import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';

import { ApiError } from '@/services/api-client';
import {
  codePulseApi,
  type CodePulseAssignment,
  type CodePulseAssignmentInput,
  type CodePulseClassroom,
  type CodePulseTestCase,
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
  testCases: assignment.testCases,
});

const statusLabel = (assignment: CodePulseAssignment) =>
  assignment.status === 'PUBLISHED' ? 'Published' : 'Draft';

export function AssignmentEditor({ classroomId, classroom, canEdit }: AssignmentEditorProps) {
  const [assignments, setAssignments] = useState<CodePulseAssignment[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [form, setForm] = useState<AssignmentForm>(() => emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedId),
    [assignments, selectedId],
  );

  const load = useCallback(async () => {
    if (!classroomId) {
      setAssignments([]);
      setSelectedId(undefined);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await codePulseApi.listAssignments(classroomId);
      setAssignments(response.data.items);
      setSelectedId((current) => current && response.data.items.some((item) => item.id === current)
        ? current
        : response.data.items[0]?.id);
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tải assignment.');
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (selectedAssignment) setForm(toForm(selectedAssignment));
  }, [selectedAssignment]);

  const updateField = <K extends keyof AssignmentForm>(field: K, value: AssignmentForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  };

  const updateTestCase = (index: number, field: keyof CodePulseTestCase, value: string | boolean) => {
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
      setError(reason.message);
      setFieldErrors(reason.errors);
    } else {
      setError(fallback);
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
    setError('');
    setMessage('');
    setFieldErrors({});
    try {
      await persist();
      setMessage('Đã lưu assignment dưới dạng draft.');
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể lưu assignment.');
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    if (!classroomId) return;
    setSaving(true);
    setError('');
    setMessage('');
    setFieldErrors({});
    try {
      const saved = await persist();
      const response = await codePulseApi.verifyAssignment(classroomId, saved.id, form.referenceSolution);
      setAssignments((current) => current.map((item) => item.id === saved.id ? response.data.item : item));
      setForm(toForm(response.data.item));
      setMessage(`Đã verify ${response.data.verification.testCaseCount} test case bằng reference solution.`);
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể verify assignment.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!classroomId) return;
    setSaving(true);
    setError('');
    setMessage('');
    setFieldErrors({});
    try {
      const saved = await persist();
      const response = await codePulseApi.publishAssignment(classroomId, saved.id);
      setAssignments((current) => current.map((item) => item.id === saved.id ? response.data.item : item));
      setForm(toForm(response.data.item));
      setMessage('Assignment đã được publish.');
    } catch (reason: unknown) {
      applyApiError(reason, 'Không thể publish assignment.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!classroomId || !form.id || !window.confirm('Xóa assignment draft này?')) return;
    setSaving(true);
    setError('');
    try {
      await codePulseApi.deleteAssignment(classroomId, form.id);
      setAssignments((current) => current.filter((item) => item.id !== form.id));
      setSelectedId(undefined);
      setForm(emptyForm());
      setMessage('Đã xóa assignment.');
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

  if (!classroomId) return null;

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Assignment authoring</p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">{classroom?.name ?? 'Selected classroom'}</h3>
          <p className="mt-1 text-sm text-gray-600">Drafts are private until a lecturer publishes them.</p>
        </div>
        {canEdit && <button type="button" onClick={() => { setSelectedId(undefined); setForm(emptyForm()); setFieldErrors({}); setMessage(''); setError(''); }} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">New assignment</button>}
      </div>

      {message && <p className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p>}
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
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
                          <span className={test.verified ? 'font-semibold text-green-700' : 'text-gray-500'}>{test.verified ? 'Verified' : 'Not verified'}</span>
                          <button type="button" onClick={() => setForm((current) => ({ ...current, testCases: current.testCases.filter((_, testIndex) => testIndex !== index) }))} className="font-semibold text-red-600">Remove</button>
                        </div>
                      </div>
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
