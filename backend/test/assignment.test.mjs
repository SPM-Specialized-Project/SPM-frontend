import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');

test('SCRUM-91: lecturer assignment CRUD, verification, publish validation and visibility', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-assignment-test-'));
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
  const tutor = await login('tutor@gmail.com', 'tutor123');
  const admin = await login('admin@gmail.com', 'admin123');

  const tutorClassrooms = await api('/api/codepulse/classrooms?courseId=13', tutor);
  assert.equal(tutorClassrooms.status, 200);
  assert.equal(tutorClassrooms.data.items.length, 2);
  const tutorDraft = await api('/api/codepulse/classrooms/class-1/assignments', tutor, 'POST', {
    title: 'Tutor-managed draft',
  });
  assert.equal(tutorDraft.status, 201);
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${tutorDraft.data.item.id}`, tutor, 'DELETE')).status, 200);

  const draft = await api('/api/codepulse/classrooms/class-1/assignments', lecturer, 'POST', {
    title: 'Partial draft',
  });
  assert.equal(draft.status, 201);
  assert.equal(draft.data.item.status, 'DRAFT');
  assert.equal(draft.data.item.title, 'Partial draft');

  const lecturerDrafts = await api('/api/codepulse/classrooms/class-1/assignments', lecturer);
  assert.ok(lecturerDrafts.data.items.some((item) => item.id === draft.data.item.id));

  const studentAssignmentsBeforePublish = await api('/api/codepulse/classrooms/class-1/assignments', student);
  assert.equal(studentAssignmentsBeforePublish.status, 200);
  assert.ok(studentAssignmentsBeforePublish.data.items.every((item) => item.status === 'PUBLISHED'));
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, student)).status, 404);

  const completeDraft = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: {
      title: 'Sum two numbers',
      description: 'Add two integers.',
      constraints: 'Values fit in a signed 32-bit integer.',
      inputFormat: 'Two integers a and b.',
      outputFormat: 'Print a + b.',
      cpuTimeLimitMs: 0,
      memoryLimitMb: 0,
      runtime: 'PYTHON',
      referenceSolution: 'a, b = map(int, input().split()); print(a + b)',
      testCases: [{ id: 'case-1', input: '1 2', expectedOutput: '3', hidden: false }],
    },
  });
  assert.equal(completeDraft.status, 200);

  const verification = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/verify`, lecturer, 'POST');
  assert.equal(verification.status, 200);
  assert.equal(verification.data.item.verificationStatus, 'VERIFIED');
  assert.equal(verification.data.item.testCases[0].verified, true);

  const invalidPublish = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(invalidPublish.status, 422);
  assert.equal(invalidPublish.data.code, 'VALIDATION_ERROR');
  assert.match(invalidPublish.data.errors.cpuTimeLimitMs, /lớn hơn 0/);
  assert.match(invalidPublish.data.errors.memoryLimitMb, /lớn hơn 0/);

  const updated = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: { cpuTimeLimitMs: 1000, memoryLimitMb: 128 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.item.verificationStatus, 'UNVERIFIED');

  const reverified = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/verify`, lecturer, 'POST');
  assert.equal(reverified.status, 200);
  const noOpPersist = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: {
      title: reverified.data.item.title,
      description: reverified.data.item.description,
      constraints: reverified.data.item.constraints,
      inputFormat: reverified.data.item.inputFormat,
      outputFormat: reverified.data.item.outputFormat,
      cpuTimeLimitMs: reverified.data.item.cpuTimeLimitMs,
      memoryLimitMb: reverified.data.item.memoryLimitMb,
      runtime: reverified.data.item.runtime,
      referenceSolution: reverified.data.item.referenceSolution,
      testCases: reverified.data.item.testCases,
    },
  });
  assert.equal(noOpPersist.status, 200);
  assert.equal(noOpPersist.data.item.verificationStatus, 'VERIFIED');
  const published = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(published.status, 200);
  assert.equal(published.data.item.status, 'PUBLISHED');

  const studentPublished = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, student);
  assert.equal(studentPublished.status, 200);
  assert.equal(studentPublished.data.item.testCases.length, 1);
  assert.equal('referenceSolution' in studentPublished.data.item, false);

  const editedPublished = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: { description: 'Updated after publication.' },
  });
  assert.equal(editedPublished.status, 200);
  assert.equal(editedPublished.data.item.status, 'DRAFT');
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, student)).status, 404);

  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, admin, 'PATCH', { patch: { title: 'admin edit' } })).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-1/assignments', admin)).status, 200);
});
