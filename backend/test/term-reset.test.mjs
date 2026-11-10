import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
  return `http://127.0.0.1:${port}/api`;
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

test('term reset blocks writes, purges student data and records audit', async (t) => {
  const baseUrl = await startBackend(t);
  const admin = await login(baseUrl, 'admin@gmail.com', 'admin123');
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');

  const unauthorized = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/start', student, 'POST');
  assert.equal(unauthorized.status, 403);
  const endTerm = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'PATCH', {
    patch: { status: 'ENDED', startDate: '2019-01-01', endDate: '2020-01-01', resetDate: '2020-01-01' },
  });
  assert.equal(endTerm.status, 200);
  const started = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/start', admin, 'POST');
  assert.equal(started.status, 200);
  assert.equal(started.data.item.status, 'RESETTING');
  const bypassResetTransition = await request(baseUrl, '/codepulse/terms/term-2026-1', admin, 'PATCH', {
    patch: { status: 'RESETDONE' },
  });
  assert.equal(bypassResetTransition.status, 409);

  const blockedWorkspace = await request(baseUrl, '/codepulse/workspaces/workspace-1', student, 'PATCH', { patch: { sourceCode: 'blocked' } });
  assert.equal(blockedWorkspace.status, 409);

  const executed = await request(baseUrl, '/codepulse/terms/term-2026-1/reset/execute', admin, 'POST');
  assert.equal(executed.status, 200);
  assert.equal(executed.data.item.status, 'RESETDONE');
  assert.equal(executed.data.resetRecord.status, 'COMPLETE');
  assert.ok(executed.data.resetRecord.affectedRowCounts.workspaces >= 1);
  assert.equal(executed.data.resetRecord.reconciliation.problemBank, true);

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
