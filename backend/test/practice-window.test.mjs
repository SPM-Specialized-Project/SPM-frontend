import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startBackend(t) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-practice-window-'));
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
    server.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });
  return { baseUrl: `http://127.0.0.1:${port}`, dataDirectory };
}

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

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const waitUntil = async (timestamp) => {
  while (Date.now() < timestamp) {
    await wait(Math.min(100, timestamp - Date.now()));
  }
};

test('SCRUM-66: practice windows stay open outside LAB hours and enforce server deadlines', async (t) => {
  const { baseUrl, dataDirectory } = await startBackend(t);
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const admin = await login(baseUrl, 'admin@gmail.com', 'admin123');
  const labsRoute = '/api/codepulse/classrooms/class-1/labs';
  const now = Date.now();
  const lab = await request(baseUrl, labsRoute, lecturer, 'POST', {
    name: 'LAB 01 · Homework window',
    description: 'Physical session already ended; practice remains available.',
    startAt: new Date(now - 6 * 60 * 60_000).toISOString(),
    endAt: new Date(now - 60 * 60_000).toISOString(),
    assignments: [{
      assignmentVersionId: 'problem-1-v1',
      mandatory: true,
      openAt: new Date(now - 60 * 60_000).toISOString(),
      closeAt: new Date(now + 60 * 60_000).toISOString(),
    }],
  });
  assert.equal(lab.status, 201);
  assert.equal(lab.data.item.assignments[0].practiceWindowStatus, 'OPEN');
  assert.notEqual(lab.data.item.assignments[0].openAt, lab.data.item.startAt);

  const labId = lab.data.item.id;
  const labAssignmentId = lab.data.item.assignments[0].id;
  const simultaneousWindowUpdates = await Promise.all([
    request(baseUrl, `${labsRoute}/${labId}/assignments/${labAssignmentId}/practice-window`, lecturer, 'PATCH', {
      closeAt: new Date(now + 90 * 60_000).toISOString(),
      expectedVersion: lab.data.item.assignments[0].practiceWindowVersion,
    }),
    request(baseUrl, `${labsRoute}/${labId}/assignments/${labAssignmentId}/practice-window`, lecturer, 'PATCH', {
      closeAt: new Date(now + 90 * 60_000).toISOString(),
      expectedVersion: lab.data.item.assignments[0].practiceWindowVersion,
    }),
  ]);
  assert.deepEqual(simultaneousWindowUpdates.map((item) => item.status).sort(), [200, 409]);
  assert.equal(simultaneousWindowUpdates.find((item) => item.status === 409).data.code, 'STALE_PRACTICE_WINDOW');
  const currentWindow = simultaneousWindowUpdates.find((item) => item.status === 200).data.item;
  const live = await request(baseUrl, `${labsRoute}/${labId}`, lecturer, 'PATCH', { status: 'LIVE', expectedStateVersion: lab.data.item.stateVersion });
  assert.equal(live.status, 200);
  const ended = await request(baseUrl, `${labsRoute}/${labId}`, lecturer, 'PATCH', { status: 'ENDED', expectedStateVersion: live.data.item.stateVersion });
  assert.equal(ended.status, 200);

  const studentLabs = await request(baseUrl, labsRoute, student);
  assert.equal(studentLabs.status, 200);
  assert.equal(studentLabs.data.items.length, 1);
  assert.equal(studentLabs.data.items[0].status, 'ENDED');
  assert.equal(studentLabs.data.items[0].assignments[0].practiceAccess, 'OPEN');
  assert.equal(studentLabs.data.items[0].assignments[0].activityContext, 'OUTSIDE_LAB');

  const workspaceRoute = `/api/codepulse/classrooms/class-1/workspace?labId=${encodeURIComponent(labId)}&labAssignmentId=${encodeURIComponent(labAssignmentId)}`;
  const workspace = await request(baseUrl, workspaceRoute, student);
  assert.equal(workspace.status, 200);
  assert.equal(workspace.data.practiceWindow.activityContext, 'OUTSIDE_LAB');
  const workspaceId = workspace.data.item.id;

  const saved = await request(baseUrl, `/api/codepulse/workspaces/${workspaceId}`, student, 'PATCH', {
    sourceCode: 'print(input())',
  });
  assert.equal(saved.status, 200);

  const run = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/assignments/problem-1/run?labId=${encodeURIComponent(labId)}&labAssignmentId=${encodeURIComponent(labAssignmentId)}`,
    student,
    'POST',
    { sourceCode: 'print(input())' },
  );
  assert.equal(run.status, 200);
  assert.equal(run.data.item.passedCount, 1);

  const accepted = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${labId}/assignments/${labAssignmentId}/submit`,
    student,
    'POST',
    { sourceCode: 'print(input())', acceptedAt: new Date(now - 10 * 60_000).toISOString() },
  );
  assert.equal(accepted.status, 201);
  assert.equal(accepted.data.item.activityContext, 'OUTSIDE_LAB');
  assert.notEqual(accepted.data.item.acceptedAt, new Date(now - 10 * 60_000).toISOString());
  assert.equal(accepted.data.item.aiAnalysis.outsideLabSupported, true);
  assert.equal(accepted.data.item.notification.status, 'QUEUED');
  assert.equal((await request(baseUrl, `/api/codepulse/classrooms/class-1/labs/${labId}/assignments/${labAssignmentId}/submit`, admin, 'POST', { sourceCode: 'print(input())' })).status, 403);

  const termsFile = path.join(dataDirectory, 'codepulse-terms.json');
  const terms = JSON.parse(await readFile(termsFile, 'utf8'));
  const activeTerm = terms.find((item) => item.id === 'term-2026-1');
  activeTerm.status = 'COMPLETED';
  await writeFile(termsFile, `${JSON.stringify(terms, null, 2)}\n`, 'utf8');
  const inactiveTermSubmission = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${labId}/assignments/${labAssignmentId}/submit`,
    student,
    'POST',
    { sourceCode: 'print(input())' },
  );
  assert.equal(inactiveTermSubmission.status, 403);
  const inactiveTermSave = await request(
    baseUrl,
    `/api/codepulse/workspaces/${workspaceId}`,
    student,
    'PATCH',
    { sourceCode: 'must not save in inactive term' },
  );
  assert.equal(inactiveTermSave.status, 403);
  assert.equal(inactiveTermSave.data.code, 'PRACTICE_TERM_INACTIVE');
  activeTerm.status = 'ACTIVE';
  await writeFile(termsFile, `${JSON.stringify(terms, null, 2)}\n`, 'utf8');

  const closed = await request(
    baseUrl,
    `${labsRoute}/${labId}/assignments/${labAssignmentId}/practice-window`,
    lecturer,
    'PATCH',
    { status: 'CLOSED', expectedVersion: currentWindow.practiceWindowVersion },
  );
  assert.equal(closed.status, 200);
  assert.equal(closed.data.item.practiceWindowStatus, 'CLOSED');
  assert.equal((await request(baseUrl, `/api/codepulse/workspaces/${workspaceId}`, student, 'PATCH', { sourceCode: 'print("blocked")' })).status, 403);
  assert.equal((await request(baseUrl, `/api/codepulse/classrooms/class-1/labs/${labId}/assignments/${labAssignmentId}/submit`, student, 'POST', { sourceCode: 'print(input())' })).status, 403);

  const reopenedCloseAt = new Date(Date.now() + 3_000).toISOString();
  const reopened = await request(
    baseUrl,
    `${labsRoute}/${labId}/assignments/${labAssignmentId}/practice-window`,
    lecturer,
    'PATCH',
    { status: 'OPEN', closeAt: reopenedCloseAt, expectedVersion: closed.data.item.practiceWindowVersion },
  );
  assert.equal(reopened.status, 200);
  assert.equal(reopened.data.item.practiceWindowStatus, 'OPEN');

  const closeTimestamp = Date.parse(reopened.data.item.closeAt);
  await waitUntil(closeTimestamp - 1_000);
  const beforeClose = await request(baseUrl, `/api/codepulse/classrooms/class-1/labs/${labId}/assignments/${labAssignmentId}/submit`, student, 'POST', { sourceCode: 'print(input())' });
  assert.equal(beforeClose.status, 201);
  await waitUntil(closeTimestamp + 1_000);
  const afterClose = await request(baseUrl, `/api/codepulse/classrooms/class-1/labs/${labId}/assignments/${labAssignmentId}/submit`, student, 'POST', { sourceCode: 'print(input())' });
  assert.equal(afterClose.status, 403);
  assert.equal(afterClose.data.code, 'PRACTICE_WINDOW_CLOSED');

  const audit = await request(baseUrl, `/api/codepulse/practice-window-audit?labId=${encodeURIComponent(labId)}`, admin);
  assert.equal(audit.status, 200);
  assert.deepEqual(audit.data.items.map((item) => item.action), ['CREATE', 'UPDATE', 'CLOSE', 'REOPEN']);
  const activities = await request(baseUrl, `/api/codepulse/practice-activities?labId=${encodeURIComponent(labId)}`, admin);
  assert.equal(activities.status, 200);
  assert.ok(activities.data.items.some((item) => item.type === 'SAVE' && item.activityContext === 'OUTSIDE_LAB'));
  assert.ok(activities.data.items.some((item) => item.type === 'RUN' && item.activityContext === 'OUTSIDE_LAB'));
  assert.ok(activities.data.items.some((item) => item.type === 'SUBMIT' && item.activityContext === 'OUTSIDE_LAB'));

  const inLabStartAt = new Date(Date.now() - 60_000).toISOString();
  const inLabEndAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const inLab = await request(baseUrl, labsRoute, lecturer, 'POST', {
    id: 'lab-in-lab-activity',
    name: 'LAB 02 · In-Lab activity tag',
    startAt: inLabStartAt,
    endAt: inLabEndAt,
    assignments: [{
      assignmentVersionId: 'problem-1-v1',
      mandatory: true,
      openAt: inLabStartAt,
      closeAt: inLabEndAt,
    }],
  });
  assert.equal(inLab.status, 201);
  const inLabAssignmentId = inLab.data.item.assignments[0].id;
  const inLabSubmission = await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${inLab.data.item.id}/assignments/${inLabAssignmentId}/submit`,
    student,
    'POST',
    { sourceCode: 'print(input())' },
  );
  assert.equal(inLabSubmission.status, 201);
  assert.equal(inLabSubmission.data.item.activityContext, 'IN_LAB');

  const concurrentLab = await request(baseUrl, labsRoute, lecturer, 'POST', {
    id: 'lab-state-concurrency',
    name: 'LAB 03 · Concurrent transition',
    startAt: inLabStartAt,
    endAt: inLabEndAt,
    assignments: [{
      assignmentVersionId: 'problem-1-v1',
      mandatory: true,
      openAt: inLabStartAt,
      closeAt: inLabEndAt,
    }],
  });
  assert.equal(concurrentLab.status, 201);
  const stateRaces = await Promise.all([
    request(baseUrl, `${labsRoute}/${concurrentLab.data.item.id}`, lecturer, 'PATCH', { status: 'LIVE', expectedStateVersion: 0 }),
    request(baseUrl, `${labsRoute}/${concurrentLab.data.item.id}`, lecturer, 'PATCH', { status: 'CANCELLED', expectedStateVersion: 0 }),
  ]);
  assert.deepEqual(stateRaces.map((item) => item.status).sort(), [200, 409]);
  assert.equal(stateRaces.find((item) => item.status === 409).data.code, 'STALE_LAB_STATE');

  const submissions = JSON.parse(await readFile(path.join(dataDirectory, 'codepulse-submissions.json'), 'utf8'));
  assert.ok(submissions.every((item) => item.acceptedAt));
});
