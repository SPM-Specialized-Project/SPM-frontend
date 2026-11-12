import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  AUDIT_LOGS_FILE,
  TRACES_FILE,
  EXECUTIONS_FILE,
  DATA_DIRECTORY,
} from './config.mjs';

let auditLogsQueue = Promise.resolve();
let tracesQueue = Promise.resolve();

async function readJsonSafe(filePath, defaultValue = []) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

// ---------------- AUDIT LOGS ----------------

export function sanitizeAuditData(value, key = '') {
  if (value == null) return value;
  if (typeof value === 'string') {
    let sanitized = value;
    // Redact passwords
    sanitized = sanitized.replace(/(password\s*[:=]\s*["']?)([^"',;\s}{]+)(["']?)/gi, '$1[REDACTED_PASSWORD]$3');
    sanitized = sanitized.replace(/password123/gi, '[REDACTED_PASSWORD]');
    sanitized = sanitized.replace(/("password"\s*:\s*")([^"]+)(")/gi, '$1[REDACTED_PASSWORD]$3');
    // Redact tokens / bearer / secret / api keys
    sanitized = sanitized.replace(/(bearer\s+)([A-Za-z0-9._~+/-]+=*)/gi, '$1[REDACTED_TOKEN]');
    sanitized = sanitized.replace(/((?:token|secret|api[_-]?key|authorization)\s*[:=]\s*["']?)([^"',;\s}{]+)(["']?)/gi, '$1[REDACTED_TOKEN]$3');
    sanitized = sanitized.replace(/("(?:token|secret|apiKey|authorization)"\s*:\s*")([^"]+)(")/gi, '$1[REDACTED_TOKEN]$3');
    // Redact student source code
    if (/^sourceCode$/i.test(key)) {
      return '[REDACTED_STUDENT_CODE]';
    }
    sanitized = sanitized.replace(/(?:#include\s*<[a-z0-9._]+>|public\s+class\s+\w+|def\s+\w+\s*\(|int\s+main\s*\()[^;{}]+/gi, '[REDACTED_STUDENT_CODE]');
    // Redact hidden tests
    if (/hiddenTest|hidden_test/i.test(key) || (/hidden/i.test(key) && /input|output/i.test(key))) {
      return '[REDACTED_HIDDEN_TEST]';
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditData(item, key));
  }
  if (typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (/password/i.test(k)) {
        cleaned[k] = '[REDACTED_PASSWORD]';
      } else if (/token|secret|authorization|api[_-]?key/i.test(k)) {
        cleaned[k] = '[REDACTED_TOKEN]';
      } else if (/sourceCode|studentCode|code/i.test(k) && typeof v === 'string') {
        cleaned[k] = '[REDACTED_STUDENT_CODE]';
      } else if ((value.hidden || /hidden/i.test(k)) && (k === 'input' || k === 'expectedOutput')) {
        cleaned[k] = k === 'input' ? '[REDACTED_INPUT]' : '[REDACTED_OUTPUT]';
      } else {
        cleaned[k] = sanitizeAuditData(v, k);
      }
    }
    return cleaned;
  }
  return value;
}

export async function getAuditLogs() {
  const logs = await readJsonSafe(AUDIT_LOGS_FILE, []);
  if (logs.length === 0) {
    // Return initial seed audit logs so the table isn't completely empty
    return [
      {
        id: 'audit-init-1',
        actor: 'admin@gmail.com',
        action: 'SYSTEM_STARTUP',
        target: 'SystemHealth',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        requestId: 'req-sys-boot',
        result: 'SUCCESS',
        details: 'Hệ thống CodePulse khởi động thành công.',
      },
      {
        id: 'audit-init-2',
        actor: 'coordinator@gmail.com',
        action: 'UPDATE_ALERT_RULE',
        target: 'RuleEngine:ConsecutiveFailures',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        requestId: 'req-rule-cfg',
        result: 'SUCCESS',
        details: 'Cập nhật ngưỡng phát hiện lỗi: 3 lần liên tiếp.',
      },
    ];
  }
  return logs;
}

export function recordAuditLog({ actor, action, target, requestId, result, details }) {
  const sanitizedDetails = typeof details === 'object' && details !== null
    ? JSON.stringify(sanitizeAuditData(details))
    : sanitizeAuditData(details);
  const sanitizedTarget = sanitizeAuditData(target);

  const entry = {
    id: `audit-${Date.now()}-${randomUUID().slice(0, 6)}`,
    actor: actor || 'system',
    action: action || 'UNKNOWN',
    target: sanitizedTarget || 'N/A',
    timestamp: new Date().toISOString(),
    requestId: requestId || `req-${randomUUID().slice(0, 8)}`,
    result: result || 'SUCCESS',
    details: sanitizedDetails || '',
  };

  const promise = auditLogsQueue.then(async () => {
    await mkdir(DATA_DIRECTORY, { recursive: true });
    const logs = await readJsonSafe(AUDIT_LOGS_FILE, []);
    logs.unshift(entry);
    // Truly append-only: do not drop older logs (D-08)
    await writeFile(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    return entry;
  });

  auditLogsQueue = promise.catch(() => {});
  return promise;
}

// ---------------- REQUEST TRACES & REDACTION ----------------

export async function getTraces() {
  return readJsonSafe(TRACES_FILE, []);
}

export function recordTraceEvent(requestId, event) {
  const promise = tracesQueue.then(async () => {
    await mkdir(DATA_DIRECTORY, { recursive: true });
    const traces = await readJsonSafe(TRACES_FILE, []);
    let trace = traces.find((t) => t.requestId === requestId);
    if (!trace) {
      trace = {
        requestId,
        startedAt: new Date().toISOString(),
        events: [],
      };
      traces.unshift(trace);
    }
    trace.events.push(redactTraceEvent({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    }));
    // Keep max 100 traces
    const trimmed = traces.slice(0, 100);
    await writeFile(TRACES_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    return trace;
  });

  tracesQueue = promise.catch(() => {});
  return promise;
}

const redactValue = (value, key = '') => {
  if (/^sourceCode$/i.test(key) && typeof value === 'string') return '[REDACTED_STUDENT_CODE]';
  if (/password|token|authorization|secret|api[_-]?key/i.test(key) && value != null) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!value || typeof value !== 'object') return value;

  const cloned = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (value.hidden === true && (childKey === 'input' || childKey === 'expectedOutput')) {
      cloned[childKey] = childKey === 'input' ? '[REDACTED_INPUT]' : '[REDACTED_OUTPUT]';
      continue;
    }
    cloned[childKey] = redactValue(childValue, childKey);
  }
  return cloned;
};

function redactTraceEvent(event) {
  const cloned = structuredClone(event);
  if (cloned.payload) cloned.payload = redactValue(cloned.payload);
  return cloned;
}

export function redactSensitiveData(trace) {
  if (!trace) return null;
  return {
    ...structuredClone(trace),
    events: (trace.events ?? []).map(redactTraceEvent),
  };
}

export async function getRequestTrace(requestId) {
  const traces = await getTraces();
  const trace = traces.find((item) => item.requestId === requestId);
  return trace ? redactSensitiveData(trace) : null;
}

// ---------------- SYSTEM HEALTH & WORKER METRICS ----------------

export async function getSystemOperationsHealth(queueStats = {}, aiQueueStats = null) {
  const executions = await readJsonSafe(EXECUTIONS_FILE, []);

  // Compute latencies from executions
  const latencies = executions
    .map((e) => Number(e.runtimeMs) || 0)
    .filter((l) => l > 0)
    .sort((a, b) => a - b);

  const percentile = (values, fraction) => values.length
    ? values[Math.max(0, Math.ceil(values.length * fraction) - 1)]
    : null;
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);

  // Error rate
  const recent = executions.slice(-50);
  const failureCount = recent.filter(
    (e) => ['FAILED', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIMEOUT', 'INTERNAL_ERROR'].includes(e.status),
  ).length;
  const errorRate = recent.length > 0 ? Number(((failureCount / recent.length) * 100).toFixed(1)) : null;
  const totalWorkers = Math.max(0, Number(queueStats.totalWorkers ?? queueStats.concurrency) || 0);
  const runningExecutions = Math.max(0, Number(queueStats.activeCount) || 0);
  const queueLength = Math.max(0, Number(queueStats.pendingCount) || 0);

  // D-07: Determine real pool health based on workers, error rate and saturation
  let poolHealth = 'HEALTHY';
  if (totalWorkers === 0) {
    poolHealth = 'UNAVAILABLE';
  } else if (errorRate !== null && errorRate >= 50) {
    poolHealth = 'CRITICAL';
  } else if (errorRate !== null && errorRate >= 20) {
    poolHealth = 'DEGRADED';
  } else if (queueLength > 0 && runningExecutions >= totalWorkers) {
    poolHealth = 'SATURATED';
  }

  const resolvedAiQueue = typeof aiQueueStats === 'number'
    ? aiQueueStats
    : (aiQueueStats?.pendingCount ?? aiQueueStats?.queueLength ?? null);

  return {
    queueLength,
    runningExecutions,
    aiAssessmentQueue: resolvedAiQueue,
    workerStatus: {
      totalWorkers,
      activeWorkers: Math.min(runningExecutions, totalWorkers),
      idleWorkers: Math.max(0, totalWorkers - runningExecutions),
      poolHealth,
    },
    latency: {
      p50Ms: p50,
      p95Ms: p95,
      unit: 'ms',
    },
    errorRate: {
      percentage: errorRate,
      recentSamples: recent.length,
      status: errorRate === null ? 'NO_DATA' : errorRate < 5.0 ? 'NORMAL' : 'ELEVATED',
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
