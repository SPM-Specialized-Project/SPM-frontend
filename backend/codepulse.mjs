import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

import {
  DATA_DIRECTORY,
  MEMBERSHIPS_FILE,
  TERMS_FILE,
  CLASSROOMS_FILE,
  ASSIGNMENTS_FILE,
  LABS_FILE,
  ASSIGNMENT_VERSIONS_FILE,
  CODEPULSE_SUBMISSIONS_FILE,
  CODEPULSE_ACTIVITIES_FILE,
  PRACTICE_WINDOW_AUDIT_FILE,
  WORKSPACES_FILE,
} from './config.mjs';
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

const directory = DATA_DIRECTORY;
const termFile = TERMS_FILE;
const classroomFile = CLASSROOMS_FILE;
const membershipFile = MEMBERSHIPS_FILE;
const workspaceFile = WORKSPACES_FILE;
const assignmentFile = ASSIGNMENTS_FILE;
const labFile = LABS_FILE;
const assignmentVersionFile = ASSIGNMENT_VERSIONS_FILE;
const submissionFile = CODEPULSE_SUBMISSIONS_FILE;
const activityFile = CODEPULSE_ACTIVITIES_FILE;
const practiceWindowAuditFile = PRACTICE_WINDOW_AUDIT_FILE;

const ALLOWED_RUNTIMES = new Set(['PYTHON', 'CPP']);
const MAX_CPU_TIME_LIMIT_MS = 10_000;
const MAX_MEMORY_LIMIT_MB = 1_024;
const MAX_SOURCE_CODE_LENGTH = 200_000;
const MAX_RUN_OUTPUT_LENGTH = 32_000;

const initialTerms = [
  { id: 'term-2026-1', courseId: '13', name: '2026 Semester 1', startDate: '2026-01-01', endDate: '2027-01-01', resetDate: '2027-01-02', status: 'ACTIVE' },
  { id: 'term-2027-1', courseId: '13', name: '2027 Semester 1', startDate: '2027-01-02', endDate: '2027-06-01', resetDate: '2027-06-02', status: 'DRAFT' },
];
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

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
const initialWorkspaces = [
  { id: 'workspace-1', classroomId: 'class-1', assignmentId: 'problem-1', termId: 'term-2026-1', ownerEmail: 'student@gmail.com', sourceCode: 'print("Hello World")' },
  { id: 'workspace-2', classroomId: 'class-1', assignmentId: 'problem-1', termId: 'term-2026-1', ownerEmail: 'student2@gmail.com', sourceCode: 'print("Private")' },
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

function mutate(file, initial, callback) {
  const result = mutationQueue.then(async () => {
    const records = await readRecords(file, initial);
    const value = callback(records);
    await writeFile(file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    return value;
  });
  mutationQueue = result.catch(() => {});
  return result;
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
];

const normalizeTestCases = (value) => (Array.isArray(value) ? value.map((test, index) => ({
  id: test?.id ?? `test-${Date.now()}-${index + 1}`,
  input: typeof test?.input === 'string' ? test.input : '',
  expectedOutput: typeof test?.expectedOutput === 'string' ? test.expectedOutput : '',
  hidden: Boolean(test?.hidden),
  verified: Boolean(test?.verified),
})) : []);

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
});

const normalizeAssignmentPatch = (patch = {}) => {
  const normalized = {};
  for (const field of assignmentFields) {
    if (!Object.hasOwn(patch, field)) continue;
    if (field === 'testCases') {
      normalized[field] = normalizeTestCases(patch[field]);
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
      if (!test.verified) errors[`testCases.${index}.verified`] = 'Test case chưa được verify bằng reference solution.';
    });
  }
  if (assignment.verificationStatus !== 'VERIFIED') errors.verification = 'Hãy verify assignment bằng reference solution trước khi publish.';
  return errors;
};

