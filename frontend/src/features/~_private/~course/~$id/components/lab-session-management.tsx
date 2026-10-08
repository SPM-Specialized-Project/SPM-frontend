import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import {
  codePulseApi,
  type CodePulseAssignmentVersion,
  type CodePulseClassroom,
  type CodePulseLab,
  type CodePulseLabStatus,
  type CodePulseLabAssignment,
  type CodePulsePracticeWindowAudit,
} from '@/services/codepulse-api';

import { StudentLabWorkspace } from './student-lab-workspace';

type LabSessionManagementProps = {
  classrooms: CodePulseClassroom[];
  role?: string;
};

type SelectedProblem = {
  assignmentVersionId: string;
  mandatory: boolean;
  openAt: string;
  closeAt: string;
};

const fieldClassName =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

function toLocalDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function nextStatuses(status: CodePulseLabStatus): CodePulseLabStatus[] {
  if (status === 'SCHEDULED') return ['LIVE', 'CANCELLED'];
  if (status === 'LIVE') return ['PAUSED', 'ENDED', 'CANCELLED'];
  if (status === 'PAUSED') return ['LIVE', 'ENDED'];
  return [];
}

function labStatusLabel(status: CodePulseLabStatus) {
  const labels: Record<CodePulseLabStatus, string> = {
    SCHEDULED: 'Đã lên lịch',
    LIVE: 'Đang diễn ra',
    PAUSED: 'Đang tạm dừng',
    ENDED: 'Đã kết thúc',
    CANCELLED: 'Đã hủy',
  };
  return labels[status];
}

function labStatusClassName(status: CodePulseLabStatus) {
  const classes: Record<CodePulseLabStatus, string> = {
    SCHEDULED: 'bg-slate-100 text-slate-700',
    LIVE: 'bg-emerald-100 text-emerald-800',
    PAUSED: 'bg-amber-100 text-amber-800',
    ENDED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-rose-100 text-rose-800',
  };
  return classes[status];
}

function transitionLabel(status: CodePulseLabStatus) {
  const labels: Record<CodePulseLabStatus, string> = {
    SCHEDULED: 'Lên lịch',
    LIVE: 'Bắt đầu / tiếp tục',
    PAUSED: 'Tạm dừng',
    ENDED: 'Kết thúc LAB',
    CANCELLED: 'Hủy LAB',
  };
  return labels[status];
}

function practiceStatusLabel(assignment: CodePulseLabAssignment) {
  if (assignment.practiceWindowStatus === 'CLOSED') return 'Đã đóng thủ công';
  if (assignment.practiceAccess === 'OPEN') {
    return assignment.activityContext === 'OUTSIDE_LAB' ? 'Đang mở · Outside-Lab' : 'Đang mở · In-Lab';
  }
  if (new Date(assignment.openAt).getTime() > Date.now()) return 'Chưa mở';
  return 'Đã hết hạn';
}

function PracticeWindowControls({
  classroomId,
  labId,
  assignment,
  disabled,
  onUpdated,
}: {
  classroomId: string;
  labId: string;
  assignment: CodePulseLabAssignment;
  disabled: boolean;
  onUpdated: () => void;
}) {
  const [openAt, setOpenAt] = useState(() => toLocalDateTime(new Date(assignment.openAt)));
  const [closeAt, setCloseAt] = useState(() => toLocalDateTime(new Date(assignment.closeAt)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOpenAt(toLocalDateTime(new Date(assignment.openAt)));
    setCloseAt(toLocalDateTime(new Date(assignment.closeAt)));
  }, [assignment.closeAt, assignment.id, assignment.openAt, assignment.practiceWindowVersion]);

  const update = async (status?: 'OPEN' | 'CLOSED') => {
    setSaving(true);
    try {
      await codePulseApi.updatePracticeWindow(classroomId, labId, assignment.id, {
        status,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
        expectedVersion: assignment.practiceWindowVersion,
      });
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật practice window.');
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded border border-blue-100 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-600">
          Mở practice
          <input
            type="datetime-local"
            value={openAt}
            onChange={(event) => setOpenAt(event.target.value)}
            className={fieldClassName}
            disabled={disabled || saving}
          />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Đóng practice
          <input
            type="datetime-local"
            min={openAt}
            value={closeAt}
            onChange={(event) => setCloseAt(event.target.value)}
            className={fieldClassName}
            disabled={disabled || saving}
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => void update()}
          className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 disabled:opacity-50"
        >
          Lưu thời gian
        </button>
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => void update(assignment.practiceWindowStatus === 'CLOSED' ? 'OPEN' : 'CLOSED')}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          {assignment.practiceWindowStatus === 'CLOSED' ? 'Mở lại practice' : 'Đóng practice'}
        </button>
      </div>
    </div>
  );
}

