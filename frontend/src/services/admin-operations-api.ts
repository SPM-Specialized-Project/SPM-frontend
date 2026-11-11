import { apiClient } from './api-client';

export interface OperationsHealth {
  queueLength: number;
  runningExecutions: number;
  aiAssessmentQueue: number;
  workerStatus: {
    totalWorkers: number;
    activeWorkers: number;
    idleWorkers: number;
    poolHealth: string;
  };
  latency: {
    p50Ms: number;
    p95Ms: number;
    unit: string;
  };
  errorRate: {
    percentage: number;
    recentSamples: number;
    status: string;
  };
  uptimeSeconds: number;
  timestamp: string;
}

export interface TraceEvent {
  stage: 'RECEIVED' | 'DISPATCHED' | 'EXECUTED' | 'RECORDED';
  timestamp: string;
  description: string;
  payload: Record<string, any>;
}

export interface RequestTrace {
  requestId: string;
  target: string;
  clientEmail?: string;
  totalDurationMs?: number;
  events: TraceEvent[];
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  requestId: string;
  result: string;
  details: string;
}

export interface SmartAlert {
  id: string;
  classroomId: string;
  labId?: string;
  assignmentId?: string;
  workspaceId: string;
  studentEmail: string;
  ruleType: 'CONSECUTIVE_FAILURES' | 'TIMEOUT_LOOP';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  details?: {
    lastExecutionId?: string;
    lastStatus?: string;
    stderr?: string;
    consecutiveCount?: number;
  };
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  occurrenceCount: number;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  dismissedBy?: string;
  dismissedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastOccurredAt: string;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;
  critical: number;
}

export interface SemesterBackup {
  id: string;
  filename: string;
  termId: string;
  createdAt: string;
  sizeBytes: number;
  sha256Hash: string;
  status: 'VERIFIED' | 'CORRUPTED';
  recordCounts: {
    classrooms: number;
    assignments: number;
    workspaces: number;
    submissions: number;
    alerts?: number;
  };
}

export interface DrillResult {
  backupId: string;
  filename: string;
  verified: boolean;
  checksumMatch: boolean;
  sha256Hash: string;
  recomputedHash: string;
  referentialIntegrity: boolean;
  checkedAt: string;
  durationMs: number;
  checks: string[];
  message: string;
}

export interface SessionReport {
  sessionId: string;
  title: string;
  classroomName: string;
  totalRegistered: number;
  participation: {
    inLabActive: number;
    outsideLabActive: number;
    rate: number | null;
    displayRate: string;
  };
  problems: Array<{
    problemId: string;
    title: string;
    submissionsCount: number;
    passedCount: number;
    completionRate: number | null;
    displayCompletionRate: string;
    averageScore: number | null;
  }>;
  scoreDistribution: {
    buckets: Array<{
      label: string;
      count: number;
      percentage: number | null;
    }>;
    averageScore: number | null;
    displayAverageScore: string;
  };
  denominatorWarning: boolean;
  generatedAt: string;
}

export const adminOperationsApi = {
  async getHealth(): Promise<OperationsHealth> {
    const res = await apiClient.get<{ item: OperationsHealth }>('/admin/operations/health');
    return res.data.item;
  },

  async getTrace(requestId: string): Promise<RequestTrace> {
    const res = await apiClient.get<{ item: RequestTrace }>(`/admin/operations/traces/${encodeURIComponent(requestId)}`);
    return res.data.item;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await apiClient.get<{ items: AuditLog[] }>('/admin/operations/audit-logs');
    return res.data.items || [];
  },

  async getAlerts(params?: { classroomId?: string; status?: string }): Promise<SmartAlert[]> {
    const res = await apiClient.get<{ items: SmartAlert[] }>('/admin/alerts', { params });
    return res.data.items || [];
  },

  async getAlertStats(classroomId?: string): Promise<AlertStats> {
    const res = await apiClient.get<{ item: AlertStats }>('/admin/alerts/stats', {
      params: classroomId ? { classroomId } : undefined,
    });
    return res.data.item;
  },

  async updateAlertStatus(alertId: string, status: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'): Promise<SmartAlert> {
    const res = await apiClient.patch<{ item: SmartAlert }>(`/admin/alerts/${encodeURIComponent(alertId)}/status`, {
      status,
    });
    return res.data.item;
  },

  async getBackups(): Promise<SemesterBackup[]> {
    const res = await apiClient.get<{ items: SemesterBackup[] }>('/admin/backups');
    return res.data.items || [];
  },

  async createBackup(termId?: string): Promise<SemesterBackup> {
    const res = await apiClient.post<{ item: SemesterBackup }>('/admin/backups', { termId });
    return res.data.item;
  },

  async runDisasterRecoveryDrill(backupId: string): Promise<DrillResult> {
    const res = await apiClient.post<{ item: DrillResult }>(`/admin/backups/${encodeURIComponent(backupId)}/verify`);
    return res.data.item;
  },

  async getSessionReport(sessionId: string): Promise<SessionReport> {
    const res = await apiClient.get<{ item: SessionReport }>(`/codepulse/sessions/${encodeURIComponent(sessionId)}/report`);
    return res.data.item;
  },
};
