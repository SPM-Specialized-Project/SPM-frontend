import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  ServerStackIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';

import StudyLayout from '@/components/study-layout';
import {
  adminOperationsApi,
  type OperationsHealth,
  type SmartAlert,
  type AlertStats,
  type RequestTrace,
  type AuditLog,
  type SemesterBackup,
  type DrillResult,
  type SessionReport,
} from '@/services/admin-operations-api';

export const Route = createFileRoute('/_private/system-monitoring/')({
  beforeLoad: async () => {
    document.title = 'Giám sát hệ thống - Code Pulse';
    const storedUser = localStorage.getItem('userStore');
    if (!storedUser) {
      window.location.assign('/login');
      return;
    }
    try {
      const role = String(JSON.parse(storedUser)?.state?.user?.role ?? '').toLowerCase();
      if (!['admin', 'coordinator', 'chairman', 'lecturer'].includes(role)) {
        window.location.assign('/dashboard');
      }
    } catch {
      window.location.assign('/dashboard');
    }
  },
  component: SystemMonitoringPage,
});

type MainTab = 'monitoring' | 'tracing' | 'retention';

export function SystemMonitoringPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MainTab>('monitoring');

  // Health state
  const [health, setHealth] = useState<OperationsHealth | null>(null);
  const [healthError, setHealthError] = useState(false);

  // Alerts state
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CRITICAL'>('ALL');
  const [alertActionLoading, setAlertActionLoading] = useState<string | null>(null);

  // Trace state
  const [traceRequestId, setTraceRequestId] = useState('');
  const [searchedTraceId, setSearchedTraceId] = useState('');
  const [trace, setTrace] = useState<RequestTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Backups state
  const [backups, setBackups] = useState<SemesterBackup[]>([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [drillRunning, setDrillRunning] = useState<string | null>(null);
  const [drillResult, setDrillResult] = useState<DrillResult | null>(null);

  // Session report state
  const [selectedSessionId, setSelectedSessionId] = useState('lab-1790764823448');
  const [sessionReport, setSessionReport] = useState<SessionReport | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadHealth = async () => {
    try {
      const data = await adminOperationsApi.getHealth();
      setHealth(data);
      setHealthError(false);
    } catch {
      setHealth(null);
      setHealthError(true);
    }
  };

  const loadAlerts = async () => {
    try {
      const [list, stats] = await Promise.all([
        adminOperationsApi.getAlerts(),
        adminOperationsApi.getAlertStats(),
      ]);
      setAlerts(list);
      setAlertStats(stats);
    } catch (e) {
      console.error('Lỗi tải dữ liệu cảnh báo:', e);
    }
  };

  const loadTrace = async (reqId: string) => {
    const requestId = reqId.trim();
    if (!requestId) {
      setTrace(null);
      setSearchedTraceId('');
      return;
    }
    setTrace(null);
    setSearchedTraceId(requestId);
    setTraceLoading(true);
    try {
      const res = await adminOperationsApi.getTrace(requestId);
      setTrace(res);
      if (!res) showNotification('Không tìm thấy trace đã được ghi nhận cho mã này.', 'error');
    } catch {
      showNotification('Không tìm thấy bản ghi vết cho mã yêu cầu này.', 'error');
    } finally {
      setTraceLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await adminOperationsApi.getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Lỗi tải nhật ký kiểm toán:', e);
    }
  };

  const loadBackups = async () => {
    try {
      const list = await adminOperationsApi.getBackups();
      setBackups(list);
    } catch (e) {
      console.error('Lỗi tải danh sách sao lưu:', e);
    }
  };

  const loadSessionReport = async (sId: string) => {
    try {
      const rep = await adminOperationsApi.getSessionReport(sId);
      setSessionReport(rep);
    } catch {
      setSessionReport(null);
      showNotification('Không thể tải báo cáo buổi thực hành.', 'error');
    }
  };

  useEffect(() => {
    loadHealth();
    loadAlerts();
    loadAuditLogs();
    loadBackups();
    loadSessionReport(selectedSessionId);
    if (traceRequestId) loadTrace(traceRequestId);

    const timer = setInterval(() => {
      loadHealth();
      loadAlerts();
    }, 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAlertStatus = async (alertId: string, newStatus: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED') => {
    setAlertActionLoading(alertId);
    try {
      await adminOperationsApi.updateAlertStatus(alertId, newStatus);
      showNotification(`Đã cập nhật trạng thái cảnh báo sang: ${newStatus}`);
      await loadAlerts();
      await loadAuditLogs();
    } catch {
      showNotification('Không thể cập nhật trạng thái cảnh báo.', 'error');
    } finally {
      setAlertActionLoading(null);
    }
  };

  const handleCreateBackup = async () => {
    setBackupCreating(true);
    try {
      const b = await adminOperationsApi.createBackup('term-2026-1');
      showNotification(`Tạo bản sao lưu thành công: ${b.filename}`);
      await loadBackups();
      await loadAuditLogs();
    } catch {
      showNotification('Lỗi trong quá trình tạo bản sao lưu dữ liệu.', 'error');
    } finally {
      setBackupCreating(false);
    }
  };

  const handleRunDrill = async (backupId: string) => {
    setDrillRunning(backupId);
    setDrillResult(null);
    try {
      const res = await adminOperationsApi.runDisasterRecoveryDrill(backupId);
      setDrillResult(res);
      showNotification(
        res.verified ? 'Diễn tập phục hồi đạt yêu cầu.' : 'Diễn tập phát hiện backup không hợp lệ.',
        res.verified ? 'success' : 'error',
      );
      await loadAuditLogs();
    } catch {
      showNotification('Lỗi trong quá trình diễn tập phục hồi.', 'error');
    } finally {
      setDrillRunning(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter === 'ALL') return true;
    if (alertFilter === 'CRITICAL') return a.severity === 'CRITICAL' && a.status === 'ACTIVE';
    return a.status === alertFilter;
  });

  return (
    <StudyLayout>
      <div className="min-h-screen bg-slate-50 p-6">
        {/* Navigation back button */}
        <button
          onClick={() => navigate({ to: '/dashboard' })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Quay lại trang chủ</span>
        </button>

        {/* Header Title Section */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                Quản trị hệ thống
              </span>
              <span className="text-xs text-slate-400">Phiên bản 2.4</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Giám sát hệ thống & Báo cáo vận hành
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Hạ tầng thực thi sandbox, cảnh báo hỗ trợ sinh viên, truy vết yêu cầu và lưu trữ dữ liệu học kỳ.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              health?.workerStatus.poolHealth === 'HEALTHY'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : healthError || health?.workerStatus.poolHealth === 'UNAVAILABLE'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              <span className={`size-2 rounded-full ${health?.workerStatus.poolHealth === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {healthError ? 'Không tải được dữ liệu hệ thống' : health?.workerStatus.poolHealth ?? 'Đang tải trạng thái'}
            </span>
            <button
              onClick={() => {
                loadHealth();
                loadAlerts();
                loadAuditLogs();
                loadBackups();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowPathIcon className="size-3.5 text-slate-500" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mb-5 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition ${
              notification.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                : notification.type === 'error'
                  ? 'border border-red-200 bg-red-50 text-red-900'
                  : 'border border-blue-200 bg-blue-50 text-blue-900'
            }`}
          >
            <span>{notification.text}</span>
            <button onClick={() => setNotification(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">
              Đóng
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="mb-6 inline-flex rounded-lg bg-slate-200 p-1">
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`rounded-md px-5 py-2 text-sm font-medium transition ${
              activeTab === 'monitoring'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-700 hover:bg-slate-300'
            }`}
          >
            Hạ tầng & Cảnh báo thông minh
          </button>
          <button
            onClick={() => setActiveTab('tracing')}
            className={`rounded-md px-5 py-2 text-sm font-medium transition ${
              activeTab === 'tracing'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-700 hover:bg-slate-300'
            }`}
          >
            Truy vết & Nhật ký kiểm toán
          </button>
          <button
            onClick={() => setActiveTab('retention')}
            className={`rounded-md px-5 py-2 text-sm font-medium transition ${
              activeTab === 'retention'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-700 hover:bg-slate-300'
            }`}
          >
            Sao lưu & Báo cáo học kỳ
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: HẠ TẦNG & CẢNH BÁO THÔNG MINH (SCRUM-81)               */}
        {/* ============================================================== */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {/* Metric KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Hàng đợi thực thi (Queue)</span>
                  <ServerStackIcon className="size-4 text-slate-400" />
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{health?.queueLength ?? '—'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Đang chạy: <strong className="text-blue-600">{health?.runningExecutions ?? '—'}</strong> tiến trình
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Hàng đợi chấm AI</span>
                  <ClockIcon className="size-4 text-slate-400" />
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{health?.aiAssessmentQueue ?? '—'}</div>
                <div className="mt-1 text-xs text-slate-500">Trạng thái: {health?.aiAssessmentQueue == null ? 'Chưa có số liệu' : 'Sẵn sàng tiếp nhận'}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Độ trễ trung vị (p50 / p95)</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">ms</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{health?.latency.p50Ms ?? '—'}</span>
                  <span className="text-xs text-slate-500">/ p95: {health?.latency.p95Ms ?? '—'}ms</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">Thời gian biên dịch và chạy test public</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Tỷ lệ lỗi thực thi</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {health?.errorRate.status ?? 'Chưa có số liệu'}
                  </span>
                </div>
                <div className="mt-2 text-3xl font-bold text-emerald-600">{health?.errorRate.percentage == null ? '—' : `${health.errorRate.percentage}%`}</div>
                <div className="mt-1 text-xs text-slate-500">Tính trên {health?.errorRate.recentSamples ?? '—'} lần chạy mã gần nhất</div>
              </div>
            </div>

            {/* Worker Nodes Pool */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Danh sách Sandbox Worker Nodes</h3>
                  <p className="text-xs text-slate-500">Các container Docker độc lập xử lý biên dịch C++ và chạy test case.</p>
                </div>
                <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Tổng số: {health?.workerStatus.totalWorkers ?? '—'} workers
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: health?.workerStatus.totalWorkers ?? 0 }, (_, index) => index + 1).map((node) => {
                  const isBusy = node <= (health?.workerStatus.activeWorkers ?? 0);
                  return (
                    <div key={node} className="rounded-lg border border-slate-200 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">Worker Node #{node}</span>
                        <span className={`size-2 rounded-full ${isBusy ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Trạng thái: <strong className={isBusy ? 'text-amber-600' : 'text-emerald-600'}>{isBusy ? 'Đang chạy' : 'Sẵn sàng'}</strong>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">Image: cpp-sandbox:v2</div>
                    </div>
                  );
                })}
                {health?.workerStatus.totalWorkers === 0 && (
                  <p className="text-xs text-slate-500">Không có số liệu worker.</p>
                )}
              </div>
            </div>

            {/* Smart Alerts Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">Hệ thống Cảnh báo Thông minh</h3>
                    {(alertStats?.active ?? 0) > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        {alertStats?.active} cần xử lý
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Tự động nhận diện sinh viên gặp lỗi liên tiếp (từ 3 lần trở lên) hoặc lặp vô tận/timeout (từ 2 lần trở lên).
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1">
                  {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CRITICAL'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAlertFilter(filter)}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${
                        alertFilter === filter
                          ? 'bg-white font-semibold text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter === 'ALL' && 'Tất cả'}
                      {filter === 'ACTIVE' && 'Đang hoạt động'}
                      {filter === 'ACKNOWLEDGED' && 'Đã tiếp nhận'}
                      {filter === 'RESOLVED' && 'Đã xử lý'}
                      {filter === 'CRITICAL' && 'Nghiêm trọng'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alert list */}
              <div className="mt-4 divide-y divide-slate-100">
                {filteredAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Không có cảnh báo nào trong mục này.
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div key={alert.id} className="py-4 first:pt-2 last:pb-0">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                                alert.severity === 'CRITICAL'
                                  ? 'border border-red-200 bg-red-50 text-red-700'
                                  : 'border border-amber-200 bg-amber-50 text-amber-800'
                              }`}
                            >
                              {alert.severity === 'CRITICAL' ? 'Mức nghiêm trọng' : 'Mức cảnh báo'}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {alert.ruleType === 'CONSECUTIVE_FAILURES' ? 'Lỗi liên tiếp' : 'Vòng lặp / Quá thời gian'}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                alert.status === 'ACTIVE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : alert.status === 'ACKNOWLEDGED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {alert.status === 'ACTIVE' && 'Chưa tiếp nhận'}
                              {alert.status === 'ACKNOWLEDGED' && 'Đang hỗ trợ'}
                              {alert.status === 'RESOLVED' && 'Đã khắc phục'}
                              {alert.status === 'DISMISSED' && 'Bỏ qua'}
                            </span>
                          </div>

                          <div className="mt-2 text-sm font-semibold text-slate-900">{alert.message}</div>
                          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>Sinh viên: <strong className="text-slate-700">{alert.studentEmail}</strong></span>
                            <span>Mã bài tập: <code className="text-slate-700">{alert.assignmentId || 'N/A'}</code></span>
                            <span>Lặp lại: <strong className="text-red-600">{alert.occurrenceCount} lần</strong></span>
                            <span>Thời điểm: {new Date(alert.lastOccurredAt).toLocaleTimeString('vi-VN')} {new Date(alert.lastOccurredAt).toLocaleDateString('vi-VN')}</span>
                          </div>

                          {alert.details?.stderr && (
                            <pre className="mt-2.5 max-h-24 overflow-x-auto rounded bg-slate-900 p-2.5 font-mono text-[11px] text-red-300">
                              {alert.details.stderr}
                            </pre>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                          {alert.status === 'ACTIVE' && (
                            <button
                              disabled={alertActionLoading === alert.id}
                              onClick={() => handleAlertStatus(alert.id, 'ACKNOWLEDGED')}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                            >
                              Tiếp nhận
                            </button>
                          )}
                          {alert.status !== 'RESOLVED' && (
                            <button
                              disabled={alertActionLoading === alert.id}
                              onClick={() => handleAlertStatus(alert.id, 'RESOLVED')}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                            >
                              Đánh dấu đã giải quyết
                            </button>
                          )}
                          {alert.status !== 'DISMISSED' && alert.status !== 'RESOLVED' && (
                            <button
                              disabled={alertActionLoading === alert.id}
                              onClick={() => handleAlertStatus(alert.id, 'DISMISSED')}
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Bỏ qua
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: TRUY VẾT & NHẬT KÝ KIỂM TOÁN (UI-09)                    */}
        {/* ============================================================== */}
        {activeTab === 'tracing' && (
          <div className="space-y-6">
            {/* Request trace section */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Tra cứu Vết Thực thi Yêu cầu (Request Trace)</h3>
              <p className="text-xs text-slate-500">
                Theo dõi toàn bộ 4 giai đoạn vòng đời (RECEIVED ➔ DISPATCHED ➔ EXECUTED ➔ RECORDED) với cơ chế bảo mật che giấu mã nguồn sinh viên.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={traceRequestId}
                    onChange={(e) => setTraceRequestId(e.target.value)}
                    placeholder="Nhập mã Request ID hoặc Execution ID cần tra cứu..."
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  disabled={traceLoading || !traceRequestId.trim()}
                  onClick={() => loadTrace(traceRequestId)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  {traceLoading ? 'Đang tìm...' : 'Tra cứu'}
                </button>
              </div>

              <p className="mt-2.5 text-xs text-slate-500">
                Dùng Execution ID nhận được sau khi chạy bài. Chỉ trace thực đã được ghi nhận mới hiển thị.
              </p>

              {/* Trace Timeline View */}
              {searchedTraceId && !trace && (
                <p className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-500">
                  Không có trace đã ghi nhận cho mã {searchedTraceId}.
                </p>
              )}
              {trace && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Mã yêu cầu:</span>
                      <span className="ml-1.5 font-mono text-sm font-bold text-slate-900">{trace.requestId}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <ShieldCheckIcon className="size-4 text-emerald-600" />
                      Mã nguồn & Test case ẩn đã được che giấu ([REDACTED])
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    {trace.events.map((evt, idx) => (
                      <div key={idx} className="relative flex gap-3 pl-6 before:absolute before:left-2.5 before:top-3 before:h-full before:w-0.5 before:bg-slate-200 last:before:hidden">
                        <div className="absolute left-1 top-1.5 size-3.5 rounded-full border-2 border-white bg-blue-600 shadow"></div>
                        <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-blue-800">{evt.stage}</span>
                            <span className="text-slate-400">{evt.timestamp}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-700">{evt.description}</p>
                          <pre className="mt-2 max-h-32 overflow-x-auto rounded bg-slate-900 p-2.5 font-mono text-[11px] text-slate-200">
                            {JSON.stringify(evt.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audit Logs Table */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Nhật ký Kiểm toán Hệ thống (Audit Logs)</h3>
                  <p className="text-xs text-slate-500">Bản ghi bất biến ghi nhận các thao tác quản trị, sao lưu và diễn tập phục hồi.</p>
                </div>
                <span className="text-xs text-slate-400">Tổng cộng {auditLogs.length} bản ghi</span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 font-semibold">Thời gian</th>
                      <th className="p-3 font-semibold">Tài khoản</th>
                      <th className="p-3 font-semibold">Thao tác</th>
                      <th className="p-3 font-semibold">Đối tượng</th>
                      <th className="p-3 font-semibold">Mã yêu cầu</th>
                      <th className="p-3 font-semibold">Kết quả</th>
                      <th className="p-3 font-semibold">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap p-3 text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3 font-medium text-slate-800">{log.actor}</td>
                        <td className="p-3 font-mono font-semibold text-blue-700">{log.action}</td>
                        <td className="p-3 text-slate-600">{log.target}</td>
                        <td className="p-3 font-mono text-slate-500">{log.requestId}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              log.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SAO LƯU & BÁO CÁO HỌC KỲ (SCRUM-82)                      */}
        {/* ============================================================== */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            {/* Backup Management Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Lưu trữ Dữ liệu Học kỳ & Diễn tập Phục hồi Thảm họa</h3>
                  <p className="text-xs text-slate-500">
                    Bảo đảm lưu giữ dữ liệu xuyên suốt 4 tháng học kỳ, đối chiếu mã băm toàn vẹn SHA-256 và diễn tập phục hồi (Disaster Recovery Drill).
                  </p>
                </div>
                <button
                  disabled={backupCreating}
                  onClick={handleCreateBackup}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <DocumentArrowDownIcon className="size-4" />
                  <span>{backupCreating ? 'Đang sao lưu...' : 'Tạo bản sao lưu học kỳ mới'}</span>
                </button>
              </div>

              {/* Drill Result Card */}
              {drillResult && (
                <div className={`mt-4 rounded-lg border p-4 text-xs ${drillResult.verified ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {drillResult.verified ? 'Báo cáo Diễn tập Phục hồi Thảm họa: ĐẠT TIÊU CHUẨN' : 'Diễn tập không đạt'}
                    </span>
                    <span className="text-[11px] text-slate-500">Thời gian thực thi: {drillResult.durationMs}ms</span>
                  </div>
                  <p className="mt-1">{drillResult.message}</p>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-2">
                    <div>Mã băm lưu trữ: <span className="text-slate-700">{drillResult.sha256Hash.slice(0, 24)}...</span></div>
                    <div>Mã băm đối soát: <span className="text-slate-700">{drillResult.recomputedHash.slice(0, 24)}...</span></div>
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-slate-700">
                    {drillResult.checks.map((chk, i) => (
                      <li key={i}>{chk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Backups List Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 font-semibold">Học kỳ</th>
                      <th className="p-3 font-semibold">Tên tập tin</th>
                      <th className="p-3 font-semibold">Thời điểm sao lưu</th>
                      <th className="p-3 font-semibold">Dung lượng</th>
                      <th className="p-3 font-semibold">Mã băm SHA-256</th>
                      <th className="p-3 font-semibold">Dữ liệu lưu trữ</th>
                      <th className="p-3 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-blue-700">{b.termId}</td>
                        <td className="p-3 font-mono text-slate-800">{b.filename}</td>
                        <td className="whitespace-nowrap p-3 text-slate-500">
                          {new Date(b.createdAt).toLocaleDateString('vi-VN')} {new Date(b.createdAt).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="p-3 text-slate-600">{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                        <td className="p-3 font-mono text-slate-500" title={b.sha256Hash}>
                          {b.sha256Hash.slice(0, 16)}...
                        </td>
                        <td className="p-3 text-slate-600">
                          {b.recordCounts.workspaces} workspaces, {b.recordCounts.submissions} bài nộp
                        </td>
                        <td className="p-3 text-right">
                          <button
                            disabled={drillRunning === b.id}
                            onClick={() => handleRunDrill(b.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            {drillRunning === b.id ? 'Đang kiểm tra...' : 'Diễn tập phục hồi'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session Report & Metrics Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Báo cáo Tổng kết Buổi Thực hành (Session Report)</h3>
                  <p className="text-xs text-slate-500">
                    Thống kê tỷ lệ tham gia trong và ngoài giờ lab, mức độ hoàn thành bài tập, và kiểm soát an toàn mẫu số rỗng (N=0).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Chọn buổi:</span>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => {
                      setSelectedSessionId(e.target.value);
                      loadSessionReport(e.target.value);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="lab-1790764823448">LAB 01 - PRACTICE</option>
                    <option value="s-1">Buổi 1 - Mạng máy tính (Computer Network)</option>
                    <option value="s-2">Lab - Hệ cơ sở dữ liệu (Database System)</option>
                    <option value="s-3">Buổi tổng hợp - Hệ cơ sở dữ liệu (Database System)</option>
                    <option value="empty-session-test">Kiểm thử Mẫu số Rỗng (N=0 / AC-14e)</option>
                  </select>
                </div>
              </div>

              {sessionReport?.denominatorWarning && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <strong>Quy tắc AC-14e / AC-238 (Xử lý Mẫu số Rỗng N=0):</strong> Buổi học này chưa có sinh viên đăng ký. Hệ thống trả về <code className="font-semibold">null</code> và hiển thị <span className="rounded bg-amber-100 px-1 font-semibold">N/A</span> một cách an toàn, tránh lỗi chia cho 0 hoặc lỗi 500.
                </div>
              )}

              {sessionReport && (
                <div className="mt-5 space-y-5">
                  {/* Summary metric cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <span className="text-xs font-medium text-slate-500">Tổng sinh viên đăng ký (N)</span>
                      <div className="mt-1 text-2xl font-bold text-slate-900">{sessionReport.totalRegistered}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{sessionReport.classroomName}</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <span className="text-xs font-medium text-slate-500">Tỷ lệ tham gia (In-Lab)</span>
                      <div className="mt-1 text-2xl font-bold text-blue-700">{sessionReport.participation.displayRate}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Trong lab: {sessionReport.participation.inLabActive} | Ngoài lab: {sessionReport.participation.outsideLabActive}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <span className="text-xs font-medium text-slate-500">Điểm số trung bình</span>
                      <div className="mt-1 text-2xl font-bold text-emerald-700">{sessionReport.scoreDistribution.displayAverageScore}</div>
                      <div className="mt-0.5 text-xs text-slate-400">Thang điểm 10 tiêu chuẩn</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <span className="text-xs font-medium text-slate-500">Tổng số bài tập</span>
                      <div className="mt-1 text-2xl font-bold text-slate-900">{sessionReport.problems.length}</div>
                      <div className="mt-0.5 text-xs text-slate-400">Bài tập trong ca thực hành</div>
                    </div>
                  </div>

                  {/* Problem completion table */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-500">Tiến độ bài tập thực hành</h4>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-2.5 font-semibold">Tên bài thực hành</th>
                            <th className="p-2.5 font-semibold">Số lượt nộp</th>
                            <th className="p-2.5 font-semibold">Số bài đạt (Passed)</th>
                            <th className="p-2.5 font-semibold">Tỷ lệ hoàn thành</th>
                            <th className="p-2.5 font-semibold">Điểm trung bình</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sessionReport.problems.map((prob) => (
                            <tr key={prob.problemId} className="hover:bg-slate-50">
                              <td className="p-2.5 font-medium text-slate-800">{prob.title}</td>
                              <td className="p-2.5 text-slate-600">{prob.submissionsCount}</td>
                              <td className="p-2.5 font-semibold text-emerald-700">{prob.passedCount}</td>
                              <td className="p-2.5">
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                                  {prob.displayCompletionRate}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-700">
                                {prob.averageScore !== null ? `${prob.averageScore}/10` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Score distribution buckets */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-500">Phân bổ phổ điểm (Score Buckets)</h4>
                    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {sessionReport.scoreDistribution.buckets.map((b) => (
                        <div key={b.label} className="rounded-lg border border-slate-200 p-3 text-center">
                          <span className="text-xs font-medium text-slate-500">{b.label}</span>
                          <div className="mt-1 text-xl font-bold text-slate-900">{b.count} bài</div>
                          <span className="text-[11px] text-slate-500">
                            {b.percentage !== null ? `${b.percentage}%` : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </StudyLayout>
  );
}

export default SystemMonitoringPage;
