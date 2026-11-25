const newestFirst = (left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''))
  || left.id.localeCompare(right.id);
const ascending = (left, right) => newestFirst(right, left);
const snapshotMetadata = ({ id, revision, assignmentVersionId, createdAt }) =>
  ({ id, revision, assignmentVersionId, createdAt });
const snapshotView = (snapshot) => snapshot
  ? { ...snapshotMetadata(snapshot), sourceCode: snapshot.sourceCode }
  : null;

export function inspectStudentWork({ scope, workspace, snapshots, assessments, executions, submissions, judgments, selectedEventId }) {
  const inScope = (item, email) => item.classroomId === scope.classroomId
    && item.assignmentId === scope.assignmentId && email === scope.studentEmail;
  const workspaceSnapshots = snapshots
    .filter((item) => item.workspaceId === scope.workspaceId && inScope(item, item.studentEmail));
  const bySnapshot = new Map(workspaceSnapshots.map((item) => [item.id, item]));
  const assessmentBySnapshot = new Map(assessments.filter((item) => item.workspaceId === scope.workspaceId
    && inScope(item, item.studentEmail)).map((item) => [item.snapshotId, item]));
  const studentExecutions = executions.filter((item) => inScope(item, item.ownerEmail));
  const studentSubmissions = submissions.filter((item) => inScope(item, item.student?.email ?? item.ownerEmail));
  const executionsById = new Map(studentExecutions.map((item) => [item.id, item]));
  const submissionsById = new Map(studentSubmissions.map((item) => [item.id, item]));
  const matchesSnapshot = (item, snapshot) => item
    && (!item.workspaceId || item.workspaceId === scope.workspaceId)
    && (!item.assignmentVersionId || item.assignmentVersionId === snapshot.assignmentVersionId)
    && (typeof item.sourceCode !== 'string' || item.sourceCode === snapshot.sourceCode)
    && (!item.sourceHash || item.sourceHash === snapshot.hash);
  const linkedExecutions = new Set();
  const linkedSubmissions = new Set();
  const entries = workspaceSnapshots.map((snapshot) => {
    const assessment = assessmentBySnapshot.get(snapshot.id);
    const run = executionsById.get(assessment?.executionId ?? snapshot.runId);
    const submission = submissionsById.get(assessment?.submissionId ?? snapshot.submissionId);
    const execution = matchesSnapshot(run, snapshot) ? run : null;
    const submitted = matchesSnapshot(submission, snapshot) ? submission : null;
    if (execution) linkedExecutions.add(execution.id);
    if (submitted) linkedSubmissions.add(submitted.id);
    return {
      id: snapshot.id, createdAt: snapshot.createdAt,
      kind: snapshot.trigger === 'RUN' || snapshot.trigger === 'SUBMIT' ? snapshot.trigger : 'SNAPSHOT',
      snapshot, execution, submission: submitted,
    };
  });
  for (const item of studentExecutions) {
    if (item.workspaceId === scope.workspaceId && !linkedExecutions.has(item.id)) {
      entries.push({ id: item.id, createdAt: item.executedAt, kind: 'RUN', execution: item });
    }
  }
  for (const item of studentSubmissions) {
    if (item.workspaceId === scope.workspaceId && !linkedSubmissions.has(item.id)) {
      entries.push({ id: item.id, createdAt: item.acceptedAt ?? item.submittedAt, kind: 'SUBMIT', submission: item });
    }
  }
  entries.sort(newestFirst);
  const selected = selectedEventId ? entries.find((item) => item.id === selectedEventId) : entries[0];
  const current = workspace && inScope(workspace, workspace.ownerEmail) ? workspace : null;
  const saved = current?.revisions?.find((item) => item.revision === current.revision);
  const latestSave = current && workspaceSnapshots.filter((item) => item.trigger === 'SAVE' && item.revision === current.revision
    && item.sourceCode === current.sourceCode).sort(newestFirst)[0];

  const selectedSubmission = selected?.submission;
  const submissionJudgment = (selectedSubmission?.finalJudgmentId
    ? judgments.find((item) => item.id === selectedSubmission.finalJudgmentId && item.submissionId === selectedSubmission.id)
    : null) ?? null;
  const execution = selected?.execution;
  const decision = submissionJudgment?.verdict ?? selectedSubmission?.status;
  const recordedSource = selectedSubmission ?? execution;
  const eventCode = selected && !selected.snapshot && typeof recordedSource?.sourceCode === 'string'
    ? snapshotView({ id: recordedSource.id, sourceCode: recordedSource.sourceCode, revision: null,
      assignmentVersionId: recordedSource.assignmentVersionId ?? null, createdAt: selected.createdAt })
    : null;
  const testView = (item) => ({
    testCaseId: item.testCaseId, status: item.status ?? item.verdict, passed: item.passed,
    trace: item.stderr || null,
  });
  return {
    alertSnapshot: snapshotView(bySnapshot.get(scope.evidence?.[0]?.snapshotId)),
    currentCode: current ? snapshotView({
      id: current.id, sourceCode: current.sourceCode, revision: current.revision ?? 0,
      assignmentVersionId: current.assignmentVersionId ?? latestSave?.assignmentVersionId ?? scope.assignmentVersionId,
      createdAt: saved?.savedAt ?? latestSave?.createdAt ?? null,
    }) : null,
    timeline: entries.map((item) => ({
      id: item.id, kind: item.kind, createdAt: item.createdAt,
      snapshot: item.snapshot ? snapshotMetadata(item.snapshot) : null,
      executionId: item.execution?.id ?? null, submissionId: item.submission?.id ?? null,
      status: item.submission?.status ?? item.execution?.status ?? null,
    })),
    selectedEvent: selected ? {
      id: selected.id, snapshot: snapshotView(selected.snapshot), eventCode,
      executionId: execution?.id ?? null, submissionId: selectedSubmission?.id ?? null,
      compilerTrace: execution?.stderr || null,
      submissionVerdict: decision ?? null,
      runTests: (execution?.results ?? []).map(testView),
      submissionTests: (submissionJudgment?.testResults ?? selectedSubmission?.results ?? []).map(testView),
    } : null,
    hintHistory: (current?.hintProgress ?? []).map((hint) => ({
      id: hint.hintId, createdAt: hint.revealedAt,
    })).sort(ascending),
  };
}