const publicAssignment = (assignment, viewerRole) => {
  if (viewerRole !== 'student') return assignment;
  const { rawRunnerTrace, referenceSolution, verificationStatus, verifiedAt, verifiedBy, ...safeAssignment } = assignment;
  return {
    ...safeAssignment,
    testCases: assignment.testCases.filter((test) => !test.hidden),
  };
};

const normalizeRunOutput = (value) => String(value ?? '').replace(/\r\n/g, '\n').trimEnd();

const runProcess = (command, args, { cwd, input = '', timeoutMs }) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd, windowsHide: true });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let outputLimitReached = false;
  let settled = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);

  const appendOutput = (target, chunk) => {
    const value = chunk.toString();
    if (target === 'stdout') stdout += value;
    else stderr += value;
    if (stdout.length + stderr.length > MAX_RUN_OUTPUT_LENGTH) {
      outputLimitReached = true;
      child.kill();
    }
  };

  child.stdout.on('data', (chunk) => appendOutput('stdout', chunk));
  child.stderr.on('data', (chunk) => appendOutput('stderr', chunk));
  child.once('error', (error) => {
    clearTimeout(timer);
    if (settled) return;
    settled = true;
    reject(error);
  });
  child.once('close', (code, signal) => {
    clearTimeout(timer);
    if (settled) return;
    settled = true;
    resolve({
      code,
      signal,
      stdout: stdout.slice(0, MAX_RUN_OUTPUT_LENGTH),
      stderr: stderr.slice(0, MAX_RUN_OUTPUT_LENGTH),
      timedOut,
      outputLimitReached,
    });
  });

  child.stdin.on('error', () => {});
  child.stdin.end(input);
});

