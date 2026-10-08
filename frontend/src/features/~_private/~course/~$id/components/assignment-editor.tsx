import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { toast } from 'react-toastify';

import { ApiError } from '@/services/api-client';
import {
  codePulseApi,
  type CodePulseAssignment,
  type CodePulseAssignmentInput,
  type CodePulseAssignmentVersion,
  type CodePulseClassroom,
  type CodePulseTestCase,
  type CodePulseVersionHistory,
} from '@/services/codepulse-api';

import { MonacoCodeEditor } from './monaco-code-editor';

type AssignmentEditorProps = {
  classroomId?: string;
  classroom?: CodePulseClassroom;
  canEdit: boolean;
};

type AssignmentForm = Omit<CodePulseAssignmentInput, 'id'> & { id?: string };

const editorInputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

const emptyTestCase = (): CodePulseTestCase => ({
  id: `test-${Date.now()}`,
  input: '',
  expectedOutput: '',
  hidden: false,
  verified: false,
  weight: 1,
});

const emptyForm = (): AssignmentForm => ({
  title: '',
  description: '',
  constraints: '',
  inputFormat: '',
  outputFormat: '',
  cpuTimeLimitMs: 1000,
  memoryLimitMb: 128,
  runtime: 'PYTHON',
  referenceSolution: '',
  comparator: { normalizeLineEndings: true, trimTrailingNewline: true },
  testCases: [emptyTestCase()],
});

const toForm = (assignment: CodePulseAssignment): AssignmentForm => ({
  id: assignment.id,
  title: assignment.title,
  description: assignment.description,
  constraints: assignment.constraints,
  inputFormat: assignment.inputFormat,
  outputFormat: assignment.outputFormat,
  cpuTimeLimitMs: assignment.cpuTimeLimitMs,
  memoryLimitMb: assignment.memoryLimitMb,
  runtime: assignment.runtime,
  referenceSolution: assignment.referenceSolution,
  comparator: assignment.comparator ?? { normalizeLineEndings: true, trimTrailingNewline: true },
  testCases: assignment.testCases,
});

const statusLabel = (assignment: CodePulseAssignment) =>
  assignment.status === 'PUBLISHED' ? 'Published' : 'Draft';

