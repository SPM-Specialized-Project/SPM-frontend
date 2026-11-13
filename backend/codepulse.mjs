import { mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { runSandbox } from './sandbox.mjs';
import { createExecutionQueue } from './executions.mjs';
import { evaluateExecutionAlert } from './alerts.mjs';
import { recordTraceEvent } from './admin-operations.mjs';
import {
  createGradingQueue,
  lecturerJudgmentView,
  studentJudgmentView,
} from './grading.mjs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

import {
  DATA_DIRECTORY,
  MEMBERSHIPS_FILE,
  TERMS_FILE,
  CLASSROOMS_FILE,
  ASSIGNMENTS_FILE,
  LABS_FILE,
  ASSIGNMENT_VERSIONS_FILE,
  STUDENT_SUBMISSIONS_DIRECTORY,
  CODEPULSE_SUBMISSIONS_FILE,
  CODEPULSE_ACTIVITIES_FILE,
  PRACTICE_WINDOW_AUDIT_FILE,
  WORKSPACES_FILE,
SNAPSHOTS_FILE,
  EXECUTIONS_FILE,
  RESET_RECORDS_FILE,
  GRADING_JOBS_FILE,
  JUDGMENTS_FILE,
  ISSUE_DETECTION_FILE,
  CORS_ORIGIN,
} from './config.mjs';
import { createIssueDetectionService } from './issue-detection.mjs';
import {
  assignmentRepositoryName,
  commitRepositoryFile,
  createAssignmentRepository,
  createVersionBranch,
  isGiteaConfigured,
} from './gitea.mjs';
import {
  DSA_CLASSROOM_ASSIGNMENTS,
  DSA_COURSE_ID,
  DSA_ROSTER_CLASSROOM_ID,
  DSA_MANAGER_EMAILS,
  COURSE_OWNERSHIPS,
  INITIAL_MEMBERSHIPS,
  normalizeCourse13Memberships,
  USERS,
} from './data/seeds.mjs';
import { mutateSubmissions, readSubmissions } from './data/storage.mjs';

const directory = DATA_DIRECTORY;
const termFile = TERMS_FILE;
const classroomFile = CLASSROOMS_FILE;
const membershipFile = MEMBERSHIPS_FILE;
const workspaceFile = WORKSPACES_FILE;
const snapshotFile = SNAPSHOTS_FILE;
const initialSnapshots = [];
const assignmentFile = ASSIGNMENTS_FILE;
const labFile = LABS_FILE;
const assignmentVersionFile = ASSIGNMENT_VERSIONS_FILE;
const studentSubmissionsDirectory = STUDENT_SUBMISSIONS_DIRECTORY;
const submissionFile = CODEPULSE_SUBMISSIONS_FILE;
const activityFile = CODEPULSE_ACTIVITIES_FILE;
const practiceWindowAuditFile = PRACTICE_WINDOW_AUDIT_FILE;
const resetRecordFile = RESET_RECORDS_FILE;
const gradingJobFile = GRADING_JOBS_FILE;
const judgmentFile = JUDGMENTS_FILE;

const ALLOWED_RUNTIMES = new Set(['PYTHON', 'CPP']);
const MAX_CPU_TIME_LIMIT_MS = 10_000;
const MAX_MEMORY_LIMIT_MB = 1_024;
const MAX_SOURCE_CODE_LENGTH = 200_000;
const MAX_REQUEST_KEY_LENGTH = 128;
const REQUEST_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

const initialTerms = [
  { id: 'term-2026-1', courseId: '13', name: '2026 Semester 1', startDate: '2026-01-01', endDate: '2027-01-01', resetDate: '2027-01-02', status: 'ACTIVE' },
  { id: 'term-2027-1', courseId: '13', name: '2027 Semester 1', startDate: '2027-01-02', endDate: '2027-06-01', resetDate: '2027-06-02', status: 'DRAFT' },
];
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const assessmentExecutionSummary = (execution, { includeResultText = true } = {}) => {
  if (!execution) return null;
  return {
    id: execution.id,
    state: execution.state ?? 'FINISHED',
    status: execution.status,
    mode: execution.mode ?? 'SUBMISSION',
    runtime: execution.runtime ?? null,
    stdout: includeResultText ? String(execution.stdout ?? '').slice(0, 4_000) : '',
    stderr: includeResultText ? String(execution.stderr ?? '').slice(0, 4_000) : '',
    results: (execution.results ?? []).map((result) => ({
      testCaseId: result.testCaseId,
      status: result.status,
      passed: result.passed,
      durationMs: result.durationMs,
      ...(includeResultText && !result.passed ? {
        actualOutput: String(result.actualOutput ?? '').slice(0, 4_000),
        stderr: String(result.stderr ?? '').slice(0, 4_000),
      } : {}),
    })),
  };
};

const initialClassrooms = DSA_CLASSROOM_ASSIGNMENTS.map((classroom) => {
  const ownerEmail = COURSE_OWNERSHIPS[classroom.courseId]?.ownerEmail;
  return {
    ...classroom,
    managerEmails: [...new Set([
      ...(classroom.managerEmails ?? []),
      ownerEmail,
    ].filter(Boolean))],
  };
});
const initialAssignments = [{
  id: 'problem-1', classroomId: 'class-1', title: 'Hello World',
  description: 'Read one line and print it unchanged.',
  constraints: 'The input contains one non-empty line.',
  inputFormat: 'A single line of text.',
  outputFormat: 'Print the same line.',
  cpuTimeLimitMs: 1_000,
  memoryLimitMb: 128,
  runtime: 'PYTHON',
  referenceSolution: 'print(input())',
  verificationStatus: 'VERIFIED',
  verifiedAt: '2026-01-01T00:00:00.000Z',
  verifiedBy: 'lecturer@gmail.com',
  status: 'PUBLISHED',
  testCases: [
    { id: 'public-1', input: 'Hello', expectedOutput: 'Hello', hidden: false, verified: true },
    { id: 'hidden-1', input: 'secret input', expectedOutput: 'secret output', hidden: true, verified: true },
  ],
  rawRunnerTrace: 'internal runner trace',
}];
const initialAssignmentVersions = [
  {
    id: 'problem-1-v1', assignmentId: 'problem-1', classroomId: 'class-1', version: 1,
    title: 'Singly Linked List', description: 'Implement the core operations of a singly linked list.',
    language: 'PYTHON', starterCode: '# Implement the singly linked list here\n',
    hints: [
      { id: 'problem-1-v1-hint-1', title: 'Head pointer', content: 'Keep the first node in a dedicated head reference.' },
      { id: 'problem-1-v1-hint-2', title: 'Traversal', content: 'Move through the list by following each node next reference.' },
    ],
    status: 'PUBLISHED', publishedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'problem-2-v2', assignmentId: 'problem-2', classroomId: 'class-1', version: 2,
    title: 'Doubly Linked List', description: 'Implement insertion and deletion for a doubly linked list.',
    language: 'PYTHON', starterCode: '# Implement the doubly linked list here\n',
    hints: [
      { id: 'problem-2-v2-hint-1', title: 'Two directions', content: 'Update both next and previous references when linking nodes.' },
      { id: 'problem-2-v2-hint-2', title: 'Boundary nodes', content: 'Handle head and tail updates as separate edge cases.' },
    ],
    status: 'PUBLISHED', publishedAt: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'problem-3-v1', assignmentId: 'problem-3', classroomId: 'class-1', version: 1,
    title: 'Queue implementation', description: 'Build a FIFO queue with enqueue and dequeue operations.',
    language: 'PYTHON', starterCode: '# Implement the queue here\n',
    hints: [
      { id: 'problem-3-v1-hint-1', title: 'FIFO', content: 'Insert at the rear and remove from the front.' },
    ],
    status: 'PUBLISHED', publishedAt: '2026-09-03T08:00:00.000Z',
  },
  { id: 'problem-draft-v1', assignmentId: 'problem-draft', classroomId: 'class-1', version: 1, title: 'Unpublished draft', status: 'DRAFT', publishedAt: null },
];
const initialLabs = [];
const initialCodePulseSubmissions = [];
const initialCodePulseActivities = [];
const initialPracticeWindowAudit = [];
const initialResetRecords = [];
const initialGradingJobs = [];
const initialJudgments = [];
const initialWorkspaces = [
  { id: 'workspace-1', classroomId: 'class-1', assignmentId: 'problem-1', termId: 'term-2026-1', ownerEmail: 'student@gmail.com', sourceCode: 'print("Hello World")', revision: 0 },
  { id: 'workspace-2', classroomId: 'class-1', assignmentId: 'problem-1', termId: 'term-2026-1', ownerEmail: 'student2@gmail.com', sourceCode: 'print("Private")', revision: 0 },
];

let mutationQueue = Promise.resolve();

async function readRecords(file, initial) {
  await mkdir(directory, { recursive: true });
  try {
    const records = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(records)) throw new Error(`Invalid data file: ${file}`);
    return file === membershipFile ? normalizeCourse13Memberships(records) : records;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await writeFile(file, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
    const records = structuredClone(initial);
    return file === membershipFile ? normalizeCourse13Memberships(records) : records;
  }
}

function mutate(file, initial, callback, { durable = false } = {}) {
  const result = mutationQueue.then(async () => {
    const records = await readRecords(file, initial);
    const value = callback(records);
    const serialized = `${JSON.stringify(records, null, 2)}\n`;
    if (durable) {
      const temporaryFile = `${file}.${randomUUID()}.tmp`;
      try {
        const handle = await open(temporaryFile, 'wx');
        try {
          await handle.writeFile(serialized, 'utf8');
          await handle.sync();
        } finally {
          await handle.close();
        }
        await rename(temporaryFile, file);
      } finally {
        await rm(temporaryFile, { force: true });
      }
    } else {
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, serialized, 'utf8');
        await rename(temporary, file);
      } finally {
        await rm(temporary, { force: true });
      }
    }
    return value;
  });
  mutationQueue = result.catch(() => {});
  return result;
}

const executions = createExecutionQueue({
  read: () => readRecords(EXECUTIONS_FILE, []),
  mutate: (callback) => mutate(EXECUTIONS_FILE, [], callback),
  onUpdate: async (execution) => {
    const writeTrace = async (stage, description, payload) => {
      try {
        await recordTraceEvent(execution.id, { stage, description, payload });
      } catch (error) {
        console.error('Failed to persist execution trace:', error.message);
      }
    };

    if (execution.state === 'QUEUED') {
      await writeTrace('RECEIVED', 'Execution request validated and accepted.', {
        sourceCode: execution.sourceCode,
        mode: execution.mode,
      });
      await writeTrace('DISPATCHED', 'Execution admitted to the worker queue.', {
        queueState: execution.state,
      });
    }

    let targetWorkspace = null;
    if (execution.workspaceId) {
      await mutate(workspaceFile, initialWorkspaces, (records) => {
        const workspace = records.find((item) => item.id === execution.workspaceId);
        if (workspace && (!workspace.executionResult || workspace.executionResult.id === execution.id
          || execution.state === 'QUEUED')) {
          workspace.executionResult = execution;
          targetWorkspace = structuredClone(workspace);
        }
      });
    }

    if (execution.state === 'FINISHED') {
      try {
        if (targetWorkspace) {
          await evaluateExecutionAlert({
            workspace: targetWorkspace,
            executionResult: execution,
            classroomId: targetWorkspace.classroomId,
            studentEmail: targetWorkspace.ownerEmail,
          });
        }
      } catch (err) {
        console.error('Failed to evaluate execution alert:', err);
      }

      await writeTrace('EXECUTED', 'Execution worker completed the sandbox run.', {
        status: execution.status,
        runtime: execution.runtime,
        durationMs: execution.runtimeMs,
        exitCode: execution.exitCode,
      });
      await writeTrace('RECORDED', 'Execution result was persisted and alert evaluation completed.', {
        state: execution.state,
        passedCount: execution.passedCount,
        totalCount: execution.totalCount,
      });
    }
  },
});

export const getCodePulseExecutionQueueStats = () => executions.getStats();
export const getCodePulseAiQueueStats = () => (typeof issueDetection.getQueueStats === 'function' ? issueDetection.getQueueStats().pendingCount : 0);

export const initializeCodePulseExecutions = async () => {
  await executions.list();
  const terms = await readRecords(termFile, initialTerms);
  for (const item of terms) {
    if (['RESETTING', 'RESETDONE'].includes(String(item.status).toUpperCase())) {
      executions.blockTerm(item.id);
    }
  }
};

const issueDetection = createIssueDetectionService({
  file: ISSUE_DETECTION_FILE,
  resolveExecution: async (id) => (await executions.list()).find((item) => item.id === id) ?? null,
  resolveSnapshot: async (id) => (await readRecords(snapshotFile, initialSnapshots)).find((item) => item.id === id) ?? null,
});

export const initializeCodePulseIssueDetection = () => issueDetection.initialize();

const assignmentSnapshot = (assignment, version, id, publication = {}) => ({
  ...structuredClone(assignment),
  id,
  assignmentId: assignment.id,
  classroomId: assignment.classroomId,
  version,
  testCases: normalizeTestCases(assignment.testCases),
  comparator: normalizeComparator(assignment.comparator),
  status: 'PUBLISHED',
  publishedAt: publication.publishedAt ?? new Date().toISOString(),
  usedAt: publication.usedAt ?? null,
  giteaRepository: publication.giteaRepository ?? null,
  giteaBranch: publication.giteaBranch ?? null,
});


