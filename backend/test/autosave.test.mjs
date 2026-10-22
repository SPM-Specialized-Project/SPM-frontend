import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');

test('US-006.1 autosaves create durable, ordered revisions and reject stale writes', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-autosave-test-'));
  const server = spawn(process.execPath, [serverFile], {
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    server.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(Number(match[1]));
    });
  });
  const api = async (url, token, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };
  const login = async (email, password) => {
    const result = await api('/api/auth/login', null, 'POST', { email, password });
    assert.equal(result.status, 200);
    return result.data.accessToken;
  };

  const student = await login('student@gmail.com', 'student123');
  const lecturer = await login('lecturer@gmail.com', 'lecturer123');
  const workspaceResponse = await api(
    '/api/codepulse/classrooms/class-1/workspace?assignmentId=problem-1',
    student,
  );
  const workspace = workspaceResponse.data.item;
  assert.equal(workspace.revision, 0);

  const missingBaseRevision = await api(`/api/codepulse/workspaces/${workspace.id}`, student, 'PATCH', {
    sourceCode: 'print("must include base revision")',
  });
  assert.equal(missingBaseRevision.status, 400);
  assert.equal(missingBaseRevision.data.code, 'BASE_REVISION_REQUIRED');

  const firstSave = await api(`/api/codepulse/workspaces/${workspace.id}`, student, 'PATCH', {
    sourceCode: 'print("revision one")',
    baseRevision: workspace.revision,
  });
  assert.equal(firstSave.status, 200);
  assert.equal(firstSave.data.item.revision, 1);
  assert.ok(firstSave.data.item.updatedAt);

  const staleSave = await api(`/api/codepulse/workspaces/${workspace.id}`, student, 'PATCH', {
    sourceCode: 'print("stale overwrite")',
    baseRevision: workspace.revision,
  });
  assert.equal(staleSave.status, 409);
  assert.equal(staleSave.data.code, 'REVISION_CONFLICT');
  assert.equal(staleSave.data.currentRevision, 1);

  const concurrentSaves = await Promise.all([
    api(`/api/codepulse/workspaces/${workspace.id}`, student, 'PATCH', {
      sourceCode: 'print("concurrent one")',
      baseRevision: 1,
    }),
    api(`/api/codepulse/workspaces/${workspace.id}`, student, 'PATCH', {
      sourceCode: 'print("concurrent two")',
      baseRevision: 1,
    }),
  ]);
  assert.deepEqual(concurrentSaves.map((result) => result.status).sort(), [200, 409]);

  const storedWorkspaces = JSON.parse(
    await readFile(path.join(dataDirectory, 'codepulse-workspaces.json'), 'utf8'),
  );
  const storedWorkspace = storedWorkspaces.find((item) => item.id === workspace.id);
  assert.equal(storedWorkspace.revision, 2);
  assert.deepEqual(storedWorkspace.revisions.map((revision) => revision.revision), [1, 2]);

  const lecturerWorkspace = await api(`/api/codepulse/workspaces/${workspace.id}`, lecturer);
  assert.equal(lecturerWorkspace.data.item.revision, 2);
  assert.equal(lecturerWorkspace.data.item.updatedAt, storedWorkspace.updatedAt);
  assert.equal('revisions' in lecturerWorkspace.data.item, false);
});
