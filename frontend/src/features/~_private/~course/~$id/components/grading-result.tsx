import type { CodePulseWorkspaceSubmission } from '@/services/codepulse-api';

const statusLabel: Record<CodePulseWorkspaceSubmission['status'], string> = {
  PENDING: 'Pending',
  JUDGING: 'Judging',
  COMPLETED: 'Completed',
  INTERNAL_ERROR: 'Internal Error',
};

export function GradingResult({
  submission,
}: {
  submission: CodePulseWorkspaceSubmission;
}) {
  const judgment = submission.judgment;
  const active =
    submission.status === 'PENDING' || submission.status === 'JUDGING';
  const lecturerView = Boolean(judgment && 'testResults' in judgment);
  const visibleTests = judgment
    ? 'publicTests' in judgment
      ? judgment.publicTests
      : judgment.testResults
    : [];
  const hiddenTests = judgment
    ? 'hiddenTests' in judgment
      ? judgment.hiddenTests
      : {
          passedCount: judgment.testResults.filter(
            (result) => result.hidden && result.passed,
          ).length,
          totalCount: judgment.testResults.filter((result) => result.hidden)
            .length,
          earnedWeight: judgment.testResults
            .filter((result) => result.hidden)
            .reduce((sum, result) => sum + result.earnedWeight, 0),
          maxWeight: judgment.testResults
            .filter((result) => result.hidden)
            .reduce((sum, result) => sum + result.weight, 0),
        }
    : null;

  return (
    <section
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      aria-label="Grading result"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Auto grading
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Submission <span className="font-mono">{submission.id}</span>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            submission.status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800'
              : submission.status === 'INTERNAL_ERROR'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-blue-100 text-blue-800'
          }`}
        >
          {statusLabel[submission.status]}
        </span>
      </div>

      {active && (
        <p className="mt-3 text-sm text-slate-600" aria-live="polite">
          {submission.status === 'PENDING'
            ? 'Bài nộp đang chờ grading worker.'
            : 'Đang chạy public và hidden test cases…'}
        </p>
      )}

      {submission.status === 'INTERNAL_ERROR' && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Hệ thống chấm bài gặp sự cố. Chưa có điểm hợp lệ và bài nộp không bị
          tính 0 điểm.
        </p>
      )}

      {submission.status === 'COMPLETED' && judgment && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Score</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {judgment.score}%
              </p>
              <p className="text-xs text-slate-500">
                {judgment.earnedWeight}/{judgment.maxWeight} weighted points
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Tests passed
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {judgment.passedCount}/{judgment.totalCount}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Verdict</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {judgment.verdict?.replaceAll('_', ' ') ?? 'Completed'}
              </p>
            </div>
          </div>

          <div>
            <h6 className="text-sm font-bold text-slate-900">
              {lecturerView ? 'Test breakdown' : 'Public tests'}
            </h6>
            <div className="mt-2 space-y-2">
              {visibleTests.map((result, index) => (
                <details
                  key={result.testCaseId}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    Test {index + 1}
                    {'hidden' in result && result.hidden
                      ? ' (hidden)'
                      : ''}: {result.verdict.replaceAll('_', ' ')} ·{' '}
                    {result.earnedWeight}/{result.weight} points
                  </summary>
                  <dl className="mt-3 grid gap-2 text-xs text-slate-700">
                    <div>
                      <dt className="font-semibold">Input</dt>
                      <dd className="whitespace-pre-wrap font-mono">
                        {result.input}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Expected</dt>
                      <dd className="whitespace-pre-wrap font-mono">
                        {result.expectedOutput}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Actual</dt>
                      <dd className="whitespace-pre-wrap font-mono">
                        {result.actualOutput}
                      </dd>
                    </div>
                    {result.stderr && (
                      <div>
                        <dt className="font-semibold">Diagnostic</dt>
                        <dd className="whitespace-pre-wrap font-mono">
                          {result.stderr}
                        </dd>
                      </div>
                    )}
                  </dl>
                </details>
              ))}
              {visibleTests.length === 0 && (
                <p className="text-sm text-slate-500">
                  Không có test case result.
                </p>
              )}
            </div>
          </div>

          {hiddenTests && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
              Hidden tests: {hiddenTests.passedCount}/{hiddenTests.totalCount}{' '}
              passed · {hiddenTests.earnedWeight}/{hiddenTests.maxWeight}{' '}
              weighted points
            </div>
          )}
        </div>
      )}
    </section>
  );
}
