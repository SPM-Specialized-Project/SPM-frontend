import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type SVGProps } from 'react';

import { courseDriver } from '@/components/data/~mock-courses';
import { ArrowLeft } from '@/components/icons';
import StudyLayout from '@/components/study-layout';
import { BackendDriverError, backendDriver } from '@/services/backend-driver';
import type { SubmissionView, SubmissionViewerRole } from '@/types/submission';
import filePDF from '/group07_report 02.pdf';

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9.99 0C4.47 0 0 4.48 0 10C0 15.52 4.47 20 9.99 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 9.99 0ZM10 18C5.58 18 2 14.42 2 10C2 5.58 5.58 2 10 2C14.42 2 18 5.58 18 10C18 14.42 14.42 18 10 18ZM10.5 5H9V11L14.25 14.15L15 12.92L10.5 10.25V5Z" fill="#3D4863" />
    </svg>
  );
}
export function UserCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M23.3333 0C10.4533 0 0 10.4533 0 23.3333C0 36.2133 10.4533 46.6667 23.3333 46.6667C36.2133 46.6667 46.6667 36.2133 46.6667 23.3333C46.6667 10.4533 36.2133 0 23.3333 0ZM23.3333 7C27.2067 7 30.3333 10.1267 30.3333 14C30.3333 17.8733 27.2067 21 23.3333 21C19.46 21 16.3333 17.8733 16.3333 14C16.3333 10.1267 19.46 7 23.3333 7ZM23.3333 40.1333C17.5 40.1333 12.3433 37.1467 9.33333 32.62C9.40333 27.9767 18.6667 25.4333 23.3333 25.4333C27.9767 25.4333 37.2633 27.9767 37.3333 32.62C34.3233 37.1467 29.1667 40.1333 23.3333 40.1333Z" fill="#3D4863" />
    </svg>
  );
}

export const Route = createFileRoute('/_private/course/$id/$name/$stuname/' as any)({
  component: RouteComponent,
});

