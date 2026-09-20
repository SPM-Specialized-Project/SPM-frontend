import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startBackend(t) {
  const port = 4600 + Math.floor(Math.random() * 300);
  const url = `http://127.0.0.1:${port}`;
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-membership-'));
  const backend = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: String(port), BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: 'ignore',
  });
  t.after(async () => {
    backend.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) return url;
    } catch {
      // Server may still be starting.
    }
    await wait(50);
  }
  throw new Error('Backend startup timed out');
}

async function request(url, token, method = 'GET', body) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

async function login(url, email, password) {
  const result = await request(`${url}/api/auth/login`, null, 'POST', { email, password });
  assert.equal(result.status, 200);
  return result.data.accessToken;
}

test('roster keeps history and uses authenticated identity', async (t) => {
  const url = await startBackend(t);
  const tutor = await login(url, 'tutor@gmail.com', 'tutor123');
  const student = await login(url, 'student@gmail.com', 'student123');
  const roster = `${url}/api/classrooms/1/memberships`;

  assert.equal((await request(roster, null)).status, 401);
  const initial = await request(`${roster}?viewerRole=student`, tutor);
  assert.equal(initial.status, 200);
  assert.equal(initial.data.items.length, 3);
  const own = await request(`${roster}?viewerRole=tutor&viewerEmail=tutor@gmail.com`, student);
  assert.equal(own.status, 200);
  assert.deepEqual(own.data.items.map((item) => item.studentEmail), ['student@gmail.com']);
  assert.equal(own.data.permissions.canEdit, false);
  assert.equal((await request(roster, student, 'POST', {
    viewerRole: 'tutor', viewerEmail: 'tutor@gmail.com', studentEmail: 'student2@gmail.com',
  })).status, 403);

  const duplicate = await request(roster, tutor, 'POST', { studentEmail: 'student@gmail.com' });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.data.created, false);
  const added = await request(roster, tutor, 'POST', { studentEmail: 'vovanf@student.hcmut.edu.vn' });
  assert.equal(added.status, 201);
  assert.equal((await request(roster, tutor, 'POST', {
    studentEmail: 'missing@student.example.com',
  })).data.code, 'STUDENT_NOT_FOUND');
  const membershipId = added.data.item.id;
  const revoked = await request(`${roster}/${membershipId}`, tutor, 'PATCH', { status: 'REVOKED' });
  assert.equal(revoked.data.item.status, 'REVOKED');
  const reactivated = await request(roster, tutor, 'POST', { studentEmail: 'vovanf@student.hcmut.edu.vn' });
  assert.equal(reactivated.data.reactivated, true);
  assert.equal(reactivated.data.item.id, membershipId);

  const studentMembership = `${roster}/membership-1-student-account-1`;
  assert.equal((await request(studentMembership, tutor, 'PATCH', { status: 'REVOKED' })).status, 200);
  const denied = await request(`${url}/api/courses/1/detail?viewerRole=tutor`, student);
  assert.equal(denied.status, 403);
  assert.equal(denied.data.code, 'MEMBERSHIP_REQUIRED');
  assert.equal((await request(`${url}/api/sessions?courseId=1`, student)).status, 403);
  assert.equal((await request(roster, student)).status, 403);
  assert.equal((await request(roster, tutor, 'POST', { studentEmail: 'student@gmail.com' })).data.reactivated, true);
  assert.equal((await request(`${url}/api/courses/1/detail`, student)).status, 200);
  const sessions = await request(`${url}/api/sessions?courseId=1`, student);
  assert.equal(sessions.status, 200);
  assert.ok(sessions.data.items.length > 0);

  const submissionsUrl = `${url}/api/courses/2/submissions?studentId=2-student-1`;
  const before = await request(submissionsUrl, tutor);
  assert.equal(before.status, 200);
  assert.equal((await request(
    `${url}/api/classrooms/2/memberships/membership-2-student-1`,
    tutor, 'PATCH', { status: 'REVOKED' },
  )).status, 200);
  assert.deepEqual((await request(submissionsUrl, tutor)).data.items, before.data.items);
  assert.equal((await request(`${url}/api/classrooms/3/memberships`, tutor)).status, 403);
});
