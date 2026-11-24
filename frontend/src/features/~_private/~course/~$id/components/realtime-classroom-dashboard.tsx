import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  SignalSlashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  codePulseApi,
  type CodePulseRealtimeDashboardResponse,
  type CodePulseStudentProgress,
} from '@/services/codepulse-api';

type RealtimeClassroomDashboardProps = {
  classroomId: string;
};

type StatusFilter = 'ALL' | 'HAS_ALERT' | 'STALE_IDLE' | 'SUBMITTED' | 'IN_PROGRESS';

function formatTimestamp(value?: string | null): string {
  if (!value) return 'Chưa có hoạt động';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có hoạt động';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatIdleTime(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return 'Ngoại tuyến';
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m trước`;
}

export function RealtimeClassroomDashboard({
  classroomId,
}: RealtimeClassroomDashboardProps) {
  const [dashboard, setDashboard] = useState<CodePulseRealtimeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStaleConnection, setIsStaleConnection] = useState(false);
  const [lastSuccessTime, setLastSuccessTime] = useState<Date | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [labFilter, setLabFilter] = useState<string>('');

  const isMountedRef = useRef(true);

  const fetchDashboard = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const response = await codePulseApi.getRealtimeDashboard(classroomId, {
          labId: labFilter || undefined,
        });
        if (!isMountedRef.current) return;
        setDashboard(response.data);
        setError(null);
        setIsStaleConnection(false);
        setLastSuccessTime(new Date());
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setIsStaleConnection(true);
        if (!dashboard) {
          setError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu realtime dashboard.');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [classroomId, labFilter, dashboard],
  );

  // Initial load and classroomId change
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    void fetchDashboard(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [classroomId, labFilter, fetchDashboard]);

  // Periodic polling every 6 seconds (AC-198c)
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchDashboard(false);
      }
    }, 6000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchDashboard(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDashboard]);

  // Derived filter lists
  const availableLabs = useMemo(() => {
    if (!dashboard?.students) return [];
    const labsMap = new Map<string, string>();
    for (const s of dashboard.students) {
      if (s.activeProblem?.labId && s.activeProblem?.labTitle) {
        labsMap.set(s.activeProblem.labId, s.activeProblem.labTitle);
      }
    }
    return Array.from(labsMap.entries()).map(([id, title]) => ({ id, title }));
  }, [dashboard]);

  const filteredStudents = useMemo(() => {
    if (!dashboard?.students) return [];
    return dashboard.students.filter((student) => {
      // Search text match
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = student.studentName.toLowerCase().includes(query);
        const matchesEmail = student.studentEmail.toLowerCase().includes(query);
        const matchesId = student.studentId.toLowerCase().includes(query);
        const matchesProblem = student.activeProblem?.title.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesId && !matchesProblem) return false;
      }

      // Status filter
      if (statusFilter === 'HAS_ALERT') {
        return Boolean(student.activeAlert || student.aiStatus === 'ACTIVE_ALERT');
      }
      if (statusFilter === 'STALE_IDLE') {
        return student.isStale;
      }
      if (statusFilter === 'SUBMITTED') {
        return student.milestone === 'SUBMITTED';
      }
      if (statusFilter === 'IN_PROGRESS') {
        return student.milestone !== 'NOT_STARTED' && student.milestone !== 'SUBMITTED';
      }

      return true;
    });
  }, [dashboard, search, statusFilter]);

  // Milestone badge renderer (AC-198a)
  const renderMilestoneBadge = (milestone: CodePulseStudentProgress['milestone']) => {
    switch (milestone) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            <CheckCircleIcon className="size-3.5" />
            Đã nộp bài
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            <ArrowPathIcon className="size-3.5 animate-spin" />
            Đang chạy test
          </span>
        );
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
            <ClockIcon className="size-3.5" />
            Đã chạy test
          </span>
        );
      case 'SAVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
            Đã lưu code
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Chưa bắt đầu
          </span>
        );
    }
  };

  // AI Status Badge renderer (AC-09e / AC-198b)
  const renderAiStatusBadge = (aiStatus: CodePulseStudentProgress['aiStatus']) => {
    switch (aiStatus) {
      case 'NO_ISSUES':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircleIcon className="size-3.5 text-emerald-600" />
            Không có lỗi
          </span>
        );
      case 'ACTIVE_ALERT':
        return (
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            <ExclamationCircleIcon className="size-3.5 text-rose-600" />
            Cảnh báo khó khăn
          </span>
        );
      case 'AI_ERROR':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <ExclamationTriangleIcon className="size-3.5 text-amber-600" />
            AI lỗi / Tạm ngưng
          </span>
        );
      case 'UNEVALUATED':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            <ClockIcon className="size-3.5 text-slate-400" />
            Chưa đánh giá
          </span>
        );
    }
  };

  // Connectivity and stale status renderer (AC-09d / AC-197c)
  const renderConnectionBadge = (student: CodePulseStudentProgress) => {
    if (student.isStale) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            <SignalSlashIcon className="size-3 text-amber-600" />
            Mất kết nối / Idle
          </span>
          <span className="text-[11px] text-slate-400">{formatIdleTime(student.idleMinutes)}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <span className="size-2 animate-ping rounded-full bg-emerald-500" />
          Trực tuyến
        </span>
        <span className="text-[11px] text-slate-400">{formatIdleTime(student.idleMinutes)}</span>
      </div>
    );
  };

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <ArrowPathIcon className="size-8 animate-spin text-teal-600" />
        <p className="mt-3 text-sm font-medium text-slate-600">Đang tải Realtime Classroom Dashboard...</p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="size-6 shrink-0 text-rose-600" />
          <div>
            <h3 className="font-semibold text-rose-900">Không thể tải Dashboard</h3>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchDashboard(true)}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-rose-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const currentClassroom = dashboard?.classroom;
  const summary = dashboard?.summary;

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Top Header & Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              Realtime Classroom Dashboard (UI-04)
            </h2>
            <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
              {currentClassroom?.name || 'Classroom'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Giám sát trực tiếp tiến độ thực hành, mốc nộp bài và cảnh báo khó khăn thời gian thực của sinh viên.
          </p>
        </div>

        {/* Sync Status & Refresh Button */}
        <div className="flex items-center gap-3">
          {isStaleConnection ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              <SignalSlashIcon className="size-4 text-amber-600" />
              <span>Mất kết nối máy chủ · Stale data</span>
              {lastSuccessTime && (
                <span className="text-[11px] font-normal text-amber-700">
                  ({lastSuccessTime.toLocaleTimeString('vi-VN')})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span>Đồng bộ trực tiếp (6s)</span>
              {lastSuccessTime && (
                <span className="text-[11px] font-normal text-slate-400">
                  · {lastSuccessTime.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Làm mới dữ liệu ngay"
          >
            <ArrowPathIcon className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <span className="text-xs font-medium text-slate-500">Tổng sinh viên</span>
            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.totalStudents}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5">
            <span className="text-xs font-medium text-blue-700">Đang thực hành</span>
            <p className="mt-1 text-2xl font-bold text-blue-900">{summary.activeCount}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3.5">
            <span className="text-xs font-medium text-rose-700">Cần hỗ trợ (Alert)</span>
            <p className="mt-1 text-2xl font-bold text-rose-800">{summary.alertCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
            <span className="text-xs font-medium text-amber-700">Mất kết nối / Stale</span>
            <p className="mt-1 text-2xl font-bold text-amber-800">{summary.staleCount}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
            <span className="text-xs font-medium text-emerald-700">Đã hoàn thành</span>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{summary.submittedCount}</p>
          </div>
        </div>
      )}

      {/* Filter Toolbar (AC-09b / AC-197b) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, MSSV, bài tập..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </div>

        {/* Lab filter dropdown if multiple labs available */}
        {availableLabs.length > 0 && (
          <select
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="">Tất cả LAB</option>
            {availableLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.title}
              </option>
            ))}
          </select>
        )}

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'HAS_ALERT', label: 'Cần hỗ trợ (Alert)' },
              { key: 'IN_PROGRESS', label: 'Đang làm' },
              { key: 'SUBMITTED', label: 'Đã nộp bài' },
              { key: 'STALE_IDLE', label: 'Mất kết nối (>10m)' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === item.key
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster & Progress Table (AC-09a / AC-197a / AC-198a / AC-198b) */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[840px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <th className="px-4 py-3">Sinh viên</th>
              <th className="px-4 py-3">Bài đang thực hành</th>
              <th className="px-4 py-3">Tiến độ Test (AC-198a)</th>
              <th className="px-4 py-3">Cột mốc</th>
              <th className="px-4 py-3">Đánh giá AI (AC-09e)</th>
              <th className="px-4 py-3">Trạng thái kết nối (AC-09d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Không tìm thấy sinh viên phù hợp với tiêu chí lọc.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const hasAlert = Boolean(student.activeAlert);

                return (
                  <tr
                    key={student.studentId}
                    className={`transition hover:bg-slate-50/80 ${
                      hasAlert ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Student Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.avatar ? (
                          <img
                            src={student.avatar}
                            alt=""
                            className="size-8 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="size-8 text-slate-400" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">
                            {student.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {student.studentId} · {student.studentEmail}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Alert Banner if student is stuck */}
                      {hasAlert && (
                        <div className="mt-2 rounded border border-rose-200 bg-rose-50 p-2 text-rose-800">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <ExclamationTriangleIcon className="size-4 shrink-0 text-rose-600" />
                              <span className="text-[11px] font-semibold">
                                {student.activeAlert?.ruleType}: {student.activeAlert?.message}
                              </span>
                            </div>
                            <span className="rounded bg-rose-200/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-900">
                              {student.activeAlert?.severity}
                            </span>
                          </div>
                          {student.activeAlert?.consecutiveFailures && (
                            <p className="mt-0.5 text-[10px] text-rose-700">
                              Thất bại liên tiếp: {student.activeAlert.consecutiveFailures} lần
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Active Problem */}
                    <td className="px-4 py-3">
                      {student.activeProblem ? (
                        <div>
                          <div className="font-medium text-slate-800">
                            {student.activeProblem.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {student.activeProblem.labTitle && (
                              <span className="text-[11px] text-slate-500">
                                {student.activeProblem.labTitle}
                              </span>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                student.practiceMode === 'IN_LAB'
                                  ? 'bg-blue-100 text-blue-800'
                                  : student.practiceMode === 'HOMEWORK'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {student.practiceMode === 'IN_LAB'
                                ? 'In-Lab'
                                : student.practiceMode === 'HOMEWORK'
                                  ? 'Homework'
                                  : 'Tự do'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Chưa chọn bài tập</span>
                      )}
                    </td>

                    {/* Test Progress (AC-198a) */}
                    <td className="px-4 py-3">
                      {student.testProgress.totalCount > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-700">
                              {student.testProgress.passedCount}/{student.testProgress.totalCount} Passed
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {Math.round(student.testProgress.passRatio * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full transition-all duration-300 ${
                                student.testProgress.passRatio === 1
                                  ? 'bg-emerald-500'
                                  : student.testProgress.passRatio > 0.5
                                    ? 'bg-teal-500'
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.round(student.testProgress.passRatio * 100)}%` }}
                            />
                          </div>
                          {student.testProgress.lastExecutedAt && (
                            <span className="text-[10px] text-slate-400">
                              Chạy lần cuối: {formatTimestamp(student.testProgress.lastExecutedAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Milestone */}
                    <td className="px-4 py-3">
                      {renderMilestoneBadge(student.milestone)}
                    </td>

                    {/* AI Status (AC-09e) */}
                    <td className="px-4 py-3">
                      {renderAiStatusBadge(student.aiStatus)}
                    </td>

                    {/* Connectivity & Last Activity (AC-09d) */}
                    <td className="px-4 py-3">
                      {renderConnectionBadge(student)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