export function LabSessionManagement({
  classrooms,
  role,
}: LabSessionManagementProps) {
  const [classroomId, setClassroomId] = useState('');
  const [versions, setVersions] = useState<CodePulseAssignmentVersion[]>([]);
  const [labs, setLabs] = useState<CodePulseLab[]>([]);
  const [audits, setAudits] = useState<CodePulsePracticeWindowAudit[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(() =>
    toLocalDateTime(new Date(Date.now() + 60 * 60_000)),
  );
  const [endAt, setEndAt] = useState(() =>
    toLocalDateTime(new Date(Date.now() + 6 * 60 * 60_000)),
  );
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>(
    [],
  );
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const isLecturer = role === 'lecturer';

  useEffect(() => {
    if (!classrooms.some((item) => item.id === classroomId)) {
      setClassroomId(classrooms[0]?.id ?? '');
    }
  }, [classroomId, classrooms]);

  const load = useCallback(async () => {
    if (!classroomId) {
      setLabs([]);
      setVersions([]);
      return;
    }
    setLoading(true);
    try {
      const [labResult, versionResult] = await Promise.all([
        codePulseApi.listLabs(classroomId),
        codePulseApi.listPublishedAssignmentVersions(classroomId),
      ]);
      setLabs(labResult.data.items);
      setVersions(versionResult.data.items);
      if (role === 'admin') {
        const auditResult = await codePulseApi.listPracticeWindowAudit(classroomId);
        setAudits(auditResult.data.items);
      } else {
        setAudits([]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu LAB.',
      );
    } finally {
      setLoading(false);
    }
  }, [classroomId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIds = useMemo(
    () => new Set(selectedProblems.map((item) => item.assignmentVersionId)),
    [selectedProblems],
  );
  const versionsByProblem = useMemo(() => {
    const grouped = new Map<string, CodePulseAssignmentVersion[]>();
    for (const version of versions) {
      const problemVersions = grouped.get(version.assignmentId) ?? [];
      problemVersions.push(version);
      grouped.set(version.assignmentId, problemVersions);
    }
    return [...grouped.values()].map((problemVersions) =>
      problemVersions.sort((left, right) => right.version - left.version));
  }, [versions]);

  const addProblem = (version: CodePulseAssignmentVersion) => {
    setSelectedProblems((items) => [
      ...items,
      {
        assignmentVersionId: version.id,
        mandatory: true,
        openAt: startAt,
        closeAt: endAt,
      },
    ]);
  };

  const updateProblem = (index: number, patch: Partial<SelectedProblem>) => {
    setSelectedProblems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const moveProblem = (index: number, offset: number) => {
    setSelectedProblems((items) => {
      const destination = index + offset;
      if (destination < 0 || destination >= items.length) return items;
      const next = [...items];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const createLab = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedProblems.length === 0) {
      setMessage('Hãy chọn ít nhất một bài đã publish.');
      return;
    }
    setLoading(true);
    try {
      await codePulseApi.createLab(classroomId, {
        name,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        assignments: selectedProblems.map((item) => ({
          ...item,
          openAt: new Date(item.openAt).toISOString(),
          closeAt: new Date(item.closeAt).toISOString(),
        })),
      });
      setName('');
      setDescription('');
      setSelectedProblems([]);
      setMessage('Đã tạo LAB và pin chính xác các phiên bản bài tập đã chọn.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo LAB.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    lab: CodePulseLab,
    status: CodePulseLabStatus,
  ) => {
    setLoading(true);
    try {
      await codePulseApi.updateLabStatus(classroomId, lab.id, status, lab.stateVersion);
      setMessage(`Đã chuyển ${lab.name} sang trạng thái ${labStatusLabel(status)}.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái LAB.',
      );
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            US-004.1
          </p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">
            Multiple-problem LAB sessions
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Mỗi bài giữ nguyên phiên bản, thứ tự và khung giờ luyện tập riêng.
          </p>
        </div>
        <label className="min-w-64 text-sm font-medium text-gray-700">
          Classroom
          <select
            value={classroomId}
            onChange={(event) => setClassroomId(event.target.value)}
            className={fieldClassName}
          >
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          {message}
        </p>
      )}

      <div
        className={`grid gap-6 ${isLecturer ? 'xl:grid-cols-[1fr_1.25fr]' : ''}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">LAB sessions</h4>
            {loading && (
              <span className="text-xs text-gray-500">Đang tải...</span>
            )}
          </div>
          {labs.map((lab) => (
            <article
              key={lab.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h5 className="font-semibold text-gray-900">{lab.name}</h5>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateTime(lab.startAt)} – {formatDateTime(lab.endAt)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${labStatusClassName(lab.status)}`}>
                  {labStatusLabel(lab.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Trạng thái buổi LAB không tự đóng practice window của từng bài.
              </p>
              {lab.description && (
                <p className="mt-3 text-sm text-gray-600">{lab.description}</p>
              )}
              <ol className="mt-4 space-y-2">
                {lab.assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="rounded-lg border border-gray-100 bg-slate-50 p-3 text-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-gray-900">
                        {assignment.order}. {assignment.title}
                      </span>
                      <span className="whitespace-nowrap text-xs text-blue-700">
                        v{assignment.version}
                        {assignment.mandatory ? ' · Bắt buộc' : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Practice: {formatDateTime(assignment.openAt)} –{' '}
                      {formatDateTime(assignment.closeAt)}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${assignment.practiceAccess === 'OPEN' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {practiceStatusLabel(assignment)}
                    </p>
                    {assignment.workspaceId && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Workspace độc lập đã sẵn sàng
                      </p>
                    )}
                    {isLecturer && (
                      <PracticeWindowControls
                        classroomId={classroomId}
                        labId={lab.id}
                        assignment={assignment}
                        disabled={loading}
                        onUpdated={() => void load()}
                      />
                    )}
                  </li>
                ))}
              </ol>
              {isLecturer && nextStatuses(lab.status).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2" aria-label="Điều khiển trạng thái LAB">
                  {nextStatuses(lab.status).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={loading}
                      onClick={() => void updateStatus(lab, status)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${status === 'ENDED' || status === 'CANCELLED' ? 'border-rose-200 text-rose-700 hover:border-rose-500' : status === 'PAUSED' ? 'border-amber-200 text-amber-800 hover:border-amber-500' : 'border-blue-200 text-blue-700 hover:border-blue-500'}`}
                    >
                      {transitionLabel(status)}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
          {!loading && labs.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              {role === 'student'
                ? 'Chưa có LAB đang diễn ra.'
                : 'Chưa có LAB nào trong classroom này.'}
            </p>
          )}
          {role === 'admin' && audits.length > 0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                Audit practice window ({audits.length})
              </summary>
              <ol className="mt-3 space-y-2 text-xs text-amber-900">
                {audits.map((audit) => (
                  <li key={audit.id} className="rounded border border-amber-200 bg-white p-2">
                    <span className="font-bold">{audit.action}</span> · {audit.actorEmail} ·{' '}
                    {formatDateTime(audit.occurredAt)}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>

        {isLecturer && (
          <form
            onSubmit={createLab}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h4 className="text-lg font-semibold text-gray-900">Tạo LAB mới</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Tên LAB
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={fieldClassName}
                  placeholder="LAB 01 · Linked structures"
                />
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Mô tả
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClassName} min-h-20`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Bắt đầu
                <input
                  required
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  className={fieldClassName}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Kết thúc
                <input
                  required
                  type="datetime-local"
                  value={endAt}
                  min={startAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  className={fieldClassName}
                />
              </label>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-gray-900">Bài đã publish</h5>
                <span className="text-xs text-gray-500">
                  {selectedProblems.length} đã chọn
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {versionsByProblem.map((problemVersions) => {
                  const latest = problemVersions[0];
                  return (
                    <section key={latest.assignmentId} className="w-full border-t border-gray-200 py-3 first:border-0">
                      <h6 className="mb-2 text-sm font-semibold text-gray-800">{latest.title}</h6>
                      <div className="flex flex-wrap gap-2">
                        {problemVersions.map((version) => {
                          const alreadyAdded = selectedIds.has(version.id);
                          return (
                            <button
                              key={version.id}
                              type="button"
                              onClick={() => addProblem(version)}
                              disabled={alreadyAdded}
                              className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500"
                              title={`Published ${formatDateTime(version.publishedAt)}`}
                            >
                              {alreadyAdded ? 'Added' : 'Add'} · v{version.version}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                {versions.length === 0 && (
                  <p className="text-sm text-amber-700">
                    Classroom chưa có bài đã publish.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {selectedProblems.map((selection, index) => {
                const version = versions.find(
                  (item) => item.id === selection.assignmentVersionId,
                );
                return (
                  <div
                    key={selection.assignmentVersionId}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">
                        {index + 1}. {version?.title}{' '}
                        <span className="text-xs text-blue-700">
                          v{version?.version}
                        </span>
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Đưa bài lên"
                          onClick={() => moveProblem(index, -1)}
                          disabled={index === 0}
                          className="rounded border px-2 py-1 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Đưa bài xuống"
                          onClick={() => moveProblem(index, 1)}
                          disabled={index === selectedProblems.length - 1}
                          className="rounded border px-2 py-1 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProblems((items) =>
                              items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selection.mandatory}
                        onChange={(event) =>
                          updateProblem(index, {
                            mandatory: event.target.checked,
                          })
                        }
                      />{' '}
                      Bắt buộc
                    </label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-gray-600">
                        Practice mở lúc
                        <input
                          required
                          type="datetime-local"
                          value={selection.openAt}
                          onChange={(event) =>
                            updateProblem(index, {
                              openAt: event.target.value,
                            })
                          }
                          className={fieldClassName}
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600">
                        Practice đóng lúc
                        <input
                          required
                          type="datetime-local"
                          min={selection.openAt || startAt}
                          value={selection.closeAt}
                          onChange={(event) =>
                            updateProblem(index, {
                              closeAt: event.target.value,
                            })
                          }
                          className={fieldClassName}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading || selectedProblems.length === 0}
              className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Tạo LAB với {selectedProblems.length} bài
            </button>
          </form>
        )}
      </div>
      {role === 'student' && <StudentLabWorkspace labs={labs} />}
    </div>
  );
}
