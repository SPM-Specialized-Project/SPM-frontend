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
  normalizeRole,
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

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const parts = requestUrl.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'spm-backend-driver' });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
    const body = await readRequestBody(request);
    const user = USERS.find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );

    if (!user) throw apiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng!');

    sendJson(response, 200, {
      accessToken: `local-backend-token-${user.role}-${Date.now()}`,
      user: createUser(user),
      role: user.role,
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/courses') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const items = Array.from({ length: 12 }, (_, index) => getCourse(String(index + 1)));
    sendJson(response, 200, toListResponse(items, viewerRole, requestUrl.searchParams.get('viewerEmail'), 'course'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'detail' && request.method === 'GET') {
    const course = getCourse(parts[2]);
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    sendJson(response, 200, {
      course: toResource(course, viewerRole, requestUrl.searchParams.get('viewerEmail'), 'course'),
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

    const viewerRole = requestUrl.searchParams.get('viewerRole') === 'tutor' ? 'tutor' : 'student';
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
      const matched = items.filter(
        (item) =>
          (studentId && item.student.id === studentId) ||
          (studentEmail && item.student.email === studentEmail),
      );
      if (studentId || studentEmail) items.splice(0, items.length, ...(matched.length > 0 ? matched : items.slice(0, 1)));
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
        source: 'local-backend',
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
    const viewerRole = body.viewerRole === 'tutor' ? 'tutor' : 'student';
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
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const viewerEmail = requestUrl.searchParams.get('viewerEmail');
    const courseId = requestUrl.searchParams.get('courseId');
    const records = await readCollection('sessions');
    const items = courseId ? records.filter((record) => record.courseId === courseId) : records;
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'session'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    const viewerRole = normalizeRole(body.viewerRole);
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `session-${Date.now()}`,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
      ownerRole: body.item?.ownerRole ?? viewerRole,
      ownerEmail: body.item?.ownerEmail ?? body.viewerEmail ?? undefined,
    };
    const records = await readCollection('sessions');
    records.push(item);
    await saveCollection('sessions', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, body.viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);

    const viewerRole = normalizeRole(body.viewerRole);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa session này.');

    const updated = { ...current, ...clone(body.patch ?? {}), updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('sessions', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, body.viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole: body.viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa session này.');
    await saveCollection('sessions', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && request.method === 'GET') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const viewerEmail = requestUrl.searchParams.get('viewerEmail');
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
    const viewerRole = normalizeRole(body.viewerRole);
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `registration-${Date.now()}`,
      registrationType: body.registrationType ?? viewerRole,
      ownerRole: body.item?.ownerRole ?? viewerRole,
      ownerEmail: body.item?.ownerEmail ?? body.item?.Email ?? body.viewerEmail ?? undefined,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('registrations');
    records.push(item);
    await saveCollection('registrations', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, body.viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('registrations');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
    const viewerRole = normalizeRole(body.viewerRole);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa registration này.');
    const updated = { ...current, ...clone(body.patch ?? {}), updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('registrations', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, body.viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('registrations');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole: body.viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa registration này.');
    await saveCollection('registrations', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && request.method === 'GET') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const viewerEmail = requestUrl.searchParams.get('viewerEmail');
    const records = await readCollection('courseRequests');
    sendJson(response, 200, toListResponse(records, viewerRole, viewerEmail, 'courseRequest'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    const viewerRole = normalizeRole(body.viewerRole);
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `course-request-${Date.now()}`,
      ownerRole: body.item?.ownerRole ?? viewerRole,
      ownerEmail: body.item?.ownerEmail ?? body.item?.coordinatorEmail ?? body.viewerEmail ?? undefined,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('courseRequests');
    records.push(item);
    await saveCollection('courseRequests', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, body.viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const viewerRole = normalizeRole(body.viewerRole);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa yêu cầu này.');
    const updated = { ...current, ...clone(body.patch ?? {}), updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('courseRequests', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, body.viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole: body.viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa yêu cầu này.');
    await saveCollection('courseRequests', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  throw apiError(404, 'NOT_FOUND', 'Không tìm thấy API endpoint.');
}

export { handleRequest };
