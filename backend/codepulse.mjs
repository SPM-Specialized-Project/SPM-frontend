import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { DATA_DIRECTORY } from './config.mjs';

const directory = DATA_DIRECTORY;
const membershipFile = path.join(directory, 'codepulse-memberships.json');
const workspaceFile = path.join(directory, 'codepulse-workspaces.json');

const classrooms = [
  { id: 'class-1', term: '2026-1', name: 'CodePulse Demo', lecturerEmail: 'lecturer@gmail.com' },
  { id: 'class-2', term: '2026-2', name: 'CodePulse Other Term', lecturerEmail: 'lecturer2@gmail.com' },
];
const problems = [{
  id: 'problem-1', classroomId: 'class-1', title: 'Hello World',
  testCases: [
    { id: 'public-1', input: 'Hello', expectedOutput: 'Hello', hidden: false },
    { id: 'hidden-1', input: 'secret input', expectedOutput: 'secret output', hidden: true },
  ],
  rawRunnerTrace: 'internal runner trace',
}];
const initialMemberships = [
  { id: 'member-1', classroomId: 'class-1', userEmail: 'student@gmail.com', status: 'active' },
  { id: 'member-2', classroomId: 'class-1', userEmail: 'student2@gmail.com', status: 'active' },
];
const initialWorkspaces = [
  { id: 'workspace-1', classroomId: 'class-1', ownerEmail: 'student@gmail.com', sourceCode: 'print("Hello World")' },
  { id: 'workspace-2', classroomId: 'class-1', ownerEmail: 'student2@gmail.com', sourceCode: 'print("Private")' },
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
  const deny = () => { throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.'); };
  const notFound = () => { throw apiError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.'); };
  const classroom = (id) => classrooms.find((item) => item.id === id) ?? notFound();
  const memberships = await readRecords(membershipFile, initialMemberships);
  const isMember = (classroomId) => memberships.some((item) =>
    item.classroomId === classroomId && item.userEmail === user.email && item.status === 'active');
  const isLecturer = (item) => user.role === 'lecturer' && item.lecturerEmail === user.email;
  const canAccessClass = (item) => isLecturer(item) || (user.role === 'student' && isMember(item.id));

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
      member.classroomId === item.id && member.status === 'active').length });
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
    const workspaces = await readRecords(workspaceFile, initialWorkspaces);
    const workspace = workspaces.find((item) => item.id === parts[3]) ?? notFound();
    const item = classroom(workspace.classroomId);
    const isOwner = user.role === 'student' && workspace.ownerEmail === user.email && isMember(item.id);
    const lecturerCanRead = isLecturer(item) && memberships.some((member) =>
      member.classroomId === item.id && member.userEmail === workspace.ownerEmail && member.status === 'active');
    if (request.method === 'GET') {
      if (!isOwner && !lecturerCanRead) deny();
      sendJson(response, 200, { item: workspace });
      return;
    }
    if (!isOwner) deny();
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
    if (!['active', 'revoked'].includes(body.status)) {
      throw apiError(400, 'INVALID_INPUT', 'Membership status phải là active hoặc revoked.');
    }
    const updated = await mutate(membershipFile, initialMemberships, (records) => {
      const current = records.find((record) => record.id === parts[3]) ?? notFound();
      current.status = body.status;
      current.updatedAt = new Date().toISOString();
      return current;
    });
    sendJson(response, 200, { item: updated });
    return;
  }

  notFound();
}
