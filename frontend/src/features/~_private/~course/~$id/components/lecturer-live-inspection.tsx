import { useEffect, useRef, useState } from 'react';

import {
  codePulseApi,
  type CodePulseLiveDraftEvent,
  type CodePulseLiveWorkspace,
} from '@/services/codepulse-api';

export function LecturerLiveInspection({ classroomId, labId, live }: {
  classroomId: string;
  labId: string;
  live: boolean;
}) {
  const [items, setItems] = useState<CodePulseLiveWorkspace[]>([]);
  const [serverLive, setServerLive] = useState<boolean>();
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<{ sourceCode: string; revision: number; updatedAt: string }>();
  const [snapshot, setSnapshot] = useState<{ sourceCode: string; revision: number; createdAt: string }>();
  const [status, setStatus] = useState<'connecting' | 'live' | 'stale' | 'ended' | 'forbidden'>('connecting');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [retryNeeded, setRetryNeeded] = useState(false);
  const previousSelection = useRef('');
  const selected = items.find((item) => item.workspaceId === selectedId);
  const activeLive = serverLive ?? live;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await codePulseApi.listLiveWorkspaces(classroomId, labId);
        if (!active) return;
        setItems(result.data.items);
        setServerLive(result.data.live);
        setSelectedId((current) => result.data.items.some((item) => item.workspaceId === current)
          ? current : result.data.items[0]?.workspaceId ?? '');
        setError('');
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách workspace.');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [classroomId, labId]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const changedSelection = previousSelection.current !== selectedId;
    previousSelection.current = selectedId;
    if (changedSelection) {
      setDraft(undefined);
      setSnapshot(undefined);
    }
    setStatus(activeLive ? changedSelection ? 'connecting' : 'stale' : 'ended');
    const loadSnapshot = async () => {
      try {
        const result = await codePulseApi.getWorkspaceSnapshots(selectedId);
        if (!active) return;
        const latest = result.data.items.at(-1);
        setSnapshot(latest ? {
          sourceCode: latest.sourceCode,
          revision: latest.revision,
          createdAt: latest.createdAt,
        } : undefined);
      } catch {
        if (active) setSnapshot(undefined);
      }
    };
    if (!activeLive) {
      void loadSnapshot();
      return () => { active = false; };
    }
    const controller = new AbortController();
    const onEvent = (event: CodePulseLiveDraftEvent) => {
      if (!active) return;
      if (event.type === 'draft' && event.draft) {
        setDraft((current) => !current || event.draft!.revision > current.revision ? event.draft : current);
        setStatus('live');
        setRetryNeeded(false);
      } else if (event.type === 'ended') {
        setDraft(undefined);
        setStatus(event.reason === 'forbidden' ? 'forbidden' : 'ended');
        setRetryNeeded(false);
        if (event.reason !== 'forbidden') void loadSnapshot();
      } else if (event.type === 'disconnected') {
        setStatus('stale');
        setRetryNeeded(false);
      } else if (event.type === 'transport-error') {
        setStatus('stale');
        setRetryNeeded(true);
      }
    };
    codePulseApi.subscribeLiveDraft(selectedId, onEvent, controller.signal);
    return () => { active = false; controller.abort(); };
  }, [selectedId, activeLive, retry]);

  useEffect(() => {
    if (!activeLive || !retryNeeded) return;
    const timer = window.setTimeout(() => setRetry((value) => value + 1), 3_000);
    return () => window.clearTimeout(timer);
  }, [activeLive, retryNeeded, retry]);

  const displayed = status === 'ended' ? snapshot : status === 'forbidden' ? undefined : draft;
  return (
    <section className="mt-5 border-t border-gray-200 pt-4" aria-label="Xem mã trực tiếp">
      <h5 className="font-semibold text-gray-900">Xem mã trực tiếp</h5>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      {items.length === 0 && !error && <p className="mt-2 text-sm text-slate-500">Chưa có workspace trong LAB.</p>}
      {items.length > 0 && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="space-y-1" aria-label="Sinh viên và bài tập">
            {items.map((item) => (
              <button key={item.workspaceId} type="button" onClick={() => setSelectedId(item.workspaceId)}
                className={`w-full rounded border p-2 text-left text-sm ${selectedId === item.workspaceId ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <span className="block font-medium">{item.studentName}</span>
                <span className="block text-xs text-slate-600">{item.problemTitle}</span>
              </button>
            ))}
          </div>
          <div className="min-w-0 rounded border border-slate-200 p-3">
            <p className="font-semibold">{selected?.studentName} · {selected?.problemTitle}</p>
            <p className="mt-1 text-xs text-slate-600" role="status">
              {status === 'live' ? 'Đang chia sẻ trực tiếp' : status === 'connecting' ? 'Đang kết nối...' : status === 'stale' ? 'Mất kết nối / dữ liệu cũ' : status === 'forbidden' ? 'Quyền xem đã bị thu hồi' : 'LAB đã dừng · bản lưu gần nhất'}
              {displayed && ` · Bản #${displayed.revision} · ${new Date(status === 'ended' ? snapshot!.createdAt : draft!.updatedAt).toLocaleString('vi-VN')}`}
            </p>
            <pre className="mt-3 max-h-[32rem] min-h-40 overflow-auto rounded bg-slate-950 p-3 font-mono text-xs text-slate-100" aria-label="Mã chỉ đọc">
              {displayed?.sourceCode ?? (status === 'forbidden' ? 'Không thể xem mã của sinh viên.' : status === 'ended' ? 'Chưa có snapshot đã lưu.' : 'Chưa nhận được mã từ sinh viên.')}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
