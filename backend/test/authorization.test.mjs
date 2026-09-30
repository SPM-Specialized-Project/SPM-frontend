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
  const studentWithoutMembership = await login('student2@gmail.com', 'student2123');
  const lecturer = await login('lecturer@gmail.com', 'lecturer123');
  const admin = await login('admin@gmail.com', 'admin123');
  const tutor = await login('tutor@gmail.com', 'tutor123');
  const tutorAliasSession = await api('/api/auth/me', tutor);
  assert.equal(tutorAliasSession.status, 200);
  assert.equal(tutorAliasSession.data.role, 'lecturer');
  assert.equal(tutorAliasSession.data.user.role, 'lecturer');

  const tutorCourses = await api('/api/courses?viewerRole=coordinator', tutor);
  assert.equal(tutorCourses.status, 200);
  assert.deepEqual(
    tutorCourses.data.items.map((item) => item.id),
    ['1', '2', '3', '13'],
  );
  assert.equal(tutorCourses.data.items[0].meta.viewerRole, 'lecturer');
  assert.equal(tutorCourses.data.items[0].meta.ownerRole, 'lecturer');
  assert.equal(tutorCourses.data.items[0].meta.ownerEmail, 'tutor@gmail.com');
  assert.equal(tutorCourses.data.items[0].meta.ownershipLocked, true);
  assert.equal(tutorCourses.data.items.find((item) => item.id === '13').ownershipLocked, true);
  assert.deepEqual(
    tutorCourses.data.items.find((item) => item.id === '13').students.map((student) => student.email),
    [
      'student@gmail.com',
      'nguyenvana@student.hcmut.edu.vn',
      'tranthib@student.hcmut.edu.vn',
      'leminhc@student.hcmut.edu.vn',
      'phamvand@student.hcmut.edu.vn',
      'hoangthie@student.hcmut.edu.vn',
    ],
  );
  assert.equal(tutorCourses.data.items[0].membership.status, 'ACTIVE');
  assert.equal(tutorCourses.data.items[0].membership.email, 'tutor@gmail.com');
  assert.equal(tutorCourses.data.items[0].permissions.canEdit, true);
  const ownedCourseDetail = await api('/api/courses/13/detail', tutor);
  assert.equal(ownedCourseDetail.status, 200);
  assert.equal(ownedCourseDetail.data.course.permissions.canEdit, true);
  assert.equal(ownedCourseDetail.data.detail.permissions.canEdit, true);
  const ownedClassroom = await api('/api/codepulse/classrooms/class-1', tutor);
  assert.equal(ownedClassroom.status, 200);
  assert.ok(ownedClassroom.data.item.managerEmails.includes('tutor@gmail.com'));
  const tutorCourse13Roster = await api('/api/classrooms/13/memberships', tutor);
  assert.equal(tutorCourse13Roster.status, 200);
  assert.deepEqual(
    tutorCourse13Roster.data.items.map((item) => item.studentEmail),
    [
      'student@gmail.com',
      'nguyenvana@student.hcmut.edu.vn',
      'tranthib@student.hcmut.edu.vn',
      'leminhc@student.hcmut.edu.vn',
      'phamvand@student.hcmut.edu.vn',
      'hoangthie@student.hcmut.edu.vn',
    ],
  );
  const updatedOwnedClassroom = await api('/api/codepulse/classrooms/class-1', tutor, 'PATCH', {
    patch: { description: 'Owner can edit this classroom.' },
  });
  assert.equal(updatedOwnedClassroom.status, 200);
  assert.equal((await api('/api/courses/4/detail?viewerRole=coordinator', tutor)).status, 403);

  const lecturerCourses = await api('/api/courses?viewerRole=coordinator', lecturer);
  assert.equal(lecturerCourses.status, 200);
  assert.deepEqual(lecturerCourses.data.items.map((item) => item.id), ['13']);
  assert.equal(lecturerCourses.data.items[0].meta.viewerRole, 'lecturer');
  assert.equal((await api('/api/courses/1/detail?viewerRole=coordinator', lecturer)).status, 403);
  assert.equal((await api('/api/courses/13/detail?viewerRole=coordinator', lecturer)).status, 200);

  const adminCourses = await api('/api/courses?viewerRole=student', admin);
  assert.equal(adminCourses.status, 200);
  assert.equal(adminCourses.data.items.length, 13);
  assert.equal(adminCourses.data.items[0].meta.viewerRole, 'admin');
  assert.equal(adminCourses.data.permissions.canEdit, false);
  assert.ok(adminCourses.data.items.every((item) => item.meta.ownerRole && item.meta.ownershipLocked === true));

  const noMembershipCourses = await api('/api/courses', studentWithoutMembership);
  assert.equal(noMembershipCourses.status, 200);
  assert.deepEqual(noMembershipCourses.data.items, []);

  const studentCourses = await api('/api/courses', student);
  assert.equal(studentCourses.status, 200);
  const studentDsaCourse = studentCourses.data.items.find((item) => item.id === '13');
  assert.ok(studentDsaCourse);
  assert.equal(studentDsaCourse.code, 'DSA-LAB');
  assert.equal(studentDsaCourse.title, 'DSA LAB');

  assert.equal((await api('/api/codepulse/workspaces/workspace-1', null)).status, 401);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', 'invalid')).status, 401);
  assert.equal((await api('/api/codepulse/classrooms/class-1/dashboard', student)).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-2', student)).status, 403);
  assert.equal((await api('/api/codepulse/classrooms/class-2/dashboard', lecturer)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-2', student)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-2', student, 'PATCH', { sourceCode: 'hacked', is_admin: true })).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', lecturer, 'PATCH', { sourceCode: 'hacked' })).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', admin)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', admin, 'PATCH', { sourceCode: 'hacked' })).status, 403);
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
  const courseThreeSession = await api('/api/sessions', tutor, 'POST', {
    item: { title: 'Course 3 owned session', courseId: '3' },
  });
  assert.equal(courseThreeSession.status, 201);
  assert.equal(courseThreeSession.data.item.ownerEmail, 'tutor@gmail.com');
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
  assert.equal((await api('/api/courses/2/submissions?viewerRole=tutor', student)).status, 403);
  assert.equal((await api('/api/submissions/2-2-submission-1', student, 'PATCH', { viewerRole: 'tutor', score: 10 })).status, 403);
  assert.equal((await api('/api/courses/2/submissions', tutor)).status, 200);
  const dsaSubmissions = await api('/api/courses/13/submissions', tutor);
  assert.equal(dsaSubmissions.status, 200);
  assert.equal(dsaSubmissions.data.items[0].term.name, '2026 Semester 1');
  assert.equal(dsaSubmissions.data.items[0].classroom.name, 'CodePulse Demo');
  const courseThreeSubmissions = await api('/api/courses/3/submissions', tutor);
  assert.equal(courseThreeSubmissions.status, 200);
  assert.equal(courseThreeSubmissions.data.items.length, 3);
  const pendingSubmission = courseThreeSubmissions.data.items.find((item) => item.score === null);
  assert.ok(pendingSubmission);
  const gradedSubmission = await api(`/api/submissions/${pendingSubmission.id}`, tutor, 'PATCH', {
    score: 9,
    feedback: 'Đã chấm bài.',
  });
  assert.equal(gradedSubmission.status, 200);
  assert.equal(gradedSubmission.data.item.score, 9);
  assert.equal(gradedSubmission.data.item.permissions.canReview, true);
  assert.equal((await api('/api/codepulse/terms?courseId=13', lecturer)).status, 200);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', student, 'PATCH', { sourceCode: 'safe edit', is_admin: true })).status, 200);
  assert.equal((await api('/api/codepulse/classrooms/class-1/dashboard', student)).status, 403);

  assert.equal((await api('/api/codepulse/memberships/member-1', admin, 'PATCH', { status: 'revoked' })).status, 200);
  const inactiveStudentCourses = await api('/api/courses', student);
  assert.equal(inactiveStudentCourses.status, 200);
  assert.equal(inactiveStudentCourses.data.items.some((item) => item.id === '13'), false);
  const tutorCoursesAfterStudentRevoke = await api('/api/courses', tutor);
  assert.equal(tutorCoursesAfterStudentRevoke.status, 200);
  assert.ok(tutorCoursesAfterStudentRevoke.data.items.some((item) => item.id === '13'));
  assert.equal((await api('/api/codepulse/classrooms/class-1', student)).status, 403);
  assert.equal((await api('/api/codepulse/workspaces/workspace-1', student)).status, 403);
  const restoredMembership = await api('/api/codepulse/memberships/member-1', admin, 'PATCH', { status: 'active' });
  assert.equal(restoredMembership.status, 200);
  assert.equal(restoredMembership.data.item.status, 'ACTIVE');
  assert.equal((await api('/api/codepulse/classrooms/class-1', student)).status, 200);
});
