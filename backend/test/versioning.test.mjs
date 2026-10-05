import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');
const studentKey = (email) => createHash('sha256').update(email).digest('hex');

test('publishes immutable versions and commits student submissions to Gitea branches', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-version-test-'));
  const giteaRequests = [];
  const gitFiles = new Map();
  const gitea = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    giteaRequests.push({ method: request.method, url: request.url, body });
    response.setHeader('Content-Type', 'application/json');

    if (request.method === 'POST' && request.url === '/api/v1/user/repos') {
      response.writeHead(201);
      response.end(JSON.stringify({ default_branch: 'main' }));
      return;
    }
    if (request.method === 'POST' && request.url.includes('/branches')) {
      response.writeHead(201);
      response.end(JSON.stringify({ name: body.new_branch_name }));
      return;
    }
    if (request.method === 'GET' && request.url.includes('/contents/')) {
      response.writeHead(404);
      response.end(JSON.stringify({ message: 'not found' }));
      return;
    }
    if (request.method === 'PUT' && request.url.includes('/contents/')) {
      const commitPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      gitFiles.set(`${body.branch}:${commitPath}`, Buffer.from(body.content, 'base64').toString('utf8'));
      response.writeHead(201);
      response.end(JSON.stringify({ commit: { sha: `sha-${gitFiles.size}` } }));
      return;
    }
    response.writeHead(404);
    response.end(JSON.stringify({ message: 'unhandled mock route' }));
  });
  await new Promise((resolve) => gitea.listen(0, '127.0.0.1', resolve));
  const giteaUrl = `http://127.0.0.1:${gitea.address().port}/api/v1`;
  const backend = spawn(process.execPath, [serverFile], {
    env: {
      ...process.env,
      BACKEND_PORT: '0',
      BACKEND_DATA_DIRECTORY: dataDirectory,
      GITEA_API_URL: giteaUrl,
      GITEA_API_TOKEN: 'test-token',
      GITEA_OWNER: 'codepulse',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(async () => {
    backend.kill();
    await new Promise((resolve) => gitea.close(resolve));
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Backend startup timed out')), 5000);
    backend.once('error', reject);
    backend.once('exit', (code) => reject(new Error(`Backend exited: ${code}`)));
    backend.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(Number(match[1]));
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
  const lecturer = await login('lecturer@gmail.com', 'lecturer123');
  const student = await login('student@gmail.com', 'student123');
  const student2 = await login('student2@gmail.com', 'student2123');
  const assignmentInput = {
    title: 'Weighted version fixture',
    description: 'A version-pinning integration test.',
    constraints: 'Inputs are short strings.',
    inputFormat: 'One string.',
    outputFormat: 'Print the expected transformed string.',
    cpuTimeLimitMs: 5000,
    memoryLimitMb: 128,
    runtime: 'PYTHON',
    referenceSolution: 'value = input(); print(value if value == "public" else "secret output")',
    comparator: { normalizeLineEndings: true, trimTrailingNewline: false },
    testCases: [
      { id: 'public', input: 'public', expectedOutput: 'public\n', hidden: false, weight: 2 },
      { id: 'hidden', input: 'secret input', expectedOutput: 'secret output\n', hidden: true, weight: 3 },
    ],
  };
  const created = await api('/api/codepulse/classrooms/class-1/assignments', lecturer, 'POST', assignmentInput);
  assert.equal(created.status, 201);
  const assignmentId = created.data.item.id;
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/verify`, lecturer, 'POST')).status, 200);
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/publish`, lecturer, 'POST')).status, 200);

  const versionsPath = path.join(dataDirectory, 'codepulse-assignment-versions.json');
  const versionsV1 = JSON.parse(await readFile(versionsPath, 'utf8'));
  const version1 = versionsV1.find((item) => item.assignmentId === assignmentId);
  assert.equal(version1.version, 1);
  assert.equal(version1.testCases[1].expectedOutput, 'secret output\n');
  assert.equal(version1.comparator.trimTrailingNewline, false);
  assert.ok(version1.giteaRepository);
  assert.equal(version1.giteaBranch, 'version/1');
  assert.equal(giteaRequests.filter((item) => item.url === '/api/v1/user/repos').length, 1);

  const lecturerHistoryBeforeUse = await api(`/api/codepulse/classrooms/class-1/assignment-versions/${version1.id}/history`, lecturer);
  assert.equal(lecturerHistoryBeforeUse.status, 200);
  assert.equal(lecturerHistoryBeforeUse.data.item.testCases.length, 2);
  assert.deepEqual(lecturerHistoryBeforeUse.data.submissions, []);

  const studentProblem = await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}`, student);
  assert.equal(studentProblem.data.item.testCases.length, 1);
  assert.equal(JSON.stringify(studentProblem.data).includes('secret input'), false);
  const runV1 = await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/run`, student, 'POST', {
    sourceCode: 'print(input())',
  });
  assert.equal(runV1.status, 200);
  assert.equal(runV1.data.item.assignmentVersionId, version1.id);
  const submittedV1 = await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/submissions`, student, 'POST', {
    sourceCode: 'print(input())',
  });
  assert.equal(submittedV1.status, 201);
  assert.equal(submittedV1.data.item.assignmentVersionId, version1.id);
  assert.equal(submittedV1.data.item.score, 40, JSON.stringify(submittedV1.data));
  assert.equal(JSON.stringify(submittedV1.data).includes('secret input'), false);
  assert.equal(JSON.stringify(submittedV1.data).includes('secret output'), false);
  assert.equal(submittedV1.data.item.results.length, 2);
  assert.equal(submittedV1.data.item.results[1].testCaseId, 'hidden');
  assert.equal('input' in submittedV1.data.item.results[1], false);

  const lecturerHistoryV1 = await api(`/api/codepulse/classrooms/class-1/assignment-versions/${version1.id}/history`, lecturer);
  assert.equal(lecturerHistoryV1.status, 200);
  assert.equal(lecturerHistoryV1.data.item.testCases[1].input, 'secret input');
  assert.equal(lecturerHistoryV1.data.submissions.length, 1);
  assert.equal(lecturerHistoryV1.data.submissions[0].studentEmail, 'student@gmail.com');
  assert.equal(lecturerHistoryV1.data.submissions[0].assignmentVersionId, version1.id);
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignment-versions/${version1.id}/history`, student)).status, 403);

  const edited = await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}`, lecturer, 'PATCH', {
    patch: {
      description: 'Version two description.',
      testCases: [
        { id: 'public-v2', input: 'public', expectedOutput: 'public!\n', hidden: false, weight: 4 },
        { id: 'hidden-v2', input: 'secret input v2', expectedOutput: 'secret output v2\n', hidden: true, weight: 1 },
      ],
    },
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.item.status, 'DRAFT');
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/verify`, lecturer, 'POST')).status, 200);
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/publish`, lecturer, 'POST')).status, 200);

  const versionsV2 = JSON.parse(await readFile(versionsPath, 'utf8'));
  const retainedV1 = versionsV2.find((item) => item.id === version1.id);
  const version2 = versionsV2.find((item) => item.assignmentId === assignmentId && item.version === 2);
  assert.equal(retainedV1.testCases[1].expectedOutput, 'secret output\n');
  assert.equal(version2.description, 'Version two description.');
  assert.deepEqual(version2.testCases.map((item) => item.weight), [4, 1]);
  assert.equal(version2.giteaBranch, 'version/2');
  assert.equal('versionDescription' in version2, false);
  const branchV2 = giteaRequests.find((item) => item.url.includes('/branches') && item.body.new_branch_name === 'version/2');
  assert.equal(branchV2.body.old_branch_name, 'version/1');

  const submittedV2 = await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/submissions`, student, 'POST', {
    sourceCode: 'value = input(); print(value + "!" if value == "public" else "wrong")',
  });
  assert.equal(submittedV2.data.item.assignmentVersionId, version2.id);
  assert.equal(submittedV2.data.item.score, 80);
  assert.equal((await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/submissions`, student)).data.items.length, 2);
  const membershipsFile = path.join(dataDirectory, 'codepulse-memberships.json');
  const memberships = JSON.parse(await readFile(membershipsFile, 'utf8'));
  memberships.push({
    id: 'version-test-student-2',
    classroomId: 'class-1',
    studentEmail: 'student2@gmail.com',
    status: 'ACTIVE',
  });
  await writeFile(membershipsFile, `${JSON.stringify(memberships, null, 2)}\n`);
  const secondStudentSubmission = await api(`/api/codepulse/classrooms/class-1/assignments/${assignmentId}/submissions`, student2, 'POST', {
    sourceCode: 'print(input())',
  });
  assert.equal(secondStudentSubmission.status, 201, JSON.stringify(secondStudentSubmission.data));

  const ledgerDirectory = path.join(dataDirectory, 'codepulse-student-submissions');
  const ledgerFiles = await readdir(ledgerDirectory);
  assert.equal(ledgerFiles.length, 2);
  assert.ok(gitFiles.has(`version/1:/api/v1/repos/codepulse/codepulse-${assignmentId}/contents/submissions/${studentKey('student@gmail.com')}.json`));
  assert.ok(gitFiles.has(`version/2:/api/v1/repos/codepulse/codepulse-${assignmentId}/contents/submissions/${studentKey('student@gmail.com')}.json`));
});
