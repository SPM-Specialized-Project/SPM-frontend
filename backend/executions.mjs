import { randomUUID, createHash } from 'node:crypto';
import { internalError, runSandbox, sandboxImageId, removeExecutionContainer } from './sandbox.mjs';

export const executionView = ({ snapshot, ...item }) => item;
const normalize = (value, comparator) => {
  let text = value;
  if (comparator?.normalizeLineEndings !== false) text = text.replace(/\r\n/g, '\n');
  return comparator?.trimTrailingNewline === false ? text : text.replace(/\n+$/, '');
};

export function executionInput(body, assignment) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400, code: 'INVALID_RUN_INPUT' }); };
  const mode = body.mode ?? 'PUBLIC_TESTS';
  if (!['STDIN', 'PUBLIC_TESTS'].includes(mode)) fail('mode must be STDIN or PUBLIC_TESTS.');
  if (body.stdin !== undefined && (typeof body.stdin !== 'string' || Buffer.byteLength(body.stdin) > 64000)) fail('stdin must be a string of at most 64000 bytes.');
  if (body.testCaseIds !== undefined && (!Array.isArray(body.testCaseIds) || body.testCaseIds.some((id) => typeof id !== 'string'))) fail('testCaseIds must be an array of strings.');
  if (mode === 'STDIN') return { mode, tests: [{ id: 'stdin', input: body.stdin ?? '', expectedOutput: null }] };
  const visible = assignment.testCases.filter((test) => !test.hidden);
  if (body.testCaseIds?.some((id) => !visible.some((test) => test.id === id))) fail('Only public test cases may be run.');
  const tests = body.testCaseIds ? visible.filter((test) => body.testCaseIds.includes(test.id)) : visible;
  if (!tests.length) fail('No public test cases selected. Use STDIN mode.');
  if (tests.length > 100) fail('At most 100 public test cases can be run at once.');
  return { mode, tests: structuredClone(tests) };
}

