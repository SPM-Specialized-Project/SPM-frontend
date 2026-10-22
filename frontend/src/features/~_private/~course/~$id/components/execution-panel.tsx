import { useEffect, useId, useState } from 'react';

import { codePulseApi, type CodePulseExecutionResult } from '@/services/codepulse-api';

type Execution = CodePulseExecutionResult;

export function ExecutionStatus({ execution }: { execution: Execution }) {
  const status = execution.state === 'QUEUED' || execution.state === 'RUNNING' ? execution.state : execution.status;
  const label = status === 'INTERNAL_ERROR' ? 'Internal Error · Lỗi hệ thống'
    : status === 'RUNTIME_ERROR' ? 'Runtime error · Lỗi chương trình' : status;
  const color = status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800'
    : status === 'QUEUED' || status === 'RUNNING' ? 'bg-blue-100 text-blue-800'
      : status === 'INTERNAL_ERROR' ? 'bg-slate-200 text-slate-800' : 'bg-rose-100 text-rose-800';
  return <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

function memoryLabel(kb?: number | null) {
  if (kb == null || !Number.isFinite(kb)) return 'Chưa có số đo';
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB (${kb} KB)` : `${kb} KB`;
}

function OutputStream({ label, value, error = false }: { label: string; value: string; error?: boolean }) {
  // Untrusted program output stays in React text nodes, never HTML or Markdown.
  const truncated = value.length > 32000;
  return (
    <section aria-label={label} className="min-w-0 rounded border border-slate-700 bg-slate-950">
      <h6 className={`border-b border-slate-700 px-3 py-2 font-mono text-xs font-semibold ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{label}</h6>
      <pre className={`max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs ${error ? 'text-rose-200' : 'text-slate-100'}`}>{value.slice(0, 32000) || '(empty)'}</pre>
      {truncated && <p className="px-3 pb-2 text-xs text-amber-300">⚠ Output truncated · Nội dung hiển thị đã bị cắt.</p>}
    </section>
  );
}

