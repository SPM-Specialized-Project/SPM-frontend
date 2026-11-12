import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const testDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-admin-operations-'));
process.env.BACKEND_DATA_DIRECTORY = testDataDirectory;
const {
  getSystemOperationsHealth,
  getRequestTrace,
  getAuditLogs,
  recordAuditLog,
  recordTraceEvent,
} = await import('../admin-operations.mjs');

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});

test('Admin Operations - System Health & Worker Pool', async () => {
  const health = await getSystemOperationsHealth({ pendingCount: 2, activeCount: 1, totalWorkers: 2 });

  assert.ok(health);
  assert.equal(health.queueLength, 2);
  assert.equal(health.runningExecutions, 1);
  assert.equal(health.workerStatus.totalWorkers, 2);
  assert.equal(health.workerStatus.activeWorkers, 1);
  assert.equal(health.workerStatus.idleWorkers, 1);
  assert.equal(health.workerStatus.poolHealth, 'HEALTHY');
  assert.equal(health.latency.p50Ms, null);
  assert.equal(health.latency.p95Ms, null);
  assert.equal(health.errorRate.percentage, null);
});

test('Admin Operations - Request Trace Lookup and Sensitive Field Redaction', async () => {
  const requestId = 'execution-test-trace-01';
  await recordTraceEvent(requestId, {
    stage: 'RECEIVED',
    description: 'Execution request received.',
    payload: {
      sourceCode: 'const privateMarker = "must-not-persist";',
      authorization: 'Bearer private-token',
      testCases: [{ id: 'hidden-01', hidden: true, input: 'private-input', expectedOutput: 'private-output' }],
    },
  });
  await recordTraceEvent(requestId, { stage: 'DISPATCHED', description: 'Execution queued.', payload: {} });
  await recordTraceEvent(requestId, { stage: 'EXECUTED', description: 'Worker completed.', payload: {} });
  await recordTraceEvent(requestId, { stage: 'RECORDED', description: 'Result recorded.', payload: {} });

  const trace = await getRequestTrace(requestId);

  assert.ok(trace);
  assert.equal(trace.requestId, requestId);
  assert.equal(trace.events.length, 4);

  const stages = trace.events.map((e) => e.stage);
  assert.deepEqual(stages, ['RECEIVED', 'DISPATCHED', 'EXECUTED', 'RECORDED']);

  // Check sensitive fields redaction
  const receivedEvent = trace.events.find((e) => e.stage === 'RECEIVED');
  assert.equal(receivedEvent.payload.sourceCode, '[REDACTED_STUDENT_CODE]');
  assert.equal(receivedEvent.payload.authorization, '[REDACTED]');
  assert.equal(receivedEvent.payload.testCases[0].input, '[REDACTED_INPUT]');
  assert.equal(receivedEvent.payload.testCases[0].expectedOutput, '[REDACTED_OUTPUT]');

  const storedTrace = await readFile(path.join(testDataDirectory, 'codepulse-traces.json'), 'utf8');
  assert.equal(storedTrace.includes('must-not-persist'), false);
  assert.equal(storedTrace.includes('private-token'), false);
  assert.equal(storedTrace.includes('private-input'), false);
  assert.equal(await getRequestTrace('missing-trace-id'), null);
});

test('Admin Operations - Audit Logs Append-Only Recording', async () => {
  const logged = await recordAuditLog({
    actor: 'admin@test.com',
    action: 'TEST_ACTION',
    target: 'TestTarget',
    requestId: 'req-audit-test',
    result: 'SUCCESS',
    details: 'Audit log unit test verification.',
  });

  assert.ok(logged.id);
  assert.equal(logged.action, 'TEST_ACTION');

  const logs = await getAuditLogs();
  const found = logs.find((l) => l.id === logged.id);
  assert.ok(found, 'Recorded log should appear in audit logs list');
});
