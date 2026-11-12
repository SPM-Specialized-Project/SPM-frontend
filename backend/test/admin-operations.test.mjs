import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const testDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-admin-operations-'));
process.env.BACKEND_DATA_DIRECTORY = testDataDirectory;
await mkdir(testDataDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(testDataDirectory, 'codepulse-terms.json'), JSON.stringify([
    { id: 'term-2026-test', name: 'Test Term' },
    { id: 'term-other', name: 'Other Term' },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-classrooms.json'), JSON.stringify([
    { id: 'class-test', termId: 'term-2026-test' },
    { id: 'class-other', termId: 'term-other' },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-assignments.json'), JSON.stringify([
    { id: 'assignment-test', classroomId: 'class-test' },
    { id: 'assignment-other', classroomId: 'class-other' },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-assignment-versions.json'), JSON.stringify([
    { id: 'version-test', assignmentId: 'assignment-test', version: 1 },
    { id: 'version-other', assignmentId: 'assignment-other', version: 1 },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-labs.json'), JSON.stringify([
    { id: 'lab-test', classroomId: 'class-test' },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-workspaces.json'), JSON.stringify([
    { id: 'workspace-test', classroomId: 'class-test', assignmentId: 'assignment-test' },
    { id: 'workspace-other', classroomId: 'class-other', assignmentId: 'assignment-other' },
  ])),
  writeFile(path.join(testDataDirectory, 'submissions.json'), JSON.stringify([
    { id: 'submission-test', classroomId: 'class-test', assignmentId: 'assignment-test', workspaceId: 'workspace-test' },
    { id: 'submission-other', classroomId: 'class-other', assignmentId: 'assignment-other', workspaceId: 'workspace-other' },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-snapshots.json'), JSON.stringify([
    { id: 'snapshot-test', workspaceId: 'workspace-test' },
  ])),
  writeFile(path.join(testDataDirectory, 'codepulse-alerts.json'), JSON.stringify([
    { id: 'alert-test', classroomId: 'class-test' },
    { id: 'alert-other', classroomId: 'class-other' },
  ])),
]);

const {
  getSystemOperationsHealth,
  getRequestTrace,
  getAuditLogs,
  recordAuditLog,
  recordTraceEvent,
} = await import('../admin-operations.mjs');
const {
  getBackups,
  createSemesterBackup,
  verifyBackupDisasterRecovery,
  restoreSemesterBackup,
} = await import('../backups.mjs');

test('Backup list contains only persisted records', async () => {
  assert.deepEqual(await getBackups(), []);
});

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});

