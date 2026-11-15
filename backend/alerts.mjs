import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { ALERTS_FILE, DATA_DIRECTORY } from './config.mjs';

let alertsMutationQueue = Promise.resolve();

// In-memory tracking of consecutive failure counters
const consecutiveFailures = new Map();
const consecutiveTimeouts = new Map();

async function readAlerts() {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  try {
    const raw = await readFile(ALERTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await writeFile(ALERTS_FILE, '[]\n', 'utf8');
    return [];
  }
}

function mutateAlerts(callback) {
  const result = alertsMutationQueue.then(async () => {
    const records = await readAlerts();
    const value = await callback(records);
    await writeFile(ALERTS_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    return value;
  });
  alertsMutationQueue = result.catch(() => {});
  return result;
}

export async function evaluateExecutionAlert({
  workspace,
  executionResult,
  classroomId,
  studentEmail,
}) {
  if (!workspace || !executionResult) return null;

  const workspaceId = workspace.id;
  const isFailure = ['FAILED', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIMEOUT', 'INTERNAL_ERROR'].includes(executionResult.status);
  const isTimeout = executionResult.status === 'TIMEOUT';
  const isSuccess = executionResult.status === 'COMPLETED' || executionResult.status === 'SUCCESS' || executionResult.exitCode === 0;

  if (isSuccess && (!executionResult.results || executionResult.results.every((r) => r.passed))) {
    // Reset counters
    consecutiveFailures.delete(workspaceId);
    consecutiveTimeouts.delete(workspaceId);

    // Auto-resolve any active alerts for this problem/workspace
    return mutateAlerts((alerts) => {
      let resolvedCount = 0;
      for (const alert of alerts) {
        if (alert.workspaceId === workspaceId && (alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED')) {
          alert.status = 'RESOLVED';
          alert.resolvedAt = new Date().toISOString();
          alert.updatedAt = alert.resolvedAt;
          resolvedCount += 1;
        }
      }
      return { autoResolvedCount: resolvedCount };
    });
  }

  if (isFailure) {
    const currentFailures = (consecutiveFailures.get(workspaceId) ?? 0) + 1;
    consecutiveFailures.set(workspaceId, currentFailures);

    const currentTimeouts = isTimeout ? (consecutiveTimeouts.get(workspaceId) ?? 0) + 1 : (consecutiveTimeouts.get(workspaceId) ?? 0);
    if (isTimeout) consecutiveTimeouts.set(workspaceId, currentTimeouts);

    let ruleType = null;
    let severity = 'WARNING';
    let message = '';

    if (currentTimeouts >= 2) {
      ruleType = 'TIMEOUT_LOOP';
      severity = 'CRITICAL';
      message = `Sinh viên gặp lỗi vòng lặp/timeout ${currentTimeouts} lần liên tiếp.`;
    } else if (currentFailures >= 3) {
      ruleType = 'CONSECUTIVE_FAILURES';
      severity = currentFailures >= 5 ? 'CRITICAL' : 'WARNING';
      message = `Sinh viên chạy thử thất bại ${currentFailures} lần liên tiếp (${executionResult.status}).`;
    }

    if (!ruleType) return null;

    return mutateAlerts((alerts) => {
      // Deduplication: look for existing active alert for this workspace & ruleType
      const existing = alerts.find(
        (a) => a.workspaceId === workspaceId && a.ruleType === ruleType && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'),
      );

      const now = new Date().toISOString();

      if (existing) {
        existing.occurrenceCount = (existing.occurrenceCount ?? 1) + 1;
        existing.lastOccurredAt = now;
        existing.updatedAt = now;
        existing.severity = severity;
        existing.message = message;
        existing.details = {
          lastExecutionId: executionResult.id,
          lastStatus: executionResult.status,
          stderr: (executionResult.stderr || executionResult.stdout || '').slice(0, 500),
          consecutiveCount: currentFailures,
        };
        return existing;
      }

      const newAlert = {
        id: `alert-${Date.now()}-${randomUUID().slice(0, 6)}`,
        classroomId: classroomId ?? workspace.classroomId,
        labId: workspace.labId ?? null,
        assignmentId: workspace.assignmentId,
        workspaceId,
        studentEmail: studentEmail ?? workspace.ownerEmail,
        ruleType,
        severity,
        message,
        details: {
          lastExecutionId: executionResult.id,
          lastStatus: executionResult.status,
          stderr: (executionResult.stderr || executionResult.stdout || '').slice(0, 500),
          consecutiveCount: currentFailures,
        },
        status: 'ACTIVE',
        occurrenceCount: 1,
        createdAt: now,
        updatedAt: now,
        lastOccurredAt: now,
      };

      alerts.unshift(newAlert);
      return newAlert;
    });
  }

  return null;
}

export async function getAlerts({ classroomId = null, status = null } = {}) {
  const alerts = await readAlerts();
  return alerts.filter((alert) => {
    if (classroomId && alert.classroomId !== classroomId) return false;
    if (status && alert.status !== status) return false;
    return true;
  });
}

export async function updateAlertStatus(alertId, newStatus, userEmail) {
  if (!['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'].includes(newStatus)) {
    throw new Error(`Invalid alert status: ${newStatus}`);
  }

  return mutateAlerts((alerts) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('ALERT_NOT_FOUND');

    const now = new Date().toISOString();
    alert.status = newStatus;
    alert.updatedAt = now;

    if (newStatus === 'ACKNOWLEDGED') {
      alert.acknowledgedBy = userEmail;
      alert.acknowledgedAt = now;
    } else if (newStatus === 'DISMISSED') {
      alert.dismissedBy = userEmail;
      alert.dismissedAt = now;
    } else if (newStatus === 'RESOLVED') {
      alert.resolvedAt = now;
    }

    return alert;
  });
}

export async function getAlertStats({ classroomId = null } = {}) {
  const alerts = await getAlerts({ classroomId });
  const active = alerts.filter((a) => a.status === 'ACTIVE').length;
  const acknowledged = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolved = alerts.filter((a) => a.status === 'RESOLVED').length;
  const dismissed = alerts.filter((a) => a.status === 'DISMISSED').length;
  const critical = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;

  return {
    total: alerts.length,
    active,
    acknowledged,
    resolved,
    dismissed,
    critical,
  };
}
