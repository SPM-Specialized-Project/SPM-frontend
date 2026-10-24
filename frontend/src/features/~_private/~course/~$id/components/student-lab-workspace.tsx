import { useEffect, useMemo, useState } from 'react';

import { ConflictResolutionModal } from './conflict-resolution-modal';
import { usePracticeWindow } from '@/hooks/use-practice-window';
import {
  codePulseApi,
  type CodePulseLab,
  type CodePulseLabAssignment,
  type CodePulseWorkspace,
} from '@/services/codepulse-api';

type StudentLabWorkspaceProps = {
  labs: CodePulseLab[];
};

export function StudentLabWorkspace({ labs }: StudentLabWorkspaceProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [workspace, setWorkspace] = useState<CodePulseWorkspace>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    currentRevision: number;
    serverSourceCode: string;
    serverUpdatedAt?: string;
  } | null>(null);

  const { practiceOpen, practiceStatus, practiceMessage, activityContext } =
    usePracticeWindow(workspace?.id);

  const assignments = useMemo(
    () =>
      labs.flatMap((lab) =>
        lab.assignments.map((assignment) => ({ lab, assignment })),
      ),
    [labs],
  );
  const selected = assignments.find(
    ({ assignment }) => assignment.workspaceId === selectedWorkspaceId,
  );

  useEffect(() => {
    if (
      !assignments.some(
        ({ assignment }) => assignment.workspaceId === selectedWorkspaceId,
      )
    ) {
      setSelectedWorkspaceId(assignments[0]?.assignment.workspaceId ?? '');
    }
  }, [assignments, selectedWorkspaceId]);

  useEffect(() => {
    let active = true;
    const workspaceId = selectedWorkspaceId;
    if (!workspaceId) {
      setWorkspace(undefined);
      return;
    }
    const loadWorkspace = async () => {
      setLoading(true);
      setMessage('');
      setWorkspace(undefined);
      try {
        const result = await codePulseApi.getWorkspace(workspaceId);
        if (!active) return;
        setWorkspace(result.data.item);
        setDrafts((current) => ({
          ...current,
          [workspaceId]: current[workspaceId] ?? result.data.item.sourceCode,
        }));
      } catch (error) {
        if (!active) return;
        setMessage(
          error instanceof Error ? error.message : 'Không thể tải workspace.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  const sourceCode = selectedWorkspaceId
    ? (drafts[selectedWorkspaceId] ?? workspace?.sourceCode ?? '')
    : '';

  const replaceWorkspace = (item: CodePulseWorkspace) => {
    setWorkspace(item);
    setDrafts((current) => ({ ...current, [item.id]: item.sourceCode }));
  };

  const save = async (forcedRevision?: number) => {
    if (!workspace) return;
    setLoading(true);
    try {
      const baseRev = forcedRevision !== undefined ? forcedRevision : (workspace.revision ?? 1);
      const result = await codePulseApi.updateWorkspace(
        workspace.id,
        sourceCode,
        baseRev,
      );
      replaceWorkspace(result.data.item);
      setMessage('Đã lưu mã nguồn thành công.');
      setConflictModal(null);
    } catch (error: any) {
      const errorDetails = error?.details ?? error?.response?.data?.details;
      const status = error?.status ?? error?.response?.status;
      if (status === 409 && errorDetails?.conflict) {
        setConflictModal({
          isOpen: true,
          currentRevision: errorDetails.currentRevision,
          serverSourceCode: errorDetails.serverSourceCode,
          serverUpdatedAt: errorDetails.serverUpdatedAt,
        });
        setMessage('⚠️ Phát hiện xung đột phiên bản! Vui lòng chọn cách giải quyết trong hộp thoại.');
      } else {
        setMessage(
          error instanceof Error ? error.message : 'Không thể lưu workspace.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeepServer = () => {
    if (!conflictModal || !workspace) return;
    setDrafts((current) => ({
      ...current,
      [workspace.id]: conflictModal.serverSourceCode,
    }));
    setWorkspace((current) =>
      current
        ? {
            ...current,
            sourceCode: conflictModal.serverSourceCode,
            revision: conflictModal.currentRevision,
          }
        : undefined,
    );
    setConflictModal(null);
    setMessage('Đã đồng bộ mã nguồn theo phiên bản trên máy chủ.');
  };

  const handleOverwrite = () => {
    if (!conflictModal) return;
    void save(conflictModal.currentRevision);
  };

  const execute = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const result = await codePulseApi.executeWorkspace(
        workspace.id,
        sourceCode,
      );
      replaceWorkspace(result.data.item);
      setMessage('Đã lưu execution result riêng cho problem này.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể chạy source code.',
      );
    } finally {
      setLoading(false);
    }
  };

  const revealHint = async (hintId: string) => {
    if (!workspace) return;
    setLoading(true);
    try {
      const result = await codePulseApi.revealWorkspaceHint(
        workspace.id,
        hintId,
      );
      replaceWorkspace(result.data.item);
      setMessage('Hint đã được mở riêng cho problem này.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể mở hint.');
    } finally {
      setLoading(false);
    }
  };

  if (assignments.length === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
      <header className="border-b border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Student practice
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-bold text-gray-900">
            Chọn problem để tiếp tục luyện tập
          </h4>
          {selected && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                practiceOpen
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activityContext &&
                `${activityContext === 'OUTSIDE_LAB' ? 'Outside-Lab' : 'In-Lab'} · `}
              {practiceStatus}
            </span>
          )}
        </div>
      </header>

      <div className="grid min-h-[520px] lg:grid-cols-[280px_1fr]">
        <nav
          aria-label="LAB problems"
          className="border-b border-gray-200 bg-slate-50 p-3 lg:border-b-0 lg:border-r"
        >
          {labs.map((lab) => (
            <div key={lab.id} className="mb-4 last:mb-0">
              <p className="mb-2 px-2 text-xs font-bold uppercase text-gray-500">
                {lab.name}
              </p>
              <div className="space-y-1">
                {lab.assignments.map((assignment) => (
                  <ProblemButton
                    key={assignment.id}
                    assignment={assignment}
                    selected={assignment.workspaceId === selectedWorkspaceId}
                    onSelect={() =>
                      setSelectedWorkspaceId(assignment.workspaceId ?? '')
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-5">
          {message && (
            <p
              role="status"
              className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900"
            >
              {message}
            </p>
          )}
          {loading && !workspace ? (
            <p className="text-sm text-gray-500">Đang tải workspace...</p>
          ) : workspace?.problem && selected ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h5 className="text-xl font-bold text-gray-900">
                    {workspace.problem.title}
                  </h5>
                  <p className="mt-1 text-sm text-gray-600">
                    {workspace.problem.description}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  v{workspace.problem.version} · {workspace.problem.language}
                </span>
              </div>

              {!practiceOpen && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {practiceMessage} Workspace hiện ở chế độ chỉ đọc.
                </p>
              )}

              <label className="mt-5 block text-sm font-semibold text-gray-800">
                Source code
                <textarea
                  aria-label="Source code"
                  value={sourceCode}
                  readOnly={!practiceOpen}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [workspace.id]: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-64 w-full rounded-lg border border-slate-300 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none focus:border-blue-500"
                  spellCheck={false}
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading || !practiceOpen}
                    onClick={() => void save()}
                    className="rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40 shadow-sm"
                  >
                    Lưu code
                  </button>
                  <button
                    type="button"
                    disabled={loading || !practiceOpen}
                    onClick={() => void execute()}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-300 shadow-sm"
                  >
                    Run
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm ${
                      !isOnline
                        ? 'border border-rose-300 bg-rose-50 text-rose-800'
                        : isReconnecting
                        ? 'border border-amber-300 bg-amber-50 text-amber-800 animate-pulse'
                        : 'border border-emerald-300 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        !isOnline
                          ? 'bg-rose-500'
                          : isReconnecting
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    {!isOnline
                      ? '○ Offline (Đang đệm vào bộ nhớ)'
                      : isReconnecting
                      ? '◌ Đang kết nối lại...'
                      : `● Trực tuyến • Bản lưu #${workspace?.revision ?? 1}`}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <section>
                  <h6 className="font-semibold text-gray-900">
                    Execution result
                  </h6>
                  {workspace.executionResult ? (
                    <div className="mt-2 rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-100">
                      <div className="mb-2 flex justify-between text-slate-400">
                        <span>{workspace.executionResult.status}</span>
                        <span>
                          {workspace.executionResult.runtimeMs} ms · exit{' '}
                          {workspace.executionResult.exitCode}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap text-emerald-300">
                        {workspace.executionResult.stdout ||
                          workspace.executionResult.stderr}
                      </pre>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Chưa có kết quả chạy cho problem này.
                    </p>
                  )}
                </section>

                <section>
                  <h6 className="font-semibold text-gray-900">Hints</h6>
                  <div className="mt-2 space-y-2">
                    {workspace.problem.hints.map((hint) => (
                      <div
                        key={hint.id}
                        className="rounded-lg border border-gray-200 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-800">
                            {hint.title}
                          </span>
                          {!hint.revealed && (
                            <button
                              type="button"
                              disabled={loading || !practiceOpen}
                              onClick={() => void revealHint(hint.id)}
                              className="text-xs font-semibold text-blue-700 disabled:text-gray-400"
                            >
                              Mở hint
                            </button>
                          )}
                        </div>
                        {hint.revealed && (
                          <p className="mt-2 text-gray-600">{hint.content}</p>
                        )}
                      </div>
                    ))}
                    {workspace.problem.hints.length === 0 && (
                      <p className="text-sm text-gray-500">
                        Problem này không có hint.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {conflictModal && (
        <ConflictResolutionModal
          isOpen={conflictModal.isOpen}
          onClose={() => setConflictModal(null)}
          localDraft={sourceCode}
          serverSourceCode={conflictModal.serverSourceCode}
          serverRevision={conflictModal.currentRevision}
          serverUpdatedAt={conflictModal.serverUpdatedAt}
          onKeepServer={handleKeepServer}
          onOverwriteLocal={handleOverwrite}
        />
      )}
    </section>
  );
}

function ProblemButton({
  assignment,
  selected,
  onSelect,
}: {
  assignment: CodePulseLabAssignment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        selected
          ? 'bg-blue-700 text-white'
          : 'bg-white text-gray-700 hover:bg-blue-50'
      }`}
    >
      <span className="block font-semibold">
        {assignment.order}. {assignment.title}
      </span>
      <span
        className={`mt-1 block text-xs ${selected ? 'text-blue-100' : 'text-gray-500'}`}
      >
        v{assignment.version}
        {assignment.mandatory ? ' · Bắt buộc' : ''} ·{' '}
        {assignment.hintCount ?? 0} hints
      </span>
    </button>
  );
}
