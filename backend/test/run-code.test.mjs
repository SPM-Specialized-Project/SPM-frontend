import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

async function fixture(t, env = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'scrum71-api-'));
  const assignment = { id: 'problem-1', classroomId: 'class-1', status: 'PUBLISHED', runtime: 'PYTHON',
    title: 'Echo', cpuTimeLimitMs: 300, memoryLimitMb: 128, comparator: {},
    testCases: [{ id: 'public', input: 'Hello', expectedOutput: 'Hello', hidden: false },
      { id: 'hidden', input: 'DO_NOT_RUN', expectedOutput: 'SECRET', hidden: true }] };
  await writeFile(path.join(directory, 'codepulse-assignments.json'), JSON.stringify([assignment]));
  await writeFile(path.join(directory, 'codepulse-assignment-versions.json'), JSON.stringify([
    { ...assignment, id: 'problem-1-v1', assignmentId: 'problem-1', version: 1 },
  ]));
  const launch = () => spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], {
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: directory, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let server = launch();
  const stop = async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
  };
  t.after(async () => {
    await stop();
    await rm(directory, { recursive: true, force: true });
  });
  const portOf = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', reject);
    server.stdout.on('data', (chunk) => { const match = String(chunk).match(/localhost:(\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  let port = await portOf();
  const restart = async () => { await stop(); server = launch(); port = await portOf(); };
  const api = async (route, token, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${port}/api${route}`, { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  const login = async (role) => (await api('/auth/login', null, 'POST', { email: `${role}@gmail.com`, password: `${role}123` })).data.accessToken;
  const finish = async (id, token) => {
    for (let i = 0; i < 200; i++) {
      const result = await api(`/codepulse/executions/${id}`, token);
      assert.equal(result.status, 200);
      if (result.data.item.state === 'FINISHED') return result.data.item;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.fail('Execution did not finish');
  };
  return { api, login, finish, directory, assignment, restart };
}

test('SCRUM-71 API: queue snapshot, pinned limits/public tests, privacy and no Submission/completion', async (t) => {
  const { api, login, finish, directory, assignment } = await fixture(t);
  const student = await login('student');
  const student2 = await login('student2');
  const lecturer = await login('lecturer');
  const route = '/codepulse/workspaces/workspace-1/execute';
  const before = (await api('/codepulse/workspaces/workspace-1', student)).data.item;
  const submittedBefore = await api('/codepulse/classrooms/class-1/assignments/problem-1/submissions', student);
  const body = { sourceCode: 'print(input())', mode: 'STDIN', stdin: 'custom', runtime: 'CPP', memoryLimitMb: 1024 };
  const queued = await api(route, student, 'POST', body);
  assert.equal(queued.status, 202, JSON.stringify(queued));
  assert.equal(queued.data.item.state, 'QUEUED');
  // Change the live authoring configuration after queue admission; v1 must stay pinned.
  await writeFile(path.join(directory, 'codepulse-assignments.json'), JSON.stringify([
    { ...assignment, cpuTimeLimitMs: 10000, memoryLimitMb: 1024, runtime: 'CPP' },
  ]));
  const result = await finish(queued.data.item.id, student);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.stdout, 'custom\n');
  assert.equal(result.limits.cpuTimeLimitMs, 300);
  assert.equal(result.limits.memoryLimitMb, 128);
  assert.equal(result.runtime, 'PYTHON');
  assert.match(result.sandboxImage, /^sha256:/);
  assert.equal(result.assignmentVersionId, 'problem-1-v1');
  assert.equal(result.sourceHash, createHash('sha256').update(body.sourceCode).digest('hex'));
  assert.equal(result.passedCount, 0);
  assert.equal(result.totalCount, 0);
  assert.equal('score' in result, false);
  assert.equal(JSON.stringify(result).includes('DO_NOT_RUN'), false);
  const publicJob = await api(route, student, 'POST', { sourceCode: 'print(input())' });
  assert.equal(publicJob.status, 202);
  const publicResult = await finish(publicJob.data.item.id, student);
  assert.equal(publicResult.passedCount, 1);
  assert.equal(publicResult.results.length, 1);
  assert.equal((await api(route, student, 'POST', { sourceCode: 'print(1)', testCaseIds: ['hidden'] })).status, 400);
  assert.equal((await api(route, student, 'POST', { sourceCode: 'x'.repeat(200001) })).status, 413);
  assert.equal((await api(route, student2, 'POST', body)).status, 403);
  assert.equal((await api(route, lecturer, 'POST', body)).status, 403);
  assert.equal((await api(`/codepulse/executions/${result.id}`, student2)).status, 404);
  assert.equal((await api(`/codepulse/executions/${result.id}`, lecturer)).status, 200);
  const history = await api('/codepulse/executions?workspaceId=workspace-1', lecturer);
  assert.equal(history.data.items.length, 2);
  const versionHistory = await api('/codepulse/classrooms/class-1/assignment-versions/problem-1-v1/history', lecturer);
  assert.equal(versionHistory.data.executions.length, 2);
  assert.equal(versionHistory.data.submissions.length, 0);
  assert.equal((await api('/codepulse/classrooms/class-1/assignments/problem-1/run', lecturer, 'POST', {
    sourceCode: 'print(input())', testCaseIds: ['hidden'],
  })).status, 400);
  const submittedAfter = await api('/codepulse/classrooms/class-1/assignments/problem-1/submissions', student);
  assert.deepEqual(submittedAfter.data.items, submittedBefore.data.items);
  const after = (await api('/codepulse/workspaces/workspace-1', student)).data.item;
  assert.equal(after.sourceCode, before.sourceCode);
  assert.equal(after.completed, before.completed);
  assert.equal(after.executionResult.id, publicResult.id);
  const ledger = JSON.parse(await readFile(path.join(directory, 'codepulse-executions.json')));
  assert.equal(ledger.length, 2);
  assert.deepEqual(ledger[1].snapshot.tests.map((test) => test.id), ['public']);
  const workspacePath = path.join(directory, 'codepulse-workspaces.json');
  const staleWorkspaces = JSON.parse(await readFile(workspacePath, 'utf8'));
  staleWorkspaces.find((item) => item.id === 'workspace-1').termId = 'another-term';
  await writeFile(workspacePath, JSON.stringify(staleWorkspaces));
  assert.equal((await api(route, student, 'POST', body)).status, 403);
});

test('SCRUM-71 API: unavailable infrastructure is Internal Error, never passed tests', async (t) => {
  const { api, login, finish } = await fixture(t, { CODEPULSE_SANDBOX_IMAGE: 'codepulse-missing-image:invalid' });
  const student = await login('student');
  const queued = await api('/codepulse/workspaces/workspace-1/execute', student, 'POST', { sourceCode: 'print("Hello")' });
  assert.equal(queued.status, 202);
  const result = await finish(queued.data.item.id, student);
  assert.equal(result.status, 'INTERNAL_ERROR');
  assert.equal(result.passedCount, 0);
  assert.equal(result.results.some((item) => item.passed), false);
});

test('AC-07b: durable per-run snapshots and metrics, reload/restart, pagination and role access', async (t) => {
  const { api, login, finish, directory, restart } = await fixture(t);
  let student = await login('student');
  const route = '/codepulse/workspaces/workspace-1/execute';
  const sourceCode = 'import sys\nprint("<script>alert(1)</script>")\nprint("diagnostic", file=sys.stderr)';
  const run = await api(route, student, 'POST', { sourceCode, mode: 'STDIN' });
  assert.equal(run.status, 202);
  const first = await finish(run.data.item.id, student);
  assert.equal(first.stdout, '<script>alert(1)</script>\n');
  assert.equal(first.stderr, 'diagnostic\n');
  assert.equal(first.sourceCode, sourceCode);
  assert.ok(first.runtimeMs >= 0);
  assert.ok(first.memoryUsageKb > 0);
  assert.equal(first.results[0].memoryUsageKb, first.memoryUsageKb);
  const next = await api(route, student, 'POST', { sourceCode: 'raise ValueError("edge case")', mode: 'STDIN' });
  const second = await finish(next.data.item.id, student);
  assert.notEqual(first.id, second.id);
  assert.equal(second.status, 'RUNTIME_ERROR');
  assert.match(second.stderr, /edge case/);
  const endpoint = '/codepulse/executions?workspaceId=workspace-1';
  const before = await api(endpoint, student);
  assert.deepEqual(before.data.items.map((item) => item.id), [second.id, first.id]);
  assert.equal(before.data.nextCursor, null);
  await restart();
  student = await login('student');
  const after = await api(endpoint, student);
  assert.deepEqual(after.data, before.data);
  assert.deepEqual((await api(`/codepulse/executions/${first.id}`, student)).data.item, first);
  const otherStudent = await login('student2');
  const lecturer = await login('lecturer');
  const admin = await login('admin');
  assert.equal((await api(endpoint, lecturer)).data.items.length, 2);
  assert.equal((await api(`/codepulse/executions/${first.id}`, lecturer)).status, 200);
  assert.equal((await api(endpoint, otherStudent)).data.items.length, 0);
  assert.equal((await api(`/codepulse/executions/${first.id}`, otherStudent)).status, 404);
  assert.equal((await api(endpoint, admin)).status, 403);
  assert.equal((await api(`/codepulse/executions/${first.id}`, admin)).status, 403);
  assert.equal((await api('/codepulse/classrooms/class-1/assignment-versions/problem-1-v1/history', admin)).status, 403);
  const ledger = JSON.parse(await readFile(path.join(directory, 'codepulse-executions.json')));
  const older = Array.from({ length: 103 }, (_, index) => ({ ...ledger[0], id: `execution-older-${index}` }));
  await writeFile(path.join(directory, 'codepulse-executions.json'), JSON.stringify([...older, ...ledger]));
  const page1 = (await api(endpoint, student)).data;
  const page2 = (await api(`${endpoint}&before=${page1.nextCursor}`, student)).data;
  assert.equal(page1.items.length, 100);
  assert.equal(page2.items.length, 5);
  assert.equal(new Set([...page1.items, ...page2.items].map((item) => item.id)).size, 105);
  assert.equal(page2.nextCursor, null);
  assert.equal((await api(`${endpoint}&before=private-or-missing`, student)).status, 400);
});
