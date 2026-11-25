import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const time = (minute) => `2026-11-07T10:0${minute}:00.000Z`;
const email = 'student@gmail.com';
const latestCode = 'print("fixed")';
const alertCode = 'def f():\n    return f()';
const scope = { classroomId: 'class-1', assignmentId: 'problem-1', assignmentVersionId: 'problem-1-v1' };
const workspace = {
  ...scope, id: 'workspace-1', termId: 'term-2026-1', ownerEmail: email,
  sourceCode: latestCode, revision: 2, updatedAt: time(4),
  revisions: [{ revision: 2, savedAt: time(4), sourceCode: latestCode }],
  hintProgress: [{ hintId: 'hint-example', revealedAt: time(3) }],
};
const snapshot = (id, createdAt, sourceCode, trigger, revision, extra = {}) => ({
  id, ...scope, workspaceId: workspace.id, studentEmail: email, createdAt, sourceCode, trigger, revision, ...extra,
});
const issue = {
  ...scope, id: 'case-1', workspaceId: workspace.id, studentEmail: email, episodeNumber: 1,
  problemTypeId: 'INFINITE_RECURSION', status: 'ACTIVE', createdAt: time(2), updatedAt: time(2),
};

test('SCRUM-77: lecturer can inspect immutable alert evidence and scoped timelines after code changes and dismissal', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'spm-case-inspection-'));
  const write = (name, data) => writeFile(path.join(directory, name), JSON.stringify(data), 'utf8');
  const alert = snapshot('snapshot-alert', time(1), alertCode, 'RUN', 1);
  const duplicateCode = snapshot('snapshot-later-run', time(3), alertCode, 'RUN', 1, { runId: 'run-later' });
  const submissionSnapshot = snapshot('snapshot-submit', time(2), alertCode, 'SUBMIT', 1, { submissionId: 'submit-1' });
  const saved = snapshot('snapshot-current', time(4), latestCode, 'SAVE', 2);
  const sameTime = snapshot('snapshot-another-save', time(4), latestCode, 'SAVE', 2);
  const otherStudent = snapshot('snapshot-unrelated', time(5), 'PRIVATE', 'RUN', 1, {
    workspaceId: 'workspace-private', studentEmail: 'student2@gmail.com',
  });
  const run = (id, stderr, testCaseId) => ({
    id, ...scope, workspaceId: workspace.id, ownerEmail: email, termId: workspace.termId,
    executedAt: time(1), sourceCode: alertCode, status: 'RUNTIME_ERROR', state: 'FINISHED', stderr,
    results: [{ testCaseId, status: 'RUNTIME_ERROR', passed: false, stderr }],
  });
  const codeSubmission = {
    ...scope, id: 'submit-1', kind: 'CODE_SUBMISSION', workspaceId: workspace.id, student: { email },
    acceptedAt: time(2), termId: workspace.termId, status: 'GRADED', sourceCode: alertCode, finalJudgmentId: 'judgment-1',
  };
  await Promise.all([
    write('codepulse-workspaces.json', [workspace]),
    write('codepulse-snapshots.json', [saved, submissionSnapshot, duplicateCode, sameTime, alert, otherStudent]),
    write('codepulse-executions.json', [run('run-other', 'Off-topic error', 'wrong-test'), run('run-later', 'Another run', 'later-test'), run('run-alert', 'RecursionError from original run', 'failing-test')]),
    write('submissions.json', [codeSubmission]),
    write('codepulse-judgments.json', [{
      id: 'judgment-1', submissionId: codeSubmission.id, verdict: 'WRONG_ANSWER',
      testResults: [{ testCaseId: 'submit-test', verdict: 'WRONG_ANSWER', passed: false, stderr: 'submit trace' }],
    }]),
    write('codepulse-issue-detection.json', {
      assessments: [{ ...scope, id: 'assessment-1', snapshotId: alert.id, eventId: 'event-1',
        eventSequence: 1, workspaceId: workspace.id, studentEmail: email, state: 'EVALUATED',
        executionId: 'run-alert', createdAt: time(1) }],
      issueCases: [issue],
      caseEvidence: [{ id: 'evidence-1', assessmentId: 'assessment-1', caseId: issue.id, snapshotId: alert.id,
        executionId: 'run-alert', rationale: 'The recursive function has no base case.',
        references: [{ kind: 'CODE', snapshotId: alert.id, lineStart: 1, lineEnd: 2, excerpt: alertCode }] }],
      caseTests: [{ caseId: issue.id, testCaseId: 'failing-test' }],
    }),
  ]);

  const backend = spawn(process.execPath, ['server.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: directory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (backend.exitCode === null && backend.signalCode === null) {
      const exited = once(backend, 'exit');
      backend.kill();
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  });
  const port = await new Promise((resolve, reject) => {
    backend.once('error', reject);
    backend.once('exit', (code) => reject(new Error(`Fixture backend exited with ${code}`)));
    backend.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (match) resolve(match[1]);
    });
  });
  const request = async (route, token, method = 'GET', payload) => {
    const response = await fetch(`http://127.0.0.1:${port}/api${route}`, {
      method,
      headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(payload && { 'Content-Type': 'application/json' }) },
      ...(payload && { body: JSON.stringify(payload) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const login = async (email, password) => {
    const response = await request('/auth/login', null, 'POST', { email, password });
    assert.equal(response.status, 200);
    return response.body.accessToken;
  };

  const [lecturer, otherLecturer, student, admin] = await Promise.all([
    login('lecturer@gmail.com', 'lecturer123'), login('lecturer2@gmail.com', 'lecturer2123'),
    login(email, 'student123'), login('admin@gmail.com', 'admin123'),
  ]);
  const route = '/codepulse/issue-cases/case-1';
  const timeline = '/codepulse/workspaces/workspace-1/timeline';
  for (const outsider of [otherLecturer, student]) {
    assert.equal((await request(route, outsider)).status, 403);
    assert.equal((await request(timeline, outsider)).status, 403);
  }

  const opened = await request(route, lecturer);
  assert.equal(opened.status, 200);
  const item = opened.body.item;
  assert.equal(item.studentEmail, email);
  assert.deepEqual(item.problem, { id: 'problem-1', versionId: 'problem-1-v1', title: 'Singly Linked List', version: 1 });
  assert.equal(item.alertSnapshot.sourceCode, alertCode);
  assert.equal(item.alertSnapshot.createdAt, time(1));
  assert.equal(item.currentCode.sourceCode, latestCode);
  assert.equal(item.currentCode.revision, 2);
  assert.equal(item.currentCode.createdAt, time(4));
  assert.equal(item.selectedEvent.snapshot.id, alert.id);
  assert.equal(item.selectedEvent.compilerTrace, 'RecursionError from original run');
  assert.deepEqual(item.selectedEvent.runTests.map((result) => result.testCaseId), ['failing-test']);
  assert.deepEqual(item.timeline.map(({ id }) => id), [
    sameTime.id, saved.id, duplicateCode.id, submissionSnapshot.id, 'run-other', alert.id,
  ]);
  assert.equal(item.hintHistory[0].id, 'hint-example');
  assert.equal((await request(`${timeline}?eventId=${otherStudent.id}`, lecturer)).status, 404);
  const submit = (await request(`${timeline}?eventId=${submissionSnapshot.id}`, lecturer)).body.item.selectedEvent;
  assert.equal(submit.compilerTrace, null);
  assert.deepEqual(submit.runTests, []);
  assert.equal(submit.submissionVerdict, 'WRONG_ANSWER');
  assert.equal(submit.submissionTests[0].testCaseId, 'submit-test');

  assert.equal((await request('/codepulse/workspaces/workspace-1', lecturer, 'PATCH', { sourceCode: 'invalid', baseRevision: 2 })).status, 403);
  assert.equal((await request('/codepulse/workspaces/workspace-1/execute', lecturer, 'POST', { sourceCode: 'invalid' })).status, 403);
  assert.equal((await request('/codepulse/workspaces/workspace-1/submissions', lecturer, 'POST', { sourceCode: 'invalid' })).status, 403);
  assert.equal((await request('/codepulse/workspaces/workspace-1/snapshots', lecturer, 'POST', { sourceCode: 'invalid' })).status, 403);
  assert.equal((await request(route, lecturer, 'PATCH', { status: 'DISMISSED', reason: ' ' })).status, 400);
  assert.equal((await request(route, admin, 'PATCH', { status: 'DISMISSED', reason: 'Not allowed' })).status, 403);
  assert.equal((await request(route, admin)).status, 200);
  const audit = JSON.parse(await readFile(path.join(directory, 'codepulse-audit-logs.json'), 'utf8'));
  assert.ok(audit.some((entry) => entry.action === 'CODEPULSE_INSPECTION_READ' && entry.target === issue.id));
  const closed = await request(route, lecturer, 'PATCH', { status: 'DISMISSED', reason: '  False positive  ' });
  assert.equal(closed.body.item.status, 'DISMISSED');
  assert.equal((await request(route, lecturer, 'PATCH', { status: 'RESOLVED' })).status, 409);
  const historical = (await request(route, lecturer)).body.item;
  assert.equal(historical.issue.reviewHistory[0].reason, 'False positive');
  assert.equal(historical.issue.reviewHistory[0].status, 'DISMISSED');
  assert.deepEqual(historical.alertSnapshot, item.alertSnapshot);
  assert.deepEqual(historical.selectedEvent.runTests, item.selectedEvent.runTests);
  assert.deepEqual(historical.issue.evidence, item.issue.evidence);

  await write('codepulse-terms.json', [{ id: workspace.termId, status: 'RESETDONE' }]);
  assert.equal((await request(route, lecturer)).status, 409);
});
