import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { api } from '@/services/api-client';
import {
  codePulseApi,
  type CodePulseAssignment,
  type CodePulseClassroom,
  type CodePulseRunResult,
  type CodePulseRunSummary,
  type CodePulseTerm,
} from '@/services/codepulse-api';
import { getCurrentViewerContext } from '@/services/viewer-context';

import { AssignmentEditor } from './assignment-editor';
import { LabSessionManagement } from './lab-session-management';
import { MonacoCodeEditor } from './monaco-code-editor';

type DsaLabManagementProps = { courseId: string; editMode?: boolean };

type WorkspaceSaveState = 'loading' | 'saved' | 'dirty' | 'saving' | 'error';
type MobileWorkspaceTab = 'problem' | 'code' | 'tests';

const runtimeLabel: Record<CodePulseAssignment['runtime'], string> = {
  PYTHON: 'Python',
  CPP: 'C++',
  '': 'Plain text',
};

const formatDuration = (durationMs: number | null) =>
  durationMs === null ? '—' : `${durationMs} ms`;

const problemNumber = (index: number) =>
  `Problem ${String(index + 1).padStart(2, '0')}`;

function StudentWorkspaceEditor({
  classroomId,
  assignment,
  mobileTab,
}: {
  classroomId: string;
  assignment: CodePulseAssignment;
  mobileTab: MobileWorkspaceTab;
}) {
  const [workspace, setWorkspace] = useState<{
    id: string;
    sourceCode: string;
    updatedAt?: string;
  }>();
  const [sourceCode, setSourceCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<CodePulseRunSummary>();
  const [error, setError] = useState<string>();
  const [runError, setRunError] = useState<string>();
  const [saveState, setSaveState] = useState<WorkspaceSaveState>('loading');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    setWorkspace(undefined);
    setSourceCode('');
    setRunSummary(undefined);
    setRunError(undefined);
    setSaveState('loading');

    void codePulseApi
      .getStudentWorkspace(classroomId, assignment.id)
      .then((response) => {
        if (!active) return;
        setWorkspace(response.data.item);
        setSourceCode(response.data.item.sourceCode);
        setSaveState('saved');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Không thể tải workspace bài làm.',
        );
        setSaveState('error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [assignment.id, classroomId]);

  const persistWorkspace = async (showToast = true) => {
    if (!workspace) return false;
    setSaving(true);
    setSaveState('saving');
    try {
      const response = await codePulseApi.updateWorkspace(
        workspace.id,
        sourceCode,
      );
      setWorkspace(response.data.item);
      setSourceCode(response.data.item.sourceCode);
      setSaveState('saved');
      if (showToast) toast.success(`Đã lưu bài làm: ${assignment.title}.`);
      return true;
    } catch (reason: unknown) {
      setSaveState('error');
      if (showToast)
        toast.error(
          reason instanceof Error ? reason.message : 'Không thể lưu bài làm.',
        );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
    if (!workspace) return;
    setRunning(true);
    setRunError(undefined);
    setRunSummary(undefined);
    try {
      const saved = await persistWorkspace(false);
      if (!saved) {
        setRunError('Không thể lưu code trước khi chạy.');
        return;
      }
      const response = await codePulseApi.runAssignment(
        classroomId,
        assignment.id,
        sourceCode,
      );
      setRunSummary(response.data.item);
    } catch (reason: unknown) {
      setRunError(
        reason instanceof Error ? reason.message : 'Không thể chạy bài làm.',
      );
    } finally {
      setRunning(false);
    }
  };

  const saveStateLabel: Record<WorkspaceSaveState, string> = {
    loading: 'Đang tải',
    saved: workspace?.updatedAt
      ? `Đã lưu ${new Date(workspace.updatedAt).toLocaleTimeString('vi-VN')}`
      : 'Đã lưu',
    dirty: 'Chưa lưu thay đổi',
    saving: 'Đang lưu',
    error: 'Lưu thất bại',
  };

  const saveStateClass: Record<WorkspaceSaveState, string> = {
    loading: 'text-slate-500',
    saved: 'text-emerald-700',
    dirty: 'text-amber-700',
    saving: 'text-slate-500',
    error: 'text-rose-700',
  };

  const editorLanguage = assignment.runtime === 'CPP' ? 'cpp' : 'python';
  const filename = assignment.runtime === 'CPP' ? 'main.cpp' : 'main.py';
  const unauthorized =
    error?.includes('401') ||
    error?.includes('403') ||
    error?.toLowerCase().includes('unauthorized');

  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-mono text-sm font-medium text-slate-900">
            {filename}
          </span>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span className="sr-only">Ngôn ngữ</span>
            <select
              aria-label="Ngôn ngữ"
              value={assignment.runtime}
              disabled
              className="h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-100"
            >
              <option value={assignment.runtime}>
                {runtimeLabel[assignment.runtime]}
              </option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`text-xs ${saveStateClass[saveState]}`}
            aria-live="polite"
          >
            {saveStateLabel[saveState]}
          </span>
          <button
            type="button"
            onClick={() => void persistWorkspace()}
            disabled={
              saving ||
              running ||
              loading ||
              !workspace ||
              saveState === 'saved'
            }
            className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloudArrowUpIcon className="size-4" aria-hidden="true" />
            Lưu
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={
              saving || running || loading || !workspace || !sourceCode.trim()
            }
            className="inline-flex h-8 items-center gap-1.5 rounded bg-teal-700 px-3 text-xs font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {running ? (
              <ArrowPathIcon
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <PlayIcon className="size-4" aria-hidden="true" />
            )}
            {running ? 'Đang chạy' : 'Run'}
          </button>
        </div>
      </div>

      {loading && (
        <p className="px-4 py-8 text-sm text-slate-500">Đang tải editor...</p>
      )}
      {!loading && error && (
        <div
          className="m-4 flex gap-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          <ExclamationTriangleIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              {unauthorized
                ? 'Không có quyền truy cập'
                : 'Không thể tải bài làm'}
            </p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}
      {!loading && !error && workspace && (
        <>
          <div
            className={`${mobileTab === 'code' ? 'block' : 'hidden'} p-3 lg:block`}
          >
            <MonacoCodeEditor
              label="Code"
              language={editorLanguage}
              value={sourceCode}
              onChange={(value) => {
                setSourceCode(value);
                setSaveState('dirty');
              }}
              height="min(52vh, 520px)"
            />
          </div>
          <div
            className={`${mobileTab === 'tests' ? 'block' : 'hidden'} border-t border-slate-200 lg:block`}
          >
            <TestResultsPanel
              summary={runSummary}
              running={running}
              error={runError}
            />
          </div>
        </>
      )}
    </section>
  );
}

