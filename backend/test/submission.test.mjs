import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startBackend(t) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-submission-'));
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

async function createLiveLab(baseUrl, lecturer, student, { startAt, endAt }) {
  const created = await request(
    baseUrl,
    '/api/codepulse/classrooms/class-1/labs',
    lecturer,
    'POST',
    {
      name: 'SCRUM-73 immutable submission LAB',
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
  assert.equal(created.status, 201);
  const labId = created.data.item.id;
  assert.equal((await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${labId}`,
    lecturer,
    'PATCH',
    { status: 'LIVE' },
  )).status, 200);
  const labs = await request(baseUrl, '/api/codepulse/classrooms/class-1/labs', student);
  const lab = labs.data.items.find((item) => item.id === labId);
  assert.ok(lab);
  return { lab, workspaceId: lab.assignments[0].workspaceId };
}

test('SCRUM-73: accepts the current editor source as an immutable version-pinned snapshot', async (t) => {
  const { baseUrl, dataDirectory } = await startBackend(t);
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const now = Date.now();
  const { workspaceId } = await createLiveLab(baseUrl, lecturer, student, {
    startAt: new Date(now - 60_000).toISOString(),
    endAt: new Date(now + 60_000).toISOString(),
  });

  await request(baseUrl, `/api/codepulse/workspaces/${workspaceId}`, student, 'PATCH', {
    sourceCode: 'print("stale autosave")',
  });
  const beforeRequest = Date.now();
  const accepted = await request(
    baseUrl,
    `/api/codepulse/workspaces/${workspaceId}/submissions`,
    student,
    'POST',
    {
      sourceCode: 'print("official editor source")',
      assignmentVersionId: 'problem-1-v1',
      requestKey: 'scrum73-success-0001',
      studentId: 'forged-student',
      acceptedAt: '2000-01-01T00:00:00.000Z',
    },
  );
  const afterRequest = Date.now();
  assert.equal(accepted.status, 201);
  assert.equal(accepted.data.created, true);
  assert.match(accepted.data.item.id, /^submission-/);
  assert.equal(accepted.data.item.sourceCode, 'print("official editor source")');
  assert.equal(accepted.data.item.assignmentVersionId, 'problem-1-v1');
  assert.equal(accepted.data.item.assignmentVersion.version, 1);
  assert.equal(accepted.data.item.student.email, 'student@gmail.com');
  assert.equal(accepted.data.item.status, 'PENDING');
  assert.ok(Date.parse(accepted.data.item.acceptedAt) >= beforeRequest);
  assert.ok(Date.parse(accepted.data.item.acceptedAt) <= afterRequest);

  await request(baseUrl, `/api/codepulse/workspaces/${workspaceId}`, student, 'PATCH', {
    sourceCode: 'print("later workspace edit")',
  });
  const submissionId = accepted.data.item.id;
  const preserved = await request(baseUrl, `/api/codepulse/submissions/${submissionId}`, student);
  assert.equal(preserved.status, 200);
  assert.equal(preserved.data.item.sourceCode, 'print("official editor source")');

  const versionsFile = path.join(dataDirectory, 'codepulse-assignment-versions.json');
  const versions = JSON.parse(await readFile(versionsFile, 'utf8'));
  versions.find((item) => item.id === 'problem-1-v1').title = 'Mutated problem bank title';
  versions.push({ ...versions[0], id: 'problem-1-v2', version: 2, title: 'Version 2' });
  await writeFile(versionsFile, `${JSON.stringify(versions, null, 2)}\n`, 'utf8');
  const stillPinned = await request(baseUrl, `/api/codepulse/submissions/${submissionId}`, lecturer);
  assert.equal(stillPinned.status, 200);
  assert.equal(stillPinned.data.item.assignmentVersion.id, 'problem-1-v1');
  assert.equal(stillPinned.data.item.assignmentVersion.title, 'Singly Linked List');
  assert.equal((await request(
    baseUrl,
    `/api/submissions/${submissionId}`,
    lecturer,
    'PATCH',
    { sourceCode: 'tampered', score: 10 },
  )).status, 409);
});

test('SCRUM-73: enforces idempotency, payload conflicts and concurrent duplicate safety', async (t) => {
  const { baseUrl, dataDirectory } = await startBackend(t);
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const now = Date.now();
  const { lab, workspaceId } = await createLiveLab(baseUrl, lecturer, student, {
    startAt: new Date(now - 60_000).toISOString(),
    endAt: new Date(now + 60_000).toISOString(),
  });
  const route = `/api/codepulse/workspaces/${workspaceId}/submissions`;
  const payload = {
    sourceCode: 'print("one logical request")',
    assignmentVersionId: 'problem-1-v1',
    requestKey: 'scrum73-concurrent-0001',
  };

  const responses = await Promise.all([
    request(baseUrl, route, student, 'POST', payload),
    request(baseUrl, route, student, 'POST', payload),
    request(baseUrl, route, student, 'POST', payload),
  ]);
  assert.deepEqual(new Set(responses.map((item) => item.status)), new Set([200, 201]));
  assert.equal(new Set(responses.map((item) => item.data.item.id)).size, 1);
  assert.equal(responses.filter((item) => item.data.created).length, 1);

  assert.equal((await request(
    baseUrl,
    `/api/codepulse/classrooms/class-1/labs/${lab.id}`,
    lecturer,
    'PATCH',
    { status: 'ENDED' },
  )).status, 200);
  const retryAfterLabEnded = await request(baseUrl, route, student, 'POST', payload);
  assert.equal(retryAfterLabEnded.status, 200);
  assert.equal(retryAfterLabEnded.data.item.id, responses[0].data.item.id);
  assert.equal(retryAfterLabEnded.data.created, false);

  const conflict = await request(baseUrl, route, student, 'POST', {
    ...payload,
    sourceCode: 'print("different payload")',
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.code, 'IDEMPOTENCY_CONFLICT');

  const records = JSON.parse(await readFile(path.join(dataDirectory, 'submissions.json'), 'utf8'));
  assert.equal(records.filter((item) => item.kind === 'CODE_SUBMISSION').length, 1);
});

test('SCRUM-73: rejects invalid windows, mismatched versions and unauthorized workspaces', async (t) => {
  const { baseUrl } = await startBackend(t);
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const student2 = await login(baseUrl, 'student2@gmail.com', 'student2123');
  const now = Date.now();

  const future = await createLiveLab(baseUrl, lecturer, student, {
    startAt: new Date(now + 60_000).toISOString(),
    endAt: new Date(now + 120_000).toISOString(),
  });
  const futureResponse = await request(
    baseUrl,
    `/api/codepulse/workspaces/${future.workspaceId}/submissions`,
    student,
    'POST',
    { sourceCode: 'print(1)', assignmentVersionId: 'problem-1-v1', requestKey: 'scrum73-future-0001' },
  );
  assert.equal(futureResponse.status, 409);
  assert.equal(futureResponse.data.code, 'PRACTICE_WINDOW_NOT_OPEN');

  const past = await createLiveLab(baseUrl, lecturer, student, {
    startAt: new Date(now - 120_000).toISOString(),
    endAt: new Date(now - 60_000).toISOString(),
  });
  const pastResponse = await request(
    baseUrl,
    `/api/codepulse/workspaces/${past.workspaceId}/submissions`,
    student,
    'POST',
    { sourceCode: 'print(1)', assignmentVersionId: 'problem-1-v1', requestKey: 'scrum73-past-00001' },
  );
  assert.equal(pastResponse.status, 409);
  assert.equal(pastResponse.data.code, 'PRACTICE_WINDOW_CLOSED');

  const active = await createLiveLab(baseUrl, lecturer, student, {
    startAt: new Date(now - 60_000).toISOString(),
    endAt: new Date(now + 60_000).toISOString(),
  });
  const route = `/api/codepulse/workspaces/${active.workspaceId}/submissions`;
  assert.equal((await request(baseUrl, route, null, 'POST', {
    sourceCode: 'print(1)', assignmentVersionId: 'problem-1-v1', requestKey: 'scrum73-no-auth-001',
  })).status, 401);
  assert.equal((await request(baseUrl, route, student2, 'POST', {
    sourceCode: 'print(1)', assignmentVersionId: 'problem-1-v1', requestKey: 'scrum73-other-user01',
  })).status, 403);
  const mismatch = await request(baseUrl, route, student, 'POST', {
    sourceCode: 'print(1)', assignmentVersionId: 'problem-1-v2', requestKey: 'scrum73-version-0001',
  });
  assert.equal(mismatch.status, 409);
  assert.equal(mismatch.data.code, 'ASSIGNMENT_VERSION_MISMATCH');
  assert.equal((await request(baseUrl, route, student, 'POST', {
    sourceCode: 'print(1)', assignmentVersionId: 'problem-1-v1', requestKey: 'bad key',
  })).status, 400);
});
