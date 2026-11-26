import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { createLiveDrafts } from '../live-drafts.mjs';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startBackend(t) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-live-draft-'));
  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => { server.kill(); await rm(dataDirectory, { recursive: true, force: true }); });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 5_000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
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
  const result = await request(baseUrl, '/api/auth/login', null, 'POST', { email, password });
  assert.equal(result.status, 200);
  return result.data.accessToken;
}

test('LiveDraft presence expires without storing a replay history', (t) => {
  let now = Date.parse('2026-11-20T10:00:00.000Z');
  t.mock.method(Date, 'now', () => now);
  const service = createLiveDrafts();
  const events = [];
  service.subscribe('workspace-1', (event) => events.push(event.type));
  assert.equal(service.publish('workspace-1', 'publisher-one', 'first', true).revision, 1);
  now += 12_001;
  assert.equal(service.current('workspace-1'), null);
  assert.deepEqual(events, ['draft', 'disconnected']);
  assert.equal(service.publish('workspace-1', 'publisher-two', 'second').revision, 2);
  assert.equal(service.current('workspace-1').sourceCode, 'second');
});

test('SCRUM-293 streams only ephemeral code to the assigned lecturer during a live LAB', async (t) => {
  const { baseUrl, dataDirectory } = await startBackend(t);
  const lecturer = await login(baseUrl, 'lecturer@gmail.com', 'lecturer123');
  const otherLecturer = await login(baseUrl, 'lecturer2@gmail.com', 'lecturer2123');
  const student = await login(baseUrl, 'student@gmail.com', 'student123');
  const admin = await login(baseUrl, 'admin@gmail.com', 'admin123');
  const startAt = new Date(Date.now() - 60_000).toISOString();
  const endAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const labsRoute = '/api/codepulse/classrooms/class-1/labs';
  const created = await request(baseUrl, labsRoute, lecturer, 'POST', {
    name: 'Live inspection test', startAt, endAt,
    assignments: [{ assignmentVersionId: 'problem-1-v1', mandatory: true, openAt: startAt, closeAt: endAt }],
  });
  assert.equal(created.status, 201);
  const lab = created.data.item;
  const studentLabs = await request(baseUrl, labsRoute, student);
  const workspaceId = studentLabs.data.items.find((item) => item.id === lab.id).assignments[0].workspaceId;
  const route = `/api/codepulse/workspaces/${workspaceId}/live-draft`;
  assert.equal((await request(baseUrl, route, student, 'POST', { publisherId: 'publisher-one', sourceCode: 'unsaved' })).status, 409);
  const live = await request(baseUrl, `${labsRoute}/${lab.id}`, lecturer, 'PATCH', {
    status: 'LIVE', expectedStateVersion: lab.stateVersion,
  });
  assert.equal(live.status, 200);
  assert.equal((await request(baseUrl, route, otherLecturer, 'POST', { publisherId: 'publisher-two', sourceCode: 'x' })).status, 403);
  assert.equal((await request(baseUrl, `${route}/events`, otherLecturer)).status, 403);
  assert.equal((await request(baseUrl, route, admin, 'POST', { publisherId: 'publisher-two', sourceCode: 'x' })).status, 403);

  const published = await request(baseUrl, route, student, 'POST', {
    publisherId: 'publisher-one', sourceCode: 'unsaved draft', claim: true,
  });
  assert.equal(published.status, 200);
  assert.equal(published.data.revision, 1);
  const roster = await request(baseUrl, `${labsRoute}/${lab.id}/live-workspaces`, lecturer);
  assert.equal(roster.status, 200);
  assert.ok(roster.data.items.some((item) => item.workspaceId === workspaceId && item.connected));
  assert.equal((await request(baseUrl, `${labsRoute}/${lab.id}/live-workspaces`, otherLecturer)).status, 403);
  const streamController = new AbortController();
  t.after(() => streamController.abort());
  const stream = await fetch(`${baseUrl}${route}/events`, {
    headers: { Authorization: `Bearer ${lecturer}` }, signal: streamController.signal,
  });
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get('content-type'), /text\/event-stream/);
  const reader = stream.body.getReader();
  t.after(() => reader.cancel().catch(() => undefined));
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /unsaved draft/);
  assert.match(first, /"revision":1/);

  assert.equal((await request(baseUrl, route, student, 'POST', {
    publisherId: 'publisher-one', sourceCode: 'next draft',
  })).data.revision, 2);
  assert.equal((await request(baseUrl, route, student, 'POST', {
    publisherId: 'publisher-two', sourceCode: 'new tab', claim: true,
  })).data.revision, 3);
  assert.equal((await request(baseUrl, route, student, 'POST', {
    publisherId: 'publisher-one', sourceCode: 'stale tab',
  })).status, 409);
  const stored = JSON.parse(await readFile(path.join(dataDirectory, 'codepulse-workspaces.json'), 'utf8'));
  assert.notEqual(stored.find((item) => item.id === workspaceId).sourceCode, 'new tab');

  const revoked = await request(baseUrl, '/api/codepulse/memberships/membership-13-student-account-1', admin, 'PATCH', {
    status: 'revoked',
  });
  assert.equal(revoked.status, 200);
  let streamed = '';
  const deadline = Date.now() + 2_000;
  while (!streamed.includes('event: ended') && Date.now() < deadline) {
    let timer;
    const chunk = await Promise.race([
      reader.read(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Live stream did not end after revocation')), 2_000); }),
    ]).finally(() => clearTimeout(timer));
    if (chunk.done) break;
    streamed += new TextDecoder().decode(chunk.value);
  }
  assert.match(streamed, /event: ended/);
  assert.match(streamed, /forbidden/);
  assert.equal((await request(baseUrl, route, student, 'POST', {
    publisherId: 'publisher-two', sourceCode: 'after revoke',
  })).status, 409);
  assert.equal((await request(baseUrl, `${labsRoute}/${lab.id}/live-workspaces`, lecturer)).data.items
    .some((item) => item.workspaceId === workspaceId), false);

  const ended = await request(baseUrl, `${labsRoute}/${lab.id}`, lecturer, 'PATCH', {
    status: 'ENDED', expectedStateVersion: live.data.item.stateVersion,
  });
  assert.equal(ended.status, 200);
  assert.equal((await request(baseUrl, route, student, 'POST', {
    publisherId: 'publisher-two', sourceCode: 'after LAB',
  })).status, 409);
  assert.equal((await request(baseUrl, `${route}/events`, lecturer)).status, 409);
});