const runStatusMeta: Record<
  CodePulseRunResult['status'],
  { label: string; className: string }
> = {
  PASSED: { label: 'Passed', className: 'text-emerald-700' },
  WRONG_ANSWER: { label: 'Wrong answer', className: 'text-amber-700' },
  RUNTIME_ERROR: { label: 'Runtime error', className: 'text-rose-700' },
  TIMEOUT: { label: 'Timeout', className: 'text-orange-700' },
  OUTPUT_LIMIT: { label: 'Output limit', className: 'text-orange-700' },
  COMPILE_ERROR: { label: 'Compile error', className: 'text-rose-700' },
};

function TestResultsPanel({
  summary,
  running,
  error,
}: {
  summary?: CodePulseRunSummary;
  running: boolean;
  error?: string;
}) {
  const allPassed = summary
    ? summary.passedCount === summary.totalCount
    : false;
  const totalDuration =
    summary?.results.reduce(
      (total, result) => total + (result.durationMs ?? 0),
      0,
    ) ?? 0;

  return (
    <div className="min-h-44 resize-y overflow-auto p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Tests</h3>
          <p className="mt-1 text-xs text-slate-500">
            Public test cases for this problem.
          </p>
        </div>
        {summary && (
          <div className="text-right text-xs text-slate-500">
            <span
              className={`font-semibold ${allPassed ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              {allPassed ? 'Passed' : 'Failed'} · {summary.passedCount}/
              {summary.totalCount}
            </span>
            <span className="ml-2">{totalDuration} ms</span>
          </div>
        )}
      </div>

      {running && (
        <p className="mt-5 text-sm text-slate-500">Đang chạy test cases...</p>
      )}
      {!running && error && (
        <div
          className="mt-4 flex gap-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          <ExclamationTriangleIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Không thể chạy bài làm</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}
      {!running && !error && !summary && (
        <p className="mt-5 text-sm text-slate-500">No tests run yet.</p>
      )}
      {!running && !error && summary && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="p-2 font-medium">Test</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Time</th>
                <th className="p-2 font-medium">Input</th>
                <th className="p-2 font-medium">Output</th>
                <th className="p-2 font-medium">Expected</th>
              </tr>
            </thead>
            <tbody>
              {summary.results.map((result, index) => {
                const meta = runStatusMeta[result.status];
                const renderedOutput =
                  result.actualOutput || result.stderr || '—';
                return (
                  <tr
                    key={result.testCaseId}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="px-2 py-3 font-mono text-slate-500">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${meta.className}`}
                      >
                        {result.passed ? (
                          <CheckCircleIcon
                            className="size-4"
                            aria-hidden="true"
                          />
                        ) : (
                          <XCircleIcon className="size-4" aria-hidden="true" />
                        )}
                        {meta.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-slate-500">
                      {formatDuration(result.durationMs)}
                    </td>
                    <td className="max-w-40 whitespace-pre-wrap px-2 py-3 font-mono text-slate-700">
                      {result.input || '—'}
                    </td>
                    <td className="max-w-40 whitespace-pre-wrap px-2 py-3 font-mono text-slate-700">
                      <output aria-label={`Output for test ${index + 1}`}>
                        {renderedOutput}
                      </output>
                    </td>
                    <td className="max-w-40 whitespace-pre-wrap px-2 py-3 font-mono text-slate-700">
                      {result.expectedOutput || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProblemStatement({
  assignment,
  index,
}: {
  assignment: CodePulseAssignment;
  index: number;
}) {
  return (
    <article className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
      <header className="border-b border-slate-200 pb-5">
        <p className="font-mono text-xs text-slate-500">
          {problemNumber(index)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {assignment.title || 'Untitled assignment'}
        </h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {assignment.description || 'No description provided.'}
        </p>
      </header>

      <div className="grid gap-5 border-b border-slate-200 py-5 sm:grid-cols-3">
        <ProblemDetail label="Constraints" value={assignment.constraints} />
        <ProblemDetail label="Input" value={assignment.inputFormat} />
        <ProblemDetail label="Output" value={assignment.outputFormat} />
      </div>

      <section className="pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Examples</h2>
          <span className="text-xs text-slate-500">
            {assignment.testCases.length} public{' '}
            {assignment.testCases.length === 1 ? 'case' : 'cases'}
          </span>
        </div>
        {assignment.testCases.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No public examples.</p>
        )}
        {assignment.testCases.length > 0 && (
          <div className="mt-3 overflow-hidden rounded border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Input</th>
                  <th className="px-3 py-2 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {assignment.testCases.map((testCase) => (
                  <tr
                    key={testCase.id}
                    className="border-t border-slate-200 align-top"
                  >
                    <td className="whitespace-pre-wrap p-3 font-mono text-xs text-slate-700">
                      {testCase.input || '—'}
                    </td>
                    <td className="whitespace-pre-wrap p-3 font-mono text-xs text-slate-700">
                      {testCase.expectedOutput || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}

function ProblemDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-500">{label}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700">
        {value || '—'}
      </p>
    </div>
  );
}

function StudentProblemWorkspace({
  courseId,
  classroomId,
  classroom,
}: {
  courseId: string;
  classroomId: string;
  classroom?: CodePulseClassroom;
}) {
  const [assignments, setAssignments] = useState<CodePulseAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileWorkspaceTab>('problem');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void codePulseApi
      .listAssignments(classroomId, 'student')
      .then((response) => {
        if (!active) return;
        setAssignments(response.data.items);
        setSelectedIndex((current) =>
          Math.min(current, Math.max(response.data.items.length - 1, 0)),
        );
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            error instanceof Error ? error.message : 'Không thể tải bài tập.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classroomId]);

  const assignment = assignments[selectedIndex];
  const selectedProblemLabel = assignment
    ? problemNumber(selectedIndex)
    : 'Problem';

  return (
    <section className="border-t border-slate-200 bg-[#f7f8fa] p-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <a
            href={`/course/${courseId}`}
            className="transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          >
            Courses
          </a>
          <span className="px-2 text-slate-400">/</span>
          <span>{classroom?.name ?? 'CodePulse Demo'}</span>
          <span className="px-2 text-slate-400">/</span>
          <span className="text-slate-700">{selectedProblemLabel}</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              {classroom?.term.name ?? 'Học kỳ hiện tại'} ·{' '}
              {classroom?.name ?? 'CodePulse Demo'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Problem workspace
            </h2>
          </div>
          {assignments.length > 1 && (
            <div className="flex gap-2">
              {assignments.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedIndex(index);
                    setMobileTab('problem');
                  }}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    selectedIndex === index
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                  }`}
                >
                  {problemNumber(index)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="mt-4 flex border-b border-slate-200 lg:hidden"
          role="tablist"
          aria-label="Problem workspace sections"
        >
          {(['problem', 'code', 'tests'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab}
              onClick={() => setMobileTab(tab)}
              className={`border-b-2 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/30 ${mobileTab === tab ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {tab === 'problem'
                ? 'Problem'
                : tab === 'code'
                  ? 'Code'
                  : 'Tests'}
            </button>
          ))}
        </div>

        {loading && (
          <p className="py-10 text-sm text-slate-500">Đang tải bài tập...</p>
        )}
        {!loading && error && (
          <div
            className="mt-4 flex gap-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            role="alert"
          >
            <ExclamationTriangleIcon
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Không thể tải bài tập</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}
        {!loading && assignments.length === 0 && (
          <p className="mt-4 rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Chưa có bài tập được publish trong học kỳ hiện tại.
          </p>
        )}
        {!loading && !error && assignment && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[35%_65%] items-start gap-6">
            <div
              className={mobileTab === 'problem' ? 'block' : 'hidden lg:block'}
            >
              <ProblemStatement assignment={assignment} index={selectedIndex} />
            </div>
            <div
              className={mobileTab === 'problem' ? 'hidden lg:block' : 'block'}
            >
              <StudentWorkspaceEditor
                classroomId={classroomId}
                assignment={assignment}
                mobileTab={mobileTab}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function DsaLabManagement({
  courseId,
  editMode = false,
}: DsaLabManagementProps) {
  const [classrooms, setClassrooms] = useState<CodePulseClassroom[]>([]);
  const [terms, setTerms] = useState<CodePulseTerm[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [termId, setTermId] = useState('');
  const [role, setRole] = useState<string>(
    () => getCurrentViewerContext().viewerRole,
  );
  const [termName, setTermName] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [termReset, setTermReset] = useState('');
  const [termStatus, setTermStatus] =
    useState<CodePulseTerm['status']>('DRAFT');
  const [editingTermId, setEditingTermId] = useState<string>();
  const [termFilter, setTermFilter] = useState('current');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>();
  const isStudent = role === 'student';
  const currentTerm = useMemo(() => {
    const now = Date.now();
    return (
      terms.find(
        (term) =>
          term.status === 'ACTIVE' &&
          new Date(term.startDate).getTime() <= now &&
          new Date(term.endDate).getTime() > now,
      ) ?? terms.find((term) => term.status === 'ACTIVE')
    );
  }, [terms]);
  const selectedTermId = isStudent
    ? currentTerm?.id
    : termFilter === 'current'
      ? currentTerm?.id
      : termFilter === 'all'
        ? undefined
        : termFilter;
  const visibleClassrooms = useMemo(
    () =>
      selectedTermId
        ? classrooms.filter((classroom) => classroom.termId === selectedTermId)
        : classrooms,
    [classrooms, selectedTermId],
  );
  const assignmentClassroomId = visibleClassrooms.some(
    (classroom) => classroom.id === selectedClassroomId,
  )
    ? selectedClassroomId
    : visibleClassrooms[0]?.id;
  const assignmentClassroom = classrooms.find(
    (classroom) => classroom.id === assignmentClassroomId,
  );
  const canManageClassroom = editMode && role === 'admin';
  const canUpdateClassroom =
    editMode && ['admin', 'lecturer'].includes(role ?? '');
  const canManageAssignments = editMode && role === 'lecturer';
  const showClassroomDirectory = role !== undefined && role !== 'student';

  const load = useCallback(async () => {
    const [sessionResult, classroomResult, termResult] = await Promise.all([
      api.getSession(),
      codePulseApi.listClassrooms(courseId),
      codePulseApi.listTerms(courseId),
    ]);
    setRole(sessionResult.data.role);
    setClassrooms(classroomResult.data.items);
    setTerms(termResult.data.items);
    setTermId(
      (current) =>
        current ||
        termResult.data.items.find((term) => term.status === 'ACTIVE')?.id ||
        termResult.data.items[0]?.id ||
        '',
    );
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createClassroom = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (selectedClassroomId) {
        await codePulseApi.updateClassroom(selectedClassroomId, {
          name,
          description,
          termId,
          lecturerEmail: role === 'admin' ? lecturerEmail : undefined,
        });
      } else {
        await codePulseApi.createClassroom({
          courseId,
          name,
          description,
          termId,
          lecturerEmail: role === 'admin' ? lecturerEmail : undefined,
        });
      }
      setName('');
      setDescription('');
      setLecturerEmail('');
      setSelectedClassroomId(undefined);
      toast.success(
        selectedClassroomId
          ? 'Classroom updated.'
          : 'Classroom created as Draft.',
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create classroom.',
      );
    }
  };

  const selectClassroom = (classroom: CodePulseClassroom) => {
    setSelectedClassroomId(classroom.id);
    setName(classroom.name);
    setDescription(classroom.description);
    setTermId(classroom.termId);
    setLecturerEmail(classroom.lecturerEmail ?? '');
  };

  const deleteClassroom = async () => {
    if (
      !selectedClassroomId ||
      !window.confirm(
        'Bạn muốn xóa lớp học này và dữ liệu workspace liên quan?',
      )
    )
      return;
    try {
      await codePulseApi.deleteClassroom(selectedClassroomId);
      setSelectedClassroomId(undefined);
      setName('');
      setDescription('');
      setLecturerEmail('');
      toast.success('Classroom deleted.');
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete classroom.',
      );
    }
  };

  const createTerm = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingTermId) {
        await codePulseApi.updateTerm(editingTermId, {
          name: termName,
          startDate: termStart,
          endDate: termEnd,
          resetDate: termReset,
          status: termStatus,
        });
      } else {
        await codePulseApi.createTerm({
          name: termName,
          startDate: termStart,
          endDate: termEnd,
          resetDate: termReset,
        });
      }
      setTermName('');
      setTermStart('');
      setTermEnd('');
      setTermReset('');
      setTermStatus('DRAFT');
      setEditingTermId(undefined);
      toast.success(
        editingTermId ? 'Đã cập nhật học kỳ.' : 'Đã tạo học kỳ thành công.',
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể tạo học kỳ.',
      );
    }
  };

  const editTerm = (term: CodePulseTerm) => {
    setEditingTermId(term.id);
    setTermName(term.name);
    setTermStart(term.startDate);
    setTermEnd(term.endDate);
    setTermReset(term.resetDate);
    setTermStatus(term.status);
  };

  const deleteTerm = async () => {
    if (!editingTermId || !window.confirm('Bạn muốn xóa học kỳ này?')) return;
    try {
      await codePulseApi.deleteTerm(editingTermId);
      setEditingTermId(undefined);
      setTermName('');
      setTermStart('');
      setTermEnd('');
      setTermReset('');
      setTermStatus('DRAFT');
      toast.success('Đã xóa học kỳ.');
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể xóa học kỳ.',
      );
    }
  };

  const updateClassroom = async (
    classroom: CodePulseClassroom,
    status: CodePulseClassroom['status'],
  ) => {
    try {
      await codePulseApi.updateClassroom(classroom.id, { status });
      toast.success('Cập nhật lớp học thành công.');
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể cập nhật lớp học.',
      );
    }
  };

  return (
    <section className="border-t border-gray-200 bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {isStudent ? 'Bài tập học kỳ hiện tại' : 'Terms and classrooms'}
          </h2>
          <p className="mt-1 text-gray-600">
            {isStudent
              ? 'Bạn chỉ có thể xem bài tập đã publish trong học kỳ hiện tại.'
              : 'Practice spaces are isolated by academic term.'}
          </p>
        </div>
        {showClassroomDirectory && (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <label className="min-w-64 text-sm font-medium text-gray-700">
                Học kỳ
                <select
                  aria-label="Chọn học kỳ"
                  value={termFilter}
                  onChange={(event) => setTermFilter(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="current">Học kỳ hiện tại</option>
                  <option value="all">Tất cả</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.status})
                    </option>
                  ))}
                </select>
              </label>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${editMode ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {editMode ? 'Đang bật chỉnh sửa' : 'Chỉ xem'}
              </span>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                {visibleClassrooms.map((classroom) => (
                  <article
                    key={classroom.id}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="flex justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => selectClassroom(classroom)}
                        className="text-left font-semibold text-gray-900"
                      >
                        {classroom.name}
                      </button>
                      {canUpdateClassroom ? (
                        <select
                          aria-label={`Status for ${classroom.name}`}
                          value={classroom.status}
                          onChange={(event) =>
                            void updateClassroom(
                              classroom,
                              event.target
                                .value as CodePulseClassroom['status'],
                            )
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-bold text-blue-700"
                        >
                          <option>DRAFT</option>
                          <option>ACTIVE</option>
                          <option>ARCHIVED</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-blue-700">
                          Trạng thái: {classroom.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {classroom.term.name} · {classroom.description}
                    </p>
                    {role === 'admin' && (
                      <p className="mt-2 text-xs text-gray-500">
                        Lecturer: {classroom.lecturerEmail ?? 'Unassigned'}
                      </p>
                    )}
                  </article>
                ))}
                {visibleClassrooms.length === 0 && (
                  <p className="rounded-lg bg-white p-6 text-gray-500">
                    No classrooms are available for this account.
                  </p>
                )}
              </div>
              {canManageClassroom && (
                <div className="space-y-6">
                  <form
                    onSubmit={createClassroom}
                    className="rounded-lg border border-gray-200 bg-white p-5"
                  >
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                      {selectedClassroomId
                        ? 'Edit classroom'
                        : 'Create classroom'}
                    </h3>
                    <label className="mb-3 block text-sm text-gray-700">
                      Name
                      <input
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="mb-3 block text-sm text-gray-700">
                      Description
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="mt-1 min-h-20 w-full rounded border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="mb-4 block text-sm text-gray-700">
                      Term
                      <select
                        required
                        value={termId}
                        onChange={(event) => setTermId(event.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                      >
                        {terms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {role === 'admin' && (
                      <label className="mb-4 block text-sm text-gray-700">
                        Assign DSA manager email
                        <input
                          type="email"
                          value={lecturerEmail}
                          onChange={(event) =>
                            setLecturerEmail(event.target.value)
                          }
                          placeholder="tutor@gmail.com"
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                        />
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded bg-blue-700 px-4 py-2 font-semibold text-white"
                      >
                        {selectedClassroomId ? 'Save changes' : 'Create draft'}
                      </button>
                      {selectedClassroomId && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedClassroomId(undefined)}
                            className="rounded border border-gray-300 px-4 py-2"
                          >
                            Cancel
                          </button>
                          {role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => void deleteClassroom()}
                              className="rounded bg-red-700 px-4 py-2 font-semibold text-white"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </form>
                  {role === 'admin' && (
                    <form
                      onSubmit={createTerm}
                      className="rounded-lg border border-gray-200 bg-white p-5"
                    >
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        {editingTermId
                          ? 'Edit academic term'
                          : 'Create academic term'}
                      </h3>
                      <label className="mb-3 block text-sm text-gray-700">
                        Chọn term để sửa
                        <select
                          value={editingTermId ?? ''}
                          onChange={(event) => {
                            const selected = terms.find(
                              (term) => term.id === event.target.value,
                            );
                            if (selected) editTerm(selected);
                            else {
                              setEditingTermId(undefined);
                              setTermName('');
                              setTermStart('');
                              setTermEnd('');
                              setTermReset('');
                              setTermStatus('DRAFT');
                            }
                          }}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                        >
                          <option value="">Tạo term mới</option>
                          {terms.map((term) => (
                            <option key={term.id} value={term.id}>
                              {term.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mb-3 block text-sm text-gray-700">
                        Name
                        <input
                          required
                          value={termName}
                          onChange={(event) => setTermName(event.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="text-sm text-gray-700">
                          Start
                          <input
                            required
                            type="date"
                            value={termStart}
                            onChange={(event) =>
                              setTermStart(event.target.value)
                            }
                            className="mt-1 w-full rounded border border-gray-300 p-2"
                          />
                        </label>
                        <label className="text-sm text-gray-700">
                          End
                          <input
                            required
                            type="date"
                            value={termEnd}
                            onChange={(event) => setTermEnd(event.target.value)}
                            className="mt-1 w-full rounded border border-gray-300 p-2"
                          />
                        </label>
                        <label className="text-sm text-gray-700">
                          Reset
                          <input
                            required
                            type="date"
                            value={termReset}
                            onChange={(event) =>
                              setTermReset(event.target.value)
                            }
                            className="mt-1 w-full rounded border border-gray-300 p-2"
                          />
                        </label>
                      </div>
                      {editingTermId && (
                        <label className="mt-3 block text-sm text-gray-700">
                          Status
                          <select
                            value={termStatus}
                            onChange={(event) =>
                              setTermStatus(
                                event.target.value as CodePulseTerm['status'],
                              )
                            }
                            className="mt-1 w-full rounded border border-gray-300 p-2"
                          >
                            <option>DRAFT</option>
                            <option>ACTIVE</option>
                            <option>ARCHIVED</option>
                          </select>
                        </label>
                      )}
                      <button
                        type="submit"
                        className="mt-4 rounded bg-slate-900 px-4 py-2 font-semibold text-white"
                      >
                        {editingTermId ? 'Save term' : 'Create term'}
                      </button>
                      {editingTermId && (
                        <button
                          type="button"
                          onClick={() => void deleteTerm()}
                          className="ml-2 mt-4 rounded bg-red-700 px-4 py-2 font-semibold text-white"
                        >
                          Delete term
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {role &&
          assignmentClassroomId &&
          (isStudent ? (
            <StudentProblemWorkspace
              courseId={courseId}
              classroomId={assignmentClassroomId}
              classroom={assignmentClassroom}
            />
          ) : canManageAssignments ? (
            <AssignmentEditor
              classroomId={assignmentClassroomId}
              classroom={assignmentClassroom}
              canEdit
            />
          ) : (
            <AssignmentEditor
              classroomId={assignmentClassroomId}
              classroom={assignmentClassroom}
              canEdit={false}
            />
          ))}
        <LabSessionManagement classrooms={classrooms} role={role} />
      </div>
    </section>
  );
}
