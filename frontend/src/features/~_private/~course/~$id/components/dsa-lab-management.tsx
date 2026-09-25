import { useEffect, useState } from 'react';

import { api } from '@/services/api-client';
import { codePulseApi, type CodePulseClassroom, type CodePulseTerm } from '@/services/codepulse-api';

type DsaLabManagementProps = { courseId: string };

export function DsaLabManagement({ courseId }: DsaLabManagementProps) {
  const [classrooms, setClassrooms] = useState<CodePulseClassroom[]>([]);
  const [terms, setTerms] = useState<CodePulseTerm[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [termId, setTermId] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<string>();
  const canManage = role === 'admin' || role === 'lecturer';
  const [termName, setTermName] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [termReset, setTermReset] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>();

  const load = async () => {
    const [sessionResult, classroomResult, termResult] = await Promise.all([
      api.getSession(),
      codePulseApi.listClassrooms(courseId),
      codePulseApi.listTerms(courseId),
    ]);
    setRole(sessionResult.data.role);
    setClassrooms(classroomResult.data.items);
    setTerms(termResult.data.items);
    setTermId((current) => current || termResult.data.items[0]?.id || '');
  };

  useEffect(() => { void load(); }, [courseId]);

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
        await codePulseApi.createClassroom({ courseId, name, description, termId, lecturerEmail: role === 'admin' ? lecturerEmail : undefined });
      }
      setName('');
      setDescription('');
      setLecturerEmail('');
      setSelectedClassroomId(undefined);
      setMessage(selectedClassroomId ? 'Classroom updated.' : 'Classroom created as Draft.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create classroom.');
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
    if (!selectedClassroomId || !window.confirm('Bạn muốn xóa lớp học này và dữ liệu workspace liên quan?')) return;
    try {
      await codePulseApi.deleteClassroom(selectedClassroomId);
      setSelectedClassroomId(undefined);
      setName('');
      setDescription('');
      setLecturerEmail('');
      setMessage('Classroom deleted.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete classroom.');
    }
  };

  const createTerm = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await codePulseApi.createTerm({ name: termName, startDate: termStart, endDate: termEnd, resetDate: termReset });
      setTermName('');
      setTermStart('');
      setTermEnd('');
      setTermReset('');
      setMessage('Đã tạo học kỳ thành công.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong thể tạo học kỳ.');
    }
  };

  const updateClassroom = async (classroom: CodePulseClassroom, status: CodePulseClassroom['status']) => {
    try {
      await codePulseApi.updateClassroom(classroom.id, { status });
      setMessage('Cập nhật lớp học thành công.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật lớp học.');
    }
  };

  return (
    <section className="border-t border-gray-200 bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">DSA LAB</p><h2 className="mt-1 text-2xl font-bold text-gray-900">Terms and classrooms</h2><p className="mt-1 text-gray-600">Practice spaces are isolated by academic term.</p></div>
        {message && <p className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">{message}</p>}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">{classrooms.map((classroom) => <article key={classroom.id} className="rounded-lg border border-gray-200 bg-white p-4"><div className="flex justify-between gap-4"><button type="button" onClick={() => canManage && selectClassroom(classroom)} className="text-left font-semibold text-gray-900 disabled:cursor-default">{classroom.name}</button>{canManage ? <select aria-label={`Status for ${classroom.name}`} value={classroom.status} onChange={(event) => void updateClassroom(classroom, event.target.value as CodePulseClassroom['status'])} className="rounded border border-gray-300 px-2 py-1 text-xs font-bold text-blue-700"><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select> : <span className="text-xs font-bold text-blue-700">{classroom.status}</span>}</div><p className="mt-1 text-sm text-gray-600">{classroom.term.name} · {classroom.description}</p>{role === 'admin' && <p className="mt-2 text-xs text-gray-500">Lecturer: {classroom.lecturerEmail ?? 'Unassigned'}</p>}</article>)}{classrooms.length === 0 && <p className="rounded-lg bg-white p-6 text-gray-500">No classrooms are available for this account.</p>}</div>
          {canManage && <div className="space-y-6"><form onSubmit={createClassroom} className="rounded-lg border border-gray-200 bg-white p-5"><h3 className="mb-4 text-lg font-semibold text-gray-900">{selectedClassroomId ? 'Edit classroom' : 'Create classroom'}</h3><label className="mb-3 block text-sm text-gray-700">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" /></label><label className="mb-3 block text-sm text-gray-700">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-20 w-full rounded border border-gray-300 px-3 py-2" /></label><label className="mb-4 block text-sm text-gray-700">Term<select required value={termId} onChange={(event) => setTermId(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2">{terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label>{role === 'admin' && <label className="mb-4 block text-sm text-gray-700">Assign lecturer email<input type="email" value={lecturerEmail} onChange={(event) => setLecturerEmail(event.target.value)} placeholder="lecturer@gmail.com" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" /></label>}<div className="flex gap-2"><button type="submit" className="rounded bg-blue-700 px-4 py-2 font-semibold text-white">{selectedClassroomId ? 'Save changes' : 'Create draft'}</button>{selectedClassroomId && <><button type="button" onClick={() => setSelectedClassroomId(undefined)} className="rounded border border-gray-300 px-4 py-2">Cancel</button>{role === 'admin' && <button type="button" onClick={() => void deleteClassroom()} className="rounded bg-red-700 px-4 py-2 font-semibold text-white">Delete</button>}</>}</div></form>{role === 'admin' && <form onSubmit={createTerm} className="rounded-lg border border-gray-200 bg-white p-5"><h3 className="mb-4 text-lg font-semibold text-gray-900">Create academic term</h3><label className="mb-3 block text-sm text-gray-700">Name<input required value={termName} onChange={(event) => setTermName(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" /></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm text-gray-700">Start<input required type="date" value={termStart} onChange={(event) => setTermStart(event.target.value)} className="mt-1 w-full rounded border border-gray-300 p-2" /></label><label className="text-sm text-gray-700">End<input required type="date" value={termEnd} onChange={(event) => setTermEnd(event.target.value)} className="mt-1 w-full rounded border border-gray-300 p-2" /></label><label className="text-sm text-gray-700">Reset<input required type="date" value={termReset} onChange={(event) => setTermReset(event.target.value)} className="mt-1 w-full rounded border border-gray-300 p-2" /></label></div><button type="submit" className="mt-4 rounded bg-slate-900 px-4 py-2 font-semibold text-white">Create term</button></form>}</div>}
        </div>
      </div>
    </section>
  );
}