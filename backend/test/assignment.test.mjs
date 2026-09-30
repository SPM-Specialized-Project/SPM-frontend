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

  const initialTerms = await api('/api/codepulse/terms?courseId=13', admin);
  assert.equal(initialTerms.status, 200);
  assert.equal(initialTerms.data.items.length, 2);
  const blockedTermDelete = await api('/api/codepulse/terms/term-2026-1?courseId=13', admin, 'DELETE');
  assert.equal(blockedTermDelete.status, 409);
  const createdTerm = await api('/api/codepulse/terms?courseId=13', admin, 'POST', {
    name: '2028 Semester 1',
    startDate: '2028-01-01',
    endDate: '2028-06-01',
    resetDate: '2028-06-02',
  });
  assert.equal(createdTerm.status, 201);
  assert.equal(createdTerm.data.item.status, 'DRAFT');
  const updatedTerm = await api(`/api/codepulse/terms/${createdTerm.data.item.id}?courseId=13`, admin, 'PATCH', {
    patch: { name: '2028 Semester 1 updated', status: 'ACTIVE' },
  });
  assert.equal(updatedTerm.status, 200);
  const tutorTerms = await api('/api/codepulse/terms?courseId=13', tutor);
  assert.equal(tutorTerms.status, 200);
  assert.ok(tutorTerms.data.items.some((item) => item.id === createdTerm.data.item.id));
  const deletedTerm = await api(`/api/codepulse/terms/${createdTerm.data.item.id}?courseId=13`, admin, 'DELETE');
  assert.equal(deletedTerm.status, 200);
  assert.equal(deletedTerm.data.deleted, true);

  const tutorStatus = await api('/api/codepulse/classrooms/class-1', tutor, 'PATCH', {
    patch: { status: 'DRAFT' },
  });
  assert.equal(tutorStatus.status, 200);
  assert.equal(tutorStatus.data.item.status, 'DRAFT');
  const tutorDraftClassrooms = await api('/api/codepulse/classrooms?courseId=13', tutor);
  assert.equal(tutorDraftClassrooms.status, 200);
  assert.equal(
    tutorDraftClassrooms.data.items.find((item) => item.id === 'class-1').status,
    'DRAFT',
  );
  const studentDraftTerms = await api('/api/codepulse/terms?courseId=13', student);
  assert.equal(studentDraftTerms.status, 200);
  assert.deepEqual(studentDraftTerms.data.items, []);
  const studentDraftClassrooms = await api('/api/codepulse/classrooms?courseId=13', student);
  assert.equal(studentDraftClassrooms.status, 200);
  assert.deepEqual(studentDraftClassrooms.data.items, []);
  assert.equal((await api('/api/codepulse/classrooms/class-1', tutor, 'PATCH', {
    patch: { status: 'ACTIVE' },
  })).status, 200);

  const tutorClassrooms = await api('/api/codepulse/classrooms?courseId=13', tutor);
  assert.equal(tutorClassrooms.status, 200);
  assert.equal(tutorClassrooms.data.items.length, 2);
  const studentTerms = await api('/api/codepulse/terms?courseId=13', student);
  assert.deepEqual(studentTerms.data.items.map((item) => item.id), ['term-2026-1']);
  const studentClassrooms = await api('/api/codepulse/classrooms?courseId=13', student);
  assert.deepEqual(studentClassrooms.data.items.map((item) => item.id), ['class-1']);
  const movedToFutureTerm = await api('/api/codepulse/classrooms/class-1', admin, 'PATCH', {
    patch: { termId: 'term-2027-1' },
  });
  assert.equal(movedToFutureTerm.status, 200);
  const futureTermAssignments = await api('/api/codepulse/classrooms/class-1/assignments', student);
  assert.equal(futureTermAssignments.status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-1', admin, 'PATCH', {
    patch: { termId: 'term-2026-1' },
  })).status, 200);
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
  const studentWorkspace = await api('/api/codepulse/classrooms/class-1/workspace?assignmentId=problem-1', student);
  assert.equal(studentWorkspace.status, 200);
  assert.equal(studentWorkspace.data.item.assignmentId, 'problem-1');
  assert.equal(studentWorkspace.data.item.ownerEmail, 'student@gmail.com');
  const runResult = await api('/api/codepulse/classrooms/class-1/assignments/problem-1/run', student, 'POST', {
    sourceCode: 'print(input())',
  });
  assert.equal(runResult.status, 200);
  assert.equal(runResult.data.item.passedCount, 1);
  assert.equal(runResult.data.item.totalCount, 1);
  assert.equal(runResult.data.item.results[0].status, 'PASSED');
  assert.equal(runResult.data.item.results[0].actualOutput.trim(), 'Hello');
  const savedStudentWorkspace = await api(`/api/codepulse/workspaces/${studentWorkspace.data.item.id}`, student, 'PATCH', {
    sourceCode: 'print("pasted solution")',
  });
  assert.equal(savedStudentWorkspace.status, 200);
  assert.equal(savedStudentWorkspace.data.item.sourceCode, 'print("pasted solution")');
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, student)).status, 404);

  const incompletePublish = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(incompletePublish.status, 422);
  assert.match(incompletePublish.data.errors.description, /bắt buộc/);
  assert.match(incompletePublish.data.errors.constraints, /bắt buộc/);
  assert.match(incompletePublish.data.errors.inputFormat, /bắt buộc/);
  assert.match(incompletePublish.data.errors.outputFormat, /bắt buộc/);
  assert.match(incompletePublish.data.errors.referenceSolution, /bắt buộc/);
  assert.match(incompletePublish.data.errors.cpuTimeLimitMs, /lớn hơn 0/);
  assert.match(incompletePublish.data.errors.memoryLimitMb, /lớn hơn 0/);
  assert.match(incompletePublish.data.errors.testCases, /ít nhất một test case/);

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

  const blockedByNonPositiveLimits = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(blockedByNonPositiveLimits.status, 422);
  assert.match(blockedByNonPositiveLimits.data.errors.cpuTimeLimitMs, /lớn hơn 0/);
  assert.match(blockedByNonPositiveLimits.data.errors.memoryLimitMb, /lớn hơn 0/);

  const edgeDraft = await api('/api/codepulse/classrooms/class-1/assignments', lecturer, 'POST', {
    title: 'Edge validation draft',
    description: 'Check publish boundary values.',
    constraints: 'Input is bounded.',
    inputFormat: 'One integer.',
    outputFormat: 'Print the integer.',
    cpuTimeLimitMs: 10_001,
    memoryLimitMb: 1_025,
    runtime: 'JAVA',
    testCases: [{ id: 'edge-case', input: '1', expectedOutput: '1' }],
  });
  assert.equal(edgeDraft.status, 201);
  const edgeVerify = await api(`/api/codepulse/classrooms/class-1/assignments/${edgeDraft.data.item.id}/verify`, lecturer, 'POST');
  assert.equal(edgeVerify.status, 422);
  assert.match(edgeVerify.data.errors.referenceSolution, /bắt buộc/);
  const edgePublish = await api(`/api/codepulse/classrooms/class-1/assignments/${edgeDraft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(edgePublish.status, 422);
  assert.match(edgePublish.data.errors.cpuTimeLimitMs, /10000/);
  assert.match(edgePublish.data.errors.memoryLimitMb, /1024/);
  assert.match(edgePublish.data.errors.runtime, /PYTHON hoặc CPP/);
  assert.match(edgePublish.data.errors.referenceSolution, /bắt buộc/);
  assert.match(edgePublish.data.errors.verification, /verify assignment/);
  const edgeBoundary = await api(`/api/codepulse/classrooms/class-1/assignments/${edgeDraft.data.item.id}`, lecturer, 'PATCH', {
    patch: {
      cpuTimeLimitMs: 10_000,
      memoryLimitMb: 1_024,
      runtime: 'PYTHON',
      referenceSolution: 'print(input())',
    },
  });
  assert.equal(edgeBoundary.status, 200);
  const edgeBoundaryVerify = await api(`/api/codepulse/classrooms/class-1/assignments/${edgeDraft.data.item.id}/verify`, lecturer, 'POST');
  assert.equal(edgeBoundaryVerify.status, 200);
  const edgeBoundaryPublish = await api(`/api/codepulse/classrooms/class-1/assignments/${edgeDraft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(edgeBoundaryPublish.status, 200);
  assert.equal(edgeBoundaryPublish.data.item.status, 'PUBLISHED');

  const updated = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: { cpuTimeLimitMs: 1000, memoryLimitMb: 128 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.item.verificationStatus, 'UNVERIFIED');

  const blockedAfterContentChange = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/publish`, lecturer, 'POST');
  assert.equal(blockedAfterContentChange.status, 422);
  assert.match(blockedAfterContentChange.data.errors.verification, /verify assignment/);
  assert.match(blockedAfterContentChange.data.errors['testCases.0.verified'], /chưa được verify/);

  const reverified = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/verify`, lecturer, 'POST');
  assert.equal(reverified.status, 200);
  const changedTestCases = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: { testCases: [{ id: 'case-1', input: '2 3', expectedOutput: '5', hidden: false, verified: true }] },
  });
  assert.equal(changedTestCases.status, 200);
  assert.equal(changedTestCases.data.item.verificationStatus, 'UNVERIFIED');
  assert.equal(changedTestCases.data.item.testCases[0].verified, false);

  const reverifiedAfterTestChange = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}/verify`, lecturer, 'POST');
  assert.equal(reverifiedAfterTestChange.status, 200);
  const noOpPersist = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: {
      title: reverifiedAfterTestChange.data.item.title,
      description: reverifiedAfterTestChange.data.item.description,
      constraints: reverifiedAfterTestChange.data.item.constraints,
      inputFormat: reverifiedAfterTestChange.data.item.inputFormat,
      outputFormat: reverifiedAfterTestChange.data.item.outputFormat,
      cpuTimeLimitMs: reverifiedAfterTestChange.data.item.cpuTimeLimitMs,
      memoryLimitMb: reverifiedAfterTestChange.data.item.memoryLimitMb,
      runtime: reverifiedAfterTestChange.data.item.runtime,
      referenceSolution: reverifiedAfterTestChange.data.item.referenceSolution,
      testCases: reverifiedAfterTestChange.data.item.testCases,
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

  const lecturerStudentPreview = await api('/api/codepulse/classrooms/class-1/assignments?view=student', lecturer);
  assert.equal(lecturerStudentPreview.status, 200);
  assert.ok(lecturerStudentPreview.data.items.every((item) => item.status === 'PUBLISHED'));
  assert.ok(lecturerStudentPreview.data.items.every((item) => !('referenceSolution' in item)));

  const editedPublished = await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, lecturer, 'PATCH', {
    patch: { description: 'Updated after publication.' },
  });
  assert.equal(editedPublished.status, 200);
  assert.equal(editedPublished.data.item.status, 'DRAFT');
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, student)).status, 404);

  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${draft.data.item.id}`, admin, 'PATCH', { patch: { title: 'admin edit' } })).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-1/assignments', admin)).status, 200);
});
