import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSystemOperationsHealth,
  getRequestTrace,
  getAuditLogs,
  recordAuditLog,
} from '../admin-operations.mjs';
import {
  getBackups,
  createSemesterBackup,
  verifyBackupDisasterRecovery,
} from '../backups.mjs';

test('Admin Operations - System Health & Worker Pool', async () => {
  const health = await getSystemOperationsHealth({ pendingCount: 2, activeCount: 1 });

  assert.ok(health);
  assert.equal(health.queueLength, 2);
  assert.equal(health.runningExecutions, 1);
  assert.equal(health.workerStatus.totalWorkers, 4);
  assert.ok(typeof health.latency.p50Ms === 'number');
  assert.ok(typeof health.latency.p95Ms === 'number');
  assert.ok(typeof health.errorRate.percentage === 'number');
});

test('Admin Operations - Request Trace Lookup and Sensitive Field Redaction', async () => {
  const trace = await getRequestTrace('req-test-trace-01');

  assert.ok(trace);
  assert.equal(trace.requestId, 'req-test-trace-01');
  assert.equal(trace.events.length, 4);

  const stages = trace.events.map((e) => e.stage);
  assert.deepEqual(stages, ['RECEIVED', 'DISPATCHED', 'EXECUTED', 'RECORDED']);

  // Check sensitive fields redaction
  const receivedEvent = trace.events.find((e) => e.stage === 'RECEIVED');
  assert.equal(receivedEvent.payload.sourceCode, '[REDACTED_STUDENT_CODE]');
  assert.equal(receivedEvent.payload.token, '[REDACTED]');

  const executedEvent = trace.events.find((e) => e.stage === 'EXECUTED');
  const hiddenTest = executedEvent.payload.testCases?.find((tc) => tc.hidden);
  if (hiddenTest) {
    assert.equal(hiddenTest.input, '[REDACTED_INPUT]');
    assert.equal(hiddenTest.expectedOutput, '[REDACTED_OUTPUT]');
  }
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

test('Semester Data Retention & Backup - Backup Creation & Disaster Recovery Drill', async () => {
  // 1. Create a backup
  const backup = await createSemesterBackup({
    actorEmail: 'admin@test.com',
    termId: 'term-2026-test',
  });

  assert.ok(backup.id);
  assert.ok(backup.sha256Hash, 'Backup must include SHA-256 integrity hash');
  assert.equal(backup.status, 'VERIFIED');
  assert.ok(backup.sizeBytes > 0);

  // 2. List backups
  const backups = await getBackups();
  assert.ok(backups.some((b) => b.id === backup.id));

  // 3. Run Disaster Recovery Verification Drill
  const drillResult = await verifyBackupDisasterRecovery(backup.id, 'admin@test.com');
  assert.equal(drillResult.verified, true, 'DR drill must verify backup integrity');
  assert.equal(drillResult.checksumMatch, true, 'Checksum must match stored SHA-256');
  assert.equal(drillResult.referentialIntegrity, true, 'Referential integrity must pass');
});