export function AssignmentEditor({ classroomId, classroom, canEdit }: AssignmentEditorProps) {
  const [assignments, setAssignments] = useState<CodePulseAssignment[]>([]);
  const [versions, setVersions] = useState<CodePulseAssignmentVersion[]>([]);
  const [versionHistory, setVersionHistory] = useState<CodePulseVersionHistory>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [form, setForm] = useState<AssignmentForm>(() => emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedId),
    [assignments, selectedId],
  );
  const selectedVersions = useMemo(
    () => versions
      .filter((version) => version?.assignmentId === selectedId && Number.isFinite(version.version))
      .sort((left, right) => right.version - left.version),
    [selectedId, versions],
  );

  const load = useCallback(async () => {
    if (!classroomId) {
      setAssignments([]);
      setSelectedId(undefined);
      return;
    }

    setLoading(true);
    try {
      const response = await codePulseApi.listAssignments(classroomId);
      setAssignments(response.data.items);
      setSelectedId((current) => current && response.data.items.some((item) => item.id === current)
        ? current
        : response.data.items[0]?.id);
    } catch (reason: unknown) {
      toast.error(reason instanceof ApiError ? reason.message : 'Không thể tải assignment.');
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!classroomId) {
      setVersions([]);
      return;
    }
    let active = true;
    void codePulseApi.listPublishedAssignmentVersions(classroomId)
      .then((response) => {
        if (active) setVersions(response.data.items);
      })
      .catch(() => {
        if (active) setVersions([]);
      });
    return () => { active = false; };
  }, [classroomId]);

  useEffect(() => {
    if (selectedAssignment) setForm(toForm(selectedAssignment));
  }, [selectedAssignment]);

  const viewVersionHistory = async (versionId: string) => {
    if (!classroomId) return;
    setHistoryLoading(true);
    setHistoryError(undefined);
    try {
      const response = await codePulseApi.getAssignmentVersionHistory(classroomId, versionId);
      const history = response.data;
      if (!history?.item || !Number.isFinite(history.item.version)) {
        throw new Error('Version snapshot is unavailable. Refresh the page and try again.');
      }
      setVersionHistory({
        ...history,
        item: {
          ...history.item,
          testCases: Array.isArray(history.item.testCases) ? history.item.testCases : [],
        },
        submissions: Array.isArray(history.submissions) ? history.submissions : [],
      });
    } catch (reason: unknown) {
      setVersionHistory(undefined);
      setHistoryError(reason instanceof Error ? reason.message : 'Could not load version history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateField = <K extends keyof AssignmentForm>(field: K, value: AssignmentForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  };

  const updateTestCase = (index: number, field: keyof CodePulseTestCase, value: string | boolean | number) => {
    setForm((current) => ({
      ...current,
      testCases: current.testCases.map((test, testIndex) =>
        testIndex === index ? { ...test, [field]: value, verified: false } : test),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`testCases.${index}.${String(field)}`];
      delete next[`testCases.${index}.verified`];
      return next;
    });
  };

  const applyApiError = (reason: unknown, fallback: string) => {
    if (reason instanceof ApiError) {
      setFieldErrors(reason.errors);
      toast.error(reason.message);
    } else {
      toast.error(fallback);
    }
  };

  const persist = async (): Promise<CodePulseAssignment> => {
    if (!classroomId) throw new Error('Chưa chọn classroom.');
    const response = form.id
      ? await codePulseApi.updateAssignment(classroomId, form.id, form)
      : await codePulseApi.createAssignment(classroomId, form);
    const saved = response.data.item;
    setAssignments((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [...current, saved]);
    setSelectedId(saved.id);
    setForm(toForm(saved));
    return saved;
  };

  const saveDraft = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      await persist();
      toast.success('Đã lưu assignment dưới dạng draft.');
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể lưu assignment.');
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    if (!classroomId) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const saved = await persist();
      const response = await codePulseApi.verifyAssignment(classroomId, saved.id, form.referenceSolution);
      setAssignments((current) => current.map((item) => item.id === saved.id ? response.data.item : item));
      setForm(toForm(response.data.item));
      toast.success(`Đã verify ${response.data.verification.testCaseCount} test case bằng reference solution.`);
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể verify assignment.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!classroomId) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const saved = await persist();
      const response = await codePulseApi.publishAssignment(classroomId, saved.id);
      setAssignments((current) => current.map((item) => item.id === saved.id ? response.data.item : item));
      setForm(toForm(response.data.item));
      toast.success('Assignment đã được publish.');
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể publish assignment.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!classroomId || !form.id || !window.confirm('Xóa assignment draft này?')) return;
    setSaving(true);
    try {
      await codePulseApi.deleteAssignment(classroomId, form.id);
      setAssignments((current) => current.filter((item) => item.id !== form.id));
      setSelectedId(undefined);
      setForm(emptyForm());
      toast.success('Đã xóa assignment.');
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể xóa assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleNumberChange = (field: 'cpuTimeLimitMs' | 'memoryLimitMb', event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? null : Number(event.target.value);
    updateField(field, value);
  };

  const handleWeightChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    updateTestCase(index, 'weight', Number(event.target.value));
  };

  if (!classroomId) return null;

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Assignment authoring</p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">{classroom?.name ?? 'Selected classroom'}</h3>
          <p className="mt-1 text-sm text-gray-600">Drafts are private until a lecturer publishes them.</p>
        </div>
        {canEdit && <button type="button" onClick={() => { setSelectedId(undefined); setForm(emptyForm()); setFieldErrors({}); }} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">New assignment</button>}
      </div>

      {loading && <p className="py-6 text-sm text-gray-500">Đang tải assignment...</p>}
      {!loading && assignments.length === 0 && !canEdit && <p className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-500">Chưa có assignment trong classroom này.</p>}

      {!loading && (assignments.length > 0 || canEdit) && (
        <div className={canEdit ? 'grid gap-6 lg:grid-cols-[220px_1fr]' : ''}>
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <button key={assignment.id} type="button" onClick={() => setSelectedId(assignment.id)} className={`w-full rounded border p-3 text-left transition ${assignment.id === selectedId ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <span className="block font-semibold text-gray-900">{assignment.title || 'Untitled assignment'}</span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{statusLabel(assignment)}</span>
              </button>
            ))}
          </div>

          {canEdit && (
            <form onSubmit={(event) => { event.preventDefault(); void saveDraft(); }} className="space-y-4">
              {selectedVersions.length > 0 && (
                <section aria-label="Published assignment versions" className="border-b border-gray-200 pb-4">
                  <h4 className="font-semibold text-gray-900">Published versions</h4>
                  <ol className="mt-2 divide-y divide-gray-100 border-y border-gray-200">
                    {selectedVersions.map((version) => {
                      const testCases = version.testCases ?? [];
                      const publicCount = testCases.filter((testCase) => !testCase.hidden).length;
                      const hiddenCount = testCases.filter((testCase) => testCase.hidden).length;
                      return (
                        <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <span className="font-medium text-gray-800">Version {version.version}</span>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span>
                              {new Date(version.publishedAt).toLocaleString()} · {publicCount} public / {hiddenCount} hidden tests
                              {version.giteaBranch ? ` · ${version.giteaBranch}` : ''}
                            </span>
                            <button type="button" onClick={() => void viewVersionHistory(version.id)} className="font-semibold text-blue-700 hover:text-blue-900">
                              View test cases and submissions
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {historyLoading && <p className="mt-3 text-sm text-gray-500">Loading version history...</p>}
                  {historyError && <p className="mt-3 text-sm text-red-700" role="alert">{historyError}</p>}
                  {versionHistory?.item && (
                    <section className="mt-4 space-y-5 border-t border-gray-200 pt-4" aria-label={`Version ${versionHistory.item.version} history`}>
                      <div>
                        <h5 className="font-semibold text-gray-900">Version {versionHistory.item.version} test suite</h5>
                        <p className="mt-1 text-xs text-gray-500">
                          {versionHistory.item.usedAt ? `Locked after use: ${new Date(versionHistory.item.usedAt).toLocaleString()}` : 'No runs or submissions recorded'}
                          {versionHistory.item.comparator ? ` · CRLF/LF normalization ${versionHistory.item.comparator.normalizeLineEndings ? 'on' : 'off'}, trailing newline trim ${versionHistory.item.comparator.trimTrailingNewline ? 'on' : 'off'}` : ''}
                        </p>
                        <div className="mt-3 space-y-3">
                          {(versionHistory.item.testCases ?? []).map((testCase, index) => (
                            <article key={testCase.id} className="rounded border border-gray-200 p-3 text-sm">
                              <h6 className="font-semibold text-gray-800">Test {index + 1} · {testCase.hidden ? 'Hidden' : 'Public'} · weight {testCase.weight}</h6>
                              <div className="mt-2 grid gap-3 md:grid-cols-2">
                                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-50 p-2"><strong>Input</strong>{'\n'}{testCase.input}</pre>
                                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-50 p-2"><strong>Expected output</strong>{'\n'}{testCase.expectedOutput}</pre>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">Submissions ({versionHistory.submissions.length})</h5>
                        {versionHistory.submissions.length === 0 && <p className="mt-2 text-sm text-gray-500">No student runs or submissions for this version.</p>}
                        <div className="mt-3 space-y-3">
                          {versionHistory.submissions.map((submission) => (
                            <article key={submission.id} className="rounded border border-gray-200 p-3 text-sm">
                              <div className="flex flex-wrap justify-between gap-2">
                                <span className="font-semibold text-gray-800">{submission.studentEmail ?? 'Student'} · {submission.score}% ({submission.passedCount}/{submission.totalCount})</span>
                                <time className="text-xs text-gray-500">{new Date(submission.submittedAt).toLocaleString()}</time>
                              </div>
                              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-3 text-xs text-gray-100">{submission.sourceCode}</pre>
                              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                                {submission.results.map((result) => (
                                  <li key={result.testCaseId}>{result.testCaseId}: {result.status} ({result.passed ? 'passed' : 'failed'})</li>
                                ))}
                              </ul>
                            </article>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </section>
              )}
              <Field label="Title" error={fieldErrors.title}>
                <input value={form.title} onChange={(event) => updateField('title', event.target.value)} className={editorInputClass} />
              </Field>
              <Field label="Description" error={fieldErrors.description}>
                <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} className={`${editorInputClass} min-h-28`} />
              </Field>
              <Field label="Constraints" error={fieldErrors.constraints}>
                <textarea value={form.constraints} onChange={(event) => updateField('constraints', event.target.value)} className={`${editorInputClass} min-h-24`} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Input format (or No input)" error={fieldErrors.inputFormat}>
                  <textarea value={form.inputFormat} onChange={(event) => updateField('inputFormat', event.target.value)} className={`${editorInputClass} min-h-24`} />
                </Field>
                <Field label="Output format" error={fieldErrors.outputFormat}>
                  <textarea value={form.outputFormat} onChange={(event) => updateField('outputFormat', event.target.value)} className={`${editorInputClass} min-h-24`} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="CPU time (ms)" error={fieldErrors.cpuTimeLimitMs}>
                  <input type="number" min="1" value={form.cpuTimeLimitMs ?? ''} onChange={(event) => handleNumberChange('cpuTimeLimitMs', event)} className={editorInputClass} />
                </Field>
                <Field label="Memory (MB)" error={fieldErrors.memoryLimitMb}>
                  <input type="number" min="1" value={form.memoryLimitMb ?? ''} onChange={(event) => handleNumberChange('memoryLimitMb', event)} className={editorInputClass} />
                </Field>
                <Field label="Target runtime" error={fieldErrors.runtime}>
                  <select value={form.runtime} onChange={(event) => updateField('runtime', event.target.value as AssignmentForm['runtime'])} className={editorInputClass}>
                    <option value="PYTHON">Python</option>
                    <option value="CPP">C++</option>
                  </select>
                </Field>
              </div>

              <MonacoCodeEditor
                label="Reference solution"
                language={form.runtime === 'CPP' ? 'cpp' : 'python'}
                value={form.referenceSolution}
                onChange={(value) => updateField('referenceSolution', value)}
                error={fieldErrors.referenceSolution ?? fieldErrors.verification}
                height="280px"
              />

              <fieldset className="flex flex-wrap gap-x-6 gap-y-2 border-y border-gray-200 py-3 text-sm text-gray-700">
                <legend className="px-1 font-semibold">Output comparison</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.comparator.normalizeLineEndings}
                    onChange={(event) => updateField('comparator', { ...form.comparator, normalizeLineEndings: event.target.checked })}
                  />
                  Normalize CRLF/LF
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.comparator.trimTrailingNewline}
                    onChange={(event) => updateField('comparator', { ...form.comparator, trimTrailingNewline: event.target.checked })}
                  />
                  Ignore trailing newline
                </label>
              </fieldset>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">Test cases</h4>
                    {fieldErrors.testCases && <p className="mt-1 text-xs text-red-600">{fieldErrors.testCases}</p>}
                  </div>
                  <button type="button" onClick={() => setForm((current) => ({ ...current, testCases: [...current.testCases, emptyTestCase()] }))} className="rounded border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700">Add test case</button>
                </div>
                <div className="space-y-3">
                  {form.testCases.map((test, index) => (
                    <div key={test.id} className="rounded border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-700">Test case {index + 1}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1.5 text-gray-600"><input type="checkbox" checked={test.hidden} onChange={(event) => updateTestCase(index, 'hidden', event.target.checked)} /> Hidden</label>
                          <label className="flex items-center gap-1.5 text-gray-600">Weight <input type="number" min="0.01" step="any" value={test.weight} onChange={(event) => handleWeightChange(index, event)} className="w-20 rounded border border-gray-300 px-2 py-1 text-gray-900" /></label>
                          <span className={test.verified ? 'font-semibold text-green-700' : 'text-gray-500'}>{test.verified ? 'Verified' : 'Not verified'}</span>
                          <button type="button" onClick={() => setForm((current) => ({ ...current, testCases: current.testCases.filter((_, testIndex) => testIndex !== index) }))} className="font-semibold text-red-600">Remove</button>
                        </div>
                      </div>
                      {fieldErrors[`testCases.${index}.weight`] && <p className="mb-2 text-xs text-red-600">{fieldErrors[`testCases.${index}.weight`]}</p>}
                      <div className="grid gap-3 md:grid-cols-2">
                        <MonacoCodeEditor
                          label="Input"
                          language="plaintext"
                          value={test.input}
                          onChange={(value) => updateTestCase(index, 'input', value)}
                          error={fieldErrors[`testCases.${index}.input`]}
                          height="150px"
                        />
                        <MonacoCodeEditor
                          label="Expected output"
                          language="plaintext"
                          value={test.expectedOutput}
                          onChange={(value) => updateTestCase(index, 'expectedOutput', value)}
                          error={fieldErrors[`testCases.${index}.expectedOutput`] ?? fieldErrors[`testCases.${index}.verified`]}
                          height="150px"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                <button type="submit" disabled={saving} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save draft'}</button>
                <button type="button" disabled={saving} onClick={() => void verify()} className="rounded border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Verify reference solution</button>
                <button type="button" disabled={saving} onClick={() => void publish()} className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Publish</button>
                {form.id && <button type="button" disabled={saving || selectedAssignment?.status === 'PUBLISHED'} onClick={() => void remove()} className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Delete draft</button>}
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-gray-700">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