const getScoreColor = (score: number | null) => {
  if (score === null) return 'text-gray-500';
  if (score >= 7) return 'text-green-600';
  if (score >= 5) return 'text-[#F9BA08]';
  return 'text-[#EA4335]';
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : 'Chưa nộp';

const getCurrentStudentEmail = () => {
  const rawUserStore = localStorage.getItem('userStore');
  try {
    const userStore = rawUserStore ? JSON.parse(rawUserStore) as { state?: { user?: { email?: string } } } : null;
    return userStore?.state?.user?.email;
  } catch {
    return undefined;
  }
};

function RouteComponent() {
  const { id, name, stuname } = Route.useParams();
  const course = courseDriver.getById(id);
  const [viewerRole] = useState<SubmissionViewerRole>(() => localStorage.getItem('role') === 'tutor' ? 'tutor' : 'student');
  const [matchingEntry, setMatchingEntry] = useState<SubmissionView | null>(null);
  const [activeTab, setActiveTab] = useState<'baiLam' | 'nhanXet'>('baiLam');
  const [comment, setComment] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    backendDriver
      .getSubmissions({
        courseId: id,
        assignmentId: name,
        viewerRole,
        studentEmail: viewerRole === 'student' ? getCurrentStudentEmail() : undefined,
      })
      .then((response) => {
        if (!active) return;
        const normalizedSlug = stuname.toLowerCase();
        const entry = response.data.items.find(
          (item) => item.student.email.split('@')[0].toLowerCase() === normalizedSlug,
        ) ?? response.data.items[0] ?? null;
        setMatchingEntry(entry);
        setComment(entry?.feedback ?? '');
        setScore(entry?.score ?? null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof BackendDriverError ? reason.message : 'Không thể tải bài nộp.');
        setMatchingEntry(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, name, stuname, viewerRole]);

  useEffect(() => {
    if (!matchingEntry) return;
    setHasChanges(score !== matchingEntry.score || comment !== matchingEntry.feedback);
  }, [comment, matchingEntry, score]);

  const handleSave = async () => {
    if (!matchingEntry || !hasChanges || !matchingEntry.permissions.canReview) return;

    setSaving(true);
    try {
      const response = await backendDriver.updateSubmission({
        submissionId: matchingEntry.id,
        viewerRole,
        score,
        feedback: comment,
      });
      setMatchingEntry(response.data.item);
      setComment(response.data.item.feedback);
      setScore(response.data.item.score);
      setHasChanges(false);
      alert('Đã lưu thành công!');
    } catch (reason: unknown) {
      setError(reason instanceof BackendDriverError ? reason.message : 'Không thể lưu bài nộp.');
    } finally {
      setSaving(false);
    }
  };

  if (!course) {
    return <StudyLayout><div className="p-8 text-center text-gray-500">Khóa học không tồn tại.</div></StudyLayout>;
  }

  if (loading) {
    return <StudyLayout><div className="p-8 text-center text-gray-500">Đang tải bài nộp...</div></StudyLayout>;
  }

  if (error || !matchingEntry) {
    return (
      <StudyLayout>
        <Link to={`/course/${id}/${name}` as string} className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>
        <div className="rounded-lg bg-white p-8 text-center text-gray-700 shadow-md">
          <h1 className="text-xl font-bold">Không tìm thấy bài nộp</h1>
          <p>{error || `Không tìm thấy dữ liệu cho sinh viên "${stuname}".`}</p>
        </div>
      </StudyLayout>
    );
  }

  const scoreColor = getScoreColor(score);
  const canReview = matchingEntry.permissions.canReview;
  const fileUrl = matchingEntry.fileUrl ?? filePDF;

  return (
    <StudyLayout>
      <div className="w-full font-['Archivo']">
        <Link to="/course/$id/$name" params={{ id, name } as any} className="mb-6 flex items-center gap-2 text-sm font-medium text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeftIcon className="size-5" />
          <span>Quay lại</span>
        </Link>

        <header className="flex items-center gap-4">
          <UserCircleIcon className="size-20 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{matchingEntry.student.name}</h1>
            <p className="text-sm text-gray-500">{matchingEntry.student.email}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="size-4" />
              <span>{formatDate(matchingEntry.submittedAt)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Điểm: </span>
              <input type="number" min="0" max="10" step="0.5" value={score ?? ''} onChange={(event) => setScore(event.target.value === '' ? null : Number(event.target.value))} disabled={!canReview} aria-label="Điểm số" className={`w-20 rounded-md border-gray-300 px-2 py-1 text-sm font-bold ${scoreColor} shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100`} />
            </div>
          </div>
        </header>

        <div className="mt-8 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap items-center gap-x-2 gap-y-1">
            <button onClick={() => setActiveTab('baiLam')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'baiLam' ? 'bg-[#0329E9] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Bài làm</button>
            <button onClick={() => setActiveTab('nhanXet')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'nhanXet' ? 'bg-[#0329E9] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Nhận xét</button>
            <a href={fileUrl} download className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[#0329E9] transition hover:bg-blue-50"><ArrowDownTrayIcon className="size-5" />Tải bài làm</a>
            {canReview ? <button onClick={handleSave} disabled={!hasChanges || saving} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${hasChanges && !saving ? 'text-[#0329E9] hover:bg-blue-50' : 'cursor-not-allowed text-gray-400'}`}>{saving ? 'Đang lưu...' : 'Cập nhật'}</button> : <span className="rounded-lg px-4 py-2 text-sm text-gray-400">Student chỉ có quyền xem</span>}
            <span className={`rounded-lg px-4 py-2 text-sm font-medium ${hasChanges ? 'text-orange-600' : 'text-gray-400'}`}>{hasChanges ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'baiLam' ? <div className="rounded-lg bg-white p-4 shadow-xl md:p-6"><div className="aspect-[3/4] max-h-[1000px] w-full overflow-hidden rounded-md border border-gray-200"><iframe src={fileUrl} className="size-full" title={`Bài nộp của ${matchingEntry.student.name}`} /></div></div> : null}
          {activeTab === 'nhanXet' ? <div className="rounded-lg border border-gray-300 bg-white p-4 md:p-6"><h2 className="text-base font-semibold text-gray-900">Nhận xét:</h2><div className="mt-4"><textarea rows={10} name="comment" id="comment" className="block w-full rounded-md border-black p-4 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm" placeholder="Nhập nhận xét..." value={comment} onChange={(event) => setComment(event.target.value)} disabled={!canReview} /></div><div className="mt-4 flex justify-end"><button type="button" onClick={handleSave} disabled={!hasChanges || saving || !canReview} className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition ${hasChanges && canReview && !saving ? 'bg-[#0329E9] hover:bg-blue-700' : 'cursor-not-allowed bg-gray-400'}`}>{saving ? 'Đang lưu...' : 'Lưu nhận xét'}</button></div></div> : null}
        </div>
      </div>
    </StudyLayout>
  );
}
