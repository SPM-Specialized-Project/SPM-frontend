import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const writeJson = (directory, name, value) => writeFile(
  path.join(directory, name),
  `${JSON.stringify(value, null, 2)}\n`,
  'utf8',
);

async function request(baseUrl, route, token, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

async function login(baseUrl, email, password) {
  const response = await request(baseUrl, '/api/auth/login', null, 'POST', { email, password });
  assert.equal(response.status, 200);
  return response.data.accessToken;
}

const assertNoSecrets = (value, secrets) => {
  const serialized = JSON.stringify(value);
  for (const secret of secrets) {
    assert.equal(serialized.includes(secret), false, `Student payload leaked: ${secret}`);
  }
};

test('SCRUM-74 API enforces RBAC and removes hidden secrets from the actual student payload', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-grading-api-'));
  const submission = {
    kind: 'CODE_SUBMISSION',
    id: 'submission-security-74',
    workspaceId: 'workspace-1',
    classroomId: 'class-1',
    labId: 'lab-1',
    labAssignmentId: 'lab-assignment-1',
    assignmentId: 'problem-1',
    assignmentVersionId: 'problem-1-v1',
    assignmentVersion: {
      id: 'problem-1-v1',
      assignmentId: 'problem-1',
      version: 1,
      title: 'Pinned problem',
      language: 'PYTHON',
    },
    student: {
      id: 'student-account-1',
      membershipId: 'membership-13-student-account-1',
      name: 'Student',
      email: 'student@gmail.com',
    },
    sourceCode: 'print(input())',
    acceptedAt: '2026-11-08T00:00:00.000Z',
    status: 'COMPLETED',
    latestJudgmentId: 'judgment-security-74',
    gradingAttempts: [{
      judgmentId: 'judgment-security-74',
      attempt: 1,
      status: 'COMPLETED',
      verdict: 'WRONG_ANSWER',
      completedAt: '2026-11-08T00:00:01.000Z',
    }],
    gradingSnapshot: {
      id: 'problem-1-v1',
      assignmentId: 'problem-1',
      testCases: [{
        id: 'hidden-snapshot',
        hidden: true,
        input: 'HIDDEN_SNAPSHOT_INPUT_74',
        expectedOutput: 'HIDDEN_SNAPSHOT_EXPECTED_74',
        weight: 3,
      }],
    },
  };
  const judgment = {
    id: 'judgment-security-74',
    jobId: 'grading-job-submission-security-74',
    submissionId: submission.id,
    assignmentVersionId: submission.assignmentVersionId,
    attempt: 1,
    status: 'COMPLETED',
    verdict: 'WRONG_ANSWER',
    earnedWeight: 2,
    maxWeight: 5,
    score: 40,
    passedCount: 1,
    failedCount: 1,
    totalCount: 2,
    createdAt: '2026-11-08T00:00:00.000Z',
    startedAt: '2026-11-08T00:00:00.000Z',
    completedAt: '2026-11-08T00:00:01.000Z',
    internalError: null,
    testResults: [
      {
        id: 'public-result', judgmentId: 'judgment-security-74', testCaseId: 'public',
        hidden: false, weight: 2, earnedWeight: 2, verdict: 'PASSED', passed: true,
        input: 'public input', expectedOutput: 'public expected', actualOutput: 'public expected',
        stderr: '', runtimeMs: 1, memoryUsageKb: 100, outputTruncated: false, exitCode: 0,
      },
      {
        id: 'hidden-result', judgmentId: 'judgment-security-74', testCaseId: 'hidden',
        hidden: true, weight: 3, earnedWeight: 0, verdict: 'WRONG_ANSWER', passed: false,
        input: 'HIDDEN_INPUT_SECRET_74', expectedOutput: 'HIDDEN_EXPECTED_SECRET_74',
        actualOutput: 'HIDDEN_ACTUAL_SECRET_74', stderr: 'HIDDEN_TRACE_SECRET_74',
        runtimeMs: 1, memoryUsageKb: 100, outputTruncated: false, exitCode: 0,
      },
    ],
  };
  await Promise.all([
    writeJson(dataDirectory, 'submissions.json', [submission]),
    writeJson(dataDirectory, 'codepulse-judgments.json', [judgment]),
    writeJson(dataDirectory, 'codepulse-grading-jobs.json', [{
      id: 'grading-job-submission-security-74',
      submissionId: submission.id,
      state: 'COMPLETED',
      attempts: 1,
      maxAttempts: 3,
      currentJudgmentId: judgment.id,
    }]),
  ]);

  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    server.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 5_000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Backend exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(Number(match[1]));
    });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const otherStudent = await login(baseUrl, 'student2@gmail.com', 'student2123');
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const outsideLecturer = await login(baseUrl, 'lecturer2@gmail.com', 'lecturer2123');
  const route = `/api/codepulse/submissions/${submission.id}`;

  const studentResponse = await request(baseUrl, route, student);
  assert.equal(studentResponse.status, 200);
  const secrets = [
    'HIDDEN_INPUT_SECRET_74',
    'HIDDEN_EXPECTED_SECRET_74',
    'HIDDEN_ACTUAL_SECRET_74',
    'HIDDEN_TRACE_SECRET_74',
    'HIDDEN_SNAPSHOT_INPUT_74',
    'HIDDEN_SNAPSHOT_EXPECTED_74',
  ];
  const serializedStudent = JSON.stringify(studentResponse.data);
  assert.match(serializedStudent, /public input/);
  assertNoSecrets(studentResponse.data, secrets);
  assert.deepEqual(studentResponse.data.item.judgment.hiddenTests, {
    passedCount: 0,
    totalCount: 1,
    earnedWeight: 0,
    maxWeight: 3,
  });

  const deniedStudent = await request(baseUrl, route, otherStudent);
  assert.equal(deniedStudent.status, 403);
  assertNoSecrets(deniedStudent.data, secrets);
  const deniedLecturer = await request(baseUrl, route, outsideLecturer);
  assert.equal(deniedLecturer.status, 403);
  assertNoSecrets(deniedLecturer.data, secrets);
  const lecturerResponse = await request(baseUrl, route, lecturer);
  assert.equal(lecturerResponse.status, 200);
  assert.match(JSON.stringify(lecturerResponse.data), /HIDDEN_INPUT_SECRET_74/);

  const studentHistory = await request(baseUrl, `${route}/judgments`, student);
  assert.equal(studentHistory.status, 200);
  assertNoSecrets(studentHistory.data, secrets);
  const lecturerHistory = await request(baseUrl, `${route}/judgments`, lecturer);
  assert.equal(lecturerHistory.status, 200);
  assert.match(JSON.stringify(lecturerHistory.data), /HIDDEN_TRACE_SECRET_74/);
});

