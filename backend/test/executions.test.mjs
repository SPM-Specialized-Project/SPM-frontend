import assert from 'node:assert/strict';
import test from 'node:test';
import { createExecutionQueue, executionInput } from '../executions.mjs';

const assignment = { id: 'v1', runtime: 'PYTHON', cpuTimeLimitMs: 100, memoryLimitMb: 64,
  testCases: [{ id: 'public', input: 'visible', expectedOutput: 'visible', hidden: false },
    { id: 'hidden', input: 'SECRET', expectedOutput: 'SECRET', hidden: true }] };
const success = { status: 'SUCCESS', stdout: 'visible', stderr: '', exitCode: 0, runtimeMs: 1 };
const input = { assignment, sourceCode: 'original', body: {}, ownerEmail: 'student' };
function queue(worker, records = [], options = {}) {
  let writer = Promise.resolve();
  return createExecutionQueue({ worker, imageId: async () => 'sha256:fixture',
    read: async () => structuredClone(records),
    mutate: (callback) => writer = writer.then(() => callback(records)), ...options });
}

test('Run permits only public tests, validates selectors and separates stdin', () => {
  assert.deepEqual(executionInput({}, assignment).tests.map((test) => test.id), ['public']);
  for (const body of [{ testCaseIds: ['hidden'] }, { testCaseIds: [] }, { mode: 'HIDDEN' }, { stdin: 1 }, { testCaseIds: 'public' }]) {
    assert.throws(() => executionInput(body, assignment), { status: 400 });
  }
  assert.equal(executionInput({ mode: 'STDIN', stdin: 'custom' }, assignment).tests[0].input, 'custom');
});

test('FIFO snapshots code/tests/limits and rejects concurrent per-owner flooding', async () => {
  let release;
  const blocker = new Promise((resolve) => { release = resolve; });
  const seen = [];
  const service = queue(async (job) => { seen.push(job); await blocker; return success; }, [], { concurrency: 1 });
  const first = await service.enqueue(input);
  const second = await service.enqueue(input);
  await assert.rejects(service.enqueue(input), { status: 429 });
  assert.equal(second.item.state, 'QUEUED');
  const original = assignment.testCases[0].input;
  assignment.testCases[0].input = 'changed after admission';
  release();
  const results = await Promise.all([first.completion, second.completion]);
  assignment.testCases[0].input = original;
  assert.equal(results[0].passedCount, 1);
  assert.equal(seen[1].input, original);
  assert.equal(seen[0].cpuTimeLimitMs, 100);
  assert.equal(seen[0].sandboxImage, 'sha256:fixture');
  assert.equal(results[0].snapshot, undefined);
  assert.equal(seen[0].sourceCode, 'original');
  assert.equal((await service.list()).length, 2);
});

test('worker crashes and restarts are Internal Error and cannot count passed tests', async () => {
  const records = [{ id: 'interrupted', state: 'RUNNING' }];
  const service = queue(async () => { throw new Error('infrastructure crashed'); }, records);
  assert.equal((await service.list())[0].status, 'INTERNAL_ERROR');
  const finished = await (await service.enqueue(input)).completion;
  assert.equal(finished.status, 'INTERNAL_ERROR');
  assert.equal(finished.passedCount, 0);
  assert.equal(finished.state, 'FINISHED');
});

test('stdin success has no test pass or grading result; mismatches keep successful execution', async () => {
  const service = queue(async () => success);
  const stdin = await (await service.enqueue({ ...input, body: { mode: 'STDIN' } })).completion;
  assert.equal(stdin.status, 'SUCCESS');
  assert.equal(stdin.totalCount, 0);
  assert.equal(stdin.passedCount, 0);
  assert.equal('score' in stdin, false);
  const wrong = await (await queue(async () => ({ ...success, stdout: 'wrong' })).enqueue(input)).completion;
  assert.equal(wrong.status, 'SUCCESS');
  assert.equal(wrong.results[0].status, 'WRONG_ANSWER');
  const small = await (await service.enqueue({ ...input,
    assignment: { ...assignment, cpuTimeLimitMs: 0.5, memoryLimitMb: 1 } })).completion;
  assert.equal(small.limits.memoryLimitMb, 1);
  assert.equal(small.limits.cpuTimeLimitMs, 0.5);
});

test('history retains every immutable run, separated streams, duration and measured peak memory', async () => {
  let attempts = 0;
  const service = queue(async () => ({ ...success, stdout: `<script>run${++attempts}</script>`,
    stderr: 'student diagnostic', runtimeMs: 37, memoryUsageKb: 16384 }));
  const first = await (await service.enqueue(input)).completion;
  const second = await (await service.enqueue({ ...input, sourceCode: 'changed edge case' })).completion;
  assert.notEqual(first.id, second.id);
  const history = await service.list();
  assert.equal(history[0].sourceCode, 'original');
  assert.equal(history[1].sourceCode, 'changed edge case');
  assert.equal(history[0].stdout, '<script>run1</script>');
  assert.equal(history[0].stderr, 'student diagnostic');
  assert.equal(first.runtimeMs, 37);
  assert.equal(first.memoryUsageKb, 16384);
  assert.equal(first.results[0].memoryUsageKb, 16384);
  assert.equal(first.outputTruncated, false);
  assert.ok(Date.parse(first.executedAt));
});

test('aggregate truncation is byte-bounded and flagged even when individual tests fit', async () => {
  let index = 0;
  const service = queue(async () => ({ ...success, stdout: '界'.repeat(7000), stderr: 'e'.repeat(20000),
    memoryUsageKb: ++index * 1024, outputTruncated: false }));
  const result = await (await service.enqueue({ ...input, assignment: { ...assignment, testCases: [
    { id: 'a', input: '', expectedOutput: '', hidden: false },
    { id: 'b', input: '', expectedOutput: '', hidden: false },
  ] } })).completion;
  assert.equal(result.outputTruncated, true);
  assert.ok(Buffer.byteLength(result.stdout) <= 32000);
  assert.ok(Buffer.byteLength(result.stderr) <= 32000);
  assert.equal(result.stdout.includes('\uFFFD'), false);
  assert.equal(result.memoryUsageKb, 2048);
  assert.equal(result.runtimeMs, 2);
  assert.equal(result.results.length, 2);
});

test('missing memory remains unknown and infrastructure failure keeps a null exit code', async () => {
  const service = queue(async () => ({ ...success, status: 'INTERNAL_ERROR', exitCode: null }));
  const result = await (await service.enqueue(input)).completion;
  assert.equal(result.memoryUsageKb, null);
  assert.equal(result.exitCode, null);
});