async function recordWorkspaceSnapshot({
  workspace,
  trigger = 'SAVE',
  sourceCode = workspace.sourceCode,
  assignmentId = workspace.assignmentId,
  assignmentVersionId = workspace.assignmentVersionId,
}) {
  const hash = createHash('sha256').update(sourceCode || '').digest('hex');
  const snapshot = {
    id: `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    workspaceId: workspace.id,
    classroomId: workspace.classroomId,
    assignmentId,
    assignmentVersionId: assignmentVersionId ?? null,
    studentEmail: workspace.ownerEmail,
    sourceCode: sourceCode || '',
    hash,
    revision: workspace.revision ?? 0,
    trigger,
    createdAt: new Date().toISOString(),
  };

  await mutate(snapshotFile, initialSnapshots, (records) => {
    records.push(snapshot);
    return snapshot;
  });

  return snapshot;
}

const studentAccountKey = (email) => createHash('sha256').update(normalizeEmail(email)).digest('hex');

let studentSubmissionQueue = Promise.resolve();
let submissionPersistenceQueue = Promise.resolve();
async function readStudentSubmissions(email) {
  const file = path.join(studentSubmissionsDirectory, `${studentAccountKey(email)}.json`);
  try {
    const submissions = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(submissions)) throw new Error(`Invalid submission ledger: ${file}`);
    return submissions;
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function readAllStudentSubmissions() {
  await mkdir(studentSubmissionsDirectory, { recursive: true });
  const files = await readdir(studentSubmissionsDirectory);
  const ledgers = await Promise.all(files
    .filter((file) => file.endsWith('.json'))
    .map(async (file) => {
      const submissions = JSON.parse(await readFile(path.join(studentSubmissionsDirectory, file), 'utf8'));
      if (!Array.isArray(submissions)) throw new Error(`Invalid submission ledger: ${file}`);
      return submissions;
    }));
  return ledgers.flat();
}

function saveStudentSubmission(email, submission) {
  const result = studentSubmissionQueue.then(async () => {
    const accountKey = studentAccountKey(email);
    const file = path.join(studentSubmissionsDirectory, `${accountKey}.json`);
    await mkdir(studentSubmissionsDirectory, { recursive: true });
    const submissions = await readStudentSubmissions(email);
    submissions.push(submission);
    await writeFile(file, `${JSON.stringify(submissions, null, 2)}\n`, 'utf8');
    return { accountKey, submissions };
  });
  studentSubmissionQueue = result.catch(() => {});
  return result;
}

async function preparePublishedVersion(assignment, previousVersions) {
  const publishedVersions = previousVersions
    .filter((item) => item.assignmentId === assignment.id && item.status === 'PUBLISHED')
    .sort((left, right) => Number(right.version) - Number(left.version));
  const previous = publishedVersions[0];
  const versionNumber = (Number(previous?.version) || 0) + 1;
  const versionId = `${assignment.id}-v${versionNumber}`;
  const publishedAt = new Date().toISOString();
  let repositoryName = previous?.giteaRepository;
  let branchName = null;

  if (isGiteaConfigured) {
    repositoryName ??= assignmentRepositoryName(assignment.id);
    let repository;
    if (!previous?.giteaRepository) {
      repository = await createAssignmentRepository(repositoryName, `CodePulse assignment ${assignment.title}`);
    }
    branchName = `version/${versionNumber}`;
    await createVersionBranch(repositoryName, branchName, previous?.giteaBranch ?? repository?.default_branch ?? 'main');
    const snapshot = assignmentSnapshot(assignment, versionNumber, versionId, {
      publishedAt,
      giteaRepository: repositoryName,
      giteaBranch: branchName,
    });
    await commitRepositoryFile(
      repositoryName,
      branchName,
      'assignment-version.json',
      `${JSON.stringify(snapshot, null, 2)}\n`,
      `Publish ${assignment.title} v${versionNumber}`,
    );
    return snapshot;
  }

  return assignmentSnapshot(assignment, versionNumber, versionId, { publishedAt });
}

async function markAssignmentVersionUsed(versionId) {
  return mutate(assignmentVersionFile, initialAssignmentVersions, (records) => {
    const version = records.find((record) => record.id === versionId);
    if (version && !version.usedAt) version.usedAt = new Date().toISOString();
    return version;
  });
}

const assignmentFields = [
  'title',
  'description',
  'constraints',
  'inputFormat',
  'outputFormat',
  'cpuTimeLimitMs',
  'memoryLimitMb',
  'runtime',
  'referenceSolution',
  'testCases',
  'comparator',
];

const normalizeTestCases = (value) => (Array.isArray(value) ? value.map((test, index) => ({
  id: test?.id ?? `test-${Date.now()}-${index + 1}`,
  input: typeof test?.input === 'string' ? test.input : '',
  expectedOutput: typeof test?.expectedOutput === 'string' ? test.expectedOutput : '',
  hidden: Boolean(test?.hidden),
  verified: Boolean(test?.verified),
  weight: test?.weight === undefined ? 1 : Number(test.weight),
})) : []);

const normalizeComparator = (value) => ({
  normalizeLineEndings: value?.normalizeLineEndings !== false,
  trimTrailingNewline: value?.trimTrailingNewline !== false,
});

const normalizeAssignmentInput = (body = {}) => ({
  title: typeof body.title === 'string' ? body.title.trim() : '',
  description: typeof body.description === 'string' ? body.description.trim() : '',
  constraints: typeof body.constraints === 'string' ? body.constraints.trim() : '',
  inputFormat: typeof body.inputFormat === 'string' ? body.inputFormat.trim() : '',
  outputFormat: typeof body.outputFormat === 'string' ? body.outputFormat.trim() : '',
  cpuTimeLimitMs: body.cpuTimeLimitMs === '' || body.cpuTimeLimitMs === undefined ? null : Number(body.cpuTimeLimitMs),
  memoryLimitMb: body.memoryLimitMb === '' || body.memoryLimitMb === undefined ? null : Number(body.memoryLimitMb),
  runtime: typeof body.runtime === 'string' ? body.runtime.toUpperCase() : '',
  referenceSolution: typeof body.referenceSolution === 'string' ? body.referenceSolution.trim() : '',
  testCases: normalizeTestCases(body.testCases),
  comparator: normalizeComparator(body.comparator),
});

const normalizeAssignmentPatch = (patch = {}) => {
  const normalized = {};
  for (const field of assignmentFields) {
    if (!Object.hasOwn(patch, field)) continue;
    if (field === 'testCases') {
      normalized[field] = normalizeTestCases(patch[field]);
    } else if (field === 'comparator') {
      normalized[field] = normalizeComparator(patch[field]);
    } else if (['title', 'description', 'constraints', 'inputFormat', 'outputFormat', 'referenceSolution'].includes(field)) {
      normalized[field] = typeof patch[field] === 'string' ? patch[field].trim() : '';
    } else if (field === 'runtime') {
      normalized[field] = typeof patch[field] === 'string' ? patch[field].toUpperCase() : '';
    } else {
      const numberValue = Number(patch[field]);
      normalized[field] = Number.isFinite(numberValue) ? numberValue : null;
    }
  }
  return normalized;
};

const validationError = (makeApiError, errors) => {
  const error = makeApiError(422, 'VALIDATION_ERROR', 'Assignment chưa đủ điều kiện để publish.');
  error.errors = errors;
  return error;
};

const validatePublishableAssignment = (assignment) => {
  const errors = {};
  const requiredFields = [
    ['title', 'Tiêu đề là bắt buộc.'],
    ['description', 'Mô tả bài toán là bắt buộc.'],
    ['constraints', 'Constraints là bắt buộc.'],
    ['inputFormat', 'Input format là bắt buộc; nếu không có input hãy ghi rõ “No input”.'],
    ['outputFormat', 'Output format là bắt buộc.'],
    ['referenceSolution', 'Reference solution là bắt buộc để verify.'],
  ];
  for (const [field, message] of requiredFields) {
    if (!assignment[field]) errors[field] = message;
  }
  if (assignment.inputFormat && !assignment.inputFormat.toLowerCase().includes('no input') && assignment.inputFormat.length < 3) {
    errors.inputFormat = 'Input format phải mô tả input hoặc ghi rõ “No input”.';
  }
  if (!ALLOWED_RUNTIMES.has(assignment.runtime)) errors.runtime = 'Runtime phải là PYTHON hoặc CPP.';
  if (!Number.isFinite(assignment.cpuTimeLimitMs) || assignment.cpuTimeLimitMs <= 0) {
    errors.cpuTimeLimitMs = 'CPU time limit phải lớn hơn 0.';
  } else if (assignment.cpuTimeLimitMs > MAX_CPU_TIME_LIMIT_MS) {
    errors.cpuTimeLimitMs = `CPU time limit không được vượt quá ${MAX_CPU_TIME_LIMIT_MS} ms.`;
  }
  if (!Number.isFinite(assignment.memoryLimitMb) || assignment.memoryLimitMb <= 0) {
    errors.memoryLimitMb = 'Memory limit phải lớn hơn 0.';
  } else if (assignment.memoryLimitMb > MAX_MEMORY_LIMIT_MB) {
    errors.memoryLimitMb = `Memory limit không được vượt quá ${MAX_MEMORY_LIMIT_MB} MB.`;
  }
  if (!Array.isArray(assignment.testCases) || assignment.testCases.length === 0) {
    errors.testCases = 'Cần ít nhất một test case.';
  } else {
    assignment.testCases.forEach((test, index) => {
      if (typeof test.input !== 'string') errors[`testCases.${index}.input`] = 'Input test case phải là chuỗi.';
      if (typeof test.expectedOutput !== 'string') errors[`testCases.${index}.expectedOutput`] = 'Expected output phải là chuỗi.';
      if (!Number.isFinite(test.weight) || test.weight <= 0) errors[`testCases.${index}.weight`] = 'Trọng số test case phải lớn hơn 0.';
      if (!test.verified) errors[`testCases.${index}.verified`] = 'Test case chưa được verify bằng reference solution.';
    });
  }
  if (assignment.verificationStatus !== 'VERIFIED') errors.verification = 'Hãy verify assignment bằng reference solution trước khi publish.';
  return errors;
};

const publicAssignment = (assignment, viewerRole) => {
  const normalizedAssignment = {
    ...assignment,
    testCases: normalizeTestCases(assignment.testCases),
    comparator: normalizeComparator(assignment.comparator),
  };
  if (viewerRole !== 'student') return normalizedAssignment;
  const { rawRunnerTrace, referenceSolution, verificationStatus, verifiedAt, verifiedBy, ...safeAssignment } = normalizedAssignment;
  return {
    ...safeAssignment,
    testCases: normalizedAssignment.testCases.filter((test) => !test.hidden),
  };
};

const normalizeRunOutput = (value, comparator = {}) => {
  let output = String(value ?? '');
  if (comparator.normalizeLineEndings !== false) output = output.replace(/\r\n/g, '\n');
  if (comparator.trimTrailingNewline !== false) output = output.replace(/\n+$/, '');
  return output;
};

const runAssignmentTestCases = async ({ assignment, sourceCode, testCases }) => {
  const results = [];
  for (const testCase of testCases) {
    const cpuTimeLimitMs = Math.min(Math.max(Number(assignment.cpuTimeLimitMs) || 1000, 1), 10000);
    const result = await runSandbox({ runtime: assignment.runtime, sourceCode, input: testCase.input,
      cpuTimeLimitMs, wallTimeLimitMs: cpuTimeLimitMs * 2 + 250,
      memoryLimitMb: Number(assignment.memoryLimitMb) || 128 });
    const passed = result.status === 'SUCCESS' && normalizeRunOutput(result.stdout, assignment.comparator) === normalizeRunOutput(testCase.expectedOutput, assignment.comparator);
    results.push({ testCaseId: testCase.id, input: testCase.input, expectedOutput: testCase.expectedOutput,
      weight: testCase.weight ?? 1, hidden: Boolean(testCase.hidden), actualOutput: result.stdout,
      stderr: result.stderr, status: result.status === 'SUCCESS' ? passed ? 'PASSED' : 'WRONG_ANSWER' : result.status,
      passed, durationMs: result.runtimeMs });
  }
  return results;
};

const grading = createGradingQueue({
  readJobs: () => readRecords(gradingJobFile, initialGradingJobs),
  mutateJobs: (callback) => mutate(gradingJobFile, initialGradingJobs, callback, { durable: true }),
  readJudgments: () => readRecords(judgmentFile, initialJudgments),
  mutateJudgments: (callback) => mutate(judgmentFile, initialJudgments, callback, { durable: true }),
  readSubmissions,
  mutateSubmissions,
  loadAssignmentVersion: async (submission) => {
    if (submission.gradingSnapshot?.id === submission.assignmentVersionId
      && submission.gradingSnapshot.assignmentId === submission.assignmentId) {
      return structuredClone(submission.gradingSnapshot);
    }
    const [versions, storedAssignments] = await Promise.all([
      readRecords(assignmentVersionFile, initialAssignmentVersions),
      readRecords(assignmentFile, initialAssignments),
    ]);
    const version = versions.find((item) => item.id === submission.assignmentVersionId
      && item.assignmentId === submission.assignmentId);
    if (!version) return null;
    const assignment = storedAssignments.find((item) => item.id === submission.assignmentId);
    if (!assignment && !version.testCases) return null;
    return {
      ...(assignment ?? {}),
      ...structuredClone(version),
      id: version.id,
      assignmentId: version.assignmentId,
      runtime: version.runtime ?? version.language ?? assignment?.runtime,
      cpuTimeLimitMs: version.cpuTimeLimitMs ?? assignment?.cpuTimeLimitMs,
      memoryLimitMb: version.memoryLimitMb ?? assignment?.memoryLimitMb,
      testCases: normalizeTestCases(version.testCases ?? assignment?.testCases),
      comparator: normalizeComparator(version.comparator ?? assignment?.comparator),
    };
  },
});

export const initializeCodePulseGrading = () => grading.initialize();

export async function getCodePulseClassrooms() {
  return readRecords(classroomFile, initialClassrooms);
}

export async function getCodePulseSubmissionContext(courseId, assignmentId) {
  if (String(courseId) !== DSA_COURSE_ID) {
    return { term: null, classroom: null };
  }

  const [terms, classrooms, assignments] = await Promise.all([
    readRecords(termFile, initialTerms),
    readRecords(classroomFile, initialClassrooms),
    readRecords(assignmentFile, initialAssignments),
  ]);
  const linkedAssignment = assignments.find((item) => item.id === assignmentId);
  const item = classrooms.find((classroomItem) => classroomItem.id === linkedAssignment?.classroomId)
    ?? classrooms.find((classroomItem) => classroomItem.courseId === DSA_COURSE_ID && classroomItem.status === 'ACTIVE')
    ?? classrooms.find((classroomItem) => classroomItem.courseId === DSA_COURSE_ID);
  const term = item ? terms.find((termItem) => termItem.id === item.termId) : undefined;

  return {
    term: term
      ? {
        id: term.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        status: term.status,
      }
      : null,
    classroom: item
      ? {
        id: item.id,
        name: item.name,
        termId: item.termId,
        status: item.status,
        lecturerEmail: item.lecturerEmail,
      }
      : null,
  };
}

const LAB_STATUSES = new Set(['SCHEDULED', 'LIVE', 'PAUSED', 'ENDED', 'CANCELLED']);
const LAB_TRANSITIONS = {
  SCHEDULED: new Set(['LIVE', 'CANCELLED']),
  LIVE: new Set(['PAUSED', 'ENDED', 'CANCELLED']),
  PAUSED: new Set(['LIVE', 'ENDED']),
  ENDED: new Set(),
  CANCELLED: new Set(),
};

function parseDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

const practiceWindowStatus = (assignment) => assignment.practiceWindowStatus ?? 'OPEN';

const practiceWindowValues = (assignment) => ({
  openAt: assignment.openAt
    ?? assignment.open_at
    ?? assignment.practiceStartAt
    ?? assignment.practice_start_at,
  closeAt: assignment.closeAt
    ?? assignment.close_at
    ?? assignment.practiceEndAt
    ?? assignment.practice_end_at,
});

function validateLabInput(body, publishedVersions, selectedTerm, apiError) {
  const errors = {};
  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);
  const termStart = parseDate(selectedTerm.startDate);
  const termEnd = parseDate(selectedTerm.endDate);
  if (!body.name?.trim()) errors.name = 'LAB name is required.';
  if (startAt === null) errors.startAt = 'A valid LAB start time is required.';
  if (endAt === null) errors.endAt = 'A valid LAB end time is required.';
  if (startAt !== null && endAt !== null && endAt <= startAt) {
    errors.endAt = 'LAB end time must be after its start time.';
  }
  if (termStart !== null && startAt !== null && startAt < termStart) {
    errors.startAt = 'LAB must start within the academic term.';
  }
  if (termEnd !== null && endAt !== null && endAt > termEnd) {
    errors.endAt = 'LAB must end within the academic term.';
  }
  if (!Array.isArray(body.assignments) || body.assignments.length === 0) {
    errors.assignments = 'Select at least one published problem.';
  } else {
    const selectedVersions = new Set();
    body.assignments.forEach((item, index) => {
      const version = publishedVersions.find((candidate) => candidate.id === item.assignmentVersionId);
      if (!version) errors[`assignments.${index}.assignmentVersionId`] = 'Only published problem versions can be assigned.';
      if (selectedVersions.has(item.assignmentVersionId)) errors[`assignments.${index}.assignmentVersionId`] = 'A problem version can only be assigned once.';
      selectedVersions.add(item.assignmentVersionId);
      const { openAt, closeAt } = practiceWindowValues(item);
      const practiceOpenAt = parseDate(openAt);
      const practiceCloseAt = parseDate(closeAt);
      if (practiceOpenAt === null) errors[`assignments.${index}.openAt`] = 'A valid practice opening time is required.';
      if (practiceCloseAt === null || (practiceOpenAt !== null && practiceCloseAt <= practiceOpenAt)) {
        errors[`assignments.${index}.closeAt`] = 'Practice close time must be after its opening time.';
      }
      if (termStart !== null && practiceOpenAt !== null && practiceOpenAt < termStart) {
        errors[`assignments.${index}.openAt`] = 'Practice must open within the academic term.';
      }
      if (termEnd !== null && practiceCloseAt !== null && practiceCloseAt > termEnd) {
        errors[`assignments.${index}.closeAt`] = 'Practice must close within the academic term.';
      }
    });
  }
  if (Object.keys(errors).length > 0) {
    const error = apiError(422, 'VALIDATION_ERROR', 'LAB configuration is invalid.');
    error.errors = errors;
    throw error;
  }
}

export async function handleCodePulse({ request, response, requestUrl, user, sendJson, readRequestBody, apiError }) {
  const parts = requestUrl.pathname.split('/').filter(Boolean);
  const requestedCourseId = requestUrl.searchParams.get('courseId') ?? DSA_COURSE_ID;
  const deny = () => { throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.'); };
  const notFound = () => { throw apiError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.'); };
  const terms = await readRecords(termFile, initialTerms);
  const classrooms = await readRecords(classroomFile, initialClassrooms);
  const assignments = await readRecords(assignmentFile, initialAssignments);
  const labs = await readRecords(labFile, initialLabs);
  const assignmentVersions = await readRecords(assignmentVersionFile, initialAssignmentVersions);
  const term = (id) => terms.find((item) => item.id === id) ?? notFound();
  const classroom = (id) => classrooms.find((item) => item.id === id) ?? notFound();
  const memberships = await readRecords(membershipFile, INITIAL_MEMBERSHIPS);
  const membershipClassroomId = (classroomId) => classroomId.replace(/^class-/, '');
  const belongsToClassroom = (item, classroomId) =>
    item.classroomId === classroomId;
  const isActiveMembership = (item) => String(item.status).toUpperCase() === 'ACTIVE';
  const isCurrentStudentTerm = (item) => Boolean(
    item
      && item.status === 'ACTIVE'
      && new Date(item.startDate).getTime() <= Date.now()
      && new Date(item.endDate).getTime() > Date.now(),
  );
  const isMember = (classroomId) => memberships.some((item) =>
    belongsToClassroom(item, classroomId) &&
    normalizeEmail(item.studentEmail ?? item.userEmail) === normalizeEmail(user.email) &&
    isActiveMembership(item));
  const isCourseOwner = (item) => {
    const ownership = COURSE_OWNERSHIPS[item.courseId];
    return ownership?.ownershipLocked === true
      && normalizeEmail(ownership.ownerEmail) === normalizeEmail(user.email);
  };
  const isDsaManager = (item) => user.role === 'lecturer' && (
    normalizeEmail(item.lecturerEmail) === normalizeEmail(user.email)
    || item.managerEmails?.some((managerEmail) => normalizeEmail(managerEmail) === normalizeEmail(user.email))
    || DSA_MANAGER_EMAILS.some((managerEmail) => normalizeEmail(managerEmail) === normalizeEmail(user.email))
    || isCourseOwner(item)
  );
  const isStudentVisibleClassroom = (item) => item.status === 'ACTIVE'
    && isCurrentStudentTerm(terms.find((termItem) => termItem.id === item.termId))
    && isMember(item.id);
  const lecturerEmail = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const lecturer = USERS.find((candidate) =>
      candidate.role === 'lecturer' && candidate.email === String(value).trim());
    if (!lecturer) throw apiError(400, 'INVALID_LECTURER', 'Email phải thuộc một tài khoản lecturer.');
    return lecturer.email;
  };
  const canAccessClass = (item) => user.role === 'admin'
    || isDsaManager(item)
    || (user.role === 'student' && isStudentVisibleClassroom(item));
  const canManageClass = (item) => user.role === 'admin' || isDsaManager(item);
  const canManageAssignment = (item) => isDsaManager(item);
  const activeTerm = (item) => Boolean(item && new Date(item.endDate).getTime() > Date.now());
  const isAcademicTermActive = (item) => Boolean(
    item
      && item.status === 'ACTIVE'
      && new Date(item.startDate).getTime() <= Date.now()
      && new Date(item.endDate).getTime() > Date.now(),
  );
  const rejectResetBlockedTerm = (termId) => {
    const current = terms.find((item) => item.id === termId);
    if (current && ['RESETTING', 'RESETDONE'].includes(String(current.status).toUpperCase())) {
      throw apiError(409, 'TERM_RESET_IN_PROGRESS', 'Học kỳ không còn tiếp nhận bài nộp, run hoặc đánh giá AI.');
    }
  };
  const isAssignedLecturer = (item) => user.role === 'lecturer' && isDsaManager(item);
  const normalizeLabAssignment = (assignment) => {
    const { openAt, closeAt } = practiceWindowValues(assignment);
    return {
      ...assignment,
      openAt,
      closeAt,
      open_at: openAt,
      close_at: closeAt,
      // Keep the SCRUM-65 names in responses while clients migrate to the
      // independent practice-window contract.
      practiceStartAt: openAt,
      practiceEndAt: closeAt,
      practiceWindowStatus: practiceWindowStatus(assignment),
      practiceWindowVersion: Number.isInteger(assignment.practiceWindowVersion)
        ? assignment.practiceWindowVersion
        : 0,
    };
  };
  const labAssignmentContext = ({ classroomId, labId, labAssignmentId, assignmentId } = {}) => {
    const candidateLabs = labs.filter((item) => item.classroomId === classroomId);
    const scopedLabs = labId
      ? candidateLabs.filter((item) => item.id === labId)
      : candidateLabs;
    for (const lab of scopedLabs) {
      const labAssignment = lab.assignments
        .map(normalizeLabAssignment)
        .find((item) =>
          (labAssignmentId && item.id === labAssignmentId)
          || (!labAssignmentId && assignmentId && item.assignmentId === assignmentId));
      if (labAssignment) return { lab, labAssignment };
    }
    return null;
  };
  const studentPracticeAccess = (context) => {
    if (!context || user.role !== 'student') return {
      acceptedAt: new Date().toISOString(),
      activityContext: context
        ? (Date.now() >= parseDate(context.lab.startAt) && Date.now() < parseDate(context.lab.endAt)
          ? 'IN_LAB'
          : 'OUTSIDE_LAB')
        : null,
    };
    const classroomItem = classroom(context.lab.classroomId);
    const selectedTerm = terms.find((item) => item.id === classroomItem.termId);
    if (!isCurrentStudentTerm(selectedTerm)) {
      throw apiError(403, 'PRACTICE_TERM_INACTIVE', 'Học kỳ không còn hiệu lực cho practice window.');
    }
    const now = Date.now();
    const { openAt, closeAt } = practiceWindowValues(context.labAssignment);
    const openTimestamp = parseDate(openAt);
    const closeTimestamp = parseDate(closeAt);
    if (practiceWindowStatus(context.labAssignment) !== 'OPEN'
      || closeTimestamp === null
      || now >= closeTimestamp) {
      throw apiError(403, 'PRACTICE_WINDOW_CLOSED', 'Practice window đã đóng.');
    }
    if (openTimestamp === null || now < openTimestamp) {
      throw apiError(403, 'PRACTICE_WINDOW_NOT_OPEN', 'Practice window chưa mở.');
    }
    return {
      acceptedAt: new Date(now).toISOString(),
      activityContext: now >= parseDate(context.lab.startAt) && now < parseDate(context.lab.endAt)
        ? 'IN_LAB'
        : 'OUTSIDE_LAB',
    };
  };
  const recordActivity = async ({ type, context, activityAt, metadata = {} }) => {
    const timestamp = activityAt ?? new Date().toISOString();
    const item = {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      classroomId: context?.lab?.classroomId ?? null,
      labId: context?.lab?.id ?? null,
      labAssignmentId: context?.labAssignment?.id ?? null,
      assignmentId: context?.labAssignment?.assignmentId ?? metadata.assignmentId ?? null,
      termId: context ? classroom(context.lab.classroomId).termId : null,
      ownerEmail: user.email,
      occurredAt: timestamp,
      activityContext: metadata.activityContext ?? null,
      ...metadata,
    };
    await mutate(activityFile, initialCodePulseActivities, (records) => {
      records.push(item);
      return item;
    });
    return item;
  };
  const practiceAccessView = (lab, assignment) => {
    const now = Date.now();
    const classroomItem = classroom(lab.classroomId);
    const { openAt, closeAt } = practiceWindowValues(assignment);
    const openTimestamp = parseDate(openAt);
    const closeTimestamp = parseDate(closeAt);
    let reason = null;
    if (!isAcademicTermActive(terms.find((item) => item.id === classroomItem.termId))) {
      reason = 'TERM_INACTIVE';
    } else if (classroomItem.status === 'ARCHIVED') {
      reason = 'CLASSROOM_ARCHIVED';
    } else if (practiceWindowStatus(assignment) === 'CLOSED') {
      reason = 'MANUALLY_CLOSED';
    } else if (openTimestamp === null || closeTimestamp === null) {
      reason = 'INVALID_WINDOW';
    } else if (now >= closeTimestamp) {
      reason = 'EXPIRED';
    } else if (now < openTimestamp) {
      reason = 'NOT_OPEN_YET';
    }
    return {
      serverTime: new Date(now).toISOString(),
      practiceAccess: reason ? 'CLOSED' : 'OPEN',
      practiceAccessReason: reason,
      activityContext: reason ? null
        : now >= parseDate(lab.startAt) && now < parseDate(lab.endAt)
          ? 'IN_LAB'
          : 'OUTSIDE_LAB',
    };
  };
  const labView = (lab) => ({
    ...lab,
    stateVersion: Number.isInteger(lab.stateVersion) ? lab.stateVersion : 0,
    assignments: lab.assignments.map((rawAssignment) => {
      const assignment = normalizeLabAssignment(rawAssignment);
      const membership = memberships.find((member) =>
        belongsToClassroom(member, lab.classroomId) &&
        normalizeEmail(member.studentEmail ?? member.userEmail) === normalizeEmail(user.email) &&
        isActiveMembership(member));
      const { hints = [], starterCode, ...studentSafeAssignment } = assignment;
      return {
        ...(user.role === 'student' ? studentSafeAssignment : assignment),
        ...(user.role === 'student' ? {
          hintCount: hints.length,
          workspaceId: `workspace-${lab.id}-${assignment.id}-${membership?.id}`,
        } : {}),
        ...practiceAccessView(lab, assignment),
      };
    }),
  });
  const workspaceContext = (workspace) => {
    const classroomItem = classroom(workspace.classroomId);
    const lab = workspace.labId
      ? labs.find((candidate) => candidate.id === workspace.labId && candidate.classroomId === classroomItem.id) ?? notFound()
      : null;
    const labAssignment = lab
      ? lab.assignments.find((candidate) => candidate.id === workspace.labAssignmentId) ?? notFound()
      : null;
    return { classroomItem, lab, labAssignment };
  };
  const assessmentWorkspace = ({ workspace, classroomId, assignmentId, assignmentVersionId, ownerEmail, labId = null, labAssignmentId = null }) => {
    const existing = workspace ?? {};
    return {
      ...existing,
      id: existing.id ?? `workspace-${createHash('sha256').update([
        classroomId, labId ?? '', labAssignmentId ?? '', assignmentId, normalizeEmail(ownerEmail),
      ].join('|')).digest('hex').slice(0, 24)}`,
      classroomId: existing.classroomId ?? classroomId,
      assignmentId: assignmentId ?? existing.assignmentId,
      assignmentVersionId: assignmentVersionId ?? existing.assignmentVersionId,
      termId: existing.termId ?? classroom(classroomId).termId,
      labId: existing.labId ?? labId,
      labAssignmentId: existing.labAssignmentId ?? labAssignmentId,
      ownerEmail: existing.ownerEmail ?? ownerEmail,
    };
  };
  const resolveWorkspaceAssessmentVersion = (workspace, context) => {
    const assignmentId = context.labAssignment?.assignmentId ?? workspace.assignmentId;
    const linkedAssignment = assignments.find((item) =>
      item.id === assignmentId && item.classroomId === workspace.classroomId && item.status === 'PUBLISHED');
    const versionId = context.labAssignment?.assignmentVersionId ?? workspace.assignmentVersionId;
    if (linkedAssignment) {
      return versionId
        ? resolvePublishedAssignmentVersion(linkedAssignment, versionId)
        : latestPublishedAssignmentVersion(linkedAssignment);
    }
    const version = assignmentVersions.find((item) => item.id === versionId
      && item.assignmentId === assignmentId
      && item.classroomId === workspace.classroomId
      && item.status === 'PUBLISHED');
    return version ? {
      ...version,
      runtime: version.runtime ?? version.language,
    } : null;
  };
  const enqueueAssessment = async (input) => {
    try {
      const sourceWorkspace = input.workspace;
      const workspace = assessmentWorkspace({
        workspace: sourceWorkspace,
        classroomId: sourceWorkspace.classroomId,
        assignmentId: input.assignmentVersion?.assignmentId ?? sourceWorkspace.assignmentId,
        assignmentVersionId: input.assignmentVersion?.id ?? sourceWorkspace.assignmentVersionId,
        ownerEmail: sourceWorkspace.ownerEmail,
        labId: sourceWorkspace.labId ?? null,
        labAssignmentId: sourceWorkspace.labAssignmentId ?? null,
      });
      return await issueDetection.trigger({ ...input, workspace });
    } catch (error) {
      console.error(`CodePulse assessment could not be queued (${error?.code ?? 'ASSESSMENT_QUEUE_ERROR'}).`);
      return null;
    }
  };
  const assertWorkspaceWritable = (workspace, context) => {
    rejectResetBlockedTerm(context.classroomItem.termId);
    if (context.classroomItem.status === 'ARCHIVED') {
      throw apiError(409, 'CLASSROOM_ARCHIVED', 'Classroom is archived and read-only.');
    }
    if (!context.lab) {
      if (!isAcademicTermActive(terms.find((item) => item.id === context.classroomItem.termId))) deny();
      return null;
    }
    if (!context.labAssignment) notFound();
    const practiceContext = labAssignmentContext({
      classroomId: workspace.classroomId,
      labId: context.lab.id,
      labAssignmentId: context.labAssignment.id,
    });
    if (!practiceContext) notFound();
    return {
      practiceContext,
      practiceAccess: studentPracticeAccess(practiceContext),
    };
  };
  const assertActiveSubmissionWindow = (context, acceptedAt) => {
    if (!context.lab || !context.labAssignment) {
      throw apiError(409, 'LAB_CONTEXT_REQUIRED', 'Official submission requires a LAB problem workspace.');
    }
    if (context.lab.status !== 'LIVE') {
      throw apiError(409, 'LAB_NOT_LIVE', 'Submissions are only accepted while the LAB is Live.');
    }
    const currentAccess = practiceAccessView(context.lab, context.labAssignment);
    if (currentAccess.practiceAccess !== 'OPEN') {
      if (currentAccess.practiceAccessReason === 'CLASSROOM_ARCHIVED') {
        throw apiError(409, 'CLASSROOM_ARCHIVED', 'Classroom is archived and read-only.');
      }
      if (currentAccess.practiceAccessReason === 'TERM_INACTIVE') {
        throw apiError(403, 'PRACTICE_TERM_INACTIVE', 'The academic term is not active for submissions.');
      }
      if (currentAccess.practiceAccessReason === 'NOT_OPEN_YET') {
        throw apiError(409, 'PRACTICE_WINDOW_NOT_OPEN', 'The practice window has not opened yet.');
      }
      throw apiError(409, 'PRACTICE_WINDOW_CLOSED', 'The practice window is closed.');
    }
    const acceptanceTime = acceptedAt.getTime();
    const opensAt = Date.parse(context.labAssignment.practiceStartAt);
    const closesAt = Date.parse(context.labAssignment.practiceEndAt);
    if (acceptanceTime < opensAt) {
      throw apiError(409, 'PRACTICE_WINDOW_NOT_OPEN', 'The practice window has not opened yet.');
    }
    if (acceptanceTime >= closesAt) {
      throw apiError(409, 'PRACTICE_WINDOW_CLOSED', 'The practice window is closed.');
    }
  };
  const validateRequestKey = (value) => {
    if (typeof value !== 'string'
      || value.length < 8
      || value.length > MAX_REQUEST_KEY_LENGTH
      || !REQUEST_KEY_PATTERN.test(value)) {
      throw apiError(400, 'INVALID_REQUEST_KEY', 'requestKey must be 8-128 URL-safe characters.');
    }
    return value;
  };
  const codeSubmissionView = (submission, judgment = null, viewerRole = user.role) => ({
    id: submission.id,
    workspaceId: submission.workspaceId,
    classroomId: submission.classroomId,
    labId: submission.labId,
    labAssignmentId: submission.labAssignmentId,
    assignmentId: submission.assignmentId,
    assignmentVersionId: submission.assignmentVersionId,
    assignmentVersion: submission.assignmentVersion,
    student: submission.student,
    sourceCode: submission.sourceCode,
    acceptedAt: submission.acceptedAt,
    status: submission.status,
    gradingAttempts: structuredClone(submission.gradingAttempts ?? []),
    judgment: judgment
      ? (viewerRole === 'student' ? studentJudgmentView(judgment) : lecturerJudgmentView(judgment))
      : null,
  });
  const workspaceView = (workspace, context) => {
    const visibleWorkspace = { ...workspace };
    delete visibleWorkspace.revisions;
    const revision = Number.isInteger(workspace.revision) ? workspace.revision : 0;
    if (!context.labAssignment) {
      return {
        ...visibleWorkspace,
        revision,
        executionResult: workspace.executionResult ?? null,
      };
    }
    const revealedHintIds = new Set(workspace.hintProgress?.map((item) => item.hintId) ?? []);
    return {
      ...visibleWorkspace,
      ...(visibleWorkspace.assignmentId
        ? {}
        : { assignmentId: context.labAssignment.assignmentId }),
      revision,
      executionResult: workspace.executionResult ?? null,
      problem: {
        id: context.labAssignment.id,
        assignmentId: context.labAssignment.assignmentId,
        assignmentVersionId: context.labAssignment.assignmentVersionId,
        title: context.labAssignment.title,
        description: context.labAssignment.description ?? '',
        version: context.labAssignment.version,
        language: context.labAssignment.language ?? 'PYTHON',
        hints: (context.labAssignment.hints ?? []).map((hint) => ({
          id: hint.id,
          title: hint.title,
          revealed: revealedHintIds.has(hint.id),
          ...(revealedHintIds.has(hint.id) ? { content: hint.content } : {}),
        })),
      },
    };
  };
  const writeWorkspaceRevision = (current, sourceCode, baseRevision, savedAt) => {
    const currentRevision = Number.isInteger(current.revision) ? current.revision : 0;
    if (baseRevision !== currentRevision) {
      const details = {
        conflict: true,
        currentRevision,
        serverSourceCode: current.sourceCode,
        serverUpdatedAt: current.updatedAt,
        workspaceId: current.id,
      };
      const conflict = apiError(
        409,
        'REVISION_CONFLICT',
        'Code đã bị thay đổi ở một phiên làm việc khác.',
        details,
      );
      conflict.currentRevision = currentRevision;
      throw conflict;
    }
    if (current.sourceCode === sourceCode) return current;

    const nextRevision = currentRevision + 1;
    current.revisions ??= [];
    current.revisions.push({
      revision: nextRevision,
      sourceCode,
      savedAt,
    });
    current.sourceCode = sourceCode;
    current.revision = nextRevision;
    current.updatedAt = savedAt;
    return current;
  };
  const requireBaseRevision = (body) => {
    if (body.baseRevision === undefined) {
      throw apiError(400, 'BASE_REVISION_REQUIRED', 'baseRevision is required to save workspace code.');
    }
    if (!Number.isInteger(body.baseRevision) || body.baseRevision < 0) {
      throw apiError(400, 'INVALID_BASE_REVISION', 'baseRevision must be a non-negative integer.');
    }
    return body.baseRevision;
  };
  const publishedAssignmentVersions = (classroomId) => {
    const storedVersions = assignmentVersions.filter((item) =>
      item.classroomId === classroomId && item.status === 'PUBLISHED');
    const storedAssignmentIds = new Set(storedVersions.map((item) => item.assignmentId));
    const derivedVersions = assignments
      .filter((item) => item.classroomId === classroomId && item.status === 'PUBLISHED')
      .filter((item) => !storedAssignmentIds.has(item.id))
      .map((item) => ({
        id: `${item.id}-v${Number(item.version) || 1}`,
        assignmentId: item.id,
        classroomId: item.classroomId,
        version: Number(item.version) || 1,
        title: item.title,
        description: item.description ?? '',
        language: item.runtime ?? 'PYTHON',
        starterCode: '',
        hints: structuredClone(item.hints ?? []),
        status: 'PUBLISHED',
        publishedAt: item.publishedAt ?? item.updatedAt ?? new Date().toISOString(),
      }));
    return [...storedVersions, ...derivedVersions];
  };
  const resolvePublishedAssignmentVersion = (assignment, versionId) => {
    const version = publishedAssignmentVersions(assignment.classroomId)
      .find((item) => item.id === versionId && item.assignmentId === assignment.id) ?? notFound();
    return {
      ...assignmentSnapshot(assignment, version.version, version.id, version),
      ...version,
      runtime: version.runtime ?? version.language ?? assignment.runtime,
      testCases: normalizeTestCases(version.testCases ?? assignment.testCases),
      comparator: normalizeComparator(version.comparator ?? assignment.comparator),
    };
  };
  const latestPublishedAssignmentVersion = (assignment) => {
    const version = publishedAssignmentVersions(assignment.classroomId)
      .filter((item) => item.assignmentId === assignment.id)
      .sort((left, right) => Number(right.version) - Number(left.version))[0] ?? notFound();
    return resolvePublishedAssignmentVersion(assignment, version.id);
  };
  const submissionView = (submission) => ({
    id: submission.id,
    assignmentId: submission.assignmentId,
    assignmentVersionId: submission.assignmentVersionId,
    version: submission.version,
    submittedAt: submission.submittedAt,
    passedCount: submission.passedCount,
    totalCount: submission.totalCount,
    earnedWeight: submission.earnedWeight,
    totalWeight: submission.totalWeight,
    score: submission.score,
    commitSha: submission.commitSha ?? null,
    sourceCode: submission.sourceCode,
    results: submission.results.map((result) => result.hidden
      ? {
        testCaseId: result.testCaseId,
        weight: result.weight,
        status: result.status,
        passed: result.passed,
        durationMs: result.durationMs,
      }
      : result),
  });

  const gradeSubmission = async ({ assignment, version, sourceCode, submittedAt = new Date().toISOString(), metadata = {} }) => {
    if (!ALLOWED_RUNTIMES.has(version.runtime)) {
      throw apiError(422, 'UNSUPPORTED_RUNTIME', 'Assignment chưa có runtime được hỗ trợ để chạy.');
    }
    const results = await runAssignmentTestCases({ assignment: version, sourceCode, testCases: version.testCases });
    if (results.some((result) => result.status === 'INTERNAL_ERROR')) {
      throw apiError(503, 'RUNNER_UNAVAILABLE', 'Sandbox unavailable. Retry later.');
    }
    const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
    const earnedWeight = results.reduce((sum, result) => sum + (result.passed ? result.weight : 0), 0);
    const submission = {
      id: `submission-${randomUUID()}`,
      studentEmail: user.email,
      assignmentId: assignment.id,
      assignmentVersionId: version.id,
      version: version.version,
      submittedAt,
      sourceCode,
      passedCount: results.filter((result) => result.passed).length,
      totalCount: results.length,
      earnedWeight,
      totalWeight,
      score: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 10_000) / 100 : 0,
      results,
      commitSha: null,
      ...metadata,
    };
    // Serialize the read/commit/save cycle so concurrent submissions retain every entry.
    const pending = submissionPersistenceQueue.then(async () => {
      if (isGiteaConfigured && version.giteaRepository && version.giteaBranch) {
        const previousSubmissions = await readStudentSubmissions(user.email);
        const commitContent = [...previousSubmissions.filter((item) => item.assignmentVersionId === version.id), submission].map((item) => ({
          id: item.id,
          assignmentId: item.assignmentId,
          assignmentVersionId: item.assignmentVersionId,
          submittedAt: item.submittedAt,
          sourceCode: item.sourceCode,
          score: item.score,
          passedCount: item.passedCount,
          totalCount: item.totalCount,
        }));
        try {
          const committed = await commitRepositoryFile(
            version.giteaRepository,
            version.giteaBranch,
            `submissions/${studentAccountKey(user.email)}.json`,
            `${JSON.stringify(commitContent, null, 2)}\n`,
            `Submit ${assignment.title} v${version.version}`,
            { name: user.email.split('@')[0], email: user.email },
          );
          submission.commitSha = committed?.commit?.sha ?? null;
        } catch (error) {
          console.error('Unable to commit CodePulse submission to Gitea:', error);
          throw apiError(502, 'SUBMISSION_COMMIT_FAILED', 'Could not commit the submission to its assignment version.');
        }
      }

      await markAssignmentVersionUsed(version.id);
      await saveStudentSubmission(user.email, submission);
      return submission;
    });
    submissionPersistenceQueue = pending.catch(() => {});
    return pending;
  };

  if (parts[2] === 'terms' && !parts[3] && request.method === 'GET') {
    const canViewAllCourseTerms = ['admin', 'lecturer'].includes(user.role);
    const items = terms.filter((item) => item.courseId === requestedCourseId && (canViewAllCourseTerms
      || (isCurrentStudentTerm(item)
        && classrooms.some((classroomItem) => classroomItem.termId === item.id && canAccessClass(classroomItem)))));
    sendJson(response, 200, { items });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && parts[4] === 'reset' && parts[5] === 'start' && request.method === 'POST') {
    if (user.role !== 'admin') deny();
    const current = term(parts[3]);
    if (current.courseId !== requestedCourseId) notFound();
    if (String(current.status).toUpperCase() !== 'ENDED') {
      throw apiError(409, 'TERM_NOT_ENDED', 'Chỉ có thể bắt đầu reset từ trạng thái ENDED.');
    }
    if (!current.resetDate || new Date(current.resetDate).getTime() > Date.now()) {
      throw apiError(409, 'RESET_BOUNDARY_NOT_REACHED', 'Reset chỉ được thực hiện tại ranh giới chuyển tiếp đã xác nhận.');
    }
    await executions.blockTerm(current.id);
    const updated = { ...current, status: 'RESETTING', resetStartedAt: new Date().toISOString(), resetStartedBy: user.email };
    try {
      await mutate(termFile, initialTerms, (records) => Object.assign(records.find((record) => record.id === current.id), updated));
    } catch (error) {
      await executions.unblockTerm(current.id);
      throw error;
    }
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && parts[4] === 'reset' && parts[5] === 'execute' && request.method === 'POST') {
    if (user.role !== 'admin') deny();
    const current = term(parts[3]);
    if (current.courseId !== requestedCourseId) notFound();
    if (String(current.status).toUpperCase() !== 'RESETTING') {
      throw apiError(409, 'TERM_NOT_RESETTING', 'Term phải ở trạng thái RESETTING trước khi thực hiện purge.');
    }

    await executions.drainTerm(current.id);
    const classroomIds = new Set(classrooms.filter((item) => item.termId === current.id).map((item) => item.id));
    const workspaceIds = new Set();
    const currentWorkspaces = await readRecords(workspaceFile, initialWorkspaces);
    currentWorkspaces.filter((item) => item.termId === current.id || classroomIds.has(item.classroomId))
      .forEach((item) => workspaceIds.add(item.id));
    const currentSubmissions = await readSubmissions();
    const currentCodePulseSubmissions = await readRecords(submissionFile, initialCodePulseSubmissions);
    const submissionIds = new Set([
      ...currentSubmissions,
      ...currentCodePulseSubmissions,
    ].filter((item) => item.termId === current.id || classroomIds.has(item.classroomId))
      .map((item) => item.id));
    await grading.drainSubmissions([...submissionIds]);
    await issueDetection.drainClassrooms([...classroomIds]);
    const executedAt = new Date().toISOString();
    let affected = {};
    const reconciliation = {};
    try {
      await mutate(workspaceFile, initialWorkspaces, (records) => {
        const purged = records.filter((item) => item.termId === current.id || classroomIds.has(item.classroomId));
        purged.forEach((item) => workspaceIds.add(item.id));
        affected.workspaces = purged.length;
        for (let index = records.length - 1; index >= 0; index -= 1) {
          if (records[index].termId === current.id || classroomIds.has(records[index].classroomId)) records.splice(index, 1);
        }
      }, { durable: true });

      await mutate(snapshotFile, initialSnapshots, (records) => {
        const retained = records.filter((item) => item.termId !== current.id
          && !classroomIds.has(item.classroomId)
          && !workspaceIds.has(item.workspaceId));
        affected.snapshots = records.length - retained.length;
        records.splice(0, records.length, ...retained);
      }, { durable: true });
      await mutate(submissionFile, initialCodePulseSubmissions, (records) => {
        const retained = records.filter((item) => item.termId !== current.id && !classroomIds.has(item.classroomId));
        affected.submissions = records.length - retained.length;
        records.splice(0, records.length, ...retained);
      }, { durable: true });
      await mutateSubmissions((records) => {
        const retained = records.filter((item) => item.termId !== current.id && !classroomIds.has(item.classroomId));
        affected.legacySubmissions = records.length - retained.length;
        records.splice(0, records.length, ...retained);
      });
      await mutate(activityFile, initialCodePulseActivities, (records) => {
        const retained = records.filter((item) => item.termId !== current.id && !classroomIds.has(item.classroomId));
        affected.activities = records.length - retained.length;
        records.splice(0, records.length, ...retained);
      }, { durable: true });
      await mutate(EXECUTIONS_FILE, [], (records) => {
        const retained = records.filter((item) => item.termId !== current.id
          && !classroomIds.has(item.classroomId)
          && !workspaceIds.has(item.workspaceId));
        affected.executions = records.length - retained.length;
        records.splice(0, records.length, ...retained);
      }, { durable: true });

      const gradingCounts = await grading.purgeSubmissions([...submissionIds]);
      affected.gradingJobs = gradingCounts.jobs;
      affected.judgments = gradingCounts.judgments;
      const issueDetectionCounts = await issueDetection.purgeClassrooms([...classroomIds], [...workspaceIds]);
      affected.issueAssessments = issueDetectionCounts.assessments;
      affected.issueCases = issueDetectionCounts.issueCases;
      affected.issueEvidence = issueDetectionCounts.evidence;
      affected.issueCaseTests = issueDetectionCounts.caseTests;

      affected.studentSubmissionFiles = 0;
      try {
        const studentFiles = await readdir(studentSubmissionsDirectory, { withFileTypes: true });
        for (const entry of studentFiles.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
          const file = path.join(studentSubmissionsDirectory, entry.name);
          const records = JSON.parse(await readFile(file, 'utf8'));
          if (!Array.isArray(records)) continue;
          const retained = records.filter((item) => item.termId !== current.id && !classroomIds.has(item.classroomId));
          affected.studentSubmissionFiles += records.length - retained.length;
          if (retained.length === 0 && records.length > 0) await rm(file, { force: true });
          else if (retained.length !== records.length) await writeFile(file, `${JSON.stringify(retained, null, 2)}\n`, 'utf8');
        }
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }

      reconciliation.workspaces = (await readRecords(workspaceFile, initialWorkspaces)).every((item) =>
        item.termId !== current.id && !classroomIds.has(item.classroomId));
      reconciliation.snapshots = (await readRecords(snapshotFile, initialSnapshots)).every((item) =>
        item.termId !== current.id && !classroomIds.has(item.classroomId) && !workspaceIds.has(item.workspaceId));
      reconciliation.submissions = (await readRecords(submissionFile, initialCodePulseSubmissions)).every((item) =>
        item.termId !== current.id && !classroomIds.has(item.classroomId));
      reconciliation.legacySubmissions = (await readSubmissions()).every((item) =>
        item.termId !== current.id && !classroomIds.has(item.classroomId));
      reconciliation.activities = (await readRecords(activityFile, initialCodePulseActivities)).every((item) =>
        item.termId !== current.id && !classroomIds.has(item.classroomId));
      reconciliation.executions = (await readRecords(EXECUTIONS_FILE, [])).every((item) =>
        item.termId !== current.id && !classroomIds.has(item.classroomId) && !workspaceIds.has(item.workspaceId));
      const remainingGradingData = await grading.inspectSubmissions([...submissionIds]);
      reconciliation.grading = remainingGradingData.jobs === 0 && remainingGradingData.judgments === 0;
      const remainingIssueData = await issueDetection.inspectClassrooms([...classroomIds], [...workspaceIds]);
      reconciliation.issueDetection = Object.values(remainingIssueData).every((count) => count === 0);
      reconciliation.problemBank = true;
    } catch (error) {
      const record = {
        id: `reset-${randomUUID()}`, termId: current.id, courseId: current.courseId, status: 'INCOMPLETE',
        executedAt, executedBy: user.email, affectedRowCounts: affected, reconciliation,
        errors: [error instanceof Error ? error.message : String(error)], immutable: true,
      };
      await mutate(resetRecordFile, initialResetRecords, (records) => { records.push(record); return record; }, { durable: true });
      throw apiError(500, 'TERM_RESET_INCOMPLETE', 'Reset đã ghi nhận lỗi và được đánh dấu chưa hoàn tất.', { resetRecordId: record.id });
    }

    if (!Object.values(reconciliation).every(Boolean)) {
      throw apiError(409, 'TERM_RESET_RECONCILIATION_FAILED', 'Không thể xác nhận reset vì chưa đối soát đủ dữ liệu.');
    }
    const completedAt = new Date().toISOString();
    const updated = { ...current, status: 'RESETDONE', resetCompletedAt: completedAt };
    const record = {
      id: `reset-${randomUUID()}`, termId: current.id, courseId: current.courseId, status: 'COMPLETE',
      executedAt, completedAt, executedBy: user.email, affectedRowCounts: affected, reconciliation, errors: [], immutable: true,
    };
    // AC-16e (D-02): Persist COMPLETE reset audit record first to guarantee audit durability before marking term RESETDONE
    await mutate(resetRecordFile, initialResetRecords, (records) => { records.push(record); return record; }, { durable: true });
    await mutate(termFile, initialTerms, (records) => Object.assign(records.find((record) => record.id === current.id), updated), { durable: true });
    sendJson(response, 200, { item: updated, resetRecord: record });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && parts[4] === 'reset-records' && request.method === 'GET') {
    if (!['admin', 'lecturer'].includes(user.role)) deny();
    const current = term(parts[3]);
    const records = await readRecords(resetRecordFile, initialResetRecords);
    sendJson(response, 200, { items: records.filter((item) => item.termId === current.id) });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && parts[4] === 'reset-records' && parts[5] && parts[6] === 'acknowledge' && request.method === 'POST') {
    if (user.role !== 'lecturer') deny();
    const records = await readRecords(resetRecordFile, initialResetRecords);
    const record = records.find((item) => item.termId === parts[3] && item.id === parts[5]);
    if (!record) notFound();
    const acknowledgement = {
      acknowledgedAt: new Date().toISOString(), acknowledgedBy: user.email,
    };
    const updated = await mutate(resetRecordFile, initialResetRecords, (items) => {
      const currentRecord = items.find((item) => item.id === record.id);
      currentRecord.acknowledgements = [...(currentRecord.acknowledgements ?? []), acknowledgement];
      return currentRecord;
    }, { durable: true });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'assessments' && !parts[3] && request.method === 'GET') {
    if (user.role !== 'lecturer') deny();
    const classroomId = requestUrl.searchParams.get('classroomId');
    if (!classroomId) throw apiError(400, 'CLASSROOM_REQUIRED', 'classroomId is required.');
    const item = classroom(classroomId);
    if (!isDsaManager(item)) deny();
    sendJson(response, 200, { items: await issueDetection.listAssessments(item.id) });
    return;
  }

  if (parts[2] === 'issue-events' && !parts[3] && request.method === 'GET') {
    if (user.role !== 'lecturer') deny();
    const classroomId = requestUrl.searchParams.get('classroomId');
    if (!classroomId) throw apiError(400, 'CLASSROOM_REQUIRED', 'classroomId is required.');
    const item = classroom(classroomId);
    if (!isDsaManager(item)) deny();

    response.writeHead(200, {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders?.();
    response.write('event: ready\ndata: {}\n\n');
    const unsubscribe = issueDetection.subscribe((event) => {
      if (event.classroomId !== item.id || response.destroyed || response.writableEnded) return;
      response.write(`event: update\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      if (!response.destroyed && !response.writableEnded) response.write(': keep-alive\n\n');
    }, 15_000);
    heartbeat.unref?.();
    response.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    return;
  }

  if (parts[2] === 'issue-cases' && !parts[3] && request.method === 'GET') {
    if (user.role !== 'lecturer') deny();
    const classroomId = requestUrl.searchParams.get('classroomId');
    if (!classroomId) throw apiError(400, 'CLASSROOM_REQUIRED', 'classroomId is required.');
    const item = classroom(classroomId);
    if (!isDsaManager(item)) deny();
    sendJson(response, 200, { items: await issueDetection.listIssueCases(item.id) });
    return;
  }

  if (parts[2] === 'issue-cases' && parts[3] && request.method === 'PATCH') {
    if (user.role !== 'lecturer') deny();
    const current = await issueDetection.getIssueCase(parts[3]);
    if (!current) notFound();
    if (!isDsaManager(classroom(current.classroomId))) deny();
    const body = await readRequestBody(request);
    const status = String(body.status ?? '').toUpperCase();
    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      throw apiError(400, 'INVALID_INPUT', 'Issue case status must be RESOLVED or DISMISSED.');
    }
    const item = await issueDetection.updateIssueCaseStatus(current.id, status);
    if (!item) notFound();
    sendJson(response, 200, { item });
    return;
  }

  if (parts[2] === 'terms' && !parts[3] && request.method === 'POST') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    if (!body.name?.trim() || !body.startDate || !body.endDate || !body.resetDate) {
      throw apiError(400, 'INVALID_INPUT', 'Tên, ngày bắt đầu, ngày kết thúc và ngày reset là bắt buộc.');
    }
    if (new Date(body.endDate) <= new Date(body.startDate)) {
      throw apiError(400, 'INVALID_TERM_DATES', 'Ngày kết thúc phải sau ngày bắt đầu.');
    }
    const item = { id: body.id ?? `term-${Date.now()}`, courseId: requestedCourseId, name: body.name.trim(), startDate: body.startDate, endDate: body.endDate, resetDate: body.resetDate, status: 'DRAFT' };
    await mutate(termFile, initialTerms, (records) => { records.push(item); return item; });
    sendJson(response, 201, { item });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && request.method === 'PATCH') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    const current = term(parts[3]);
    if (current.courseId !== requestedCourseId) notFound();
    if (['RESETTING', 'RESETDONE'].includes(current.status)) {
      throw apiError(409, 'TERM_RESET_LOCKED', 'A term in reset or completed reset state is read-only.');
    }
    const updated = { ...current, ...body.patch, courseId: current.courseId };
    if (!updated.name?.trim() || new Date(updated.endDate) <= new Date(updated.startDate)) {
      throw apiError(400, 'INVALID_TERM_DATES', 'Term có ngày không hợp lệ.');
    }
    if (!['DRAFT', 'ACTIVE', 'ENDED', 'RESETTING', 'RESETDONE', 'ARCHIVED'].includes(updated.status)) {
      throw apiError(400, 'INVALID_STATUS', 'Trạng thái term không hợp lệ.');
    }
    if (updated.status !== current.status && ['RESETTING', 'RESETDONE'].includes(current.status)) {
      throw apiError(409, 'INVALID_STATUS_TRANSITION', 'Trạng thái reset chỉ có thể thay đổi qua workflow reset.');
    }
    if (updated.status !== current.status && ['RESETTING', 'RESETDONE'].includes(updated.status)) {
      throw apiError(409, 'INVALID_STATUS_TRANSITION', 'Trạng thái reset chỉ có thể thay đổi qua workflow reset.');
    }
    if (updated.status === 'ENDED' && new Date(updated.endDate).getTime() > Date.now()) {
      throw apiError(409, 'TERM_NOT_ENDED', 'Chỉ có thể kết thúc term tại hoặc sau ngày kết thúc đã cấu hình.');
    }
    await mutate(termFile, initialTerms, (records) => { Object.assign(records.find((record) => record.id === current.id), updated); return updated; });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'classrooms' && !parts[3] && request.method === 'GET') {
    const items = user.role === 'admin'
      ? classrooms
      : classrooms.filter((item) => item.courseId === requestedCourseId && canAccessClass(item));
    const scopedItems = user.role === 'admin' ? items.filter((item) => item.courseId === requestedCourseId) : items;
    sendJson(response, 200, { items: scopedItems.map((item) => ({ ...item, term: term(item.termId) })) });
    return;
  }

  if (parts[2] === 'classrooms' && !parts[3] && request.method === 'POST') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    const selectedTerm = term(body.termId);
    if (selectedTerm.courseId !== requestedCourseId) throw apiError(400, 'TERM_COURSE_MISMATCH', 'Term không thuộc khóa học này.');
    if (!body.name?.trim()) throw apiError(400, 'INVALID_INPUT', 'Tên classroom không được để trống.');
    if (!activeTerm(selectedTerm)) throw apiError(400, 'TERM_ENDED', 'Không thể tạo classroom trong term đã kết thúc.');
    const item = { id: body.id ?? `class-${Date.now()}`, courseId: requestedCourseId, termId: selectedTerm.id, name: body.name.trim(), description: body.description?.trim() ?? '', status: 'DRAFT', lecturerEmail: lecturerEmail(body.lecturerEmail) };
    await mutate(classroomFile, initialClassrooms, (records) => { records.push(item); return item; });
    sendJson(response, 201, { item: { ...item, term: selectedTerm } });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && request.method === 'PATCH' && !parts[4]) {
    const current = classroom(parts[3]);
    if (!canManageClass(current)) deny();
    const body = await readRequestBody(request);
    const patch = body.patch ?? {};
    if (patch.name !== undefined && !patch.name.trim()) throw apiError(400, 'INVALID_INPUT', 'Tên classroom không được để trống.');
    if (patch.status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(patch.status)) throw apiError(400, 'INVALID_STATUS', 'Trạng thái classroom không hợp lệ.');
    const allowedPatch = user.role === 'admin'
      ? patch
      : Object.fromEntries(Object.entries(patch).filter(([key]) => ['name', 'description', 'status'].includes(key)));
    if (user.role === 'admin' && Object.hasOwn(allowedPatch, 'lecturerEmail')) {
      allowedPatch.lecturerEmail = lecturerEmail(allowedPatch.lecturerEmail);
    }
    if (user.role === 'admin' && Object.hasOwn(allowedPatch, 'termId')) {
      const selectedTerm = term(allowedPatch.termId);
      if (selectedTerm.courseId !== current.courseId) throw apiError(400, 'TERM_COURSE_MISMATCH', 'Term không thuộc khóa học này.');
      if (!activeTerm(selectedTerm)) throw apiError(400, 'TERM_ENDED', 'Không thể chuyển classroom sang term đã kết thúc.');
    }
    const updated = { ...current, ...allowedPatch, courseId: current.courseId, name: allowedPatch.name?.trim() ?? current.name };
    await mutate(classroomFile, initialClassrooms, (records) => { Object.assign(records.find((record) => record.id === current.id), updated); return updated; });
    sendJson(response, 200, { item: { ...updated, term: term(updated.termId) } });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && request.method === 'DELETE' && !parts[4]) {
    if (user.role !== 'admin') deny();
    const current = classroom(parts[3]);
    await mutate(classroomFile, initialClassrooms, (records) => {
      const index = records.findIndex((record) => record.id === current.id);
      if (index < 0) notFound();
      records.splice(index, 1);
      return current;
    });
    const linkedClassroomIds = new Set([current.id, membershipClassroomId(current.id)]);
    await mutate(membershipFile, INITIAL_MEMBERSHIPS, (records) => {
      records.splice(0, records.length, ...records.filter((record) => !linkedClassroomIds.has(record.classroomId)));
      return true;
    });
    await mutate(workspaceFile, initialWorkspaces, (records) => {
      records.splice(0, records.length, ...records.filter((record) => record.classroomId !== current.id));
      return true;
    });
    await mutate(labFile, initialLabs, (records) => {
      records.splice(0, records.length, ...records.filter((record) => record.classroomId !== current.id));
      return true;
    });
    await mutate(assignmentVersionFile, initialAssignmentVersions, (records) => {
      records.splice(0, records.length, ...records.filter((record) => record.classroomId !== current.id));
      return true;
    });
    sendJson(response, 200, { deleted: true, item: current });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && !parts[4] && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!canAccessClass(item)) deny();
    sendJson(response, 200, { item });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'assignment-versions'
    && !parts[5] && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const items = publishedAssignmentVersions(classroomItem.id).map((version) => {
      if (user.role !== 'student') return version;
      const {
        hints = [],
        starterCode,
        referenceSolution,
        rawRunnerTrace,
        giteaRepository,
        giteaBranch,
        testCases = [],
        ...safeVersion
      } = version;
      return {
        ...safeVersion,
        hintCount: hints.length,
        testCases: normalizeTestCases(testCases).filter((testCase) => !testCase.hidden),
      };
    });
    sendJson(response, 200, { items });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'assignment-versions'
    && parts[5] && parts[6] === 'history' && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const version = publishedAssignmentVersions(classroomItem.id)
      .find((item) => item.id === parts[5] && item.status === 'PUBLISHED');
    if (!version) notFound();
    const submissions = await readAllStudentSubmissions();
    sendJson(response, 200, {
      item: {
        ...version,
        testCases: normalizeTestCases(version.testCases),
        comparator: normalizeComparator(version.comparator),
      },
      submissions: submissions
        .filter((submission) => submission.assignmentVersionId === version.id)
        .map((submission) => ({ ...submission, studentEmail: submission.studentEmail ?? null })),
      executions: (await executions.list()).filter((execution) =>
        execution.classroomId === classroomItem.id && execution.assignmentVersionId === version.id).reverse().slice(0, 100),
    });
    return;
  }

  if (parts[2] === 'classrooms'
    && parts[3]
    && parts[4] === 'labs'
    && parts[5]
    && parts[6] === 'assignments'
    && parts[7]
    && parts[8] === 'practice-window'
    && request.method === 'PATCH') {
    const classroomItem = classroom(parts[3]);
    if (!isAssignedLecturer(classroomItem)) deny();
    const selectedTerm = term(classroomItem.termId);
    if (!isAcademicTermActive(selectedTerm)) {
      throw apiError(409, 'TERM_INACTIVE', 'Practice window chỉ được thay đổi trong academic term đang active.');
    }
    const lab = labs.find((item) => item.id === parts[5] && item.classroomId === classroomItem.id) ?? notFound();
    const currentAssignment = lab.assignments.find((item) => item.id === parts[7]) ?? notFound();
    const body = await readRequestBody(request);
    const patch = body.patch ?? body;
    const currentWindow = practiceWindowValues(currentAssignment);
    const requestedOpenAt = patch.openNow === true
      ? new Date().toISOString()
      : Object.hasOwn(patch, 'openAt') || Object.hasOwn(patch, 'open_at')
        ? (patch.openAt ?? patch.open_at)
        : currentWindow.openAt;
    const requestedCloseAt = Object.hasOwn(patch, 'closeAt') || Object.hasOwn(patch, 'close_at')
      ? (patch.closeAt ?? patch.close_at)
      : currentWindow.closeAt;
    const expectedVersion = patch.expectedVersion;
    if (expectedVersion === undefined) {
      throw apiError(400, 'PRACTICE_WINDOW_VERSION_REQUIRED', 'expectedVersion is required to update a practice window.');
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw apiError(400, 'INVALID_PRACTICE_WINDOW_VERSION', 'expectedVersion must be a non-negative integer.');
    }
    const openTimestamp = parseDate(requestedOpenAt);
    const closeTimestamp = parseDate(requestedCloseAt);
    const errors = {};
    if (openTimestamp === null) errors.openAt = 'A valid practice opening time is required.';
    if (closeTimestamp === null) errors.closeAt = 'A valid practice closing time is required.';
    if (openTimestamp !== null && closeTimestamp !== null && closeTimestamp <= openTimestamp) {
      errors.closeAt = 'Practice close time must be after its opening time.';
    }
    if (openTimestamp !== null && parseDate(selectedTerm.startDate) > openTimestamp) {
      errors.openAt = 'Practice must open within the academic term.';
    }
    if (closeTimestamp !== null && parseDate(selectedTerm.endDate) < closeTimestamp) {
      errors.closeAt = 'Practice must close within the academic term.';
    }
    const requestedStatus = patch.openNow === true ? 'OPEN'
      : patch.status ?? patch.practiceWindowStatus ?? currentAssignment.practiceWindowStatus ?? 'OPEN';
    if (!['OPEN', 'CLOSED'].includes(requestedStatus)) errors.status = 'Practice window status must be OPEN or CLOSED.';
    if (requestedStatus === 'OPEN' && closeTimestamp !== null && closeTimestamp <= Date.now()) {
      errors.closeAt = 'Reopening requires a closing time in the future.';
    }
    if (Object.keys(errors).length > 0) {
      const error = apiError(422, 'VALIDATION_ERROR', 'Practice window configuration is invalid.');
      error.errors = errors;
      throw error;
    }
    const mutation = await mutate(labFile, initialLabs, (records) => {
      const storedLab = records.find((record) => record.id === lab.id) ?? notFound();
      const storedAssignment = storedLab.assignments.find((assignment) => assignment.id === currentAssignment.id) ?? notFound();
      const latestVersion = Number.isInteger(storedAssignment.practiceWindowVersion)
        ? storedAssignment.practiceWindowVersion
        : 0;
      if (expectedVersion !== latestVersion) {
        throw apiError(409, 'STALE_PRACTICE_WINDOW', 'Practice window đã được cập nhật. Hãy tải lại dữ liệu mới nhất.');
      }
      const before = {
        openAt: practiceWindowValues(storedAssignment).openAt,
        closeAt: practiceWindowValues(storedAssignment).closeAt,
        status: storedAssignment.practiceWindowStatus ?? 'OPEN',
      };
      const now = new Date().toISOString();
      const updatedAssignment = {
        ...storedAssignment,
        openAt: new Date(openTimestamp).toISOString(),
        closeAt: new Date(closeTimestamp).toISOString(),
        open_at: new Date(openTimestamp).toISOString(),
        close_at: new Date(closeTimestamp).toISOString(),
        practiceStartAt: new Date(openTimestamp).toISOString(),
        practiceEndAt: new Date(closeTimestamp).toISOString(),
        practiceWindowStatus: requestedStatus,
        practiceWindowVersion: latestVersion + 1,
        manualCloseAt: requestedStatus === 'CLOSED' ? now : storedAssignment.manualCloseAt ?? null,
        manualCloseBy: requestedStatus === 'CLOSED' ? user.email : storedAssignment.manualCloseBy ?? null,
        lastReopenedAt: requestedStatus === 'OPEN' && storedAssignment.practiceWindowStatus === 'CLOSED'
          ? now
          : storedAssignment.lastReopenedAt ?? null,
        lastReopenedBy: requestedStatus === 'OPEN' && storedAssignment.practiceWindowStatus === 'CLOSED'
          ? user.email
          : storedAssignment.lastReopenedBy ?? null,
        updatedAt: now,
      };
      storedLab.assignments = storedLab.assignments.map((assignment) =>
        assignment.id === currentAssignment.id ? updatedAssignment : assignment);
      storedLab.updatedAt = now;
      return {
        lab: storedLab,
        assignment: updatedAssignment,
        before,
        occurredAt: now,
      };
    });
    const action = requestedStatus === 'CLOSED'
      ? 'CLOSE'
      : mutation.before.status === 'CLOSED'
        ? 'REOPEN'
        : 'UPDATE';
    await mutate(practiceWindowAuditFile, initialPracticeWindowAudit, (records) => {
      records.push({
        id: `practice-window-audit-${Date.now()}-${currentAssignment.id}`,
        action,
        classroomId: classroomItem.id,
        labId: lab.id,
        labAssignmentId: currentAssignment.id,
        actorEmail: user.email,
        actorRole: user.role,
        occurredAt: mutation.occurredAt,
        before: mutation.before,
        after: {
          openAt: mutation.assignment.openAt,
          closeAt: mutation.assignment.closeAt,
          status: mutation.assignment.practiceWindowStatus,
        },
      });
      return true;
    });
    sendJson(response, 200, { item: labView(mutation.lab).assignments.find((item) => item.id === currentAssignment.id) });
    return;
  }

  if (parts[2] === 'practice-window-audit' && request.method === 'GET') {
    if (user.role !== 'admin') deny();
    const records = await readRecords(practiceWindowAuditFile, initialPracticeWindowAudit);
    const labId = requestUrl.searchParams.get('labId');
    const classroomId = requestUrl.searchParams.get('classroomId');
    sendJson(response, 200, {
      items: records.filter((item) => (!labId || item.labId === labId) && (!classroomId || item.classroomId === classroomId)),
    });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'labs' && !parts[5] && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const items = labs
      .filter((item) => item.classroomId === classroomItem.id)
      .filter((item) => user.role !== 'student'
        || isCurrentStudentTerm(terms.find((termItem) => termItem.id === classroomItem.termId)))
      .map(labView);
    sendJson(response, 200, { items });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'labs'
    && parts[5] && parts[6] === 'submissions' && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!isDsaManager(classroomItem)) deny();
    const lab = labs.find((item) => item.id === parts[5] && item.classroomId === classroomItem.id) ?? notFound();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const labWorkspaceIds = new Set(workspaces
      .filter((workspace) => workspace.classroomId === classroomItem.id && workspace.labId === lab.id)
      .map((workspace) => workspace.id));
    const submissions = await readSubmissions();
    const items = await Promise.all(submissions
      .filter((submission) => submission.kind === 'CODE_SUBMISSION'
        && submission.classroomId === classroomItem.id
        && submission.labId === lab.id
        && labWorkspaceIds.has(submission.workspaceId))
      .map(async (submission) => {
        const judgment = submission.latestJudgmentId
          ? await grading.getJudgment(submission.latestJudgmentId)
          : null;
        return codeSubmissionView(submission, judgment, user.role);
      }));
    items.sort((left, right) => Date.parse(right.acceptedAt) - Date.parse(left.acceptedAt));
    sendJson(response, 200, { items });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'labs' && !parts[5] && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!isAssignedLecturer(classroomItem)) deny();
    const selectedTerm = term(classroomItem.termId);
    if (!isAcademicTermActive(selectedTerm)) {
      throw apiError(409, 'TERM_INACTIVE', 'Chỉ có thể tạo LAB trong academic term đang active.');
    }
    const body = await readRequestBody(request);
    const publishedVersions = publishedAssignmentVersions(classroomItem.id);
    validateLabInput(body, publishedVersions, selectedTerm, apiError);
    const now = new Date().toISOString();
    const labId = body.id ?? `lab-${Date.now()}`;
    const item = {
      id: labId,
      classroomId: classroomItem.id,
      termId: classroomItem.termId,
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      startAt: new Date(body.startAt).toISOString(),
      endAt: new Date(body.endAt).toISOString(),
      status: 'SCHEDULED',
      stateVersion: 0,
      createdBy: user.email,
      createdAt: now,
      updatedAt: now,
      assignments: body.assignments.map((selection, index) => {
        const version = publishedVersions.find((candidate) => candidate.id === selection.assignmentVersionId);
        const { openAt, closeAt } = practiceWindowValues(selection);
        return {
          id: `lab-assignment-${labId}-${index + 1}`,
          assignmentId: version.assignmentId,
          assignmentVersionId: version.id,
          version: version.version,
          title: version.title,
          description: version.description ?? '',
          language: version.language ?? 'PYTHON',
          starterCode: version.starterCode ?? '',
          hints: structuredClone(version.hints ?? []),
          order: index + 1,
          mandatory: Boolean(selection.mandatory),
          openAt: new Date(openAt).toISOString(),
          closeAt: new Date(closeAt).toISOString(),
          open_at: new Date(openAt).toISOString(),
          close_at: new Date(closeAt).toISOString(),
          practiceStartAt: new Date(openAt).toISOString(),
          practiceEndAt: new Date(closeAt).toISOString(),
          practiceWindowStatus: 'OPEN',
          practiceWindowVersion: 0,
          manualCloseAt: null,
          manualCloseBy: null,
          lastReopenedAt: null,
          lastReopenedBy: null,
        };
      }),
    };
    await mutate(labFile, initialLabs, (records) => { records.push(item); return item; });
    await mutate(practiceWindowAuditFile, initialPracticeWindowAudit, (records) => {
      for (const assignment of item.assignments) {
        records.push({
          id: `practice-window-audit-${Date.now()}-${assignment.id}`,
          action: 'CREATE',
          classroomId: classroomItem.id,
          labId: item.id,
          labAssignmentId: assignment.id,
          actorEmail: user.email,
          actorRole: user.role,
          occurredAt: now,
          before: null,
          after: {
            openAt: assignment.openAt,
            closeAt: assignment.closeAt,
            status: assignment.practiceWindowStatus,
          },
        });
      }
      return true;
    });
    const activeStudents = memberships.filter((member) =>
      belongsToClassroom(member, classroomItem.id) && isActiveMembership(member));
    await mutate(workspaceFile, initialWorkspaces, (records) => {
      for (const member of activeStudents) {
        const ownerEmail = member.studentEmail ?? member.userEmail;
        for (const assignment of item.assignments) {
          records.push({
            id: `workspace-${item.id}-${assignment.id}-${member.id}`,
            classroomId: classroomItem.id,
            termId: classroomItem.termId,
            labId: item.id,
            labAssignmentId: assignment.id,
            assignmentId: assignment.assignmentId,
            assignmentVersionId: assignment.assignmentVersionId,
            ownerEmail,
            sourceCode: assignment.starterCode,
            executionResult: null,
            hintProgress: [],
            updatedAt: now,
          });
        }
      }
      return true;
    });
    sendJson(response, 201, { item });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'labs' && parts[5] && request.method === 'PATCH') {
    const classroomItem = classroom(parts[3]);
    if (!isAssignedLecturer(classroomItem)) deny();
    const current = labs.find((item) => item.id === parts[5] && item.classroomId === classroomItem.id) ?? notFound();
    const body = await readRequestBody(request);
    const requestedStatus = body.status ?? body.patch?.status;
    if (!LAB_STATUSES.has(requestedStatus)) throw apiError(400, 'INVALID_STATUS', 'LAB status is invalid.');
    const expectedStateVersion = body.expectedStateVersion ?? body.patch?.expectedStateVersion;
    if (expectedStateVersion === undefined) {
      throw apiError(400, 'STATE_VERSION_REQUIRED', 'expectedStateVersion is required to transition a LAB state.');
    }
    if (!Number.isInteger(expectedStateVersion) || expectedStateVersion < 0) {
      throw apiError(400, 'INVALID_STATE_VERSION', 'expectedStateVersion must be a non-negative integer.');
    }
    if (!isAcademicTermActive(term(classroomItem.termId))) {
      throw apiError(409, 'TERM_INACTIVE', 'LAB state chỉ được thay đổi trong academic term đang active.');
    }
    const updated = await mutate(labFile, initialLabs, (records) => {
      const latest = records.find((record) => record.id === current.id && record.classroomId === classroomItem.id) ?? notFound();
      const latestVersion = Number.isInteger(latest.stateVersion) ? latest.stateVersion : 0;
      if (expectedStateVersion !== latestVersion) {
        throw apiError(409, 'STALE_LAB_STATE', 'LAB state đã được giảng viên khác cập nhật. Hãy tải lại trạng thái mới nhất.');
      }
      if (!LAB_TRANSITIONS[latest.status]?.has(requestedStatus)) {
        throw apiError(409, 'INVALID_STATUS_TRANSITION', `LAB cannot move from ${latest.status} to ${requestedStatus}.`);
      }
      Object.assign(latest, {
        status: requestedStatus,
        stateVersion: latestVersion + 1,
        updatedAt: new Date().toISOString(),
      });
      return latest;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'classrooms' && parts[4] === 'dashboard' && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!isDsaManager(item)) deny();
    sendJson(response, 200, { classroom: item, activeMembers: memberships.filter((member) =>
      belongsToClassroom(member, item.id) && isActiveMembership(member)).length });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'workspace' && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (user.role !== 'student' || !canAccessClass(classroomItem)) deny();

    const assignmentId = requestUrl.searchParams.get('assignmentId');
    const requestedLabId = requestUrl.searchParams.get('labId');
    const requestedLabAssignmentId = requestUrl.searchParams.get('labAssignmentId');
    const practiceContext = labAssignmentContext({
      classroomId: classroomItem.id,
      labId: requestedLabId,
      labAssignmentId: requestedLabAssignmentId,
      assignmentId,
    });
    if (requestedLabId || requestedLabAssignmentId) {
      if (!practiceContext) notFound();
      if (assignmentId && practiceContext.labAssignment.assignmentId !== assignmentId) notFound();
    }
    const selectedAssignmentId = practiceContext?.labAssignment.assignmentId ?? assignmentId;
    const assignment = assignments.find((item) =>
      item.id === selectedAssignmentId && item.classroomId === classroomItem.id
      && (practiceContext || item.status === 'PUBLISHED'));
    if (!assignment) notFound();

    const currentWorkspaces = await readRecords(workspaceFile, initialWorkspaces);
    let workspace = currentWorkspaces.find((item) =>
      item.classroomId === classroomItem.id
      && (!practiceContext
        ? item.assignmentId === assignment.id && !item.labAssignmentId
        : item.labId === practiceContext.lab.id && item.labAssignmentId === practiceContext.labAssignment.id)
      && item.ownerEmail === user.email);

    if (!workspace) {
      workspace = {
        id: `workspace-${Date.now()}`,
        classroomId: classroomItem.id,
        assignmentId: assignment.id,
        termId: classroomItem.termId,
        ownerEmail: user.email,
        sourceCode: '',
        revision: 0,
        revisions: [],
        ...(practiceContext
          ? {
            labId: practiceContext.lab.id,
            labAssignmentId: practiceContext.labAssignment.id,
            assignmentVersionId: practiceContext.labAssignment.assignmentVersionId,
          }
          : {}),
      };
      await mutate(workspaceFile, initialWorkspaces, (records) => {
        records.push(workspace);
        return workspace;
      });
    }

    sendJson(response, 200, {
      item: workspaceView(workspace, workspaceContext(workspace)),
      ...(practiceContext ? {
        practiceWindow: {
          ...practiceContext.labAssignment,
          ...practiceAccessView(practiceContext.lab, practiceContext.labAssignment),
        },
      } : {}),
    });
    return;
  }

  const isAssignmentRoute = parts[2] === 'classrooms'
    && parts[3]
    && ['problems', 'assignments'].includes(parts[4]);

  if (isAssignmentRoute && parts[5] && parts[6] === 'submissions'
    && (request.method === 'GET' || request.method === 'POST')) {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const assignment = assignments.find((record) =>
      record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    if (user.role !== 'student' || assignment.status !== 'PUBLISHED') {
      if (user.role === 'student') notFound();
      deny();
    }

    if (request.method === 'GET') {
      const submissions = await readStudentSubmissions(user.email);
      sendJson(response, 200, {
        items: submissions
          .filter((submission) => submission.assignmentId === assignment.id)
          .map(submissionView),
      });
      return;
    }

    await executions.runTermTask(classroomItem.termId, async () => {
    const body = await readRequestBody(request);
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode : '';
    if (!sourceCode.trim()) throw apiError(400, 'SOURCE_CODE_REQUIRED', 'Hãy nhập code trước khi submit.');
    if (sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      throw apiError(413, 'SOURCE_CODE_TOO_LARGE', `Code không được vượt quá ${MAX_SOURCE_CODE_LENGTH} ký tự.`);
    }
    const practiceContext = labAssignmentContext({ classroomId: classroomItem.id, assignmentId: assignment.id });
    if (practiceContext) {
      studentPracticeAccess(practiceContext);
      throw apiError(400, 'LAB_CONTEXT_REQUIRED', 'Use the LAB submission endpoint for an assigned problem.');
    }
    const version = latestPublishedAssignmentVersion(assignment);
    const submission = await gradeSubmission({ assignment, version, sourceCode });
    const savedWorkspaces = await readRecords(workspaceFile, initialWorkspaces);
    const existingWorkspace = savedWorkspaces.find((item) => item.classroomId === classroomItem.id
      && item.assignmentId === assignment.id
      && !item.labId
      && item.ownerEmail === user.email);
    const targetWorkspace = assessmentWorkspace({
      workspace: existingWorkspace,
      classroomId: classroomItem.id,
      assignmentId: assignment.id,
      assignmentVersionId: version.id,
      ownerEmail: user.email,
    });
    try {
      const snapshot = await recordWorkspaceSnapshot({ workspace: targetWorkspace, trigger: 'SUBMIT', sourceCode, assignmentVersionId: version.id });
      await enqueueAssessment({
        workspace: targetWorkspace,
        snapshot,
        assignmentVersion: version,
        milestone: 'SUBMIT',
        submissionId: submission.id,
        execution: assessmentExecutionSummary({
          id: submission.id,
          state: 'FINISHED',
          status: submission.results.some((result) => !result.passed) ? 'COMPLETED_WITH_FAILURES' : 'SUCCESS',
          mode: 'SUBMISSION',
          runtime: version.runtime,
          results: submission.results,
          stdout: '',
          stderr: '',
        }),
      });
    } catch (error) {
      console.error(`CodePulse submission snapshot was unavailable (${error?.code ?? 'SNAPSHOT_WRITE_ERROR'}).`);
    }
    sendJson(response, 201, { item: submissionView(submission) });
    });
    return;
  }

  if (parts[2] === 'classrooms'
    && parts[3]
    && parts[4] === 'labs'
    && parts[5]
    && parts[6] === 'assignments'
    && parts[7]
    && parts[8] === 'submit'
    && request.method === 'POST') {
    if (user.role !== 'student') deny();
    const classroomItem = classroom(parts[3]);
    rejectResetBlockedTerm(classroomItem.termId);
    if (!canAccessClass(classroomItem)) deny();
    await executions.runTermTask(classroomItem.termId, async () => {
    const practiceContext = labAssignmentContext({
      classroomId: classroomItem.id,
      labId: parts[5],
      labAssignmentId: parts[7],
    });
    if (!practiceContext) notFound();
    const practiceAccess = studentPracticeAccess(practiceContext);
    const assignment = assignments.find((record) =>
      record.id === practiceContext.labAssignment.assignmentId
      && record.classroomId === classroomItem.id) ?? notFound();
    const body = await readRequestBody(request);
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) =>
      item.classroomId === classroomItem.id
      && item.labId === practiceContext.lab.id
      && item.labAssignmentId === practiceContext.labAssignment.id
      && item.ownerEmail === user.email);
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode : workspace?.sourceCode;
    if (!sourceCode?.trim()) throw apiError(400, 'SOURCE_CODE_REQUIRED', 'Hãy lưu hoặc nhập code trước khi nộp bài.');
    if (sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      throw apiError(413, 'SOURCE_CODE_TOO_LARGE', `Code không được vượt quá ${MAX_SOURCE_CODE_LENGTH} ký tự.`);
    }
    const acceptedAt = practiceAccess.acceptedAt;
    if (workspace && workspace.sourceCode !== sourceCode) {
      const baseRevision = Number.isInteger(workspace.revision) ? workspace.revision : 0;
      await mutate(workspaceFile, initialWorkspaces, (records) => {
        const current = records.find((record) => record.id === workspace.id) ?? notFound();
        return writeWorkspaceRevision(current, sourceCode, baseRevision, acceptedAt);
      }, { durable: true });
    }
    const version = resolvePublishedAssignmentVersion(assignment, practiceContext.labAssignment.assignmentVersionId);
    const submission = await gradeSubmission({
      assignment,
      version,
      sourceCode,
      submittedAt: acceptedAt,
      metadata: {
        classroomId: classroomItem.id,
        termId: classroomItem.termId,
        labId: practiceContext.lab.id,
        labAssignmentId: practiceContext.labAssignment.id,
        ownerEmail: user.email,
        acceptedAt,
        receivedAt: acceptedAt,
        activityContext: practiceAccess.activityContext,
        status: 'GRADED',
        aiAnalysis: { status: 'QUEUED', queuedAt: acceptedAt, outsideLabSupported: true },
        notification: { type: 'SUBMISSION_RECEIVED', status: 'QUEUED', queuedAt: acceptedAt },
      },
    });
    await mutate(submissionFile, initialCodePulseSubmissions, (records) => {
      records.push(submission);
      return submission;
    });
    const targetWorkspace = assessmentWorkspace({
      workspace,
      classroomId: classroomItem.id,
      assignmentId: assignment.id,
      assignmentVersionId: version.id,
      ownerEmail: user.email,
      labId: practiceContext.lab.id,
      labAssignmentId: practiceContext.labAssignment.id,
    });
    try {
      const snapshot = await recordWorkspaceSnapshot({ workspace: targetWorkspace, trigger: 'SUBMIT', sourceCode, assignmentVersionId: version.id });
      await enqueueAssessment({
        workspace: targetWorkspace,
        snapshot,
        assignmentVersion: version,
        milestone: 'SUBMIT',
        submissionId: submission.id,
        execution: assessmentExecutionSummary({
          id: submission.id,
          state: 'FINISHED',
          status: submission.results.some((result) => !result.passed) ? 'COMPLETED_WITH_FAILURES' : 'SUCCESS',
          mode: 'SUBMISSION',
          runtime: version.runtime,
          results: submission.results,
          stdout: '',
          stderr: '',
        }),
      });
    } catch (error) {
      console.error(`CodePulse submission snapshot was unavailable (${error?.code ?? 'SNAPSHOT_WRITE_ERROR'}).`);
    }
    await recordActivity({
      type: 'SUBMIT',
      context: practiceContext,
      activityAt: acceptedAt,
      metadata: {
        assignmentId: assignment.id,
        activityContext: practiceAccess.activityContext,
        submissionId: submission.id,
        passedCount: submission.passedCount,
        totalCount: submission.totalCount,
      },
    });
    sendJson(response, 201, { item: { ...submission, ...submissionView(submission) } });
    });
    return;
  }

  if (parts[2] === 'classrooms'
    && parts[3]
    && parts[4] === 'labs'
    && parts[5]
    && parts[6] === 'assignments'
    && parts[7]
    && parts[8] === 'submissions'
    && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const practiceContext = labAssignmentContext({
      classroomId: classroomItem.id,
      labId: parts[5],
      labAssignmentId: parts[7],
    });
    if (!practiceContext) notFound();
    const records = await readRecords(submissionFile, initialCodePulseSubmissions);
    const items = records.filter((item) =>
      item.classroomId === classroomItem.id
      && item.labId === practiceContext.lab.id
      && item.labAssignmentId === practiceContext.labAssignment.id
      && (user.role !== 'student' || item.ownerEmail === user.email));
    sendJson(response, 200, { items: user.role === 'student'
      ? items.map((item) => ({ ...item, ...submissionView(item) }))
      : items });
    return;
  }

  if (parts[2] === 'practice-activities' && request.method === 'GET') {
    if (!['admin', 'lecturer'].includes(user.role)) deny();
    const records = await readRecords(activityFile, initialCodePulseActivities);
    const classroomId = requestUrl.searchParams.get('classroomId');
    const labId = requestUrl.searchParams.get('labId');
    sendJson(response, 200, {
      items: records.filter((item) => (!classroomId || item.classroomId === classroomId) && (!labId || item.labId === labId)),
    });
    return;
  }

  if (parts[2] === 'executions' && request.method === 'GET') {
    if (!['student', 'lecturer'].includes(user.role)) deny();
    const visible = (await executions.list()).filter((execution) => {
      const item = classrooms.find((candidate) => candidate.id === execution.classroomId);
      if (!item) return false;
      return user.role === 'student'
        ? execution.ownerEmail === user.email && isMember(item.id)
        : isDsaManager(item);
    });
    if (parts[3]) {
      const item = visible.find((execution) => execution.id === parts[3]) ?? notFound();
      sendJson(response, 200, { item });
    } else {
      const matches = visible.filter((execution) =>
        (!requestUrl.searchParams.has('workspaceId') || execution.workspaceId === requestUrl.searchParams.get('workspaceId'))
        && (!requestUrl.searchParams.has('classroomId') || execution.classroomId === requestUrl.searchParams.get('classroomId'))).reverse();
      const before = requestUrl.searchParams.get('before');
      const cursor = before ? matches.findIndex((execution) => execution.id === before) : -1;
      if (before && cursor === -1) throw apiError(400, 'INVALID_CURSOR', 'Invalid execution history cursor.');
      const items = matches.slice(cursor + 1, cursor + 101);
      sendJson(response, 200, { items,
        nextCursor: cursor + 101 < matches.length ? items.at(-1).id : null });
    }
    return;
  }

  if (isAssignmentRoute && parts[5] && parts[6] === 'run' && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const assignment = assignments.find((record) =>
      record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const practiceContext = labAssignmentContext({
      classroomId: classroomItem.id,
      labId: requestUrl.searchParams.get('labId'),
      labAssignmentId: requestUrl.searchParams.get('labAssignmentId'),
      assignmentId: assignment.id,
    });
    if (requestUrl.searchParams.has('labId') || requestUrl.searchParams.has('labAssignmentId')) {
      if (!practiceContext || practiceContext.labAssignment.assignmentId !== assignment.id) notFound();
    }
    if (user.role === 'student' && !practiceContext && assignment.status !== 'PUBLISHED') notFound();
    const practiceAccess = practiceContext ? studentPracticeAccess(practiceContext) : null;
    const gradingAssignment = practiceContext
      ? resolvePublishedAssignmentVersion(assignment, practiceContext.labAssignment.assignmentVersionId)
      : assignment.status === 'PUBLISHED' ? latestPublishedAssignmentVersion(assignment) : assignment;
    if (!ALLOWED_RUNTIMES.has(gradingAssignment.runtime)) {
      throw apiError(422, 'UNSUPPORTED_RUNTIME', 'Assignment chưa có runtime được hỗ trợ để chạy.');
    }

    const body = await readRequestBody(request);
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const savedWorkspace = workspaces.find((item) =>
      item.classroomId === classroomItem.id
      && item.assignmentId === assignment.id
      && (!practiceContext
        ? !item.labAssignmentId
        : item.labId === practiceContext.lab.id && item.labAssignmentId === practiceContext.labAssignment.id)
      && item.ownerEmail === user.email);
    const sourceCode = typeof body.sourceCode === 'string'
      ? body.sourceCode
      : savedWorkspace?.sourceCode;
    if (!sourceCode?.trim()) throw apiError(400, 'SOURCE_CODE_REQUIRED', 'Hãy lưu hoặc nhập code trước khi chạy.');
    if (sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      throw apiError(413, 'SOURCE_CODE_TOO_LARGE', `Code không được vượt quá ${MAX_SOURCE_CODE_LENGTH} ký tự.`);
    }

    const queued = await executions.enqueue({ assignment: gradingAssignment, sourceCode, body,
      assignmentId: assignment.id, classroomId: classroomItem.id, termId: classroomItem.termId, ownerEmail: user.email,
      workspaceId: savedWorkspace?.id ?? null, labId: practiceContext?.lab.id ?? null,
      labAssignmentId: practiceContext?.labAssignment.id ?? null });
    if (user.role === 'student' && gradingAssignment.status === 'PUBLISHED') await markAssignmentVersionUsed(gradingAssignment.id);
    const execution = await queued.completion;
    if (user.role === 'student') {
      const workspace = assessmentWorkspace({
        workspace: savedWorkspace,
        classroomId: classroomItem.id,
        assignmentId: assignment.id,
        assignmentVersionId: gradingAssignment.id,
        ownerEmail: user.email,
        labId: practiceContext?.lab.id ?? null,
        labAssignmentId: practiceContext?.labAssignment.id ?? null,
      });
      try {
        const snapshot = await recordWorkspaceSnapshot({ workspace, trigger: 'RUN', sourceCode, assignmentVersionId: gradingAssignment.id });
        await enqueueAssessment({
          workspace,
          snapshot,
          assignmentVersion: gradingAssignment,
          milestone: 'RUN',
          executionId: execution.id,
          execution: assessmentExecutionSummary(execution),
        });
      } catch (error) {
        console.error(`CodePulse run snapshot was unavailable (${error?.code ?? 'SNAPSHOT_WRITE_ERROR'}).`);
      }
    }
    await recordActivity({ type: 'RUN', context: practiceContext, activityAt: practiceAccess?.acceptedAt,
      metadata: { assignmentId: assignment.id, activityContext: practiceAccess?.activityContext ?? null,
        executionId: execution.id, executionStatus: execution.status,
        passedCount: execution.passedCount, totalCount: execution.totalCount,
        systemError: execution.status === 'INTERNAL_ERROR' } });
    sendJson(response, 200, { item: execution });
    return;
  }

  if (isAssignmentRoute && !parts[5] && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!canAccessClass(item)) deny();
    const studentPreview = requestUrl.searchParams.get('view') === 'student';
    const visibleAssignments = assignments
      .filter((assignment) => assignment.classroomId === item.id)
      .filter((assignment) => (!studentPreview && user.role !== 'student') || assignment.status === 'PUBLISHED')
      .map((assignment) => publicAssignment(assignment, studentPreview || user.role === 'student' ? 'student' : user.role));
    sendJson(response, 200, { items: visibleAssignments });
    return;
  }

  if (isAssignmentRoute && !parts[5] && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const body = await readRequestBody(request);
    const item = {
      id: body.id ?? `assignment-${Date.now()}`,
      classroomId: classroomItem.id,
      ...normalizeAssignmentInput(body),
      status: 'DRAFT',
      verificationStatus: 'UNVERIFIED',
      verifiedAt: null,
      verifiedBy: null,
    };
    await mutate(assignmentFile, initialAssignments, (records) => { records.push(item); return item; });
    sendJson(response, 201, { item });
    return;
  }

  if (isAssignmentRoute && parts[5] && parts[6] === 'verify' && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const body = await readRequestBody(request);
    const referenceSolution = typeof body.referenceSolution === 'string'
      ? body.referenceSolution.trim()
      : current.referenceSolution;
    const verificationErrors = {};
    if (!referenceSolution) verificationErrors.referenceSolution = 'Reference solution là bắt buộc.';
    if (!current.testCases.length) verificationErrors.testCases = 'Cần ít nhất một test case để verify.';
    current.testCases.forEach((test, index) => {
      if (typeof test.expectedOutput !== 'string') verificationErrors[`testCases.${index}.expectedOutput`] = 'Expected output phải là chuỗi.';
    });
    if (Object.keys(verificationErrors).length > 0) throw validationError(apiError, verificationErrors);
    const updated = await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      stored.referenceSolution = referenceSolution;
      stored.testCases = stored.testCases.map((test) => ({ ...test, verified: true }));
      stored.verificationStatus = 'VERIFIED';
      stored.verifiedAt = new Date().toISOString();
      stored.verifiedBy = user.email;
      return stored;
    });
    sendJson(response, 200, { item: updated, verification: { status: 'VERIFIED', testCaseCount: updated.testCases.length } });
    return;
  }

  if (isAssignmentRoute && parts[5] && !parts[6] && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const assignment = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    if (user.role === 'student' && assignment.status !== 'PUBLISHED') notFound();
    sendJson(response, 200, { item: publicAssignment(assignment, user.role) });
    return;
  }

  if (isAssignmentRoute && parts[5] && !parts[6] && request.method === 'PATCH') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const body = await readRequestBody(request);
    const patch = normalizeAssignmentPatch(body.patch ?? body);
    const updated = { ...current, ...patch, classroomId: current.classroomId, status: current.status };
    const contentChanged = Object.keys(patch).some((field) =>
      JSON.stringify(current[field]) !== JSON.stringify(patch[field]));
    if (contentChanged) {
      if (current.status === 'PUBLISHED') {
        const previousVersion = assignmentVersions
          .filter((version) => version.assignmentId === current.id && version.status === 'PUBLISHED')
          .sort((left, right) => Number(right.version) - Number(left.version))[0];
        if (previousVersion && !Array.isArray(previousVersion.testCases)) {
          await mutate(assignmentVersionFile, initialAssignmentVersions, (records) => {
            const storedVersion = records.find((record) => record.id === previousVersion.id);
            if (storedVersion && !Array.isArray(storedVersion.testCases)) {
              Object.assign(storedVersion, assignmentSnapshot(current, previousVersion.version, previousVersion.id, {
                publishedAt: previousVersion.publishedAt,
                giteaRepository: previousVersion.giteaRepository,
                giteaBranch: previousVersion.giteaBranch,
              }));
            }
            return storedVersion;
          });
        }
      }
      updated.status = 'DRAFT';
      updated.verificationStatus = 'UNVERIFIED';
      updated.verifiedAt = null;
      updated.verifiedBy = null;
      updated.testCases = updated.testCases.map((test) => ({ ...test, verified: false }));
    }
    await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      Object.assign(stored, updated);
      return stored;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && request.method === 'DELETE') {
    if (user.role !== 'admin') deny();
    const current = term(parts[3]);
    if (current.courseId !== requestedCourseId) notFound();
    if (['RESETTING', 'RESETDONE'].includes(current.status)) {
      throw apiError(409, 'TERM_RESET_LOCKED', 'A term in reset or completed reset state cannot be deleted.');
    }
    if (classrooms.some((classroomItem) => classroomItem.termId === current.id)) {
      throw apiError(409, 'TERM_IN_USE', 'Không thể xóa term đang được classroom sử dụng.');
    }
    await mutate(termFile, initialTerms, (records) => {
      const index = records.findIndex((record) => record.id === current.id);
      if (index < 0) notFound();
      records.splice(index, 1);
      return current;
    });
    sendJson(response, 200, { deleted: true, item: current });
    return;
  }

  if (isAssignmentRoute && parts[5] && !parts[6] && request.method === 'DELETE') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    await mutate(assignmentFile, initialAssignments, (records) => {
      const index = records.findIndex((record) => record.id === current.id);
      if (index < 0) notFound();
      records.splice(index, 1);
      return true;
    });
    sendJson(response, 200, { deleted: true, item: current });
    return;
  }

  if (isAssignmentRoute && parts[5] && parts[6] === 'publish' && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const errors = validatePublishableAssignment(current);
    if (Object.keys(errors).length > 0) throw validationError(apiError, errors);
    if (current.status === 'PUBLISHED') {
      sendJson(response, 200, { item: current });
      return;
    }
    let versionSnapshot;
    try {
      versionSnapshot = await preparePublishedVersion(current, assignmentVersions);
    } catch (error) {
      console.error('Unable to publish CodePulse version:', error);
      throw apiError(502, 'VERSION_PUBLISH_FAILED', 'Could not create the assignment version in Gitea.');
    }
    await mutate(assignmentVersionFile, initialAssignmentVersions, (records) => {
      if (!records.some((record) => record.id === versionSnapshot.id)) records.push(versionSnapshot);
      return versionSnapshot;
    });
    const updated = await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      stored.status = 'PUBLISHED';
      return stored;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  
  if (parts[2] === 'workspaces' && parts[3] && parts[4] === 'status' && request.method === 'GET') {
    if (user.role === 'admin') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const item = classroom(workspace.classroomId);
    const context = workspaceContext(workspace);
    if (workspace.termId !== item.termId) deny();
    const isOwner = user.role === 'student' && workspace.ownerEmail === user.email && isMember(item.id);
    const lecturerCanRead = isDsaManager(item) && memberships.some((member) =>
      belongsToClassroom(member, item.id) &&
      (member.studentEmail ?? member.userEmail) === workspace.ownerEmail &&
      isActiveMembership(member));
    if (!isOwner && !lecturerCanRead) deny();

    const snapshots = await readRecords(snapshotFile, initialSnapshots);
    const workspaceSnapshots = snapshots.filter((s) => s.workspaceId === workspace.id);
    const lastSnapshot = workspaceSnapshots[workspaceSnapshots.length - 1];

    sendJson(response, 200, {
      item: {
        workspaceId: workspace.id,
        revision: workspace.revision ?? 0,
        updatedAt: workspace.updatedAt ?? null,
        lastSnapshotHash: lastSnapshot?.hash ?? null,
        snapshotCount: workspaceSnapshots.length,
      },
    });
    return;
  }

  if (parts[2] === 'workspaces' && parts[3] && parts[4] === 'snapshots') {
    if (user.role === 'admin') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const item = classroom(workspace.classroomId);
    const context = workspaceContext(workspace);
    if (workspace.termId !== item.termId) deny();
    const isOwner = user.role === 'student' && workspace.ownerEmail === user.email && isMember(item.id);
    const lecturerCanRead = isDsaManager(item) && memberships.some((member) =>
      belongsToClassroom(member, item.id) &&
      (member.studentEmail ?? member.userEmail) === workspace.ownerEmail &&
      isActiveMembership(member));
    if (!isOwner && !lecturerCanRead) deny();

    if (request.method === 'GET') {
      const snapshots = await readRecords(snapshotFile, initialSnapshots);
      const items = snapshots.filter((s) => s.workspaceId === workspace.id);
      sendJson(response, 200, { items });
      return;
    }

    if (request.method === 'POST') {
      if (!isOwner) deny();
      const access = assertWorkspaceWritable(workspace, context);
      const body = await readRequestBody(request);
      const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode : workspace.sourceCode;
      const snapshot = await executions.runTermTask(item.termId, () => recordWorkspaceSnapshot({
        workspace,
        trigger: body.trigger || 'MANUAL',
        sourceCode,
        assignmentId: context.labAssignment?.assignmentId ?? workspace.assignmentId,
        assignmentVersionId: context.labAssignment?.assignmentVersionId ?? workspace.assignmentVersionId,
      }));
      sendJson(response, 201, { item: snapshot });
      return;
    }

    // Immutability rule: Snapshots cannot be updated or deleted
    if (['PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      throw apiError(405, 'SNAPSHOTS_IMMUTABLE', 'Snapshots are immutable and cannot be modified or deleted.');
    }
  }

  if (parts[2] === 'workspaces' && parts[3] && !parts[4] && (request.method === 'GET' || request.method === 'PATCH')) {
    if (user.role === 'admin') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const item = classroom(workspace.classroomId);
    const context = workspaceContext(workspace);
    if (workspace.termId !== item.termId) deny();
    const isOwner = user.role === 'student' && workspace.ownerEmail === user.email && isMember(item.id);
    const lecturerCanRead = isDsaManager(item) && memberships.some((member) =>
      belongsToClassroom(member, item.id) &&
      (member.studentEmail ?? member.userEmail) === workspace.ownerEmail &&
      isActiveMembership(member));
    if (request.method === 'GET') {
      if (!isOwner && !lecturerCanRead) deny();
      sendJson(response, 200, {
        item: workspaceView(workspace, context),
        ...(context.labAssignment ? {
          practiceWindow: labView(context.lab).assignments.find((assignment) => assignment.id === context.labAssignment.id),
        } : {}),
      });
      return;
    }
    if (!isOwner) deny();
    const access = assertWorkspaceWritable(workspace, context);
    const updated = await executions.runTermTask(item.termId, async () => {
    if (item.status === 'ARCHIVED') throw apiError(409, 'CLASSROOM_ARCHIVED', 'Classroom đã được lưu trữ và chỉ đọc.');
    const body = await readRequestBody(request);
    if (typeof body.sourceCode !== 'string') throw apiError(400, 'INVALID_INPUT', 'sourceCode phải là chuỗi.');
    if (body.sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      throw apiError(413, 'SOURCE_CODE_TOO_LARGE', `Code không được vượt quá ${MAX_SOURCE_CODE_LENGTH} ký tự.`);
    }
    const baseRevision = requireBaseRevision(body);
    const savedAt = new Date().toISOString();
    const savedWorkspace = await mutate(workspaceFile, initialWorkspaces, (records) => {
      const current = records.find((record) => record.id === workspace.id) ?? notFound();
      return writeWorkspaceRevision(current, body.sourceCode, baseRevision, savedAt);
    }, { durable: true });
    const assessmentVersion = resolveWorkspaceAssessmentVersion(savedWorkspace, context);
    const snapshot = await recordWorkspaceSnapshot({
      workspace: savedWorkspace,
      trigger: 'SAVE',
      sourceCode: body.sourceCode,
      assignmentId: context.labAssignment?.assignmentId ?? workspace.assignmentId,
      assignmentVersionId: assessmentVersion?.id,
    });
    await enqueueAssessment({
      workspace: savedWorkspace,
      snapshot,
      assignmentVersion: assessmentVersion,
      milestone: 'SAVE',
    });
    if (access) {
      await recordActivity({
        type: 'SAVE',
        context: access.practiceContext,
        activityAt: access.practiceAccess.acceptedAt,
        metadata: {
          assignmentId: context.labAssignment?.assignmentId ?? workspace.assignmentId,
          activityContext: access.practiceAccess.activityContext,
          workspaceId: workspace.id,
        },
      });
    }
    return savedWorkspace;
    });
    sendJson(response, 200, { item: workspaceView(updated, context) });
    return;
  }

  if (parts[2] === 'workspaces' && parts[3] && parts[4] === 'submissions'
    && (request.method === 'POST' || request.method === 'GET')) {
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const context = workspaceContext(workspace);
    const isOwner = user.role === 'student'
      && normalizeEmail(workspace.ownerEmail) === normalizeEmail(user.email)
      && isMember(context.classroomItem.id);
    const lecturerCanRead = isDsaManager(context.classroomItem);

    if (request.method === 'GET') {
      if (!isOwner && !lecturerCanRead) deny();
      const records = await readSubmissions();
      const submissions = records
        .filter((record) => record.kind === 'CODE_SUBMISSION' && record.workspaceId === workspace.id);
      const items = await Promise.all(submissions.map(async (submission) => {
        const judgment = submission.latestJudgmentId
          ? await grading.getJudgment(submission.latestJudgmentId)
          : null;
        return codeSubmissionView(submission, judgment, user.role);
      }));
      sendJson(response, 200, { items });
      return;
    }

    if (!isOwner) deny();
    if (workspace.termId !== context.classroomItem.termId) deny();
    rejectResetBlockedTerm(workspace.termId);
    const body = await readRequestBody(request);
    const requestKey = validateRequestKey(body.requestKey);
    if (typeof body.sourceCode !== 'string') {
      throw apiError(400, 'INVALID_INPUT', 'sourceCode must be a string.');
    }
    if (!body.sourceCode.trim()) {
      throw apiError(422, 'EMPTY_SOURCE_CODE', 'Source code cannot be empty.');
    }
    if (body.sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      throw apiError(413, 'SOURCE_CODE_TOO_LARGE', `Code cannot exceed ${MAX_SOURCE_CODE_LENGTH} characters.`);
    }
    if (!context.lab || !context.labAssignment) {
      throw apiError(409, 'LAB_CONTEXT_REQUIRED', 'Official submission requires a LAB problem workspace.');
    }
    const assignmentId = context.labAssignment.assignmentId;
    if (body.assignmentVersionId !== undefined
      && body.assignmentVersionId !== context.labAssignment.assignmentVersionId) {
      throw apiError(409, 'ASSIGNMENT_VERSION_MISMATCH', 'The requested problem version is not pinned to this workspace.');
    }

    const result = await executions.runTermTask(workspace.termId, async () => {
    const requestReceivedAt = new Date();
    const membership = memberships.find((member) =>
      belongsToClassroom(member, context.classroomItem.id)
      && normalizeEmail(member.studentEmail ?? member.userEmail) === normalizeEmail(user.email)
      && isActiveMembership(member));
    if (!membership) deny();

    const canonicalPayload = JSON.stringify({
      workspaceId: workspace.id,
      classroomId: workspace.classroomId,
      labId: workspace.labId,
      labAssignmentId: workspace.labAssignmentId,
      assignmentId,
      assignmentVersionId: context.labAssignment.assignmentVersionId,
      sourceCode: body.sourceCode,
    });
    const pinnedAssignment = assignments.find((assignment) =>
      assignment.id === assignmentId
      && assignment.classroomId === workspace.classroomId) ?? notFound();
    const pinnedGradingVersion = resolvePublishedAssignmentVersion(
      pinnedAssignment,
      context.labAssignment.assignmentVersionId,
    );
    const payloadHash = createHash('sha256').update(canonicalPayload).digest('hex');
    const result = await mutateSubmissions((records) => {
      const existing = records.find((record) =>
        record.kind === 'CODE_SUBMISSION'
        && normalizeEmail(record.student.email) === normalizeEmail(user.email)
        && record.requestKey === requestKey);
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          throw apiError(409, 'IDEMPOTENCY_CONFLICT', 'This requestKey was already accepted with a different payload.');
        }
        return { submission: existing, created: false };
      }

      assertActiveSubmissionWindow(context, requestReceivedAt);
      const submission = {
        kind: 'CODE_SUBMISSION',
        id: `submission-${randomUUID()}`,
        courseId: String(context.classroomItem.courseId),
        termId: workspace.termId,
        classroomId: workspace.classroomId,
        labId: workspace.labId,
        labAssignmentId: workspace.labAssignmentId,
        assignmentId,
        assignmentVersionId: context.labAssignment.assignmentVersionId,
        assignmentVersion: {
          id: context.labAssignment.assignmentVersionId,
          assignmentId: context.labAssignment.assignmentId,
          version: context.labAssignment.version,
          title: context.labAssignment.title,
          language: context.labAssignment.language ?? 'PYTHON',
        },
        // Server-only immutable snapshot. codeSubmissionView intentionally omits
        // this object so hidden tests never cross the Student API boundary.
        gradingSnapshot: {
          id: pinnedGradingVersion.id,
          assignmentId: pinnedGradingVersion.assignmentId,
          version: pinnedGradingVersion.version,
          runtime: pinnedGradingVersion.runtime,
          cpuTimeLimitMs: pinnedGradingVersion.cpuTimeLimitMs,
          memoryLimitMb: pinnedGradingVersion.memoryLimitMb,
          comparator: structuredClone(pinnedGradingVersion.comparator),
          testCases: structuredClone(pinnedGradingVersion.testCases),
        },
        workspaceId: workspace.id,
        student: {
          id: membership.studentId ?? user.email,
          membershipId: membership.id,
          name: membership.studentName ?? user.name ?? user.email,
          email: user.email,
        },
        sourceCode: body.sourceCode,
        acceptedAt: requestReceivedAt.toISOString(),
        requestKey,
        payloadHash,
        status: 'PENDING',
        gradingAttempts: [],
      };
      records.push(submission);
      return { submission, created: true };
    });

    if (result.created) {
      const activityContext = requestReceivedAt.getTime() >= parseDate(context.lab.startAt)
        && requestReceivedAt.getTime() < parseDate(context.lab.endAt)
        ? 'IN_LAB'
        : 'OUTSIDE_LAB';
      await recordActivity({
        type: 'SUBMIT',
        context,
        activityAt: result.submission.acceptedAt,
        metadata: {
          assignmentId,
          assignmentVersionId: context.labAssignment.assignmentVersionId,
          activityContext,
          workspaceId: workspace.id,
          submissionId: result.submission.id,
        },
      });
      try {
        const assignment = assignments.find((item) => item.id === assignmentId
          && item.classroomId === workspace.classroomId) ?? notFound();
        const version = resolvePublishedAssignmentVersion(assignment, context.labAssignment.assignmentVersionId);
        const issueWorkspace = assessmentWorkspace({
          workspace,
          classroomId: workspace.classroomId,
          assignmentId,
          assignmentVersionId: context.labAssignment.assignmentVersionId,
          ownerEmail: user.email,
          labId: workspace.labId,
          labAssignmentId: workspace.labAssignmentId,
        });
        const snapshot = await recordWorkspaceSnapshot({
          workspace: issueWorkspace,
          trigger: 'SUBMIT',
          sourceCode: body.sourceCode,
          assignmentId,
          assignmentVersionId: context.labAssignment.assignmentVersionId,
        });
        let queuedExecution = null;
        try {
          queuedExecution = await executions.enqueue({
            assignment: version,
            sourceCode: body.sourceCode,
            body: {},
            assignmentId,
            classroomId: workspace.classroomId,
          termId: workspace.termId,
            ownerEmail: user.email,
            workspaceId: workspace.id,
            labId: workspace.labId,
            labAssignmentId: workspace.labAssignmentId,
          });
        } catch (error) {
          console.error(`CodePulse submission execution could not be queued (${error?.code ?? 'EXECUTION_QUEUE_ERROR'}).`);
        }
        const executionId = queuedExecution?.item.id ?? `submission-execution-${result.submission.id}`;
        await enqueueAssessment({
          workspace: issueWorkspace,
          snapshot,
          assignmentVersion: version,
          milestone: 'SUBMIT',
          submissionId: result.submission.id,
          executionId,
          ...(queuedExecution ? {
            executionPromise: queuedExecution.completion,
          } : {
            execution: {
              id: executionId,
              state: 'FINISHED',
              status: 'RUNNER_UNAVAILABLE',
              mode: 'SUBMISSION',
              runtime: version.runtime,
              results: [],
            },
          }),
        });
      } catch (error) {
        console.error(`CodePulse immutable submission snapshot was unavailable (${error?.code ?? 'SNAPSHOT_WRITE_ERROR'}).`);
      }
    }

    // Stable job identity makes submit retries and duplicate delivery idempotent.
    await grading.enqueue(result.submission.id);
    return result;
    });

    sendJson(response, result.created ? 201 : 200, {
      item: codeSubmissionView(result.submission, null, user.role),
      created: result.created,
    });
    return;
  }

  if (parts[2] === 'submissions' && parts[3] && parts[4] === 'judgments'
    && !parts[5] && request.method === 'GET') {
    const records = await readSubmissions();
    const submission = records.find((record) =>
      record.kind === 'CODE_SUBMISSION' && record.id === parts[3]) ?? notFound();
    const classroomItem = classroom(submission.classroomId);
    const isOwner = normalizeEmail(submission.student.email) === normalizeEmail(user.email);
    const lecturerCanRead = isDsaManager(classroomItem);
    if (!isOwner && !lecturerCanRead) deny();
    const judgments = await grading.listJudgments(submission.id);
    const visible = lecturerCanRead
      ? judgments.map(lecturerJudgmentView)
      : judgments
        .filter((judgment) => judgment.id === submission.latestJudgmentId)
        .map(studentJudgmentView);
    sendJson(response, 200, { items: visible });
    return;
  }

  if (parts[2] === 'submissions' && parts[3] && !parts[4] && request.method === 'GET') {
    const records = await readSubmissions();
    const submission = records.find((record) =>
      record.kind === 'CODE_SUBMISSION' && record.id === parts[3]) ?? notFound();
    const classroomItem = classroom(submission.classroomId);
    const canRead = normalizeEmail(submission.student.email) === normalizeEmail(user.email)
      || isDsaManager(classroomItem);
    if (!canRead) deny();
    const judgment = submission.latestJudgmentId
      ? await grading.getJudgment(submission.latestJudgmentId)
      : null;
    sendJson(response, 200, { item: codeSubmissionView(submission, judgment, user.role) });
    return;
  }

  if (parts[2] === 'workspaces' && parts[3] && parts[4] === 'execute' && request.method === 'POST') {
    if (user.role !== 'student') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const context = workspaceContext(workspace);
    if (workspace.termId !== context.classroomItem.termId) deny();
    if (workspace.ownerEmail !== user.email || !isMember(context.classroomItem.id)) deny();
    const access = assertWorkspaceWritable(workspace, context);
    const body = await readRequestBody(request);
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode : workspace.sourceCode;
    if (sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
      throw apiError(413, 'SOURCE_CODE_TOO_LARGE', `Code không được vượt quá ${MAX_SOURCE_CODE_LENGTH} ký tự.`);
    }
    if (!sourceCode.trim()) throw apiError(422, 'EMPTY_SOURCE_CODE', 'Source code cannot be empty.');
    if (body.baseRevision !== undefined) {
      const baseRevision = requireBaseRevision(body);
      const currentRevision = Number.isInteger(workspace.revision) ? workspace.revision : 0;
      if (baseRevision !== currentRevision) {
        const conflict = apiError(
          409,
          'REVISION_CONFLICT',
          `Workspace is at revision ${currentRevision}; reload it before running again.`,
        );
        conflict.currentRevision = currentRevision;
        throw conflict;
      }
    }
    const assignmentId = context.labAssignment?.assignmentId ?? workspace.assignmentId;
    const linkedAssignment = assignments.find((assignment) => assignment.id === assignmentId
      && assignment.classroomId === workspace.classroomId && assignment.status === 'PUBLISHED');
    const versionId = context.labAssignment?.assignmentVersionId ?? workspace.assignmentVersionId;
    const storedVersion = assignmentVersions.find((item) => item.id === versionId
      && item.assignmentId === assignmentId && item.classroomId === workspace.classroomId
      && item.status === 'PUBLISHED');
    const version = linkedAssignment
      ? versionId ? resolvePublishedAssignmentVersion(linkedAssignment, versionId) : latestPublishedAssignmentVersion(linkedAssignment)
      : storedVersion ? { ...storedVersion, runtime: storedVersion.runtime ?? storedVersion.language,
        testCases: normalizeTestCases(storedVersion.testCases ?? []) } : notFound();
    if (!ALLOWED_RUNTIMES.has(version.runtime)) throw apiError(422, 'UNSUPPORTED_RUNTIME', 'Unsupported assignment runtime.');
    const queued = await executions.enqueue({ assignment: version, sourceCode, body,
      assignmentId, classroomId: workspace.classroomId, termId: context.classroomItem.termId, ownerEmail: user.email,
      workspaceId: workspace.id, labId: workspace.labId ?? null, labAssignmentId: workspace.labAssignmentId ?? null });
    await markAssignmentVersionUsed(version.id);
    await executions.runTermTask(context.classroomItem.termId, async () => {
      const snapshot = await recordWorkspaceSnapshot({
        workspace,
        trigger: 'RUN',
        sourceCode,
        assignmentId,
        assignmentVersionId: version.id,
      });
      await enqueueAssessment({
        workspace,
        snapshot,
        assignmentVersion: version,
        milestone: 'RUN',
        executionId: queued.item.id,
        executionPromise: queued.completion,
      });
      await recordActivity({ type: 'RUN', context: access?.practiceContext,
        activityAt: access?.practiceAccess.acceptedAt, metadata: { assignmentId,
          activityContext: access?.practiceAccess.activityContext ?? null, workspaceId: workspace.id,
          executionId: queued.item.id, executionStatus: 'QUEUED' } });
    });
    sendJson(response, 202, { item: queued.item });
    return;
  }

  if (parts[2] === 'workspaces' && parts[3] && parts[4] === 'hints' && parts[5] && request.method === 'POST') {
    if (user.role !== 'student') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const context = workspaceContext(workspace);
    if (workspace.ownerEmail !== user.email || !isMember(context.classroomItem.id)) deny();
    const access = assertWorkspaceWritable(workspace, context);
    const hint = context.labAssignment?.hints?.find((candidate) => candidate.id === parts[5]) ?? notFound();
    const updated = await executions.runTermTask(context.classroomItem.termId, async () => {
    const savedWorkspace = await mutate(workspaceFile, initialWorkspaces, (records) => {
      const current = records.find((record) => record.id === workspace.id) ?? notFound();
      current.hintProgress ??= [];
      if (!current.hintProgress.some((item) => item.hintId === hint.id)) {
        current.hintProgress.push({ hintId: hint.id, revealedAt: new Date().toISOString() });
        current.updatedAt = new Date().toISOString();
      }
      return current;
    });
    if (access) {
      await recordActivity({
        type: 'HINT',
        context: access.practiceContext,
        activityAt: access.practiceAccess.acceptedAt,
        metadata: {
          assignmentId: context.labAssignment?.assignmentId ?? workspace.assignmentId,
          activityContext: access.practiceAccess.activityContext,
          workspaceId: workspace.id,
          hintId: hint.id,
        },
      });
    }
    return savedWorkspace;
    });
    sendJson(response, 200, { item: workspaceView(updated, context) });
    return;
  }

  if (parts[2] === 'memberships' && parts[3] && request.method === 'PATCH') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    const requestedStatus = String(body.status ?? '').toLowerCase();
    if (!['active', 'revoked'].includes(requestedStatus)) {
      throw apiError(400, 'INVALID_INPUT', 'Membership status phải là active hoặc revoked.');
    }
    const codepulseMembershipIds = { 'member-1': 'student-account-1', 'member-2': '13-student-2' };
    const current = memberships.find((record) =>
      record.id === parts[3]
      || (record.classroomId === DSA_ROSTER_CLASSROOM_ID && record.studentId === codepulseMembershipIds[parts[3]]));
    if (!current) notFound();
    const updated = await mutate(membershipFile, [], (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      const timestamp = new Date().toISOString();
      stored.status = requestedStatus.toUpperCase();
      stored.revokedAt = requestedStatus === 'revoked' ? timestamp : null;
      stored.updatedAt = timestamp;
      return stored;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  notFound();
}