const runWithFallback = async (commands, options) => {
  let lastError;
  for (const [command, args] of commands) {
    try {
      return await runProcess(command, args, options);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error('Không tìm thấy runtime để chạy bài.');
};

const runnerCommands = (runtime, sourcePath, executablePath) => {
  if (runtime === 'PYTHON') {
    const python = process.env.PYTHON_BIN?.trim();
    return [
      ...(python ? [[python, ['-I', sourcePath]]] : []),
      ...(process.platform === 'win32' ? [['py', ['-3', '-I', sourcePath]]] : []),
      ['python', ['-I', sourcePath]],
      ['python3', ['-I', sourcePath]],
    ];
  }

  return [
    ['g++', ['-std=c++17', '-O2', '-pipe', sourcePath, '-o', executablePath]],
    ['clang++', ['-std=c++17', '-O2', sourcePath, '-o', executablePath]],
  ];
};

const runAssignmentTestCases = async ({ assignment, sourceCode, testCases }) => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-codepulse-run-'));
  const sourceExtension = assignment.runtime === 'CPP' ? 'cpp' : 'py';
  const sourcePath = path.join(tempDirectory, `main.${sourceExtension}`);
  const executablePath = path.join(tempDirectory, process.platform === 'win32' ? 'main.exe' : 'main');
  const timeoutMs = Math.min(
    Math.max(Number(assignment.cpuTimeLimitMs) || 1_000, 100),
    MAX_CPU_TIME_LIMIT_MS,
  );

  try {
    await writeFile(sourcePath, sourceCode, 'utf8');
    let executableCommand;
    if (assignment.runtime === 'CPP') {
      const compile = await runWithFallback(runnerCommands('CPP', sourcePath, executablePath), {
        cwd: tempDirectory,
        timeoutMs: MAX_CPU_TIME_LIMIT_MS,
      });
      if (compile.code !== 0 || compile.timedOut || compile.outputLimitReached) {
        return testCases.map((testCase) => ({
          testCaseId: testCase.id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          stderr: compile.stderr || compile.stdout,
          status: compile.timedOut ? 'TIMEOUT' : 'COMPILE_ERROR',
          passed: false,
          durationMs: null,
        }));
      }
      executableCommand = [executablePath, []];
    }

    const results = [];
    for (const testCase of testCases) {
      const startedAt = Date.now();
      const result = assignment.runtime === 'PYTHON'
        ? await runWithFallback(runnerCommands('PYTHON', sourcePath), {
          cwd: tempDirectory,
          input: testCase.input,
          timeoutMs,
        })
        : await runProcess(executableCommand[0], executableCommand[1], {
          cwd: tempDirectory,
          input: testCase.input,
          timeoutMs,
        });
      const actualOutput = normalizeRunOutput(result.stdout);
      const expectedOutput = normalizeRunOutput(testCase.expectedOutput);
      const status = result.timedOut
        ? 'TIMEOUT'
        : result.outputLimitReached
          ? 'OUTPUT_LIMIT'
          : result.code === 0
            ? actualOutput === expectedOutput ? 'PASSED' : 'WRONG_ANSWER'
            : 'RUNTIME_ERROR';
      results.push({
        testCaseId: testCase.id,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.stdout,
        stderr: result.stderr,
        status,
        passed: status === 'PASSED',
        durationMs: Date.now() - startedAt,
      });
    }
    return results;
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
};

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

const isPracticeWindowOpen = (assignment, at = Date.now()) => {
  const { openAt, closeAt } = practiceWindowValues(assignment);
  const openTimestamp = parseDate(openAt);
  const closeTimestamp = parseDate(closeAt);
  return practiceWindowStatus(assignment) === 'OPEN'
    && openTimestamp !== null
    && closeTimestamp !== null
    && openTimestamp <= at
    && at < closeTimestamp;
};

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
  const labView = (lab) => ({
    ...lab,
    stateVersion: Number.isInteger(lab.stateVersion) ? lab.stateVersion : 0,
    assignments: lab.assignments.map((rawAssignment) => {
      const assignment = normalizeLabAssignment(rawAssignment);
      const accessOpen = isPracticeWindowOpen(assignment);
      const termActive = isAcademicTermActive(terms.find((item) => item.id === classroom(lab.classroomId).termId));
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
        practiceAccess: termActive && accessOpen ? 'OPEN' : 'CLOSED',
        activityContext: termActive && accessOpen
        ? (Date.now() >= parseDate(lab.startAt) && Date.now() < parseDate(lab.endAt)
          ? 'IN_LAB'
          : 'OUTSIDE_LAB')
        : null,
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
  const assertWorkspaceWritable = (workspace, context) => {
    if (context.classroomItem.status === 'ARCHIVED') {
      throw apiError(409, 'CLASSROOM_ARCHIVED', 'Classroom is archived and read-only.');
    }
    if (!context.lab) return null;
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
  const workspaceView = (workspace, context) => {
    if (!context.labAssignment) return workspace;
    const revealedHintIds = new Set(workspace.hintProgress?.map((item) => item.hintId) ?? []);
    return {
      ...workspace,
      executionResult: workspace.executionResult ?? null,
      problem: {
        id: context.labAssignment.id,
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

  if (parts[2] === 'terms' && request.method === 'GET') {
    const canViewAllCourseTerms = ['admin', 'lecturer'].includes(user.role);
    const items = terms.filter((item) => item.courseId === requestedCourseId && (canViewAllCourseTerms
      || (isCurrentStudentTerm(item)
        && classrooms.some((classroomItem) => classroomItem.termId === item.id && canAccessClass(classroomItem)))));
    sendJson(response, 200, { items });
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
    const updated = { ...current, ...body.patch, courseId: current.courseId };
    if (!updated.name?.trim() || new Date(updated.endDate) <= new Date(updated.startDate)) {
      throw apiError(400, 'INVALID_TERM_DATES', 'Term có ngày không hợp lệ.');
    }
    if (!['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(updated.status)) {
      throw apiError(400, 'INVALID_STATUS', 'Trạng thái term không hợp lệ.');
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

  if (parts[2] === 'classrooms' && parts[3] && parts[4] === 'assignment-versions' && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const items = publishedAssignmentVersions(classroomItem.id).map((version) => {
      if (user.role !== 'student') return version;
      const { hints = [], starterCode, ...safeVersion } = version;
      return { ...safeVersion, hintCount: hints.length };
    });
    sendJson(response, 200, { items });
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
    const requestedOpenAt = Object.hasOwn(patch, 'openAt') || Object.hasOwn(patch, 'open_at')
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
    const requestedStatus = patch.status ?? patch.practiceWindowStatus ?? currentAssignment.practiceWindowStatus ?? 'OPEN';
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
    const practiceAccess = practiceContext
      ? {
        acceptedAt: new Date().toISOString(),
        activityContext: isPracticeWindowOpen(practiceContext.labAssignment)
          ? (Date.now() >= parseDate(practiceContext.lab.startAt) && Date.now() < parseDate(practiceContext.lab.endAt)
            ? 'IN_LAB'
            : 'OUTSIDE_LAB')
          : null,
        practiceAccess: isCurrentStudentTerm(terms.find((item) => item.id === classroomItem.termId))
          && isPracticeWindowOpen(practiceContext.labAssignment)
          ? 'OPEN'
          : 'CLOSED',
      }
      : null;
    if (requestedLabId || requestedLabAssignmentId) {
      if (!practiceContext) notFound();
      if (assignmentId && practiceContext.labAssignment.assignmentId !== assignmentId) notFound();
    }
    const selectedAssignmentId = practiceContext?.labAssignment.assignmentId ?? assignmentId;
    const assignment = assignments.find((item) =>
      item.id === selectedAssignmentId && item.classroomId === classroomItem.id && item.status === 'PUBLISHED');
    if (!assignment) notFound();

    const currentWorkspaces = await readRecords(workspaceFile, initialWorkspaces);
    let workspace = currentWorkspaces.find((item) =>
      item.classroomId === classroomItem.id
      && item.assignmentId === assignment.id
      && (!practiceContext
        ? !item.labAssignmentId
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
      item: workspace,
      ...(practiceContext ? {
        practiceWindow: {
          ...practiceContext.labAssignment,
          practiceAccess: practiceAccess?.practiceAccess ?? 'CLOSED',
          activityContext: practiceAccess?.activityContext ?? null,
        },
      } : {}),
    });
    return;
  }

  const isAssignmentRoute = parts[2] === 'classrooms'
    && parts[3]
    && ['problems', 'assignments'].includes(parts[4]);

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
    if (!canAccessClass(classroomItem)) deny();
    const practiceContext = labAssignmentContext({
      classroomId: classroomItem.id,
      labId: parts[5],
      labAssignmentId: parts[7],
    });
    if (!practiceContext) notFound();
    const practiceAccess = studentPracticeAccess(practiceContext);
    const assignment = assignments.find((record) =>
      record.id === practiceContext.labAssignment.assignmentId
      && record.classroomId === classroomItem.id
      && record.status === 'PUBLISHED') ?? notFound();
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
    const results = await runAssignmentTestCases({
      assignment,
      sourceCode,
      testCases: assignment.testCases,
    });
    const acceptedAt = practiceAccess.acceptedAt;
    const passedCount = results.filter((result) => result.passed).length;
    const submission = {
      id: `codepulse-submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      classroomId: classroomItem.id,
      termId: classroomItem.termId,
      labId: practiceContext.lab.id,
      labAssignmentId: practiceContext.labAssignment.id,
      assignmentId: assignment.id,
      assignmentVersionId: practiceContext.labAssignment.assignmentVersionId,
      ownerEmail: user.email,
      acceptedAt,
      receivedAt: acceptedAt,
      activityContext: practiceAccess.activityContext,
      status: 'GRADED',
      passedCount,
      totalCount: results.length,
      score: results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0,
      results,
      // The repository has no external AI detector adapter yet. The queued
      // state is persisted so a detector/notification worker can consume it
      // without changing the deadline or historical submission record.
      aiAnalysis: {
        status: 'QUEUED',
        queuedAt: acceptedAt,
        outsideLabSupported: true,
      },
      notification: {
        type: 'SUBMISSION_RECEIVED',
        status: 'QUEUED',
        queuedAt: acceptedAt,
      },
    };
    await mutate(submissionFile, initialCodePulseSubmissions, (records) => {
      records.push(submission);
      return submission;
    });
    if (workspace && workspace.sourceCode !== sourceCode) {
      await mutate(workspaceFile, initialWorkspaces, (records) => {
        const stored = records.find((record) => record.id === workspace.id);
        if (stored) {
          stored.sourceCode = sourceCode;
          stored.updatedAt = acceptedAt;
        }
        return stored;
      });
    }
    await recordActivity({
      type: 'SUBMIT',
      context: practiceContext,
      activityAt: acceptedAt,
      metadata: {
        assignmentId: assignment.id,
        activityContext: practiceAccess.activityContext,
        submissionId: submission.id,
        passedCount,
        totalCount: results.length,
      },
    });
    sendJson(response, 201, { item: submission });
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
    sendJson(response, 200, { items });
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

  if (isAssignmentRoute && parts[5] && parts[6] === 'run' && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const assignment = assignments.find((record) =>
      record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    if (user.role === 'student' && assignment.status !== 'PUBLISHED') notFound();
    const practiceContext = labAssignmentContext({
      classroomId: classroomItem.id,
      labId: requestUrl.searchParams.get('labId'),
      labAssignmentId: requestUrl.searchParams.get('labAssignmentId'),
      assignmentId: assignment.id,
    });
    const practiceAccess = practiceContext ? studentPracticeAccess(practiceContext) : null;
    if (!ALLOWED_RUNTIMES.has(assignment.runtime)) {
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

    const visibleTestCases = user.role === 'student'
      ? assignment.testCases.filter((testCase) => !testCase.hidden)
      : assignment.testCases;
    const requestedTestCaseIds = Array.isArray(body.testCaseIds)
      ? new Set(body.testCaseIds.map((id) => String(id)))
      : null;
    const selectedTestCases = requestedTestCaseIds
      ? visibleTestCases.filter((testCase) => requestedTestCaseIds.has(testCase.id))
      : visibleTestCases;
    if (selectedTestCases.length === 0) {
      throw apiError(400, 'NO_VISIBLE_TEST_CASES', 'Không có testcase public để chạy.');
    }

    const results = await runAssignmentTestCases({
      assignment,
      sourceCode,
      testCases: selectedTestCases,
    });
    await recordActivity({
      type: 'RUN',
      context: practiceContext,
      activityAt: practiceAccess?.acceptedAt,
      metadata: {
        assignmentId: assignment.id,
        activityContext: practiceAccess?.activityContext ?? null,
        passedCount: results.filter((result) => result.passed).length,
        totalCount: results.length,
      },
    });
    sendJson(response, 200, {
      item: {
        assignmentId: assignment.id,
        runtime: assignment.runtime,
        results,
        passedCount: results.filter((result) => result.passed).length,
        totalCount: results.length,
      },
    });
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
    const updated = await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      stored.status = 'PUBLISHED';
      return stored;
    });
    sendJson(response, 200, { item: updated });
    return;
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
      sendJson(response, 200, { item: workspaceView(workspace, context) });
      return;
    }
    if (!isOwner) deny();
    const access = assertWorkspaceWritable(workspace, context);
    if (item.status === 'ARCHIVED') throw apiError(409, 'CLASSROOM_ARCHIVED', 'Classroom đã được lưu trữ và chỉ đọc.');
    const body = await readRequestBody(request);
    if (typeof body.sourceCode !== 'string') throw apiError(400, 'INVALID_INPUT', 'sourceCode phải là chuỗi.');
    const updated = await mutate(workspaceFile, initialWorkspaces, (records) => {
      const current = records.find((record) => record.id === workspace.id) ?? notFound();
      current.sourceCode = body.sourceCode;
      current.updatedAt = new Date().toISOString();
      return current;
    });
    if (access) {
      await recordActivity({
        type: 'SAVE',
        context: access.practiceContext,
        activityAt: access.practiceAccess.acceptedAt,
        metadata: {
          assignmentId: workspace.assignmentId,
          activityContext: access.practiceAccess.activityContext,
          workspaceId: workspace.id,
        },
      });
    }
    sendJson(response, 200, { item: workspaceView(updated, context) });
    return;
  }

  if (parts[2] === 'workspaces' && parts[3] && parts[4] === 'execute' && request.method === 'POST') {
    if (user.role !== 'student') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const context = workspaceContext(workspace);
    if (workspace.ownerEmail !== user.email || !isMember(context.classroomItem.id)) deny();
    const access = assertWorkspaceWritable(workspace, context);
    const body = await readRequestBody(request);
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode : workspace.sourceCode;
    if (!sourceCode.trim()) throw apiError(422, 'EMPTY_SOURCE_CODE', 'Source code cannot be empty.');
    const startedAt = Date.now();
    const linkedAssignment = assignments.find((assignment) =>
      assignment.id === workspace.assignmentId &&
      assignment.classroomId === workspace.classroomId &&
      assignment.status === 'PUBLISHED');
    let executionResult;
    if (linkedAssignment && ALLOWED_RUNTIMES.has(linkedAssignment.runtime)) {
      const visibleTestCases = linkedAssignment.testCases.filter((testCase) => !testCase.hidden);
      const results = await runAssignmentTestCases({
        assignment: linkedAssignment,
        sourceCode,
        testCases: visibleTestCases,
      });
      const passedCount = results.filter((result) => result.passed).length;
      const runtimeFailure = results.find((result) =>
        ['RUNTIME_ERROR', 'COMPILE_ERROR', 'TIMEOUT', 'OUTPUT_LIMIT'].includes(result.status));
      executionResult = {
        id: `execution-${Date.now()}`,
        status: runtimeFailure ? 'RUNTIME_ERROR' : passedCount === results.length ? 'COMPLETED' : 'FAILED',
        stdout: results.map((result) => result.actualOutput).filter(Boolean).join('\n'),
        stderr: results.map((result) => result.stderr).filter(Boolean).join('\n'),
        exitCode: passedCount === results.length ? 0 : 1,
        runtimeMs: results.reduce((total, result) => total + (result.durationMs ?? 0), 0),
        executedAt: new Date().toISOString(),
        passedCount,
        totalCount: results.length,
        results,
      };
    } else {
      const hasRuntimeError = /\b(raise|throw)\b|syntax_error/i.test(sourceCode);
      executionResult = {
        id: `execution-${Date.now()}`,
        status: hasRuntimeError ? 'RUNTIME_ERROR' : 'COMPLETED',
        stdout: hasRuntimeError ? '' : `Execution completed for ${context.labAssignment?.title ?? 'problem'}.`,
        stderr: hasRuntimeError ? 'The submitted source triggered a runtime error.' : '',
        exitCode: hasRuntimeError ? 1 : 0,
        runtimeMs: Math.max(1, Date.now() - startedAt),
        executedAt: new Date().toISOString(),
      };
    }
    const updated = await mutate(workspaceFile, initialWorkspaces, (records) => {
      const current = records.find((record) => record.id === workspace.id) ?? notFound();
      current.sourceCode = sourceCode;
      current.executionResult = executionResult;
      current.updatedAt = executionResult.executedAt;
      return current;
    });
    if (access) {
      await recordActivity({
        type: 'RUN',
        context: access.practiceContext,
        activityAt: access.practiceAccess.acceptedAt,
        metadata: {
          assignmentId: workspace.assignmentId,
          activityContext: access.practiceAccess.activityContext,
          workspaceId: workspace.id,
          executionId: executionResult.id,
          executionStatus: executionResult.status,
        },
      });
    }
    sendJson(response, 200, { item: workspaceView(updated, context) });
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
    const updated = await mutate(workspaceFile, initialWorkspaces, (records) => {
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
          assignmentId: workspace.assignmentId,
          activityContext: access.practiceAccess.activityContext,
          workspaceId: workspace.id,
          hintId: hint.id,
        },
      });
    }
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
