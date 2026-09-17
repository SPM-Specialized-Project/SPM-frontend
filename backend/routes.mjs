import { PORT } from './config.mjs';
import { USERS } from './data/seeds.mjs';
import {
  clone,
  createCourseSubmissionRecords,
  createUser,
  getAssignment,
  getCourse,
  getCourseDetail,
  getResourcePermissions,
  toListResponse,
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
import { handleCodePulse } from './codepulse.mjs';

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

    sendJson(response, 200, {
      accessToken: createSession(user),
      user: createUser(user),
      role: user.role,
    });
    return;
  }

  const currentUser = getSessionUser(request, USERS);
  if (!currentUser) throw apiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
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
  if (viewerRole === 'lecturer' || viewerRole === 'admin') {
    throw apiError(403, 'FORBIDDEN', 'Vai trò này không có quyền truy cập API khóa học.');
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/courses') {
    const items = Array.from({ length: 12 }, (_, index) => getCourse(String(index + 1)));
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'course'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'detail' && request.method === 'GET') {
    const course = getCourse(parts[2]);
    sendJson(response, 200, {
      course: toResource(course, viewerRole, viewerEmail, 'course'),
      detail: getCourseDetail(course, viewerRole),
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'submissions' && request.method === 'GET') {
    const course = getCourse(parts[2]);
    const detail = getCourseDetail(course);
    const assignments = getAssignment(detail, requestUrl.searchParams.get('assignmentId'));

    if (assignments.length === 0) {
      throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy bài tập trong khóa học ${course.id}.`);
    }

    if (viewerRole !== 'student' && viewerRole !== 'tutor') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp.');
    }
    if (viewerRole === 'tutor') {
      const sessions = await readCollection('sessions');
      if (!sessions.some((item) => item.courseId === course.id && item.ownerEmail === viewerEmail)) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
      }
    }
    let records = await readSubmissions();
    let changed = false;
    const items = [];

    for (const assignment of assignments) {
      let assignmentRecords = records.filter(
        (record) => record.courseId === course.id && record.assignmentId === assignment.id,
      );

      if (assignmentRecords.length === 0) {
        assignmentRecords = createCourseSubmissionRecords(course, assignment.id);
        records = [...records, ...assignmentRecords];
        changed = true;
      }

      items.push(...assignmentRecords.map((record) => toSubmissionView(record, assignment, viewerRole)));
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
        canEdit: viewerRole === 'tutor',
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
    if (viewerRole !== 'student' && viewerRole !== 'tutor') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bài nộp.');
    }
    if (viewerRole === 'student' && current.student.email !== viewerEmail) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bài nộp của người khác.');
    }
    if (viewerRole === 'tutor') {
      const sessions = await readCollection('sessions');
      if (!sessions.some((item) => item.courseId === current.courseId && item.ownerEmail === viewerEmail)) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
      }
    }
    const updated = { ...current };

    if (viewerRole === 'tutor') {
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

    const course = getCourse(updated.courseId);
    const assignment = getAssignment(getCourseDetail(course), updated.assignmentId)[0];
    if (!assignment) throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy assignment ${updated.assignmentId}.`);

    sendJson(response, 200, { item: toSubmissionView(updated, assignment, viewerRole) });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && request.method === 'GET') {
    const courseId = requestUrl.searchParams.get('courseId');
    const records = await readCollection('sessions');
    const items = courseId ? records.filter((record) => record.courseId === courseId) : records;
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'session'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    if (viewerRole !== 'tutor' && viewerRole !== 'coordinator' && viewerRole !== 'chairman') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo session.');
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
