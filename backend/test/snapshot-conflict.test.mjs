import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForHealth(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // Child process starting
    }
    await wait(50);
  }
  throw new Error('Node backend did not become healthy in time.');
}

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  return data.accessToken;
}

test('SCRUM-70: workspace snapshot immutability, revision tracking, and conflict detection', async (t) => {
  const port = 4200 + Math.floor(Math.random() * 500);
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-snapshot-test-'));
  const backend = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: String(port), BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: 'ignore',
  });

  t.after(async () => {
    backend.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  await waitForHealth(baseUrl);
  const studentToken = await login(baseUrl, 'student@gmail.com', 'student123');
  const headers = {
    Authorization: `Bearer ${studentToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Initial workspace check
  const wsRes = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1`, { headers });
  assert.equal(wsRes.status, 200);
  const wsData = await wsRes.json();
  assert.equal(wsData.item.id, 'workspace-1');
  assert.equal(wsData.item.revision, 1);

  // 2. Reconnect status endpoint (SCRUM-136)
  const statusRes = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1/status`, { headers });
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.item.revision, 1);
  assert.equal(statusData.item.workspaceId, 'workspace-1');

  // 3. Save with matching baseRevision (SCRUM-134, SCRUM-135)
  const save1 = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sourceCode: 'print("Tab 1 Edit")',
      baseRevision: 1,
    }),
  });
  assert.equal(save1.status, 200);
  const save1Data = await save1.json();
  assert.equal(save1Data.item.revision, 2);
  assert.equal(save1Data.item.sourceCode, 'print("Tab 1 Edit")');

  // 4. Verify snapshot was recorded (SCRUM-134)
  const snapRes = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1/snapshots`, { headers });
  assert.equal(snapRes.status, 200);
  const snapData = await snapRes.json();
  assert.equal(snapData.items.length, 1);
  assert.equal(snapData.items[0].revision, 2);
  assert.equal(snapData.items[0].trigger, 'SAVE');
  assert.equal(snapData.items[0].sourceCode, 'print("Tab 1 Edit")');
  assert.ok(snapData.items[0].hash);

  // 5. Stale save rejection / Conflict Detection (SCRUM-135, SCRUM-139)
  // Tab 2 attempts to save with outdated baseRevision: 1
  const staleSave = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sourceCode: 'print("Tab 2 Stale Overwrite Attempt")',
      baseRevision: 1, // outdated, server is at revision 2
    }),
  });
  assert.equal(staleSave.status, 409);
  const conflictData = await staleSave.json();
  assert.equal(conflictData.code, 'REVISION_CONFLICT');
  assert.equal(conflictData.details.conflict, true);
  assert.equal(conflictData.details.currentRevision, 2);
  assert.equal(conflictData.details.serverSourceCode, 'print("Tab 1 Edit")');

  // 6. Verify server code was NOT overwritten during conflict
  const verifyWs = await (await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1`, { headers })).json();
  assert.equal(verifyWs.item.sourceCode, 'print("Tab 1 Edit")');
  assert.equal(verifyWs.item.revision, 2);

  // 7. Tab 2 resolves conflict by advancing to currentRevision: 2
  const resolvedSave = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sourceCode: 'print("Tab 2 Resolved")',
      baseRevision: 2,
    }),
  });
  assert.equal(resolvedSave.status, 200);
  const resolvedData = await resolvedSave.json();
  assert.equal(resolvedData.item.revision, 3);
  assert.equal(resolvedData.item.sourceCode, 'print("Tab 2 Resolved")');

  // 8. Snapshot Immutability test (SCRUM-134, SCRUM-139)
  const deleteSnap = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1/snapshots`, {
    method: 'DELETE',
    headers,
  });
  assert.equal(deleteSnap.status, 405);

  const patchSnap = await fetch(`${baseUrl}/api/codepulse/workspaces/workspace-1/snapshots`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sourceCode: 'hacked' }),
  });
  assert.equal(patchSnap.status, 405);
});
