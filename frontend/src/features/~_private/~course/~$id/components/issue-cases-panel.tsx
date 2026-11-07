import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CodePulseIssueCase['status']>('ALL');
  const [problemTypeFilter, setProblemTypeFilter] = useState('ALL');
  const [milestoneFilter, setMilestoneFilter] = useState<'ALL' | CodePulseAssessment['milestone']>('ALL');
  const [selectedStudent, setSelectedStudent] = useState('ALL');

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
    const stream = new AbortController();
    codePulseApi.subscribeIssueUpdates(classroomId, () => void load(), stream.signal);
    const fallback = window.setInterval(() => void load(), 30_000);
    return () => {
      stream.abort();
      window.clearInterval(fallback);
    };
  }, [classroomId, load]);

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
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const problemTypes = useMemo(() => [...new Map(
    cases.map((item) => [item.problemTypeId, item.problemType]),
  ).values()], [cases]);
  const students = useMemo(() => {
    const grouped = new Map<string, { email: string; cases: number; activeCases: number; issueTypes: Set<string>; latestAt: string }>();
    for (const assessment of assessments) {
      const student = grouped.get(assessment.studentEmail) ?? {
        email: assessment.studentEmail,
        cases: 0,
        activeCases: 0,
        issueTypes: new Set<string>(),
        latestAt: assessment.createdAt,
      };
      if (assessment.createdAt > student.latestAt) student.latestAt = assessment.createdAt;
      grouped.set(assessment.studentEmail, student);
    }
    for (const item of cases) {
      const student = grouped.get(item.studentEmail) ?? {
        email: item.studentEmail,
        cases: 0,
        activeCases: 0,
        issueTypes: new Set<string>(),
        latestAt: item.updatedAt,
      };
      student.cases += 1;
      if (item.status === 'ACTIVE') student.activeCases += 1;
      student.issueTypes.add(item.problemType.name);
      if (item.updatedAt > student.latestAt) student.latestAt = item.updatedAt;
      grouped.set(item.studentEmail, student);
    }
    return [...grouped.values()].sort((left, right) => left.email.localeCompare(right.email));
  }, [assessments, cases]);
  const filteredStudents = students.filter((student) => !normalizedSearch
    || student.email.toLocaleLowerCase().includes(normalizedSearch)
    || [...student.issueTypes].some((name) => name.toLocaleLowerCase().includes(normalizedSearch)));
  const filteredCases = cases.filter((item) => (statusFilter === 'ALL' || item.status === statusFilter)
    && (problemTypeFilter === 'ALL' || item.problemTypeId === problemTypeFilter)
    && (selectedStudent === 'ALL' || item.studentEmail === selectedStudent)
    && (!normalizedSearch
      || item.studentEmail.toLocaleLowerCase().includes(normalizedSearch)
      || item.problemType.name.toLocaleLowerCase().includes(normalizedSearch)
      || item.evidence.some((evidence) => evidence.rationale.toLocaleLowerCase().includes(normalizedSearch))));
  const filteredAssessments = assessments.filter((assessment) => (milestoneFilter === 'ALL' || assessment.milestone === milestoneFilter)
    && (!normalizedSearch || assessment.studentEmail.toLocaleLowerCase().includes(normalizedSearch)));

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="issue-cases-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="issue-cases-heading" className="text-lg font-semibold text-slate-900">Learning issue cases</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Review verified learning signals by student, inspect source evidence, and track assessment recovery.
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

      {error && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading assessments…</p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students assessed</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{students.length}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Active cases</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">{activeCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting assessment</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {assessments.filter((item) => ['PENDING', 'EVALUATING'].includes(item.state)).length}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-900">Students</h4>
              <p className="mt-1 text-xs text-slate-500">Select a student to focus the issue table below.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Student</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Active / total</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Issue types</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Latest activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.email} className={selectedStudent === student.email ? 'bg-amber-50/70' : 'hover:bg-slate-50'}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        <button
                          type="button"
                          aria-pressed={selectedStudent === student.email}
                          onClick={() => setSelectedStudent(selectedStudent === student.email ? 'ALL' : student.email)}
                          className="rounded-sm text-left underline decoration-slate-300 underline-offset-2 hover:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700"
                        >
                          {student.email}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700"><span className="font-semibold text-amber-900">{student.activeCases}</span> / {student.cases}</td>
                      <td className="px-4 py-3 text-slate-700">{[...student.issueTypes].join(', ')}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(student.latestAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                  {!filteredStudents.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">No students match this search.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Issue cases</h4>
                <p className="mt-1 text-xs text-slate-500">{filteredCases.length} of {cases.length} cases</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[42rem] lg:grid-cols-4">
                <label className="text-xs font-medium text-slate-600">
                  Search
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student, issue, evidence" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
                    <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Issue type
                  <select value={problemTypeFilter} onChange={(event) => setProblemTypeFilter(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
                    <option value="ALL">All issue types</option>
                    {problemTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Student
                  <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
                    <option value="ALL">All students</option>
                    {students.map((student) => <option key={student.email} value={student.email}>{student.email}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Student / episode</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Issue</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Evidence</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap p-4">
                        <p className="font-medium text-slate-900">{item.studentEmail}</p>
                        <p className="mt-1 text-xs text-slate-500">Episode {item.episodeNumber} · version {item.assignmentVersionId ?? 'unknown'}</p>
                      </td>
                      <td className="max-w-xs p-4">
                        <p className="font-semibold text-slate-900">{item.problemType.name}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.problemType.description}</p>
                      </td>
                      <td className="whitespace-nowrap p-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'ACTIVE' ? 'bg-amber-100 text-amber-950' : item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}>{item.status}</span>
                      </td>
                      <td className="min-w-56 p-4">
                        <details>
                          <summary className="cursor-pointer font-medium text-amber-900 underline decoration-amber-300 underline-offset-2">Inspect {item.evidence.length} evidence item{item.evidence.length === 1 ? '' : 's'}</summary>
                          <div className="mt-2 space-y-2">{item.evidence.map((evidence) => <EvidenceReferences key={evidence.id} item={evidence} />)}</div>
                          {item.relatedTestCaseIds.length > 0 && <p className="mt-2 text-xs text-slate-600">Related tests: {item.relatedTestCaseIds.join(', ')}</p>}
                        </details>
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {item.status === 'ACTIVE' ? (
                          <div className="flex flex-col items-start gap-2">
                            <button type="button" disabled={updatingId === item.id} onClick={() => void changeStatus(item, 'RESOLVED')} className="rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">Mark resolved</button>
                            <button type="button" disabled={updatingId === item.id} onClick={() => void changeStatus(item, 'DISMISSED')} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Dismiss</button>
                          </div>
                        ) : <span className="text-xs text-slate-400">No action</span>}
                      </td>
                    </tr>
                  ))}
                  {!filteredCases.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No issue cases match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Recent assessment lifecycle</h4>
                <p className="mt-1 text-xs text-slate-500">Events are sequenced per workspace; gaps stay pending until resynchronized.</p>
              </div>
              <label className="text-xs font-medium text-slate-600">
                Milestone
                <select value={milestoneFilter} onChange={(event) => setMilestoneFilter(event.target.value as typeof milestoneFilter)} className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100">
                  <option value="ALL">All milestones</option><option value="SAVE">Save</option><option value="RUN">Run</option><option value="SUBMIT">Submit</option>
                </select>
              </label>
            </div>
            {filteredAssessments.length ? (
              <div className="mt-3 overflow-x-auto">
                <table aria-label="Recent assessment lifecycle" className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th scope="col" className="px-3 py-2 font-semibold">Event</th><th scope="col" className="px-3 py-2 font-semibold">Student / milestone</th><th scope="col" className="px-3 py-2 font-semibold">State</th><th scope="col" className="px-3 py-2 font-semibold">Input coverage</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssessments.slice(0, 8).map((assessment) => (
                      <tr key={assessment.id}>
                        <td className="whitespace-nowrap p-3 font-mono text-xs text-slate-600">#{assessment.eventSequence}</td>
                        <td className="whitespace-nowrap p-3 text-slate-700">{assessment.studentEmail} · {assessment.milestone.toLowerCase()}</td>
                        <td className="whitespace-nowrap p-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${assessment.state === 'FAILED' ? 'bg-rose-50 text-rose-800' : assessment.state === 'INSUFFICIENT_EVIDENCE' ? 'bg-amber-50 text-amber-800' : assessment.state === 'EVALUATED' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {assessment.state === 'FAILED' ? <ExclamationTriangleIcon className="size-3.5" /> : assessment.state === 'EVALUATED' ? <CheckCircleIcon className="size-3.5" /> : null}
                            {assessmentLabel[assessment.state]}
                          </span>
                          {assessment.resultCode && <p className="mt-1 text-xs text-slate-500">{assessment.resultCode}{assessment.missingEventSequence ? ` · waiting for #${assessment.missingEventSequence}` : ''}</p>}
                        </td>
                        <td className="whitespace-nowrap p-3 text-xs text-slate-600">Snapshot {assessment.inputCoverage.snapshot ? '✓' : '—'} · version {assessment.inputCoverage.problemVersion ? '✓' : '—'} · execution {assessment.inputCoverage.executionContext ? '✓' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-500">No assessments match this filter.</p>}
          </div>
        </>
      )}
    </section>
  );
}