test('Admin Operations - System Health & Worker Pool', async () => {
  const health = await getSystemOperationsHealth(
    { pendingCount: 2, activeCount: 1, totalWorkers: 2 },
    { pendingCount: 3, inFlightCount: 1 },
  );

  assert.ok(health);
  assert.equal(health.queueLength, 2);
  assert.equal(health.runningExecutions, 1);
  assert.equal(health.aiAssessmentQueue, 3);
  assert.equal(health.workerStatus.totalWorkers, 2);
  assert.equal(health.workerStatus.activeWorkers, 1);
  assert.equal(health.workerStatus.idleWorkers, 1);
  assert.equal(health.workerStatus.poolHealth, 'HEALTHY');
  assert.equal(health.latency.p50Ms, 0);
  assert.equal(health.latency.p95Ms, 0);
  assert.equal(health.errorRate.percentage, 0);
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

test('Admin Operations - Audit Logs Append-Only Recording & Sensitive Data Redaction (D-05, D-08)', async () => {
  const logged = await recordAuditLog({
    actor: 'admin@test.com',
    action: 'TEST_ACTION',
    target: 'TestTarget',
    requestId: 'req-audit-test',
    result: 'SUCCESS',
    details: 'User password=mySecret123 with Bearer eyJhbGciOiJIUzI1NiIn and sourceCode: #include <iostream>',
  });

  assert.ok(logged.id);
  assert.equal(logged.action, 'TEST_ACTION');
  // Sensitive redaction verification
  assert.equal(logged.details.includes('mySecret123'), false, 'Password must be redacted in audit details');
  assert.equal(logged.details.includes('eyJhbGciOiJIUzI1NiIn'), false, 'Bearer token must be redacted');
  assert.equal(logged.details.includes('[REDACTED_PASSWORD]'), true);
  assert.equal(logged.details.includes('[REDACTED_TOKEN]'), true);

  const logs = await getAuditLogs();
  const found = logs.find((l) => l.id === logged.id);
  assert.ok(found, 'Recorded log should appear in audit logs list');
});

test('Semester Data Retention & Backup - Backup Creation, Verification & Restoration (D-01, D-03, D-04)', async () => {
  const backup = await createSemesterBackup({
    actorEmail: 'admin@test.com',
    termId: 'term-2026-test',
  });

  assert.ok(backup.id);
  assert.ok(backup.sha256Hash, 'Backup must include SHA-256 integrity hash');
  assert.equal(backup.status, 'VERIFIED');
  assert.ok(backup.sizeBytes > 0);

  const backupPath = path.join(testDataDirectory, 'backups', backup.filename);
  const rawBackup = await readFile(backupPath, 'utf8');
  assert.equal(createHash('sha256').update(rawBackup, 'utf8').digest('hex'), backup.sha256Hash);
  const backupData = JSON.parse(rawBackup);
  assert.deepEqual(backupData.tables.terms.map((term) => term.id), ['term-2026-test']);
  assert.deepEqual(backupData.tables.classrooms.map((classroom) => classroom.id), ['class-test']);
  assert.deepEqual(backupData.tables.assignments.map((assignment) => assignment.id), ['assignment-test']);
  assert.deepEqual(backupData.tables.workspaces.map((workspace) => workspace.id), ['workspace-test']);
  assert.deepEqual(backupData.tables.submissions.map((submission) => submission.id), ['submission-test']);
  assert.deepEqual(backupData.tables.alerts.map((alert) => alert.id), ['alert-test']);

  const backups = await getBackups();
  assert.ok(backups.some((item) => item.id === backup.id));

  const drillResult = await verifyBackupDisasterRecovery(backup.id, 'admin@test.com');
  assert.equal(drillResult.verified, true, 'DR drill must verify backup integrity');
  assert.equal(drillResult.checksumMatch, true, 'Checksum must match stored SHA-256');
  assert.equal(drillResult.jsonValid, true, 'Backup JSON structure must be valid');
  assert.equal(drillResult.referentialIntegrity, true, 'Referential integrity must pass');

  // Test Restore Functionality (D-04 / AC-16c)
  // Simulate deleting the active classroom and workspace
  await writeFile(path.join(testDataDirectory, 'codepulse-classrooms.json'), JSON.stringify([]));
  await writeFile(path.join(testDataDirectory, 'codepulse-workspaces.json'), JSON.stringify([]));

  const restoreResult = await restoreSemesterBackup(backup.id, 'admin@test.com');
  assert.equal(restoreResult.success, true);
  assert.equal(restoreResult.termId, 'term-2026-test');

  // Verify records were restored back to disk
  const restoredClassrooms = JSON.parse(await readFile(path.join(testDataDirectory, 'codepulse-classrooms.json'), 'utf8'));
  assert.ok(restoredClassrooms.some((c) => c.id === 'class-test'), 'Classroom must be restored');

  const restoredWorkspaces = JSON.parse(await readFile(path.join(testDataDirectory, 'codepulse-workspaces.json'), 'utf8'));
  assert.ok(restoredWorkspaces.some((w) => w.id === 'workspace-test'), 'Workspace must be restored');
});

test('Disaster recovery drill fails closed for tampered, malformed, missing, and broken-reference backups', async () => {
  const backup = await createSemesterBackup({ actorEmail: 'admin@test.com', termId: 'term-2026-test' });
  const backupPath = path.join(testDataDirectory, 'backups', backup.filename);
  const recordsPath = path.join(testDataDirectory, 'codepulse-backups.json');
  const validBytes = await readFile(backupPath, 'utf8');

  await writeFile(backupPath, `${validBytes} `, 'utf8');
  const tampered = await verifyBackupDisasterRecovery(backup.id, 'admin@test.com');
  assert.equal(tampered.verified, false);
  assert.equal(tampered.checksumMatch, false);
  assert.equal(tampered.jsonValid, true);

  await writeFile(backupPath, '{ invalid json', 'utf8');
  const malformed = await verifyBackupDisasterRecovery(backup.id, 'admin@test.com');
  assert.equal(malformed.verified, false);
  assert.equal(malformed.checksumMatch, false);
  assert.equal(malformed.jsonValid, false);

  const brokenData = JSON.parse(validBytes);
  brokenData.tables.workspaces[0].classroomId = 'missing-classroom';
  const brokenBytes = JSON.stringify(brokenData, null, 2);
  await writeFile(backupPath, brokenBytes, 'utf8');
  const records = JSON.parse(await readFile(recordsPath, 'utf8'));
  records.find((item) => item.id === backup.id).sha256Hash = createHash('sha256').update(brokenBytes, 'utf8').digest('hex');
  await writeFile(recordsPath, JSON.stringify(records, null, 2), 'utf8');
  const brokenReference = await verifyBackupDisasterRecovery(backup.id, 'admin@test.com');
  assert.equal(brokenReference.checksumMatch, true);
  assert.equal(brokenReference.jsonValid, true);
  assert.equal(brokenReference.referentialIntegrity, false);
  assert.equal(brokenReference.verified, false);

  await rm(backupPath);
  const missing = await verifyBackupDisasterRecovery(backup.id, 'admin@test.com');
  assert.equal(missing.verified, false);
  assert.equal(missing.checksumMatch, false);
  assert.equal(missing.jsonValid, false);
  assert.equal(missing.referentialIntegrity, false);
});