export function ExecutionConsole({ execution }: { execution: Execution }) {
  const pending = execution.state === 'QUEUED' || execution.state === 'RUNNING';
  return (
    <section aria-label="Execution console" className="min-w-0 space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ExecutionStatus execution={execution} />
        <time dateTime={execution.executedAt} className="text-xs text-slate-500">{new Date(execution.executedAt).toLocaleString('vi-VN')}</time>
      </div>
      <p className="break-all font-mono text-xs text-slate-500">execution_id: {execution.id}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
        <div><dt className="text-slate-500">Execution time</dt><dd className="mt-1 font-mono">{pending ? 'Đang đo…' : `${execution.runtimeMs} ms`}</dd></div>
        <div><dt className="text-slate-500">Peak memory usage</dt><dd className="mt-1 font-mono">{pending ? 'Đang đo…' : memoryLabel(execution.memoryUsageKb)}</dd></div>
        <div><dt className="text-slate-500">Exit code</dt><dd className="mt-1 font-mono">{execution.exitCode ?? '—'}</dd></div>
        <div><dt className="text-slate-500">Run mode</dt><dd className="mt-1 font-mono">{execution.mode}</dd></div>
      </dl>
      {execution.limits && <p className="text-xs text-slate-500">Giới hạn: {execution.limits.cpuTimeLimitMs} ms CPU · {execution.limits.memoryLimitMb} MB</p>}
      {execution.status === 'INTERNAL_ERROR' && <p role="alert" className="rounded border border-slate-300 bg-slate-100 p-3 text-sm text-slate-800">Hạ tầng thực thi gặp sự cố. Vui lòng thử lại sau; đây là lỗi hệ thống.</p>}
      {execution.outputTruncated && <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">⚠ Output truncated · Output quá lớn đã bị cắt; kết quả hiển thị không đầy đủ.</p>}
      <div className="grid gap-3 xl:grid-cols-2">
        <OutputStream label="stdout" value={execution.stdout} />
        <OutputStream label="stderr" value={execution.stderr} error />
      </div>
      {execution.results && execution.results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">{execution.mode === 'PUBLIC_TESTS' ? `Public tests · ${execution.passedCount}/${execution.totalCount} passed` : 'Custom input · Không chấm điểm'}</p>
          {execution.results.map((result, index) => (
            <details key={result.testCaseId} className="rounded border border-slate-200 p-3">
              <summary className="cursor-pointer text-xs text-slate-700">Test {index + 1} · {result.status} · {result.durationMs ?? '—'} ms · {memoryLabel(result.memoryUsageKb)}</summary>
              <pre className="my-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">Input: {result.input || '(empty)'}{'\n'}Expected: {result.expectedOutput ?? '—'}</pre>
              {result.outputTruncated && <p className="mb-2 text-xs text-amber-800">⚠ Output truncated</p>}
              <div className="grid gap-2 xl:grid-cols-2">
                <OutputStream label={`stdout · Test ${index + 1}`} value={result.actualOutput} />
                <OutputStream label={`stderr · Test ${index + 1}`} value={result.stderr} error />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export function ExecutionSnapshot({ execution }: { execution: Execution }) {
  return (
    <section aria-label="Execution snapshot" className="space-y-3">
      <p className="text-xs text-slate-600">Snapshot chỉ đọc của lần chạy này. Code chưa lưu trong editor được giữ nguyên.</p>
      <label className="block text-xs font-semibold text-slate-700">
        Code snapshot · {execution.runtime}
        <textarea aria-label="Code snapshot" readOnly value={execution.sourceCode} rows={8} spellCheck={false} className="mt-2 block w-full rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs font-normal text-slate-100" />
      </label>
      <ExecutionConsole execution={execution} />
    </section>
  );
}

export function ExecutionPanel({ workspaceId, latest }: { workspaceId: string; latest?: Execution | null }) {
  const [tab, setTab] = useState<'console' | 'history'>('console');
  const [items, setItems] = useState<Execution[]>([]);
  const [selectedRun, setSelectedRun] = useState<Execution>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | null>();
  const [refresh, setRefresh] = useState(0);
  const id = useId();

  useEffect(() => {
    let active = true;
    setLoading(true);
    void codePulseApi.listExecutions(workspaceId).then(({ data }) => {
      if (!active) return;
      setItems(data.items);
      setCursor(data.nextCursor);
      setError('');
    }).catch(() => {
      if (active) setError('Không thể tải execution history. Vui lòng thử lại.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, latest?.id, latest?.state, refresh]);

  const unfinished = items.some((item) => item.state === 'QUEUED' || item.state === 'RUNNING');
  useEffect(() => {
    if (!unfinished) return;
    const timer = window.setInterval(() => setRefresh((value) => value + 1), 2000);
    return () => window.clearInterval(timer);
  }, [unfinished]);

  const loadOlder = async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const { data } = await codePulseApi.listExecutions(workspaceId, cursor);
      setItems((current) => [...current, ...data.items.filter((item) => !current.some((entry) => entry.id === item.id))]);
      setCursor(data.nextCursor);
      setError('');
    } catch { setError('Không thể tải execution history. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  const selected = items.find((item) => item.id === selectedRun?.id) ?? selectedRun;
  const current = latest?.state === 'FINISHED' && (!items[0] || items[0].id === latest.id) ? latest : items[0] ?? latest;
  return (
    <section aria-label="Console and execution history" className="min-w-0">
      <div role="tablist" aria-label="Execution views" className="flex border-b border-slate-200">
        {(['console', 'history'] as const).map((value) => (
          <button key={value} id={`${id}-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`${id}-panel`} tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)} onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 'console' : event.key === 'End' ? 'history' : value === 'console' ? 'history' : 'console';
                setTab(next);
                document.getElementById(`${id}-${next}`)?.focus();
              }
            }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === value ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500'}`}>
            {value === 'console' ? 'Console' : 'Execution History'}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="space-y-3 p-3">
        {tab === 'console' ? current ? <ExecutionConsole execution={current} /> : <p className="p-2 text-sm text-slate-500">Chưa có kết quả chạy cho problem này.</p> : (
          <>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <p>Chọn một lần chạy để xem code snapshot và output.</p>
              <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="shrink-0 rounded border border-slate-300 px-3 py-2 font-semibold text-slate-700 disabled:opacity-50">Làm mới</button>
            </div>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            {loading && <p role="status" className="text-sm text-slate-500">Đang tải history...</p>}
            {!loading && !error && items.length === 0 && <p className="text-sm text-slate-500">Chưa có lần chạy nào.</p>}
            <ol aria-label="Execution history entries" className="max-h-64 space-y-2 overflow-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" aria-pressed={selectedRun?.id === item.id} onClick={() => setSelectedRun(item)} className={`w-full rounded border p-3 text-left ${selectedRun?.id === item.id ? 'border-teal-700 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="flex flex-wrap items-center justify-between gap-2"><ExecutionStatus execution={item} /><time dateTime={item.executedAt} className="text-xs text-slate-600">{new Date(item.executedAt).toLocaleString('vi-VN')}</time></span>
                    <span className="mt-2 block break-all font-mono text-xs text-slate-500">{item.id}</span>
                  </button>
                </li>
              ))}
            </ol>
            {cursor && <button type="button" disabled={loading} onClick={() => void loadOlder()} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Tải lần chạy cũ hơn</button>}
            {selected && <ExecutionSnapshot execution={selected} />}
          </>
        )}
      </div>
    </section>
  );
}
