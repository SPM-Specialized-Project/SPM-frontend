import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';

import {
  codePulseApi,
  type CodePulseAssessment,
  type CodePulseIssueCase,
} from '@/services/codepulse-api';

const assessmentLabel: Record<CodePulseAssessment['state'], string> = {
  PENDING: 'Pending',
  EVALUATING: 'Evaluating',
  EVALUATED: 'Evaluated',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
  FAILED: 'AI error',
};

function EvidenceReferences({ item }: { item: CodePulseIssueCase['evidence'][number] }) {
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="font-medium text-slate-800">{item.rationale}</p>
      {item.references.map((reference, index) => {
        if (reference.kind === 'CODE') {
          return (
            <div key={`${item.id}-code-${index}`} className="mt-2">
              <p className="text-xs text-slate-500">
                Snapshot {reference.snapshotId} · lines {reference.lineStart}–{reference.lineEnd}
              </p>
              <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                {reference.excerpt}
              </pre>
            </div>
          );
        }
        if (reference.kind === 'TEST') {
          return (
            <div key={`${item.id}-test-${index}`} className="mt-2">
              <p className="text-xs text-slate-600">
                Execution {reference.executionId} · test {reference.testCaseId} · {reference.status}
              </p>
              {reference.traceExcerpt && (
                <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                  {reference.traceExcerpt}
                </pre>
              )}
            </div>
          );
        }
        return (
          <p key={`${item.id}-event-${index}`} className="mt-2 text-xs text-slate-600">
            Event {reference.eventId}
          </p>
        );
      })}
      <p className="mt-2 text-xs text-slate-500">
        Snapshot {item.snapshotId}
        {item.executionId ? ` · Run ${item.executionId}` : ''}
        {item.submissionId ? ` · Submission ${item.submissionId}` : ''}
      </p>
    </div>
  );
}
export function IssueCasesPanel({ classroomId }: { classroomId: string }) {
  const [cases, setCases] = useState<CodePulseIssueCase[]>([]);
  const [assessments, setAssessments] = useState<CodePulseAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [updatingId, setUpdatingId] = useState<string>();

  const load = useCallback(async () => {
    try {
      const [caseResponse, assessmentResponse] = await Promise.all([
        codePulseApi.listIssueCases(classroomId),
        codePulseApi.listAssessments(classroomId),
      ]);
      setCases(caseResponse.data.items);
      setAssessments(assessmentResponse.data.items);
      setError(undefined);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not load issue evidence.');
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), 8_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const changeStatus = async (item: CodePulseIssueCase, status: 'RESOLVED' | 'DISMISSED') => {
    setUpdatingId(item.id);
    try {
      await codePulseApi.updateIssueCase(item.id, status);
      await load();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not update this issue case.');
    } finally {
      setUpdatingId(undefined);
    }
  };

  const activeCount = cases.filter((item) => item.status === 'ACTIVE').length;
  const recentAssessments = assessments.slice(0, 8);

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="issue-cases-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="issue-cases-heading" className="text-lg font-semibold text-slate-900">
            Learning issue cases
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Evidence linked to saved snapshots, runs, and submissions. Active cases: {activeCount}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowPathIcon className="size-4" /> Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading assessments…</p>
      ) : (
        <>
          <div className="mt-5 space-y-4">
            {cases.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.problemType.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.studentEmail} · episode {item.episodeNumber} · {item.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Workspace {item.workspaceId} · problem version {item.assignmentVersionId ?? 'unavailable'}
                    </p>
                  </div>
                  {item.status === 'ACTIVE' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => void changeStatus(item, 'RESOLVED')}
                        className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Mark resolved
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => void changeStatus(item, 'DISMISSED')}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
                {item.evidence.map((evidence) => (
                  <EvidenceReferences key={evidence.id} item={evidence} />
                ))}
                {item.relatedTestCaseIds.length > 0 && (
                  <p className="mt-3 text-xs text-slate-600">
                    Related test cases: {item.relatedTestCaseIds.join(', ')}
                  </p>
                )}
              </article>
            ))}
            {!cases.length && (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No issue cases have sufficient verified evidence yet.
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-800">Recent assessment lifecycle</h4>
            {recentAssessments.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {recentAssessments.map((assessment) => (
                  <li key={assessment.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-slate-700">
                      {assessment.studentEmail} · {assessment.milestone.toLowerCase()} · snapshot {assessment.snapshotId ?? 'unavailable'} · version {assessment.assignmentVersionId ?? 'unavailable'}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${assessment.state === 'FAILED' ? 'bg-rose-50 text-rose-800' : assessment.state === 'INSUFFICIENT_EVIDENCE' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                      {assessment.state === 'FAILED' ? <ExclamationTriangleIcon className="size-3.5" /> : assessment.state === 'EVALUATED' ? <CheckCircleIcon className="size-3.5" /> : null}
                      {assessmentLabel[assessment.state]}
                    </span>
                    {assessment.resultCode && (
                      <span className="w-full text-right text-xs text-slate-500">{assessment.resultCode}</span>
                    )}
                    <span className="w-full text-right text-xs text-slate-500">
                      Input: snapshot {assessment.inputCoverage.snapshot ? '✓' : '—'} · pinned version {assessment.inputCoverage.problemVersion ? '✓' : '—'} · execution context {assessment.inputCoverage.executionContext ? '✓' : '—'}
                    </span>
                    <span className="w-full text-right text-xs text-slate-500">
                      AI: {assessment.provider ?? 'unavailable'}{assessment.model ? ` · ${assessment.model}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No assessments have been queued.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
