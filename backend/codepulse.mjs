import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DATA_DIRECTORY,
  MEMBERSHIPS_FILE,
  TERMS_FILE,
  CLASSROOMS_FILE,
  WORKSPACES_FILE,
} from './config.mjs';
import { INITIAL_MEMBERSHIPS, USERS } from './data/seeds.mjs';

const directory = DATA_DIRECTORY;
const termFile = TERMS_FILE;
const classroomFile = CLASSROOMS_FILE;
const membershipFile = MEMBERSHIPS_FILE;
const workspaceFile = WORKSPACES_FILE;

const initialTerms = [
  { id: 'term-2026-1', courseId: '13', name: '2026 Semester 1', startDate: '2026-01-01', endDate: '2027-01-01', resetDate: '2027-01-02', status: 'ACTIVE' },
  { id: 'term-2027-1', courseId: '13', name: '2027 Semester 1', startDate: '2027-01-02', endDate: '2027-06-01', resetDate: '2027-06-02', status: 'DRAFT' },
];
const initialClassrooms = [
  { id: 'class-1', courseId: '13', termId: 'term-2026-1', name: 'CodePulse Demo', description: 'DSA practice classroom.', status: 'ACTIVE', lecturerEmail: 'lecturer@gmail.com' },
  { id: 'class-2', courseId: '13', termId: 'term-2026-1', name: 'CodePulse Other Term', description: 'Second demonstration classroom.', status: 'ACTIVE', lecturerEmail: 'lecturer2@gmail.com' },
];
const problems = [{
  id: 'problem-1', classroomId: 'class-1', title: 'Hello World',
  testCases: [
    { id: 'public-1', input: 'Hello', expectedOutput: 'Hello', hidden: false },
    { id: 'hidden-1', input: 'secret input', expectedOutput: 'secret output', hidden: true },
  ],
  rawRunnerTrace: 'internal runner trace',
}];
const initialWorkspaces = [
  { id: 'workspace-1', classroomId: 'class-1', termId: 'term-2026-1', ownerEmail: 'student@gmail.com', sourceCode: 'print("Hello World")' },
  { id: 'workspace-2', classroomId: 'class-1', termId: 'term-2026-1', ownerEmail: 'student2@gmail.com', sourceCode: 'print("Private")' },
];

let mutationQueue = Promise.resolve();

async function readRecords(file, initial) {
  await mkdir(directory, { recursive: true });
  try {
    const records = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(records)) throw new Error(`Invalid data file: ${file}`);
    return records;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await writeFile(file, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
    return structuredClone(initial);
  }
}

