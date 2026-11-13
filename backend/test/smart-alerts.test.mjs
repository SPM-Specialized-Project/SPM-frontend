import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const testDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-smart-alerts-'));
process.env.BACKEND_DATA_DIRECTORY = testDataDirectory;
const {
  evaluateExecutionAlert,
  getAlerts,
  updateAlertStatus,
  getAlertStats,
} = await import('../alerts.mjs');

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});

test('Smart Alert system - rule evaluation, deduplication, auto-resolve and lifecycle', async () => {
  const testWorkspace = {
    id: `ws-test-${Date.now()}`,
    classroomId: 'class-test-alerts',
    assignmentId: 'assign-test-1',
    ownerEmail: 'test-student@gmail.com',
  };

  // 1. Initial 2 failures: should not trigger alert yet (threshold is 3)
  const fail1 = await evaluateExecutionAlert({
    workspace: testWorkspace,
    executionResult: { id: 'exec-1', status: 'RUNTIME_ERROR', stderr: 'Error 1' },
    classroomId: testWorkspace.classroomId,
    studentEmail: testWorkspace.ownerEmail,
  });
  assert.equal(fail1, null, '2 failures should not trigger an alert yet');

  const fail2 = await evaluateExecutionAlert({
    workspace: testWorkspace,
    executionResult: { id: 'exec-2', status: 'RUNTIME_ERROR', stderr: 'Error 2' },
    classroomId: testWorkspace.classroomId,
    studentEmail: testWorkspace.ownerEmail,
  });
  assert.equal(fail2, null, '2 failures should not trigger an alert yet');

  // 2. 3rd consecutive failure: triggers WARNING alert
  const alert3 = await evaluateExecutionAlert({
    workspace: testWorkspace,
    executionResult: { id: 'exec-3', status: 'RUNTIME_ERROR', stderr: 'Error 3' },
    classroomId: testWorkspace.classroomId,
    studentEmail: testWorkspace.ownerEmail,
  });
  assert.ok(alert3, '3 consecutive failures must trigger an alert');
  assert.equal(alert3.ruleType, 'CONSECUTIVE_FAILURES');
  assert.equal(alert3.severity, 'WARNING');
  assert.equal(alert3.occurrenceCount, 1);
  assert.equal(alert3.status, 'ACTIVE');

  // 3. Deduplication: 4th consecutive failure must NOT create a new alert, but update existing
  const alert4 = await evaluateExecutionAlert({
    workspace: testWorkspace,
    executionResult: { id: 'exec-4', status: 'RUNTIME_ERROR', stderr: 'Error 4' },
    classroomId: testWorkspace.classroomId,
    studentEmail: testWorkspace.ownerEmail,
  });
  assert.equal(alert4.id, alert3.id, 'Deduplication must reuse existing active alert');
  assert.equal(alert4.occurrenceCount, 2, 'Occurrence count must be incremented');

  // 4. 5th consecutive failure: escalates severity to CRITICAL
  const alert5 = await evaluateExecutionAlert({
    workspace: testWorkspace,
    executionResult: { id: 'exec-5', status: 'RUNTIME_ERROR', stderr: 'Error 5' },
    classroomId: testWorkspace.classroomId,
    studentEmail: testWorkspace.ownerEmail,
  });
  assert.equal(alert5.severity, 'CRITICAL', '5 consecutive failures must escalate to CRITICAL');

  // 5. Acknowledge the alert
  const acked = await updateAlertStatus(alert5.id, 'ACKNOWLEDGED', 'tutor@gmail.com');
  assert.equal(acked.status, 'ACKNOWLEDGED');
  assert.equal(acked.acknowledgedBy, 'tutor@gmail.com');

  // 6. Auto-resolve: when student submits passing code
  const passingExec = {
    id: 'exec-pass',
    status: 'SUCCESS',
    exitCode: 0,
    results: [{ passed: true }],
  };
  const resolveResult = await evaluateExecutionAlert({
    workspace: testWorkspace,
    executionResult: passingExec,
    classroomId: testWorkspace.classroomId,
    studentEmail: testWorkspace.ownerEmail,
  });
  assert.ok(resolveResult.autoResolvedCount >= 1, 'Passing test must auto-resolve active alerts');

  // Check alert is RESOLVED
  const alertsAfter = await getAlerts({ classroomId: testWorkspace.classroomId });
  const resolvedAlert = alertsAfter.find((a) => a.id === alert5.id);
  assert.equal(resolvedAlert.status, 'RESOLVED');

  // 7. Timeout loop rule: 2 consecutive timeouts
  const wsTimeout = {
    id: `ws-timeout-${Date.now()}`,
    classroomId: 'class-test-alerts',
    assignmentId: 'assign-test-2',
    ownerEmail: 'timeout-student@gmail.com',
  };

  await evaluateExecutionAlert({
    workspace: wsTimeout,
    executionResult: { id: 'to-1', status: 'TIMEOUT', stderr: 'timed out 1' },
    classroomId: wsTimeout.classroomId,
    studentEmail: wsTimeout.ownerEmail,
  });

  const timeoutAlert = await evaluateExecutionAlert({
    workspace: wsTimeout,
    executionResult: { id: 'to-2', status: 'TIMEOUT', stderr: 'timed out 2' },
    classroomId: wsTimeout.classroomId,
    studentEmail: wsTimeout.ownerEmail,
  });
  assert.ok(timeoutAlert, '2 timeouts must trigger TIMEOUT_LOOP alert');
  assert.equal(timeoutAlert.ruleType, 'TIMEOUT_LOOP');
  assert.equal(timeoutAlert.severity, 'CRITICAL');

  // 8. Stats check
  const stats = await getAlertStats({ classroomId: 'class-test-alerts' });
  assert.ok(stats.total >= 2);
  assert.ok(stats.resolved >= 1);
});
