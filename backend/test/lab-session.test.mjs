import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startBackend(t) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-lab-session-'));
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

test('SCRUM-65: create a LAB with ordered pinned problems and isolated workspaces', async (t) => {
  const { baseUrl, dataDirectory } = await startBackend(t);
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const admin = await login(baseUrl, 'admin@gmail.com', 'admin123');
  const tutor = await login(baseUrl, 'tutor@gmail.com', 'tutor123');
  const labsRoute = '/api/codepulse/classrooms/class-1/labs';
  const labStart = new Date(Date.now() - 60 * 60_000).toISOString();
  const labEnd = new Date(Date.now() + 5 * 60 * 60_000).toISOString();
  const secondProblemStart = new Date(Date.now() - 30 * 60_000).toISOString();
  const practiceCloseAt = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString();

  const versions = await request(baseUrl, '/api/codepulse/classrooms/class-1/assignment-versions', lecturer);
  assert.equal(versions.status, 200);
  assert.equal(versions.data.items.length, 3);
  assert.ok(versions.data.items.every((item) => item.status === 'PUBLISHED'));
  const studentVersions = await request(baseUrl, '/api/codepulse/classrooms/class-1/assignment-versions', student);
  assert.equal(JSON.stringify(studentVersions.data).includes('Update both next and previous'), false);
  assert.equal(JSON.stringify(studentVersions.data).includes('starterCode'), false);

  const emptyLab = await request(baseUrl, labsRoute, lecturer, 'POST', {
    name: 'Empty LAB',
    startAt: labStart,
    endAt: labEnd,
    assignments: [],
  });
  assert.equal(emptyLab.status, 422);
  assert.match(emptyLab.data.errors.assignments, /at least one/i);

  const unpublished = await request(baseUrl, labsRoute, lecturer, 'POST', {
    name: 'Invalid LAB',
    startAt: labStart,
    endAt: labEnd,
    assignments: [{
      assignmentVersionId: 'problem-draft-v1',
      mandatory: true,
      practiceStartAt: labStart,
      practiceEndAt: labEnd,
    }],
  });
  assert.equal(unpublished.status, 422);

  const payload = {
    name: 'LAB 01 - Linked structures',
    description: 'Five-hour practice session.',
    startAt: labStart,
    endAt: labEnd,
    assignments: [
      { assignmentVersionId: 'problem-2-v2', mandatory: true, openAt: labStart, closeAt: practiceCloseAt },
      { assignmentVersionId: 'problem-1-v1', mandatory: false, openAt: secondProblemStart, closeAt: practiceCloseAt },
    ],
  };
  assert.equal((await request(baseUrl, labsRoute, student, 'POST', payload)).status, 403);
  assert.equal((await request(baseUrl, labsRoute, admin, 'POST', payload)).status, 403);
  const tutorAliasValidation = await request(baseUrl, labsRoute, tutor, 'POST', {
    ...payload,
    name: 'Tutor alias validation',
    assignments: [],
  });
  assert.equal(tutorAliasValidation.status, 422);

  const created = await request(baseUrl, labsRoute, lecturer, 'POST', payload);
  assert.equal(created.status, 201);
  assert.equal(created.data.item.status, 'SCHEDULED');
  assert.deepEqual(created.data.item.assignments.map((item) => item.order), [1, 2]);
  assert.deepEqual(created.data.item.assignments.map((item) => item.assignmentVersionId), ['problem-2-v2', 'problem-1-v1']);
  assert.deepEqual(created.data.item.assignments.map((item) => item.title), ['Doubly Linked List', 'Singly Linked List']);

  const cancelledCandidate = await request(baseUrl, labsRoute, lecturer, 'POST', { ...payload, id: 'lab-cancelled', name: 'Cancelled LAB' });
  const cancelled = await request(baseUrl, `${labsRoute}/${cancelledCandidate.data.item.id}`, lecturer, 'PATCH', { status: 'CANCELLED', expectedStateVersion: cancelledCandidate.data.item.stateVersion });
  assert.equal(cancelled.data.item.status, 'CANCELLED');
  assert.equal((await request(baseUrl, `${labsRoute}/${cancelledCandidate.data.item.id}`, lecturer, 'PATCH', { status: 'LIVE', expectedStateVersion: cancelled.data.item.stateVersion })).status, 409);

  assert.equal((await request(baseUrl, labsRoute, student)).data.items.length, 2);
  assert.equal((await request(baseUrl, labsRoute, admin)).data.items.length, 2);

  const assignmentFile = path.join(dataDirectory, 'codepulse-assignment-versions.json');
  const storedVersions = JSON.parse(await readFile(assignmentFile, 'utf8'));
  storedVersions.find((item) => item.id === 'problem-2-v2').title = 'Changed in problem bank';
  await writeFile(assignmentFile, `${JSON.stringify(storedVersions, null, 2)}\n`, 'utf8');
  const pinnedLab = await request(baseUrl, labsRoute, lecturer);
  assert.equal(pinnedLab.data.items[0].assignments[0].title, 'Doubly Linked List');

  const labId = created.data.item.id;
  const live = await request(baseUrl, `${labsRoute}/${labId}`, lecturer, 'PATCH', { status: 'LIVE', expectedStateVersion: created.data.item.stateVersion });
  assert.equal(live.status, 200);
  const studentLabs = await request(baseUrl, labsRoute, student);
  const studentLab = studentLabs.data.items.find((item) => item.id === labId);
  assert.ok(studentLab);
  const [first, second] = studentLab.assignments;
  assert.notEqual(first.workspaceId, second.workspaceId);

  const firstWorkspace = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}`, student);
  const secondWorkspace = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(second.workspaceId)}`, student);
  assert.equal(firstWorkspace.status, 200);
  assert.equal(secondWorkspace.status, 200);
  assert.equal(firstWorkspace.data.item.problem.title, 'Doubly Linked List');
  assert.equal(firstWorkspace.data.item.executionResult, null);
  assert.ok(firstWorkspace.data.item.problem.hints.every((hint) => !hint.revealed && !('content' in hint)));
  await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}`, student, 'PATCH', { sourceCode: 'first problem solution' });
  assert.equal((await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}`, student)).data.item.sourceCode, 'first problem solution');
  assert.match((await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(second.workspaceId)}`, student)).data.item.sourceCode, /singly linked list/);

  const executed = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}/execute`, student, 'POST', { sourceCode: 'print("first")' });
  assert.equal(executed.status, 200);
  assert.equal(executed.data.item.executionResult.status, 'COMPLETED');
  assert.equal((await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(second.workspaceId)}`, student)).data.item.executionResult, null);

  const firstHintId = firstWorkspace.data.item.problem.hints[0].id;
  const revealed = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}/hints/${firstHintId}`, student, 'POST');
  assert.equal(revealed.status, 200);
  assert.equal(revealed.data.item.problem.hints[0].revealed, true);
  assert.ok(revealed.data.item.problem.hints[0].content);
  assert.ok((await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(second.workspaceId)}`, student)).data.item.problem.hints.every((hint) => !hint.revealed));

  const ended = await request(baseUrl, `${labsRoute}/${labId}`, lecturer, 'PATCH', { status: 'ENDED', expectedStateVersion: live.data.item.stateVersion });
  assert.equal(ended.status, 200);
  const endedStudentLabs = await request(baseUrl, labsRoute, student);
  assert.equal(endedStudentLabs.data.items.find((item) => item.id === labId).status, 'ENDED');
  const preserved = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}`, student);
  assert.equal(preserved.data.item.sourceCode, 'print("first")');
  assert.equal(preserved.data.item.executionResult.status, 'COMPLETED');
  assert.equal(preserved.data.item.problem.hints[0].revealed, true);
  const homeworkSave = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}`, student, 'PATCH', { sourceCode: 'homework solution after LAB' });
  assert.equal(homeworkSave.status, 200);
  const homeworkRun = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}/execute`, student, 'POST', { sourceCode: 'print("homework")' });
  assert.equal(homeworkRun.status, 200);
  assert.equal(homeworkRun.data.item.executionResult.status, 'COMPLETED');
  const homeworkHint = await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}/hints/${firstHintId}`, student, 'POST');
  assert.equal(homeworkHint.status, 200);
  assert.equal((await request(baseUrl, `/api/codepulse/workspaces/${encodeURIComponent(first.workspaceId)}`, student)).data.item.sourceCode, 'print("homework")');
  assert.equal((await request(baseUrl, `${labsRoute}/${labId}`, lecturer, 'PATCH', { status: 'LIVE', expectedStateVersion: ended.data.item.stateVersion })).status, 409);
});
