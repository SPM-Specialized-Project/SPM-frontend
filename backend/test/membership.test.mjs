import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForHealth(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await wait(50);
  }

  throw new Error('Node backend did not become healthy in time.');
}

async function startBackend(t) {
  const port = 4600 + Math.floor(Math.random() * 300);
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-membership-'));
  const backend = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      BACKEND_PORT: String(port),
      BACKEND_DATA_DIRECTORY: dataDirectory,
    },
    stdio: 'ignore',
  });

  t.after(async () => {
    backend.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });
  await waitForHealth(baseUrl);
  return baseUrl;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

const lecturerQuery = 'viewerRole=tutor&viewerEmail=tutor%40gmail.com';

test('membership API manages roster without duplicates and preserves access history', async (t) => {
  const baseUrl = await startBackend(t);
  const rosterUrl = `${baseUrl}/api/classrooms/1/memberships`;

  const initial = await requestJson(`${rosterUrl}?${lecturerQuery}`);
  assert.equal(initial.response.status, 200);
  assert.equal(initial.body.items.length, 3);

  const studentView = await requestJson(
    `${rosterUrl}?viewerRole=student&viewerEmail=student%40gmail.com`,
  );
  assert.equal(studentView.response.status, 200);
  assert.deepEqual(
    studentView.body.items.map((item) => item.studentEmail),
    ['student@gmail.com'],
  );

  const duplicate = await requestJson(rosterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerRole: 'tutor',
      viewerEmail: 'tutor@gmail.com',
      studentEmail: 'student@gmail.com',
    }),
  });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.body.created, false);
  assert.equal(duplicate.body.reactivated, false);

  const added = await requestJson(rosterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerRole: 'tutor',
      viewerEmail: 'tutor@gmail.com',
      studentEmail: 'vovanf@student.hcmut.edu.vn',
    }),
  });
  assert.equal(added.response.status, 201);
  assert.equal(added.body.item.status, 'ACTIVE');

  const invalidStudent = await requestJson(rosterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerRole: 'tutor',
      studentEmail: 'missing@student.example.com',
    }),
  });
  assert.equal(invalidStudent.response.status, 404);
  assert.equal(invalidStudent.body.code, 'STUDENT_NOT_FOUND');

  const membershipId = added.body.item.id;
  const revoked = await requestJson(`${rosterUrl}/${membershipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerRole: 'tutor',
      viewerEmail: 'tutor@gmail.com',
      status: 'REVOKED',
    }),
  });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.body.item.status, 'REVOKED');

  const revokedAccess = await requestJson(
    `${baseUrl}/api/courses/1/detail?viewerRole=student&viewerEmail=vovanf%40student.hcmut.edu.vn`,
  );
  assert.equal(revokedAccess.response.status, 403);
  assert.equal(revokedAccess.body.code, 'MEMBERSHIP_REQUIRED');

  const reactivated = await requestJson(rosterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerRole: 'tutor',
      viewerEmail: 'tutor@gmail.com',
      studentEmail: 'vovanf@student.hcmut.edu.vn',
    }),
  });
  assert.equal(reactivated.response.status, 200);
  assert.equal(reactivated.body.reactivated, true);
  assert.equal(reactivated.body.item.id, membershipId);
  assert.equal(reactivated.body.item.status, 'ACTIVE');

  const restoredAccess = await requestJson(
    `${baseUrl}/api/courses/1/detail?viewerRole=student&viewerEmail=vovanf%40student.hcmut.edu.vn`,
  );
  assert.equal(restoredAccess.response.status, 200);

  const revokedSessionAccess = await requestJson(
    `${baseUrl}/api/sessions?courseId=3&viewerRole=student&viewerEmail=student%40gmail.com`,
  );
  assert.equal(revokedSessionAccess.response.status, 403);
  assert.equal(revokedSessionAccess.body.code, 'MEMBERSHIP_REQUIRED');

  const submissionsBefore = await requestJson(
    `${baseUrl}/api/courses/2/submissions?viewerRole=tutor&studentId=2-student-1`,
  );
  assert.equal(submissionsBefore.response.status, 200);
  const preservedMembership = await requestJson(
    `${baseUrl}/api/classrooms/2/memberships/membership-2-student-1`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerRole: 'tutor', status: 'REVOKED' }),
    },
  );
  assert.equal(preservedMembership.response.status, 200);
  const submissionsAfter = await requestJson(
    `${baseUrl}/api/courses/2/submissions?viewerRole=tutor&studentId=2-student-1`,
  );
  assert.equal(submissionsAfter.response.status, 200);
  assert.deepEqual(submissionsAfter.body.items, submissionsBefore.body.items);
});
