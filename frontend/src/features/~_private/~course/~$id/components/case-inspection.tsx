import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';

import {
  codePulseApi,
  type CodePulseInspection,
  type InspectionTest,
} from '@/services/codepulse-api';

export type InspectionTarget = { kind: 'case' | 'workspace'; id: string };

const formatTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('vi-VN') : 'Unavailable';

function CodePane({ title, code }: { title: string; code: CodePulseInspection['currentCode'] }) {
  return (
    <section aria-label={title} className="min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {code && <p className="mt-1 text-xs text-slate-600">
          {code.revision != null ? `Revision ${code.revision} · ` : ''}
          Version {code.assignmentVersionId ?? 'Unavailable'} · {formatTime(code.createdAt)}
        </p>}
      </div>
      {code ? (
        <pre tabIndex={0} aria-label={`${title} source`} className="max-h-72 overflow-auto bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          <code>{code.sourceCode || '(empty file)'}</code>
        </pre>
      ) : <p className="p-4 text-sm text-slate-600">Code is unavailable.</p>}
    </section>
  );
}

function TestResults({ title, tests }: { title: string; tests: InspectionTest[] }) {
  if (!tests.length) return null;
  return (
    <section>
      <h4 className="font-medium">{title}</h4>
      <ul className="mt-2 space-y-2">
        {tests.map((item, index) => (
          <li key={`${item.testCaseId}-${index}`} className="rounded border border-slate-200 px-3 py-2 text-sm">
            <span className="font-mono">{item.testCaseId}</span> · {item.status}
            {item.trace && <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs">{item.trace}</pre>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaseInspection({
  target, close, refreshCases,
}: {
  target: InspectionTarget;
  close: () => void;
  refreshCases: () => Promise<void>;
}) {
  const [data, setData] = useState<CodePulseInspection>();
  const [eventId, setEventId] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [reason, setReason] = useState('');
  const [dismissing, setDismissing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = target.kind === 'case'
          ? await codePulseApi.getIssueCase(target.id, eventId)
          : await codePulseApi.getStudentTimeline(target.id, eventId);
        if (!disposed) {
          setData(response.data.item);
          setError(undefined);
        }
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : 'Could not load the inspection.');
      } finally {
        inFlight = false;
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [target.id, target.kind, eventId, refresh]);

  const issue = data?.issue;
  const event = data?.selectedEvent;
  const eventLoading = eventId !== undefined && event?.id !== eventId;
  const status = issue?.status;
  async function dismiss() {
    if (!issue || !reason.trim()) return;
    setSaving(true);
    setActionError(undefined);
    try {
      await codePulseApi.updateIssueCase(issue.id, 'DISMISSED', reason.trim());
      setDismissing(false);
      setRefresh((count) => count + 1);
      await refreshCases();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not dismiss this case.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/65" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-3 sm:p-8">
        <DialogPanel className="mx-auto max-w-6xl rounded-xl border border-slate-300 bg-slate-50 shadow-xl">
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-t-xl border-b border-slate-300 bg-white px-5 py-4">
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                {target.kind === 'case' ? 'Case detail' : 'Student timeline'}
              </DialogTitle>
              {data && <p className="mt-1 text-sm text-slate-700">
                {data.studentEmail} · {data.problem.title ?? data.problem.id ?? 'Unknown problem'}
                {data.problem.version != null ? ` · Version ${data.problem.version}` : ''}
                {data.problem.versionId ? ` · ${data.problem.versionId}` : ''}
              </p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRefresh((count) => count + 1)} className="rounded border border-slate-300 px-3 py-2 text-sm">Refresh</button>
              <button type="button" onClick={close} className="rounded bg-slate-800 px-3 py-2 text-sm text-white">Close inspection</button>
            </div>
          </header>

          <div className="space-y-5 p-5">
            {error && <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            {!data && !error && <p role="status">Loading inspection…</p>}
            {data && <>
              {issue && <section className="rounded-lg border-l-4 border-amber-500 bg-white p-4">
                <h3 className="font-semibold">{issue.problemType.name} · {status}</h3>
                <p className="mt-1 text-xs text-slate-600">Opened {formatTime(issue.createdAt)}</p>
                {status === 'ACTIVE' && !dismissing &&
                  <button type="button" onClick={() => setDismissing(true)} className="mt-3 rounded border border-slate-300 px-3 py-2 text-sm">Dismiss case</button>}
                {dismissing && status === 'ACTIVE' && (
                  <form onSubmit={(event) => { event.preventDefault(); void dismiss(); }} className="mt-4 space-y-2">
                    <label className="block text-sm font-medium" htmlFor="case-dismissal-reason">Dismissal reason</label>
                    <textarea id="case-dismissal-reason" value={reason} onChange={(event) => setReason(event.target.value)}
                      maxLength={1000} required rows={3} className="block w-full rounded border border-slate-300 p-2 text-sm" />
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving || !reason.trim()} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">Confirm dismissal</button>
                      <button type="button" disabled={saving} onClick={() => setDismissing(false)} className="rounded px-3 py-2 text-sm">Cancel</button>
                    </div>
                    {actionError && <p role="alert" className="text-sm text-rose-800">{actionError}</p>}
                  </form>
                )}
              </section>}

              <div className={issue ? 'grid gap-4 lg:grid-cols-2' : ''}>
                {issue && <CodePane title="Alert snapshot" code={data.alertSnapshot} />}
                <CodePane title="Current saved code" code={data.currentCode} />
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)]">
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold">Student timeline</h3>
                  {!data.timeline.length && <p className="mt-2 text-sm text-slate-600">No recorded activity.</p>}
                  <ol className="mt-2 max-h-[32rem] space-y-1 overflow-y-auto">
                    {data.timeline.map((item) => (
                      <li key={item.id}>
                        <button type="button" aria-pressed={(eventId ?? event?.id) === item.id} onClick={() => setEventId(item.id)}
                          className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 aria-pressed:bg-amber-50 aria-pressed:text-amber-950">
                          <span className="block font-medium">{item.kind === 'SNAPSHOT' ? 'Snapshot' : item.kind === 'RUN' ? 'Run' : 'Submit'}</span>
                          <span className="block text-xs text-slate-600">{formatTime(item.createdAt)}{item.status ? ` · ${item.status}` : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4" aria-label="Event details">
                  <h3 className="font-semibold">Event details</h3>
                  {eventLoading ? <p role="status" className="text-sm">Loading selected event…</p> : event ? <>
                    <p className="break-all text-xs text-slate-600">
                      {event.executionId && <>Run {event.executionId}<br /></>}
                      {event.submissionId && <>Submission {event.submissionId} · {event.submissionVerdict}<br /></>}
                      {event.snapshot && <>Snapshot {event.snapshot.id}</>}
                    </p>
                    {event.snapshot && event.snapshot.id !== data.alertSnapshot?.id && <CodePane title="Selected snapshot" code={event.snapshot} />}
                    {event.eventCode && <CodePane title={event.submissionId ? 'Submitted code' : 'Recorded run code'} code={event.eventCode} />}
                    {event.compilerTrace && <section>
                      <h4 className="text-sm font-medium">Compiler and runner trace</h4>
                      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-100">{event.compilerTrace}</pre>
                    </section>}
                    <TestResults title="Run tests" tests={event.runTests} />
                    <TestResults title="Submission tests" tests={event.submissionTests} />
                  </> : <p className="text-sm text-slate-600">Select an event to inspect its evidence.</p>}
                </section>
              </div>

              {issue && <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">AI diagnosis</h3>
                {issue.evidence.length ? <ul className="mt-2 space-y-3">
                  {issue.evidence.map((evidence) => <li key={evidence.id} className="border-l-2 border-slate-300 pl-3 text-sm">
                    <p>{evidence.rationale}</p>
                    {data.timeline.some((item) => item.id === evidence.snapshotId) &&
                      <button type="button" onClick={() => setEventId(evidence.snapshotId)} className="mt-1 text-left text-xs text-sky-800 underline">Inspect diagnosis snapshot</button>}
                    {evidence.references.map((reference, index) => reference.kind === 'CODE' ? (
                      <div key={index} className="mt-2">
                        <p className="text-xs text-slate-600">Lines {reference.lineStart}–{reference.lineEnd}</p>
                        <pre className="overflow-auto rounded bg-slate-100 p-2 text-xs">{reference.excerpt}</pre>
                      </div>
                    ) : reference.kind === 'TEST' ? (
                      <div key={index} className="mt-2 text-xs text-slate-600">
                        <p>Test {reference.testCaseId} · {reference.status}</p>
                        {reference.traceExcerpt && <pre className="overflow-auto whitespace-pre-wrap">{reference.traceExcerpt}</pre>}
                      </div>
                    ) : <p key={index} className="mt-2 break-all text-xs text-slate-600">Event {reference.eventId}</p>)}
                  </li>)}
                </ul> : <p className="mt-2 text-sm text-slate-600">No diagnosis evidence is available.</p>}
              </section>}

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Support history</h3>
                {!issue?.reviewHistory?.length && !data.hintHistory.length && <p className="mt-2 text-sm text-slate-600">No support actions recorded.</p>}
                <ul className="mt-2 space-y-2 text-sm">
                  {issue?.reviewHistory?.map((entry) => <li key={`${entry.createdAt}-${entry.status}`}>
                    {entry.status} · {formatTime(entry.createdAt)}{entry.actor ? ` · ${entry.actor}` : ''}
                    {entry.reason && <p className="whitespace-pre-wrap text-slate-700">{entry.reason}</p>}
                  </li>)}
                  {data.hintHistory.map((hint) => <li key={`${hint.id}-${hint.createdAt}`}>Hint viewed · {hint.id} · {formatTime(hint.createdAt)}</li>)}
                </ul>
              </section>
            </>}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
