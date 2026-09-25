import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');

test('SCRUM-20: authentication, scope, sanitization and revocation', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-auth-test-'));
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
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
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
  const admin = await login('admin@gmail.com', 'admin123');
  const tutor = await login('tutor@gmail.com', 'tutor123');

  assert.equal((await api('/api/codepulse/workspaces/workspace-1', null)).status, 401);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', 'invalid')).status, 401);
  assert.equal((await api('/api/codepulse/classrooms/class-1/dashboard', student)).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-2', student)).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-2/dashboard', lecturer)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-2', student)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-2', student, 'PATCH', { sourceCode: 'hacked', is_admin: true })).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', lecturer, 'PATCH', { sourceCode: 'hacked' })).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', admin)).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-1/dashboard', lecturer)).status, 200);

  const problem = await api('/api/codepulse/classrooms/class-1/problems/problem-1', student);
  assert.equal(problem.status, 200);
  assert.equal(problem.data.item.testCases.length, 1);
  assert.equal(JSON.stringify(problem.data).includes('secret input'), false);
  assert.equal(JSON.stringify(problem.data).includes('internal runner trace'), false);

  assert.equal((await api('/api/sessions', student, 'POST', { viewerRole: 'chairman', item: {} })).status, 403);
  assert.equal((await api('/api/sessions/s-1', student, 'PATCH', { viewerRole: 'chairman', patch: { title: 'hacked' } })).status, 403);
  const createdSession = await api('/api/sessions', tutor, 'POST', {
    viewerRole: 'chairman', viewerEmail: 'admin@gmail.com',
    item: { title: 'Owned session', ownerRole: 'chairman', ownerEmail: 'admin@gmail.com' },
  });
  assert.equal(createdSession.status, 201);
  assert.equal(createdSession.data.item.ownerEmail, 'tutor@gmail.com');
  assert.equal((await api('/api/sessions', tutor, 'POST', {
    item: { title: 'Unassigned course', courseId: '3' },
  })).status, 403);
  const patchedSession = await api(`/api/sessions/${createdSession.data.item.id}`, tutor, 'PATCH', {
    patch: { ownerRole: 'chairman', ownerEmail: 'admin@gmail.com', title: 'Updated' },
  });
  assert.equal(patchedSession.status, 200);
  assert.equal(patchedSession.data.item.ownerEmail, 'tutor@gmail.com');
  const studentSessions = await api('/api/sessions?viewerRole=chairman', student);
  assert.equal(studentSessions.status, 200);
  assert.ok(studentSessions.data.items.length > 0);
  assert.ok(studentSessions.data.items.every((item) => ['1', '2', '3'].includes(item.courseId)));
  assert.ok(studentSessions.data.items.every((item) => !('tutorNote' in item) && !('members' in item)));
  assert.equal((await api('/api/courses?viewerRole=chairman', student)).data.items[0].students.length, 0);
  assert.equal((await api('/api/courses/2/submissions?viewerRole=tutor', student)).status, 200);
  assert.equal((await api('/api/courses/2/submissions?viewerRole=tutor', student)).data.items.length, 0);
  assert.equal((await api('/api/submissions/2-2-submission-1', student, 'PATCH', { viewerRole: 'tutor', score: 10 })).status, 403);
  assert.equal((await api('/api/courses/2/submissions', tutor)).status, 200);
  assert.equal((await api('/api/courses/3/submissions', tutor)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', student, 'PATCH', { sourceCode: 'safe edit', is_admin: true })).status, 200);
  assert.equal((await api('/api/codepulse/classrooms/class-1/dashboard', student)).status, 403);

  assert.equal((await api('/api/codepulse/memberships/member-1', admin, 'PATCH', { status: 'revoked' })).status, 200);
  assert.equal((await api('/api/codepulse/classrooms/class-1', student)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', student)).status, 403);
  const restoredMembership = await api('/api/codepulse/memberships/member-1', admin, 'PATCH', { status: 'active' });
  assert.equal(restoredMembership.status, 200);
  assert.equal(restoredMembership.data.item.status, 'active');
  assert.equal((await api('/api/codepulse/classrooms/class-1', student)).status, 200);
});
