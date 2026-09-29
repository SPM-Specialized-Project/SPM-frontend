import { PORT } from './config.mjs';
import {
  COURSE_CATALOG,
  COURSE_OWNERSHIPS,
  DSA_COURSE_ID,
  DSA_MANAGER_EMAILS,
  DSA_ROSTER_CLASSROOM_ID,
  INITIAL_CLASSROOM_OWNERSHIPS,
  INITIAL_SESSIONS,
  PROVISIONED_STUDENT_ACCOUNTS,
  USERS,
} from './data/seeds.mjs';
import {
  clone,
  createCourseSubmissionRecords,
  createUser,
  getAssignment,
  getCourse,
  getCourseDetail,
  getResourcePermissions,
  findProvisionedStudent,
  normalizeEmail,
  toListResponse,
  toMembershipView,
  toResource,
  toSubmissionView,
} from './domain/backend-data.mjs';
import {
  readCollection,
  readSubmissions,
  saveCollection,
  saveSubmissions,
} from './data/storage.mjs';
import { apiError, readRequestBody, sendJson } from './http.mjs';
import { createSession, getSessionUser } from './auth.mjs';
import { getCodePulseClassrooms, getCodePulseSubmissionContext, handleCodePulse } from './codepulse.mjs';

const isMembershipRoute = (parts) =>
  parts[0] === 'api' &&
  (parts[1] === 'classrooms' || parts[1] === 'courses') &&
  parts[2] &&
  parts[3] === 'memberships';

const getClassroomIdFromParts = (parts) => parts[2];

const isAssignedTutor = (courseId, email) => {
  const ownership = COURSE_OWNERSHIPS[String(courseId)];
  return Boolean(
    ownership?.ownershipLocked === true &&
      normalizeEmail(ownership.ownerEmail) === normalizeEmail(email),
  ) || INITIAL_CLASSROOM_OWNERSHIPS.some(
    (ownership) =>
      ownership.classroomId === courseId &&
      ownership.status === 'ACTIVE' &&
      normalizeEmail(ownership.ownerEmail) === normalizeEmail(email),
  ) || INITIAL_SESSIONS.some(
    (session) =>
      session.courseId === courseId &&
      normalizeEmail(session.ownerEmail) === normalizeEmail(email),
  ) || (String(courseId) === DSA_COURSE_ID && DSA_MANAGER_EMAILS.some(
    (managerEmail) => normalizeEmail(managerEmail) === normalizeEmail(email),
  ));
};

const isActiveRecord = (record) => String(record.status).toUpperCase() === 'ACTIVE';

const isCodePulseMembershipFor = (membership, classroom) =>
  membership.classroomId === classroom.id ||
  (classroom.courseId === DSA_COURSE_ID && membership.classroomId === DSA_ROSTER_CLASSROOM_ID);

const isMembershipForClassroom = (membership, classroomId) =>
  membership.classroomId === classroomId
  || (String(classroomId) === DSA_COURSE_ID && membership.classroomId === DSA_ROSTER_CLASSROOM_ID);

const getCourseWithCanonicalRoster = async (courseId) => {
  const course = getCourse(courseId);
  if (String(courseId) !== DSA_COURSE_ID) return course;

  const memberships = await readCollection('memberships');
  const activeMemberships = memberships.filter(
    (membership) => membership.classroomId === DSA_ROSTER_CLASSROOM_ID && isActiveRecord(membership),
  );
  const students = activeMemberships.map((membership) => {
    const catalogStudent = course.students.find(
      (student) => normalizeEmail(student.email) === normalizeEmail(membership.studentEmail),
    );
    return {
      ...catalogStudent,
      id: membership.studentId,
      name: membership.studentName,
      email: membership.studentEmail,
    };
  });

  return { ...course, students };
};