function mutate(file, initial, callback) {
  const result = mutationQueue.then(async () => {
    const records = await readRecords(file, initial);
    const value = callback(records);
    await writeFile(file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    return value;
  });
  mutationQueue = result.catch(() => {});
  return result;
}

export async function handleCodePulse({ request, response, requestUrl, user, sendJson, readRequestBody, apiError }) {
  const parts = requestUrl.pathname.split('/').filter(Boolean);
  const requestedCourseId = requestUrl.searchParams.get('courseId') ?? '13';
  const deny = () => { throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.'); };
  const notFound = () => { throw apiError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.'); };
  const terms = await readRecords(termFile, initialTerms);
  const classrooms = await readRecords(classroomFile, initialClassrooms);
  const term = (id) => terms.find((item) => item.id === id) ?? notFound();
  const classroom = (id) => classrooms.find((item) => item.id === id) ?? notFound();
  const memberships = await readRecords(membershipFile, INITIAL_MEMBERSHIPS);
  const membershipClassroomId = (classroomId) => classroomId.replace(/^class-/, '');
  const belongsToClassroom = (item, classroomId) =>
    item.classroomId === classroomId || item.classroomId === membershipClassroomId(classroomId);
  const isActiveMembership = (item) => String(item.status).toUpperCase() === 'ACTIVE';
  const isMember = (classroomId) => memberships.some((item) =>
    belongsToClassroom(item, classroomId) &&
    (item.studentEmail ?? item.userEmail) === user.email &&
    isActiveMembership(item));
  const isLecturer = (item) => user.role === 'lecturer' && item.lecturerEmail === user.email;
  const lecturerEmail = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const lecturer = USERS.find((candidate) =>
      candidate.role === 'lecturer' && candidate.email === String(value).trim());
    if (!lecturer) throw apiError(400, 'INVALID_LECTURER', 'Email phải thuộc một tài khoản lecturer.');
    return lecturer.email;
  };
  const canAccessClass = (item) => user.role === 'admin'
    || (user.role === 'lecturer' && isLecturer(item))
    || (user.role === 'student' && item.status === 'ACTIVE' && isMember(item.id));
  const canManageClass = (item) => user.role === 'admin' || isLecturer(item);
  const activeTerm = (item) => new Date(item.endDate).getTime() > Date.now();

  if (parts[2] === 'terms' && request.method === 'GET') {
    const items = terms.filter((item) => item.courseId === requestedCourseId && (user.role === 'admin'
      || classrooms.some((classroomItem) => classroomItem.termId === item.id && canAccessClass(classroomItem))));
    sendJson(response, 200, { items });
    return;
  }

  if (parts[2] === 'terms' && !parts[3] && request.method === 'POST') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    if (!body.name?.trim() || !body.startDate || !body.endDate || !body.resetDate) {
      throw apiError(400, 'INVALID_INPUT', 'Tên, ngày bắt đầu, ngày kết thúc và ngày reset là bắt buộc.');
    }
    if (new Date(body.endDate) <= new Date(body.startDate)) {
      throw apiError(400, 'INVALID_TERM_DATES', 'Ngày kết thúc phải sau ngày bắt đầu.');
    }
    const item = { id: body.id ?? `term-${Date.now()}`, courseId: requestedCourseId, name: body.name.trim(), startDate: body.startDate, endDate: body.endDate, resetDate: body.resetDate, status: 'DRAFT' };
    await mutate(termFile, initialTerms, (records) => { records.push(item); return item; });
    sendJson(response, 201, { item });
    return;
  }

  if (parts[2] === 'terms' && parts[3] && request.method === 'PATCH') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    const current = term(parts[3]);
    const updated = { ...current, ...body.patch, courseId: current.courseId };
    if (!updated.name?.trim() || new Date(updated.endDate) <= new Date(updated.startDate)) {
      throw apiError(400, 'INVALID_TERM_DATES', 'Term có ngày không hợp lệ.');
    }
    await mutate(termFile, initialTerms, (records) => { Object.assign(records.find((record) => record.id === current.id), updated); return updated; });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'classrooms' && !parts[3] && request.method === 'GET') {
    const items = user.role === 'admin'
      ? classrooms
      : classrooms.filter((item) => item.courseId === requestedCourseId && (user.role === 'lecturer' ? isLecturer(item) : canAccessClass(item)));
    const scopedItems = user.role === 'admin' ? items.filter((item) => item.courseId === requestedCourseId) : items;
    sendJson(response, 200, { items: scopedItems.map((item) => ({ ...item, term: term(item.termId) })) });
    return;
  }

  if (parts[2] === 'classrooms' && !parts[3] && request.method === 'POST') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    const selectedTerm = term(body.termId);
    if (selectedTerm.courseId !== requestedCourseId) throw apiError(400, 'TERM_COURSE_MISMATCH', 'Term không thuộc khóa học này.');
    if (!body.name?.trim()) throw apiError(400, 'INVALID_INPUT', 'Tên classroom không được để trống.');
    if (!activeTerm(selectedTerm)) throw apiError(400, 'TERM_ENDED', 'Không thể tạo classroom trong term đã kết thúc.');
    const item = { id: body.id ?? `class-${Date.now()}`, courseId: requestedCourseId, termId: selectedTerm.id, name: body.name.trim(), description: body.description?.trim() ?? '', status: 'DRAFT', lecturerEmail: lecturerEmail(body.lecturerEmail) };
    await mutate(classroomFile, initialClassrooms, (records) => { records.push(item); return item; });
    sendJson(response, 201, { item: { ...item, term: selectedTerm } });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && request.method === 'PATCH' && !parts[4]) {
    const current = classroom(parts[3]);
    if (!canManageClass(current)) deny();
    const body = await readRequestBody(request);
    const patch = body.patch ?? {};
    if (patch.name !== undefined && !patch.name.trim()) throw apiError(400, 'INVALID_INPUT', 'Tên classroom không được để trống.');
    if (patch.status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(patch.status)) throw apiError(400, 'INVALID_STATUS', 'Trạng thái classroom không hợp lệ.');
    const allowedPatch = user.role === 'admin'
      ? patch
      : Object.fromEntries(Object.entries(patch).filter(([key]) => ['name', 'description', 'status'].includes(key)));
    if (user.role === 'admin' && Object.hasOwn(allowedPatch, 'lecturerEmail')) {
      allowedPatch.lecturerEmail = lecturerEmail(allowedPatch.lecturerEmail);
    }
    if (user.role === 'admin' && Object.hasOwn(allowedPatch, 'termId')) {
      const selectedTerm = term(allowedPatch.termId);
      if (selectedTerm.courseId !== current.courseId) throw apiError(400, 'TERM_COURSE_MISMATCH', 'Term không thuộc khóa học này.');
      if (!activeTerm(selectedTerm)) throw apiError(400, 'TERM_ENDED', 'Không thể chuyển classroom sang term đã kết thúc.');
    }
    const updated = { ...current, ...allowedPatch, courseId: current.courseId, name: allowedPatch.name?.trim() ?? current.name };
    await mutate(classroomFile, initialClassrooms, (records) => { Object.assign(records.find((record) => record.id === current.id), updated); return updated; });
    sendJson(response, 200, { item: { ...updated, term: term(updated.termId) } });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && request.method === 'DELETE' && !parts[4]) {
    if (user.role !== 'admin') deny();
    const current = classroom(parts[3]);
    await mutate(classroomFile, initialClassrooms, (records) => {
      const index = records.findIndex((record) => record.id === current.id);
      if (index < 0) notFound();
      records.splice(index, 1);
      return current;
    });
    const linkedClassroomIds = new Set([current.id, membershipClassroomId(current.id)]);
    await mutate(membershipFile, INITIAL_MEMBERSHIPS, (records) => {
      records.splice(0, records.length, ...records.filter((record) => !linkedClassroomIds.has(record.classroomId)));
      return true;
    });
    await mutate(workspaceFile, initialWorkspaces, (records) => {
      records.splice(0, records.length, ...records.filter((record) => record.classroomId !== current.id));
      return true;
    });
    sendJson(response, 200, { deleted: true, item: current });
    return;
  }

  if (parts[2] === 'classrooms' && parts[3] && !parts[4] && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!canAccessClass(item)) deny();
    sendJson(response, 200, { item });
    return;
  }

  if (parts[2] === 'classrooms' && parts[4] === 'dashboard' && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!isLecturer(item)) deny();
    sendJson(response, 200, { classroom: item, activeMembers: memberships.filter((member) =>
      belongsToClassroom(member, item.id) && isActiveMembership(member)).length });
    return;
  }

  if (parts[2] === 'classrooms' && parts[4] === 'problems' && parts[5] && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!canAccessClass(item)) deny();
    const problem = problems.find((record) => record.id === parts[5] && record.classroomId === item.id) ?? notFound();
    if (user.role === 'student') {
      const { rawRunnerTrace, ...safeProblem } = problem;
      sendJson(response, 200, { item: { ...safeProblem, testCases: problem.testCases.filter((test) => !test.hidden) } });
    } else {
      sendJson(response, 200, { item: problem });
    }
    return;
  }

  if (parts[2] === 'workspaces' && parts[3] && (request.method === 'GET' || request.method === 'PATCH')) {
    if (user.role === 'admin') deny();
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const item = classroom(workspace.classroomId);
    if (workspace.termId !== item.termId) deny();
    const isOwner = user.role === 'student' && workspace.ownerEmail === user.email && isMember(item.id);
    const lecturerCanRead = isLecturer(item) && memberships.some((member) =>
      belongsToClassroom(member, item.id) &&
      (member.studentEmail ?? member.userEmail) === workspace.ownerEmail &&
      isActiveMembership(member));
    if (request.method === 'GET') {
      if (!isOwner && !lecturerCanRead) deny();
      sendJson(response, 200, { item: workspace });
      return;
    }
    if (!isOwner) deny();
    if (item.status === 'ARCHIVED') throw apiError(409, 'CLASSROOM_ARCHIVED', 'Classroom đã được lưu trữ và chỉ đọc.');
    const body = await readRequestBody(request);
    if (typeof body.sourceCode !== 'string') throw apiError(400, 'INVALID_INPUT', 'sourceCode phải là chuỗi.');
    const updated = await mutate(workspaceFile, initialWorkspaces, (records) => {
      const current = records.find((record) => record.id === workspace.id) ?? notFound();
      current.sourceCode = body.sourceCode;
      current.updatedAt = new Date().toISOString();
      return current;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (parts[2] === 'memberships' && parts[3] && request.method === 'PATCH') {
    if (user.role !== 'admin') deny();
    const body = await readRequestBody(request);
    const requestedStatus = String(body.status ?? '').toLowerCase();
    if (!['active', 'revoked'].includes(requestedStatus)) {
      throw apiError(400, 'INVALID_INPUT', 'Membership status phải là active hoặc revoked.');
    }
    const codepulseMembershipIds = { 'member-1': 'student-account-1', 'member-2': '2-student-1' };
    const current = memberships.find((record) =>
      record.id === parts[3] || record.studentId === codepulseMembershipIds[parts[3]]);
    if (!current) notFound();
    const updated = await mutate(membershipFile, [], (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      const timestamp = new Date().toISOString();
      stored.status = requestedStatus.toUpperCase();
      stored.revokedAt = requestedStatus === 'revoked' ? timestamp : null;
      stored.updatedAt = timestamp;
      return stored;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  notFound();
}