test('SCRUM-74 immutable submission is graded asynchronously with partial credit', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-grading-e2e-'));
  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    server.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 5_000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Backend exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(Number(match[1]));
    });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const now = Date.now();
  const startAt = new Date(now - 60_000).toISOString();
  const endAt = new Date(now + 60_000).toISOString();
  const createdLab = await request(
    baseUrl,
    '/api/codepulse/classrooms/class-1/labs',
    lecturer,
    'POST',
    {
      name: 'SCRUM-74 grading LAB',
      startAt,
      endAt,
      assignments: [{
        assignmentVersionId: 'problem-1-v1',
        mandatory: true,
        practiceStartAt: startAt,
        practiceEndAt: endAt,
      }],
    },
  );
  assert.equal(createdLab.status, 201);
  const labId = createdLab.data.item.id;
  assert.equal((await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${labId}`,
    lecturer,
    'PATCH',
    { status: 'LIVE', expectedStateVersion: 0 },
  )).status, 200);
  const labs = await request(baseUrl, '/api/codepulse/classrooms/class-1/labs', student);
  const workspaceId = labs.data.items
    .find((item) => item.id === labId)
    .assignments[0].workspaceId;
  const workspacesPath = path.join(dataDirectory, 'codepulse-workspaces.json');
  const workspaces = JSON.parse(await readFile(workspacesPath, 'utf8'));
  const labWorkspace = workspaces.find((item) => item.id === workspaceId);
  assert.ok(labWorkspace);
  delete labWorkspace.assignmentId;
  await writeJson(dataDirectory, 'codepulse-workspaces.json', workspaces);
  const recoveredWorkspace = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/workspace?labId=${labId}&labAssignmentId=${labs.data.items.find((item) => item.id === labId).assignments[0].id}`,
    student,
  );
  assert.equal(recoveredWorkspace.status, 200);
  assert.equal(recoveredWorkspace.data.item.id, workspaceId);
  assert.equal(recoveredWorkspace.data.item.assignmentId, 'problem-1');
  const runResult = await request(
    baseUrl,
    `/api/codepulse/workspaces/${workspaceId}/execute`,
    student,
    'POST',
    { sourceCode: 'print("Hello")' },
  );
  assert.equal(runResult.status, 202);
  const runSnapshots = await request(
    baseUrl,
    `/api/codepulse/workspaces/${workspaceId}/snapshots`,
    student,
  );
  assert.equal(runSnapshots.status, 200);
  assert.equal(runSnapshots.data.items.at(-1).assignmentId, 'problem-1');
  const accepted = await request(
    baseUrl,
    `/api/codepulse/workspaces/${workspaceId}/submissions`,
    student,
    'POST',
    {
      sourceCode: 'print(input())',
      assignmentVersionId: 'problem-1-v1',
      requestKey: 'scrum74-e2e-partial-0001',
    },
  );
  assert.equal(accepted.status, 201);
  assert.equal(accepted.data.item.status, 'PENDING');
  assert.equal(accepted.data.item.judgment, null);
  assertNoSecrets(accepted.data, ['secret input', 'secret output']);

  const route = `/api/codepulse/submissions/${accepted.data.item.id}`;
  let completed;
  for (let poll = 0; poll < 100; poll += 1) {
    const current = await request(baseUrl, route, student);
    if (['COMPLETED', 'INTERNAL_ERROR'].includes(current.data.item.status)) {
      completed = current;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(completed, 'grading did not finish');
  assert.equal(completed.data.item.status, 'COMPLETED', JSON.stringify(completed.data));
  assert.equal(completed.data.item.judgment.score, 50);
  assert.equal(completed.data.item.judgment.earnedWeight, 1);
  assert.equal(completed.data.item.judgment.maxWeight, 2);
  assert.equal(completed.data.item.judgment.passedCount, 1);
  assert.equal(completed.data.item.judgment.totalCount, 2);
  assert.equal(completed.data.item.judgment.publicTests.length, 1);
  assert.deepEqual(completed.data.item.judgment.hiddenTests, {
    passedCount: 0,
    totalCount: 1,
    earnedWeight: 0,
    maxWeight: 1,
  });
  assertNoSecrets(completed.data, ['secret input', 'secret output']);
  const studentHistory = await request(baseUrl, `${route}/judgments`, student);
  assert.equal(studentHistory.status, 200);
  assertNoSecrets(studentHistory.data, ['secret input', 'secret output']);

  const lecturerResult = await request(baseUrl, route, lecturer);
  assert.equal(lecturerResult.status, 200);
  assert.match(JSON.stringify(lecturerResult.data), /secret input/);
  const lecturerLabSubmissions = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${labId}/submissions`,
    lecturer,
  );
  assert.equal(lecturerLabSubmissions.status, 200);
  assert.equal(lecturerLabSubmissions.data.items.length, 1);
  assert.equal(lecturerLabSubmissions.data.items[0].id, accepted.data.item.id);
  assert.match(JSON.stringify(lecturerLabSubmissions.data), /secret input/);
  const studentLabSubmissions = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${labId}/submissions`,
    student,
  );
  assert.equal(studentLabSubmissions.status, 403);
});