const getAssignedCourseIds = async (viewerRole, viewerEmail) => {
  if (['admin', 'coordinator', 'chairman'].includes(viewerRole)) {
    return new Set(Object.keys(COURSE_CATALOG));
  }

  const assignedCourseIds = new Set();
  const normalizedViewerEmail = normalizeEmail(viewerEmail);

  if (viewerRole === 'tutor') {
    Object.entries(COURSE_OWNERSHIPS)
      .filter(([, ownership]) => ownership.ownershipLocked === true
        && normalizeEmail(ownership.ownerEmail) === normalizedViewerEmail)
      .forEach(([courseId]) => assignedCourseIds.add(String(courseId)));

    const sessions = await readCollection('sessions');
    sessions
      .filter((session) => normalizeEmail(session.ownerEmail) === normalizedViewerEmail)
      .forEach((session) => assignedCourseIds.add(String(session.courseId)));
  }

  const codePulseClassrooms = await getCodePulseClassrooms();
  if (viewerRole === 'tutor') {
    codePulseClassrooms
      .filter((classroom) => classroom.courseId === DSA_COURSE_ID && (
        DSA_MANAGER_EMAILS.some((managerEmail) => normalizeEmail(managerEmail) === normalizedViewerEmail) ||
        classroom.managerEmails?.some((managerEmail) => normalizeEmail(managerEmail) === normalizedViewerEmail)
      ))
      .forEach((classroom) => assignedCourseIds.add(String(classroom.courseId)));
  }

  if (viewerRole === 'lecturer') {
    codePulseClassrooms
      .filter((classroom) => normalizeEmail(classroom.lecturerEmail) === normalizedViewerEmail)
      .forEach((classroom) => assignedCourseIds.add(String(classroom.courseId)));
  }

  if (viewerRole === 'student') {
    const memberships = await readCollection('memberships');
    memberships
      .filter((membership) => isActiveRecord(membership) && normalizeEmail(membership.studentEmail ?? membership.userEmail) === normalizedViewerEmail)
      .forEach((membership) => {
        const legacyCourseId = String(membership.classroomId);
        if (COURSE_CATALOG[legacyCourseId]) assignedCourseIds.add(legacyCourseId);
        codePulseClassrooms
          .filter((classroom) => classroom.status === 'ACTIVE' && isCodePulseMembershipFor(membership, classroom))
          .forEach((classroom) => assignedCourseIds.add(String(classroom.courseId)));
      });
  }

  return assignedCourseIds;
};

const assertCourseAccess = async (courseId, viewerRole, viewerEmail) => {
  const assignedCourseIds = await getAssignedCourseIds(viewerRole, viewerEmail);
  if (!assignedCourseIds.has(String(courseId))) {
    if (viewerRole === 'student') {
      throw apiError(403, 'MEMBERSHIP_REQUIRED', 'Tài khoản không có membership ACTIVE trong classroom này.');
    }
    throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
  }
};

const ensureClassroomExists = (classroomId) => {
  if (!COURSE_CATALOG[classroomId]) {
    throw apiError(404, 'CLASSROOM_NOT_FOUND', `Không tìm thấy classroom ${classroomId}.`);
  }
};

const assertStudentHasAccess = (memberships, classroomId, viewerRole, viewerEmail) => {
  if (viewerRole !== 'student') return;
  if (!memberships.some((membership) =>
    isMembershipForClassroom(membership, classroomId)
    && normalizeEmail(membership.studentEmail) === normalizeEmail(viewerEmail)
    && isActiveRecord(membership))) {
    throw apiError(
      403,
      'MEMBERSHIP_REQUIRED',
      'Tài khoản không có membership ACTIVE trong classroom này.',
    );
  }
};

