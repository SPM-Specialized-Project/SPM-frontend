import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DATA_DIRECTORY,
  MEMBERSHIPS_FILE,
  TERMS_FILE,
  CLASSROOMS_FILE,
  ASSIGNMENTS_FILE,
  WORKSPACES_FILE,
} from './config.mjs';
import { INITIAL_MEMBERSHIPS, USERS } from './data/seeds.mjs';

const directory = DATA_DIRECTORY;
const termFile = TERMS_FILE;
const classroomFile = CLASSROOMS_FILE;
const membershipFile = MEMBERSHIPS_FILE;
const workspaceFile = WORKSPACES_FILE;
const assignmentFile = ASSIGNMENTS_FILE;

const ALLOWED_RUNTIMES = new Set(['PYTHON', 'CPP']);
const MAX_CPU_TIME_LIMIT_MS = 10_000;
const MAX_MEMORY_LIMIT_MB = 1_024;

const initialTerms = [
  { id: 'term-2026-1', courseId: '13', name: '2026 Semester 1', startDate: '2026-01-01', endDate: '2027-01-01', resetDate: '2027-01-02', status: 'ACTIVE' },
  { id: 'term-2027-1', courseId: '13', name: '2027 Semester 1', startDate: '2027-01-02', endDate: '2027-06-01', resetDate: '2027-06-02', status: 'DRAFT' },
];
const initialClassrooms = [
  { id: 'class-1', courseId: '13', termId: 'term-2026-1', name: 'CodePulse Demo', description: 'DSA practice classroom.', status: 'ACTIVE', lecturerEmail: 'lecturer@gmail.com' },
  { id: 'class-2', courseId: '13', termId: 'term-2026-1', name: 'CodePulse Other Term', description: 'Second demonstration classroom.', status: 'ACTIVE', lecturerEmail: 'lecturer2@gmail.com' },
];
const initialAssignments = [{
  id: 'problem-1', classroomId: 'class-1', title: 'Hello World',
  description: 'Read one line and print it unchanged.',
  constraints: 'The input contains one non-empty line.',
  inputFormat: 'A single line of text.',
  outputFormat: 'Print the same line.',
  cpuTimeLimitMs: 1_000,
  memoryLimitMb: 128,
  runtime: 'PYTHON',
  referenceSolution: 'print(input())',
  verificationStatus: 'VERIFIED',
  verifiedAt: '2026-01-01T00:00:00.000Z',
  verifiedBy: 'lecturer@gmail.com',
  status: 'PUBLISHED',
  testCases: [
    { id: 'public-1', input: 'Hello', expectedOutput: 'Hello', hidden: false, verified: true },
    { id: 'hidden-1', input: 'secret input', expectedOutput: 'secret output', hidden: true, verified: true },
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

const assignmentFields = [
  'title',
  'description',
  'constraints',
  'inputFormat',
  'outputFormat',
  'cpuTimeLimitMs',
  'memoryLimitMb',
  'runtime',
  'referenceSolution',
  'testCases',
];

const normalizeTestCases = (value) => (Array.isArray(value) ? value.map((test, index) => ({
  id: test?.id ?? `test-${Date.now()}-${index + 1}`,
  input: typeof test?.input === 'string' ? test.input : '',
  expectedOutput: typeof test?.expectedOutput === 'string' ? test.expectedOutput : '',
  hidden: Boolean(test?.hidden),
  verified: Boolean(test?.verified),
})) : []);

const normalizeAssignmentInput = (body = {}) => ({
  title: typeof body.title === 'string' ? body.title.trim() : '',
  description: typeof body.description === 'string' ? body.description.trim() : '',
  constraints: typeof body.constraints === 'string' ? body.constraints.trim() : '',
  inputFormat: typeof body.inputFormat === 'string' ? body.inputFormat.trim() : '',
  outputFormat: typeof body.outputFormat === 'string' ? body.outputFormat.trim() : '',
  cpuTimeLimitMs: body.cpuTimeLimitMs === '' || body.cpuTimeLimitMs === undefined ? null : Number(body.cpuTimeLimitMs),
  memoryLimitMb: body.memoryLimitMb === '' || body.memoryLimitMb === undefined ? null : Number(body.memoryLimitMb),
  runtime: typeof body.runtime === 'string' ? body.runtime.toUpperCase() : '',
  referenceSolution: typeof body.referenceSolution === 'string' ? body.referenceSolution.trim() : '',
  testCases: normalizeTestCases(body.testCases),
});

const normalizeAssignmentPatch = (patch = {}) => {
  const normalized = {};
  for (const field of assignmentFields) {
    if (!Object.hasOwn(patch, field)) continue;
    if (field === 'testCases') {
      normalized[field] = normalizeTestCases(patch[field]);
    } else if (['title', 'description', 'constraints', 'inputFormat', 'outputFormat', 'referenceSolution'].includes(field)) {
      normalized[field] = typeof patch[field] === 'string' ? patch[field].trim() : '';
    } else if (field === 'runtime') {
      normalized[field] = typeof patch[field] === 'string' ? patch[field].toUpperCase() : '';
    } else {
      const numberValue = Number(patch[field]);
      normalized[field] = Number.isFinite(numberValue) ? numberValue : null;
    }
  }
  return normalized;
};

const validationError = (makeApiError, errors) => {
  const error = makeApiError(422, 'VALIDATION_ERROR', 'Assignment chưa đủ điều kiện để publish.');
  error.errors = errors;
  return error;
};

const validatePublishableAssignment = (assignment) => {
  const errors = {};
  const requiredFields = [
    ['title', 'Tiêu đề là bắt buộc.'],
    ['description', 'Mô tả bài toán là bắt buộc.'],
    ['constraints', 'Constraints là bắt buộc.'],
    ['inputFormat', 'Input format là bắt buộc; nếu không có input hãy ghi rõ “No input”.'],
    ['outputFormat', 'Output format là bắt buộc.'],
    ['referenceSolution', 'Reference solution là bắt buộc để verify.'],
  ];
  for (const [field, message] of requiredFields) {
    if (!assignment[field]) errors[field] = message;
  }
  if (assignment.inputFormat && !assignment.inputFormat.toLowerCase().includes('no input') && assignment.inputFormat.length < 3) {
    errors.inputFormat = 'Input format phải mô tả input hoặc ghi rõ “No input”.';
  }
  if (!ALLOWED_RUNTIMES.has(assignment.runtime)) errors.runtime = 'Runtime phải là PYTHON hoặc CPP.';
  if (!Number.isFinite(assignment.cpuTimeLimitMs) || assignment.cpuTimeLimitMs <= 0) {
    errors.cpuTimeLimitMs = 'CPU time limit phải lớn hơn 0.';
  } else if (assignment.cpuTimeLimitMs > MAX_CPU_TIME_LIMIT_MS) {
    errors.cpuTimeLimitMs = `CPU time limit không được vượt quá ${MAX_CPU_TIME_LIMIT_MS} ms.`;
  }
  if (!Number.isFinite(assignment.memoryLimitMb) || assignment.memoryLimitMb <= 0) {
    errors.memoryLimitMb = 'Memory limit phải lớn hơn 0.';
  } else if (assignment.memoryLimitMb > MAX_MEMORY_LIMIT_MB) {
    errors.memoryLimitMb = `Memory limit không được vượt quá ${MAX_MEMORY_LIMIT_MB} MB.`;
  }
  if (!Array.isArray(assignment.testCases) || assignment.testCases.length === 0) {
    errors.testCases = 'Cần ít nhất một test case.';
  } else {
    assignment.testCases.forEach((test, index) => {
      if (typeof test.input !== 'string') errors[`testCases.${index}.input`] = 'Input test case phải là chuỗi.';
      if (typeof test.expectedOutput !== 'string') errors[`testCases.${index}.expectedOutput`] = 'Expected output phải là chuỗi.';
      if (!test.verified) errors[`testCases.${index}.verified`] = 'Test case chưa được verify bằng reference solution.';
    });
  }
  if (assignment.verificationStatus !== 'VERIFIED') errors.verification = 'Hãy verify assignment bằng reference solution trước khi publish.';
  return errors;
};

const publicAssignment = (assignment, viewerRole) => {
  if (viewerRole !== 'student') return assignment;
  const { rawRunnerTrace, referenceSolution, verificationStatus, verifiedAt, verifiedBy, ...safeAssignment } = assignment;
  return {
    ...safeAssignment,
    testCases: assignment.testCases.filter((test) => !test.hidden),
  };
};

export async function handleCodePulse({ request, response, requestUrl, user, sendJson, readRequestBody, apiError }) {
  const parts = requestUrl.pathname.split('/').filter(Boolean);
  const requestedCourseId = requestUrl.searchParams.get('courseId') ?? '13';
  const deny = () => { throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.'); };
  const notFound = () => { throw apiError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.'); };
  const terms = await readRecords(termFile, initialTerms);
  const classrooms = await readRecords(classroomFile, initialClassrooms);
  const assignments = await readRecords(assignmentFile, initialAssignments);
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
  const canManageAssignment = (item) => user.role === 'lecturer' && isLecturer(item);
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

  const isAssignmentRoute = parts[2] === 'classrooms'
    && parts[3]
    && ['problems', 'assignments'].includes(parts[4]);

  if (isAssignmentRoute && !parts[5] && request.method === 'GET') {
    const item = classroom(parts[3]);
    if (!canAccessClass(item)) deny();
    const visibleAssignments = assignments
      .filter((assignment) => assignment.classroomId === item.id)
      .filter((assignment) => user.role !== 'student' || assignment.status === 'PUBLISHED')
      .map((assignment) => publicAssignment(assignment, user.role));
    sendJson(response, 200, { items: visibleAssignments });
    return;
  }

  if (isAssignmentRoute && !parts[5] && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const body = await readRequestBody(request);
    const item = {
      id: body.id ?? `assignment-${Date.now()}`,
      classroomId: classroomItem.id,
      ...normalizeAssignmentInput(body),
      status: 'DRAFT',
      verificationStatus: 'UNVERIFIED',
      verifiedAt: null,
      verifiedBy: null,
    };
    await mutate(assignmentFile, initialAssignments, (records) => { records.push(item); return item; });
    sendJson(response, 201, { item });
    return;
  }

  if (isAssignmentRoute && parts[5] && parts[6] === 'verify' && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const body = await readRequestBody(request);
    const referenceSolution = typeof body.referenceSolution === 'string'
      ? body.referenceSolution.trim()
      : current.referenceSolution;
    const verificationErrors = {};
    if (!referenceSolution) verificationErrors.referenceSolution = 'Reference solution là bắt buộc.';
    if (!current.testCases.length) verificationErrors.testCases = 'Cần ít nhất một test case để verify.';
    current.testCases.forEach((test, index) => {
      if (typeof test.expectedOutput !== 'string') verificationErrors[`testCases.${index}.expectedOutput`] = 'Expected output phải là chuỗi.';
    });
    if (Object.keys(verificationErrors).length > 0) throw validationError(apiError, verificationErrors);
    const updated = await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      stored.referenceSolution = referenceSolution;
      stored.testCases = stored.testCases.map((test) => ({ ...test, verified: true }));
      stored.verificationStatus = 'VERIFIED';
      stored.verifiedAt = new Date().toISOString();
      stored.verifiedBy = user.email;
      return stored;
    });
    sendJson(response, 200, { item: updated, verification: { status: 'VERIFIED', testCaseCount: updated.testCases.length } });
    return;
  }

  if (isAssignmentRoute && parts[5] && !parts[6] && request.method === 'GET') {
    const classroomItem = classroom(parts[3]);
    if (!canAccessClass(classroomItem)) deny();
    const assignment = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    if (user.role === 'student' && assignment.status !== 'PUBLISHED') notFound();
    sendJson(response, 200, { item: publicAssignment(assignment, user.role) });
    return;
  }

  if (isAssignmentRoute && parts[5] && !parts[6] && request.method === 'PATCH') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const body = await readRequestBody(request);
    const patch = normalizeAssignmentPatch(body.patch ?? body);
    const updated = { ...current, ...patch, classroomId: current.classroomId, status: current.status };
    if (Object.keys(patch).length > 0) {
      updated.status = 'DRAFT';
      updated.verificationStatus = 'UNVERIFIED';
      updated.verifiedAt = null;
      updated.verifiedBy = null;
      updated.testCases = updated.testCases.map((test) => ({ ...test, verified: false }));
    }
    await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      Object.assign(stored, updated);
      return stored;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  if (isAssignmentRoute && parts[5] && !parts[6] && request.method === 'DELETE') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    await mutate(assignmentFile, initialAssignments, (records) => {
      const index = records.findIndex((record) => record.id === current.id);
      if (index < 0) notFound();
      records.splice(index, 1);
      return true;
    });
    sendJson(response, 200, { deleted: true, item: current });
    return;
  }

  if (isAssignmentRoute && parts[5] && parts[6] === 'publish' && request.method === 'POST') {
    const classroomItem = classroom(parts[3]);
    if (!canManageAssignment(classroomItem)) deny();
    const current = assignments.find((record) => record.id === parts[5] && record.classroomId === classroomItem.id) ?? notFound();
    const errors = validatePublishableAssignment(current);
    if (Object.keys(errors).length > 0) throw validationError(apiError, errors);
    const updated = await mutate(assignmentFile, initialAssignments, (records) => {
      const stored = records.find((record) => record.id === current.id) ?? notFound();
      stored.status = 'PUBLISHED';
      return stored;
    });
    sendJson(response, 200, { item: updated });
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