test('SCRUM-74 grading keeps the submission snapshot after assignment-version drift', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-grading-version-drift-'));
  const submissionId = 'submission-pinned-version-drift-74';
  const jobId = `grading-job-${submissionId}`;
  const acceptedAt = '2026-11-09T00:00:00.000Z';
  await Promise.all([
    writeJson(dataDirectory, 'submissions.json', [{
      kind: 'CODE_SUBMISSION',
      id: submissionId,
      courseId: '13',
      termId: 'term-2026-1',
      classroomId: 'class-1',
      labId: 'lab-version-drift',
      labAssignmentId: 'lab-assignment-version-drift',
      assignmentId: 'problem-1',
      assignmentVersionId: 'problem-1-v1',
      assignmentVersion: {
        id: 'problem-1-v1', assignmentId: 'problem-1', version: 1,
        title: 'Pinned v1', language: 'PYTHON',
      },
      gradingSnapshot: {
        id: 'problem-1-v1',
        assignmentId: 'problem-1',
        version: 1,
        runtime: 'PYTHON',
        cpuTimeLimitMs: 1_000,
        memoryLimitMb: 128,
        comparator: { normalizeLineEndings: true, trimTrailingNewline: true },
        testCases: [{
          id: 'pinned-public-v1', input: 'v1-output', expectedOutput: 'v1-output',
          hidden: false, verified: true, weight: 1,
        }, {
          id: 'pinned-hidden-v1', input: 'PINNED_HIDDEN_V1_SECRET', expectedOutput: 'PINNED_HIDDEN_V1_SECRET',
          hidden: true, verified: true, weight: 1,
        }],
      },
      workspaceId: 'workspace-1',
      student: {
        id: 'student-account-1', membershipId: 'membership-13-student-account-1',
        name: 'Student', email: 'student@gmail.com',
      },
      sourceCode: 'print(input())',
      acceptedAt,
      requestKey: 'version-drift-request-74',
      payloadHash: 'fixture',
      status: 'PENDING',
      gradingAttempts: [],
    }]),
    writeJson(dataDirectory, 'codepulse-grading-jobs.json', [{
      id: jobId,
      submissionId,
      assignmentVersionId: 'problem-1-v1',
      state: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      currentJudgmentId: null,
      createdAt: acceptedAt,
      updatedAt: acceptedAt,
      completedAt: null,
      lastError: null,
    }]),
    // The mutable/current record deliberately disagrees with the accepted v1 snapshot.
    writeJson(dataDirectory, 'codepulse-assignment-versions.json', [{
      id: 'problem-1-v1',
      assignmentId: 'problem-1',
      classroomId: 'class-1',
      version: 2,
      runtime: 'PYTHON',
      status: 'PUBLISHED',
      testCases: [{
        id: 'drifted-v2', input: 'public', expectedOutput: 'v2-output',
        hidden: false, verified: true, weight: 50,
      }],
    }]),
  ]);

  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    server.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 5_000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Backend exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(Number(match[1]));
    });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const route = `/api/codepulse/submissions/${submissionId}`;
  let completed;
  for (let poll = 0; poll < 100; poll += 1) {
    const current = await request(baseUrl, route, student);
    if (['COMPLETED', 'INTERNAL_ERROR'].includes(current.data.item.status)) {
      completed = current;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  assert.ok(completed, 'version-drift grading did not finish');
  assert.equal(completed.data.item.status, 'COMPLETED', JSON.stringify(completed.data));
  assert.equal(completed.data.item.judgment.score, 100);
  assert.equal(completed.data.item.judgment.maxWeight, 2);
  assert.equal(completed.data.item.judgment.publicTests[0].expectedOutput, 'v1-output');
  assertNoSecrets(completed.data, ['PINNED_HIDDEN_V1_SECRET', 'v2-output']);
});