const membershipListResponse = (items, classroomId, viewerRole, viewerEmail) => ({
  items: items.map((item) => toMembershipView(item, viewerRole, viewerEmail)),
  classroomId,
  viewerRole,
  permissions: {
    canView: true,
    canEdit: viewerRole === 'tutor',
    canDelete: viewerRole === 'tutor',
    canCreate: viewerRole === 'tutor',
  },
  availableStudents: viewerRole === 'tutor'
    ? PROVISIONED_STUDENT_ACCOUNTS
    : [],
  meta: {
    source: 'node-backend',
    updatedAt: new Date().toISOString(),
    total: items.length,
  },
});

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const parts = requestUrl.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'spm-backend' });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
    const body = await readRequestBody(request);
    const user = USERS.find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );

    if (!user) throw apiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng!');
    if (user.status !== 'ACTIVE') throw apiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa hoặc không được phép truy cập!');

    sendJson(response, 200, {
      accessToken: createSession(user),
      user: createUser(user),
      role: user.role,
    });
    return;
  }

  const currentUser = getSessionUser(request, USERS);
  if (!currentUser) throw apiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  if (currentUser.status !== 'ACTIVE') throw apiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa hoặc không được phép truy cập!');
  if (request.method === 'GET' && requestUrl.pathname === '/api/auth/me') {
    sendJson(response, 200, { user: createUser(currentUser), role: currentUser.role });
    return;
  }
  const viewerRole = currentUser.role;
  const viewerEmail = currentUser.email;
  if (requestUrl.pathname.startsWith('/api/codepulse/')) {
    await handleCodePulse({ request, response, requestUrl, user: currentUser, sendJson, readRequestBody, apiError });
    return;
  }
  const isDsaLabCatalogRoute = requestUrl.pathname === '/api/courses'
    || requestUrl.pathname === `/api/courses/${DSA_COURSE_ID}/detail`;
  const isDsaLabSubmissionRoute = (requestUrl.pathname.startsWith(`/api/courses/${DSA_COURSE_ID}/submissions`)
    || requestUrl.pathname.startsWith('/api/submissions/'));
  if ((viewerRole === 'lecturer' || viewerRole === 'admin')
    && !isDsaLabCatalogRoute
    && !isDsaLabSubmissionRoute) {
    throw apiError(403, 'FORBIDDEN', 'Vai trò này không có quyền truy cập API khóa học.');
  }

  if (isMembershipRoute(parts)) {
    const classroomId = getClassroomIdFromParts(parts);
    ensureClassroomExists(classroomId);
    const membershipId = parts[4];
    if (viewerRole === 'tutor') {
      if (!isAssignedTutor(classroomId, viewerEmail)) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công classroom này.');
      }
    }

    if (request.method === 'GET' && !membershipId) {
      const records = await readCollection('memberships');
      if (viewerRole === 'student') {
        assertStudentHasAccess(records, classroomId, viewerRole, viewerEmail);
      }
      const classroomMemberships = records.filter((record) => isMembershipForClassroom(record, classroomId));
      // Students may open the roster as a class directory. Access is still
      // gated by the authenticated student's own ACTIVE membership above;
      // the response must not be reduced to only the current student.
      const visibleMemberships = classroomMemberships;

      sendJson(
        response,
        200,
        membershipListResponse(visibleMemberships, classroomId, viewerRole, viewerEmail),
      );
      return;
    }

    if (request.method === 'POST' && !membershipId) {
      const body = await readRequestBody(request);
      if (viewerRole !== 'tutor') {
        throw apiError(403, 'FORBIDDEN', 'Chỉ tutor được quản lý membership của classroom.');
      }

      const studentEmail = normalizeEmail(body.studentEmail ?? body.email);
      const student = findProvisionedStudent(studentEmail);
      if (!student) {
        throw apiError(404, 'STUDENT_NOT_FOUND', 'Không tìm thấy tài khoản student đã được provision.');
      }

      const records = await readCollection('memberships');
      const existing = records.find(
        (record) =>
          isMembershipForClassroom(record, classroomId) &&
          (record.studentId === student.id || normalizeEmail(record.studentEmail) === studentEmail),
      );

      if (existing?.status === 'ACTIVE') {
        sendJson(response, 200, {
          item: toMembershipView(existing, viewerRole, viewerEmail),
          created: false,
          reactivated: false,
        });
        return;
      }

      const now = new Date().toISOString();
      const membershipClassroomId = String(classroomId) === DSA_COURSE_ID
        ? DSA_ROSTER_CLASSROOM_ID
        : classroomId;
      const membership = existing
        ? {
          ...existing,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          status: 'ACTIVE',
          revokedAt: null,
          updatedAt: now,
        }
        : {
          id: `membership-${membershipClassroomId}-${student.id}`,
          classroomId: membershipClassroomId,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          status: 'ACTIVE',
          enrolledAt: now,
          revokedAt: null,
          createdAt: now,
          updatedAt: now,
        };

      const nextRecords = existing
        ? records.map((record) => (record.id === existing.id ? membership : record))
        : [...records, membership];
      await saveCollection('memberships', nextRecords);
      sendJson(response, existing ? 200 : 201, {
        item: toMembershipView(membership, viewerRole, viewerEmail),
        created: !existing,
        reactivated: Boolean(existing),
      });
      return;
    }

    if ((request.method === 'PATCH' || request.method === 'DELETE') && membershipId) {
      const body = await readRequestBody(request);
      if (viewerRole !== 'tutor') {
        throw apiError(403, 'FORBIDDEN', 'Chỉ tutor được revoke membership của classroom.');
      }

      const records = await readCollection('memberships');
      const index = records.findIndex(
        (record) => isMembershipForClassroom(record, classroomId) && record.id === membershipId,
      );
      if (index < 0) {
        throw apiError(404, 'MEMBERSHIP_NOT_FOUND', `Không tìm thấy membership ${membershipId}.`);
      }

      const requestedStatus = request.method === 'DELETE' ? 'REVOKED' : body.status ?? 'REVOKED';
      if (!['ACTIVE', 'REVOKED'].includes(requestedStatus)) {
        throw apiError(400, 'INVALID_MEMBERSHIP_STATUS', 'Membership status phải là ACTIVE hoặc REVOKED.');
      }

      const now = new Date().toISOString();
      const updated = {
        ...records[index],
        status: requestedStatus,
        revokedAt: requestedStatus === 'REVOKED' ? now : null,
        updatedAt: now,
      };
      records[index] = updated;
      await saveCollection('memberships', records);
      sendJson(response, 200, {
        item: toMembershipView(updated, viewerRole, viewerEmail),
      });
      return;
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/courses') {
    const assignedCourseIds = await getAssignedCourseIds(viewerRole, viewerEmail);
    const items = await Promise.all(Object.keys(COURSE_CATALOG)
      .filter((courseId) => assignedCourseIds.has(courseId))
      .map((courseId) => getCourseWithCanonicalRoster(courseId)));
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'course'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'detail' && request.method === 'GET') {
    const course = await getCourseWithCanonicalRoster(parts[2]);
    await assertCourseAccess(parts[2], viewerRole, viewerEmail);
    sendJson(response, 200, {
      course: toResource(course, viewerRole, viewerEmail, 'course'),
      detail: getCourseDetail(course, viewerRole, viewerEmail),
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'submissions' && request.method === 'GET') {
    const course = await getCourseWithCanonicalRoster(parts[2]);
    const detail = getCourseDetail(course, viewerRole, viewerEmail);
    const assignments = getAssignment(detail, requestUrl.searchParams.get('assignmentId'));

    if (assignments.length === 0) {
      throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy bài tập trong khóa học ${course.id}.`);
    }

    if (!['student', 'tutor', 'lecturer'].includes(viewerRole)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp.');
    }
    await assertCourseAccess(course.id, viewerRole, viewerEmail);
    let records = await readSubmissions();
    let changed = false;
    const items = [];

    for (const assignment of assignments) {
      const submissionContext = await getCodePulseSubmissionContext(course.id, assignment.id);
      const submissionStudents = course.id === DSA_COURSE_ID && submissionContext.classroom
        ? (await readCollection('memberships'))
          .filter((membership) => isActiveRecord(membership)
            && isCodePulseMembershipFor(membership, submissionContext.classroom))
          .map((membership) => ({
            name: membership.studentName,
            email: membership.studentEmail,
          }))
        : course.students;
      let assignmentRecords = records.filter(
        (record) => record.courseId === course.id && record.assignmentId === assignment.id,
      );

      if (assignmentRecords.length === 0) {
        assignmentRecords = createCourseSubmissionRecords(course, assignment.id, submissionStudents);
        records = [...records, ...assignmentRecords];
        changed = true;
      }

      items.push(...assignmentRecords.map((record) => toSubmissionView(record, assignment, viewerRole, submissionContext)));
    }

    if (changed) await saveSubmissions(records);

    if (viewerRole === 'student') {
      const studentId = requestUrl.searchParams.get('studentId');
      const studentEmail = requestUrl.searchParams.get('studentEmail');
      if (studentEmail && studentEmail !== viewerEmail) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp của người khác.');
      }
      const ownItems = items.filter((item) => item.student.email === viewerEmail);
      if (studentId && ownItems.some((item) => item.student.id !== studentId)) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp của người khác.');
      }
      items.splice(0, items.length, ...ownItems);
    }

    sendJson(response, 200, {
      items,
      viewerRole,
      permissions: {
        canView: true,
        canEdit: viewerRole === 'tutor' || viewerRole === 'lecturer',
        canCreate: viewerRole === 'student',
      },
      meta: {
        source: 'node-backend',
        updatedAt: new Date().toISOString(),
        total: items.length,
      },
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'submissions' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readSubmissions();
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'SUBMISSION_NOT_FOUND', `Không tìm thấy submission ${parts[2]}.`);

    const current = records[index];
    if (!['student', 'tutor', 'lecturer'].includes(viewerRole)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bài nộp.');
    }
    if (viewerRole === 'student' && current.student.email !== viewerEmail) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bài nộp của người khác.');
    }
    await assertCourseAccess(current.courseId, viewerRole, viewerEmail);
    const updated = { ...current };

    if (viewerRole === 'tutor' || viewerRole === 'lecturer') {
      if (body.score !== undefined) updated.score = body.score;
      if (body.feedback !== undefined) updated.feedback = body.feedback;
    } else {
      if (body.submittedAt !== undefined) updated.submittedAt = body.submittedAt;
      if (body.fileUrl !== undefined) updated.fileUrl = body.fileUrl;
    }

    updated.status = updated.submittedAt
      ? updated.score === null ? 'submitted' : 'graded'
      : 'not-submitted';

    records[index] = updated;
    await saveSubmissions(records);

    const course = await getCourseWithCanonicalRoster(updated.courseId);
    const assignment = getAssignment(getCourseDetail(course, viewerRole, viewerEmail), updated.assignmentId)[0];
    if (!assignment) throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy assignment ${updated.assignmentId}.`);

    sendJson(response, 200, {
      item: toSubmissionView(
        updated,
        assignment,
        viewerRole,
        await getCodePulseSubmissionContext(updated.courseId, assignment.id),
      ),
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && request.method === 'GET') {
    const courseId = requestUrl.searchParams.get('courseId');
    const records = await readCollection('sessions');
    let items = courseId ? records.filter((record) => record.courseId === courseId) : records;
    if (viewerRole === 'student') {
      const memberships = await readCollection('memberships');
      if (courseId) {
        assertStudentHasAccess(memberships, courseId, viewerRole, viewerEmail);
      } else {
        const activeClassrooms = new Set(
          memberships
            .filter(
              (membership) =>
                membership.status === 'ACTIVE' &&
                normalizeEmail(membership.studentEmail) === normalizeEmail(viewerEmail),
            )
            .map((membership) => membership.classroomId),
        );
        items = items.filter((record) => activeClassrooms.has(record.courseId));
      }
    } else if (viewerRole === 'tutor') {
      items = items.filter((record) => record.ownerEmail === viewerEmail);
    }
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'session'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    if (viewerRole !== 'tutor' && viewerRole !== 'coordinator' && viewerRole !== 'chairman') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo session.');
    }
    if (viewerRole === 'tutor' && body.item?.courseId && !isAssignedTutor(body.item.courseId, viewerEmail)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
    }
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `session-${Date.now()}`,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
      ownerRole: viewerRole,
      ownerEmail: viewerEmail,
    };
    const records = await readCollection('sessions');
    records.push(item);
    await saveCollection('sessions', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);

    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa session này.');

    const { id: ignoredId, ownerRole: ignoredRole, ownerEmail: ignoredEmail, ...patch } = clone(body.patch ?? {});
    if (viewerRole === 'tutor' && patch.courseId && !isAssignedTutor(patch.courseId, viewerEmail)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
    }
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('sessions', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa session này.');
    await saveCollection('sessions', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && request.method === 'GET') {
    const registrationType = requestUrl.searchParams.get('registrationType');
    const records = await readCollection('registrations');
    const items = registrationType
      ? records.filter((record) => record.registrationType === registrationType)
      : records;
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'registration'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    if (viewerRole !== 'coordinator' && viewerRole !== 'chairman' && body.registrationType !== viewerRole) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo đăng ký này.');
    }
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `registration-${Date.now()}`,
      registrationType: body.registrationType ?? viewerRole,
      ownerRole: viewerRole,
      ownerEmail: viewerEmail,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('registrations');
    records.push(item);
    await saveCollection('registrations', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('registrations');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa registration này.');
    const { id: ignoredId, ownerRole: ignoredRole, ownerEmail: ignoredEmail, ...patch } = clone(body.patch ?? {});
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('registrations', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('registrations');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa registration này.');
    await saveCollection('registrations', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && request.method === 'GET') {
    const records = await readCollection('courseRequests');
    sendJson(response, 200, toListResponse(records, viewerRole, viewerEmail, 'courseRequest'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    if (viewerRole !== 'coordinator' && viewerRole !== 'chairman') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo yêu cầu khóa học.');
    }
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `course-request-${Date.now()}`,
      ownerRole: viewerRole,
      ownerEmail: viewerEmail,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('courseRequests');
    records.push(item);
    await saveCollection('courseRequests', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa yêu cầu này.');
    const { id: ignoredId, ownerRole: ignoredRole, ownerEmail: ignoredEmail, ...patch } = clone(body.patch ?? {});
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('courseRequests', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa yêu cầu này.');
    await saveCollection('courseRequests', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  throw apiError(404, 'NOT_FOUND', 'Không tìm thấy API endpoint.');
}

export { handleRequest };