// Durable ledger plus a bounded, in-process FIFO worker pool. One API process owns it.
export function createExecutionQueue({ read, mutate, onUpdate = async () => {}, worker = runSandbox, imageId = sandboxImageId, concurrency = 2 }) {
  let initialized;
  let active = 0;
  let admission = Promise.resolve();
  const pending = [];
  const owners = new Map();
  const ready = () => initialized ??= mutate((records) => {
    const interrupted = [];
    for (const record of records) {
      if (['QUEUED', 'RUNNING'].includes(record.state)) {
        Object.assign(record, internalError(), { state: 'FINISHED',
          finishedAt: new Date().toISOString(), passedCount: 0, results: [] });
        interrupted.push(executionView(record));
      }
    }
    return interrupted;
  }).then(async (interrupted) => {
    for (const record of interrupted) { await removeExecutionContainer(record.id); await onUpdate(record); }
  });
  const save = async (record) => {
    await mutate((records) => { records[records.findIndex((item) => item.id === record.id)] = structuredClone(record); });
    await onUpdate(executionView(record));
  };
  const execute = async ({ record, resolve }) => {
    try {
      record.state = 'RUNNING';
      record.status = 'RUNNING';
      record.startedAt = new Date().toISOString();
      await save(record);
      record.results = [];
      for (const test of record.snapshot.tests) {
        const result = record.sandboxImage === null ? internalError() : await worker({ executionId: record.id, sourceCode: record.sourceCode, runtime: record.runtime, sandboxImage: record.sandboxImage,
          input: test.input, ...record.limits });
        const compared = record.mode === 'PUBLIC_TESTS' && result.status === 'SUCCESS';
        const passed = compared && !result.outputTruncated && normalize(result.stdout, record.snapshot.comparator) === normalize(test.expectedOutput, record.snapshot.comparator);
        record.results.push({ testCaseId: test.id, input: test.input, expectedOutput: test.expectedOutput,
          actualOutput: result.stdout, stderr: result.stderr, durationMs: result.runtimeMs,
          outputTruncated: result.outputTruncated, exitCode: result.exitCode,
          status: compared ? passed ? 'PASSED' : 'WRONG_ANSWER' : result.status, passed });
        if (result.status === 'INTERNAL_ERROR') break;
      }
      const failure = record.results.find((result) => !['PASSED', 'WRONG_ANSWER', 'SUCCESS'].includes(result.status));
      record.status = failure?.status ?? 'SUCCESS';
      record.passedCount = record.status === 'INTERNAL_ERROR' ? 0 : record.results.filter((result) => result.passed).length;
      record.stdout = record.results.map((result) => result.actualOutput).join('\n').slice(0, 32000);
      record.stderr = record.results.map((result) => result.stderr).filter(Boolean).join('\n').slice(0, 32000);
      record.runtimeMs = record.results.reduce((sum, result) => sum + result.durationMs, 0);
      record.outputTruncated = record.results.some((result) => result.outputTruncated);
      record.exitCode = failure?.exitCode ?? 0;
    } catch {
      Object.assign(record, internalError(), { passedCount: 0 });
    } finally {
      if (record.status === 'INTERNAL_ERROR') record.results = record.results?.map((result) => ({ ...result, status: 'INTERNAL_ERROR', passed: false })) ?? [];
      record.state = 'FINISHED';
      record.finishedAt = new Date().toISOString();
      try { await save(record); } catch (error) { console.error('Execution persistence failed:', error.message); }
      owners.set(record.ownerEmail, owners.get(record.ownerEmail) - 1);
      active -= 1;
      resolve(executionView(record));
      dispatch();
    }
  };
  const dispatch = () => {
    while (active < concurrency && pending.length) { active += 1; void execute(pending.shift()); }
  };
  return {
    async list() { await ready(); return (await read()).map(executionView); },
    async enqueue({ assignment, sourceCode, body, ...metadata }) {
      await ready();
      const input = executionInput(body, assignment);
      const cpuTimeLimitMs = Math.min(Number(assignment.cpuTimeLimitMs) || 1000, 10000);
      const record = { ...metadata, id: `execution-${randomUUID()}`, assignmentVersionId: assignment.id,
        runtime: assignment.runtime, sourceCode, sourceHash: createHash('sha256').update(sourceCode).digest('hex'),
        mode: input.mode, state: 'QUEUED', status: 'QUEUED', stdout: '', stderr: '', runtimeMs: 0,
        exitCode: null, passedCount: 0, totalCount: input.mode === 'STDIN' ? 0 : input.tests.length,
        executedAt: new Date().toISOString(),
        limits: { cpuTimeLimitMs, wallTimeLimitMs: cpuTimeLimitMs * 2 + 250,
          memoryLimitMb: Math.min(Number(assignment.memoryLimitMb) || 128, 1024) },
        sandboxImage: await imageId(),
        snapshot: { ...input, comparator: structuredClone(assignment.comparator) }, results: [] };
      let resolve;
      const completion = new Promise((done) => { resolve = done; });
      const accepted = admission.then(async () => {
        if (active + pending.length >= 32 || (owners.get(record.ownerEmail) ?? 0) >= 2) {
          throw Object.assign(new Error('Execution queue is full. Retry after current runs finish.'), { status: 429, code: 'EXECUTION_QUEUE_FULL' });
        }
        await mutate((records) => records.push(structuredClone(record)));
        owners.set(record.ownerEmail, (owners.get(record.ownerEmail) ?? 0) + 1);
        try {
          await onUpdate(executionView(record));
        } catch (error) {
          Object.assign(record, internalError(), { state: 'FINISHED', finishedAt: new Date().toISOString() });
          await mutate((records) => { records[records.findIndex((item) => item.id === record.id)] = structuredClone(record); });
          owners.set(record.ownerEmail, owners.get(record.ownerEmail) - 1);
          throw error;
        }
        pending.push({ record, resolve });
        return executionView(structuredClone(record));
      });
      admission = accepted.catch(() => {});
      const item = await accepted;
      dispatch();
      return { item, completion };
    },
  };
}
