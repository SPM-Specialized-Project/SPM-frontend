import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startBackend(t) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-term-reset-'));
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
    server.once('error', reject);
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (match) resolve(Number(match[1]));
    });
  });
  return { baseUrl: `http://127.0.0.1:${port}/api`, dataDirectory };
}

async function request(baseUrl, route, token, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

async function login(baseUrl, email, password) {
  const response = await request(baseUrl, '/auth/login', null, 'POST', { email, password });
  assert.equal(response.status, 200);
  return response.data.accessToken;
}

async function writeJson(dataDirectory, filename, records) {
  const file = path.join(dataDirectory, filename);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

async function readJson(dataDirectory, filename) {
  return JSON.parse(await readFile(path.join(dataDirectory, filename), 'utf8'));
}

test('term reset blocks writes, purges student data and records audit', async (t) => {
  const { baseUrl, dataDirectory } = await startBackend(t);
  const admin = await login(baseUrl, 'admin@gmail.com', 'admin123');
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');

  await request(baseUrl, '/codepulse/terms?courseId=13', admin);
  const classroomResponse = await request(baseUrl, '/codepulse/classrooms?courseId=13', admin);
  assert.equal(classroomResponse.status, 200);
  assert.equal((await request(baseUrl, '/codepulse/workspaces/workspace-1', student)).status, 200);
  const classrooms = await readJson(dataDirectory, 'codepulse-classrooms.json');
  const controlClassroom = { ...classrooms[0], id: 'class-reset-control', termId: 'term-reset-control', name: 'Reset control classroom' };
  classrooms.push(controlClassroom);
  await writeJson(dataDirectory, 'codepulse-classrooms.json', classrooms);

  const workspaces = await readJson(dataDirectory, 'codepulse-workspaces.json');
  const controlWorkspace = {
    id: 'workspace-reset-control', classroomId: controlClassroom.id, termId: controlClassroom.termId,
    assignmentId: 'problem-1', ownerEmail: 'student@gmail.com', sourceCode: 'control', revision: 0,
  };
  workspaces.push(controlWorkspace);
  await writeJson(dataDirectory, 'codepulse-workspaces.json', workspaces);
  await writeJson(dataDirectory, 'codepulse-terms.json', [
    ...(await readJson(dataDirectory, 'codepulse-terms.json')),
    {
      id: controlClassroom.termId, courseId: '13', name: 'Reset control term',
      startDate: '2026-01-01', endDate: '2027-01-01', resetDate: '2027-01-02', status: 'ACTIVE',
    },
  ]);

  await writeJson(dataDirectory, 'submissions.json', [
    { kind: 'CODE_SUBMISSION', id: 'submission-reset-target', termId: 'term-2026-1', classroomId: 'class-1', workspaceId: 'workspace-1', sourceCode: 'target' },
    { kind: 'CODE_SUBMISSION', id: 'submission-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id, workspaceId: controlWorkspace.id, sourceCode: 'control' },
  ]);
  await writeJson(dataDirectory, 'codepulse-grading-jobs.json', [
    { id: 'grading-job-reset-target', submissionId: 'submission-reset-target', state: 'COMPLETED' },
    { id: 'grading-job-reset-control', submissionId: 'submission-reset-control', state: 'COMPLETED' },
  ]);
  await writeJson(dataDirectory, 'codepulse-judgments.json', [
    { id: 'judgment-reset-target', submissionId: 'submission-reset-target', status: 'COMPLETED' },
    { id: 'judgment-reset-control', submissionId: 'submission-reset-control', status: 'COMPLETED' },
  ]);
  await writeJson(dataDirectory, 'codepulse-submissions.json', [
    { id: 'codepulse-submission-reset-target', termId: 'term-2026-1', classroomId: 'class-1' },
    { id: 'codepulse-submission-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id },
  ]);
  await writeJson(dataDirectory, 'codepulse-snapshots.json', [
    { id: 'snapshot-reset-target', termId: 'term-2026-1', classroomId: 'class-1', workspaceId: 'workspace-1' },
    { id: 'snapshot-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id, workspaceId: controlWorkspace.id },
  ]);
  await writeJson(dataDirectory, 'codepulse-activities.json', [
    { id: 'activity-reset-target', termId: 'term-2026-1', classroomId: 'class-1' },
    { id: 'activity-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id },
  ]);
  await writeJson(dataDirectory, 'codepulse-executions.json', [
    { id: 'execution-reset-target', termId: 'term-2026-1', classroomId: 'class-1', workspaceId: 'workspace-1', state: 'FINISHED' },
    { id: 'execution-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id, workspaceId: controlWorkspace.id, state: 'FINISHED' },
  ]);
  await writeJson(dataDirectory, 'codepulse-student-submissions/reset-fixture.json', [
    { id: 'student-submission-reset-target', termId: 'term-2026-1', classroomId: 'class-1' },
    { id: 'student-submission-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id },
  ]);
  await writeJson(dataDirectory, 'codepulse-issue-detection.json', {
    assessments: [
      { id: 'assessment-reset-target', classroomId: 'class-1', workspaceId: 'workspace-1', state: 'EVALUATED' },
      { id: 'assessment-reset-control', classroomId: controlClassroom.id, workspaceId: controlWorkspace.id, state: 'EVALUATED' },
    ],
    issueCases: [
      { id: 'case-reset-target', classroomId: 'class-1', workspaceId: 'workspace-1', status: 'ACTIVE' },
      { id: 'case-reset-control', classroomId: controlClassroom.id, workspaceId: controlWorkspace.id, status: 'ACTIVE' },
    ],
    caseEvidence: [
      { id: 'evidence-reset-target', caseId: 'case-reset-target', assessmentId: 'assessment-reset-target' },
      { id: 'evidence-reset-control', caseId: 'case-reset-control', assessmentId: 'assessment-reset-control' },
    ],
    problemTypes: [],
    caseTests: [
      { id: 'case-test-reset-target', caseId: 'case-reset-target' },
      { id: 'case-test-reset-control', caseId: 'case-reset-control' },
    ],
  });

  const unauthorized = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/start', student, 'POST');
  assert.equal(unauthorized.status, 403);
  const endTerm = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'PATCH', {
    patch: { status: 'ENDED', startDate: '2019-01-01', endDate: '2020-01-01', resetDate: '2030-01-01' },
  });
  assert.equal(endTerm.status, 200);
  const beforeBoundary = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/start', admin, 'POST');
  assert.equal(beforeBoundary.status, 409);
  assert.equal(beforeBoundary.data.code, 'RESET_BOUNDARY_NOT_REACHED');
  const moveResetBoundary = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'PATCH', {
    patch: { resetDate: '2020-01-01' },
  });
  assert.equal(moveResetBoundary.status, 200);
  const started = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/start', admin, 'POST');
  assert.equal(started.status, 200);
  assert.equal(started.data.item.status, 'RESETTING');
  const bypassResetTransition = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'PATCH', {
    patch: { status: 'RESETDONE' },
  });
  assert.equal(bypassResetTransition.status, 409);

  const blockedWorkspace = await request(baseUrl, '/codepulse/workspaces/workspace-1', student, 'PATCH', { patch: { sourceCode: 'blocked' } });
  assert.equal(blockedWorkspace.status, 409);
  const blockedRun = await request(baseUrl, '/codepulse/workspaces/workspace-1/execute', student, 'POST', { sourceCode: 'print("blocked")' });
  assert.equal(blockedRun.status, 409);
  const blockedSubmission = await request(baseUrl, '/codepulse/workspaces/workspace-1/submissions', student, 'POST', {
    sourceCode: 'print("blocked")', requestKey: 'reset-blocked-submission',
  });
  assert.equal(blockedSubmission.status, 409);

  const executed = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/execute', admin, 'POST');
  assert.equal(executed.status, 200);
  assert.equal(executed.data.item.status, 'RESETDONE');
  assert.equal(executed.data.resetRecord.status, 'COMPLETE');
  assert.ok(executed.data.resetRecord.affectedRowCounts.workspaces >= 1);
  assert.equal(executed.data.resetRecord.reconciliation.problemBank, true);
  assert.equal(executed.data.resetRecord.reconciliation.grading, true);
  assert.equal(executed.data.resetRecord.reconciliation.issueDetection, true);
  assert.equal((await readJson(dataDirectory, 'submissions.json')).some((item) => item.id === 'submission-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'submissions.json')).some((item) => item.id === 'submission-reset-control'), true);
  assert.equal((await readJson(dataDirectory, 'codepulse-grading-jobs.json')).some((item) => item.id === 'grading-job-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'codepulse-grading-jobs.json')).some((item) => item.id === 'grading-job-reset-control'), true);
  assert.equal((await readJson(dataDirectory, 'codepulse-judgments.json')).some((item) => item.id === 'judgment-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'codepulse-judgments.json')).some((item) => item.id === 'judgment-reset-control'), true);
  assert.equal((await readJson(dataDirectory, 'codepulse-submissions.json')).some((item) => item.id === 'codepulse-submission-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'codepulse-submissions.json')).some((item) => item.id === 'codepulse-submission-reset-control'), true);
  assert.equal((await readJson(dataDirectory, 'codepulse-snapshots.json')).some((item) => item.id === 'snapshot-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'codepulse-snapshots.json')).some((item) => item.id === 'snapshot-reset-control'), true);
  assert.equal((await readJson(dataDirectory, 'codepulse-activities.json')).some((item) => item.id === 'activity-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'codepulse-activities.json')).some((item) => item.id === 'activity-reset-control'), true);
  assert.equal((await readJson(dataDirectory, 'codepulse-executions.json')).some((item) => item.id === 'execution-reset-target'), false);
  assert.equal((await readJson(dataDirectory, 'codepulse-executions.json')).some((item) => item.id === 'execution-reset-control'), true);
  assert.deepEqual(await readJson(dataDirectory, 'codepulse-student-submissions/reset-fixture.json'), [
    { id: 'student-submission-reset-control', termId: controlClassroom.termId, classroomId: controlClassroom.id },
  ]);
  const issueData = await readJson(dataDirectory, 'codepulse-issue-detection.json');
  assert.equal(issueData.assessments.some((item) => item.id === 'assessment-reset-target'), false);
  assert.equal(issueData.assessments.some((item) => item.id === 'assessment-reset-control'), true);
  assert.equal(issueData.issueCases.some((item) => item.id === 'case-reset-target'), false);
  assert.equal(issueData.issueCases.some((item) => item.id === 'case-reset-control'), true);
  assert.equal(issueData.caseEvidence.some((item) => item.id === 'evidence-reset-target'), false);
  assert.equal(issueData.caseEvidence.some((item) => item.id === 'evidence-reset-control'), true);
  assert.equal(issueData.caseTests.some((item) => item.id === 'case-test-reset-target'), false);
  assert.equal(issueData.caseTests.some((item) => item.id === 'case-test-reset-control'), true);

  const purgedWorkspace = await request(baseUrl, '/codepulse/workspaces/workspace-1', student);
  assert.equal(purgedWorkspace.status, 404);

  const records = await request(baseUrl, '/codepulse/terms/term-2026-1/reset-records', lecturer);
  assert.equal(records.status, 200);
  assert.ok(records.data.items.some((record) =>
    record.id === executed.data.resetRecord.id && record.status === 'COMPLETE'));

  const acknowledgement = await request(
    baseUrl,
    `/codepulse/terms/term-2026-1/reset-records/${executed.data.resetRecord.id}/acknowledge`,
    lecturer,
    'POST',
  );
  assert.equal(acknowledgement.status, 200);
  assert.ok(acknowledgement.data.item.acknowledgements.some((entry) =>
    entry.acknowledgedBy === 'lecturer@gmail.com'));

  const lockedDateUpdate = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'PATCH', {
    patch: { startDate: '2027-01-01', endDate: '2027-05-01', resetDate: '2027-05-02' },
  });
  assert.equal(lockedDateUpdate.status, 409);

  const lockedDelete = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'DELETE');
  assert.equal(lockedDelete.status, 409);
});
