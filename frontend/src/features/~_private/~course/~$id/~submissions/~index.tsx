import { createFileRoute, Link } from '@tanstack/react-router';
import { type SVGProps, useEffect, useMemo, useState } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import ArrowLeft from '@/components/icons/arrow-left';
import Search from '@/components/icons/search';
import StudyLayout from '@/components/study-layout';
import { ApiError, api } from '@/services/api-client';
import { getCurrentSubmissionViewerContext } from '@/services/viewer-context';
import type { SubmissionView } from '@/types/submission';

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

export const Route = createFileRoute('/_private/course/$id/submissions/')({
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

function SubmissionItem({ entry, courseId }: { entry: SubmissionView; courseId: string }) {
  const { student, assignment, submittedAt, score } = entry;
  const stuname = student.email.split('@')[0];

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-white p-5 shadow-custom-yellow">
      <div className="flex items-center gap-4">
        <UserCircleIcon className="size-12 shrink-0 text-gray-500" />
        <div className="flex flex-col gap-1.5">
          <div>
            <Link to={`/profile/$id` as string} className="text-xs font-semibold text-blue-600">
              {student.name}
            </Link>
            <p className="text-sm text-gray-500">{student.email}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ClockIcon className="size-4" />
            <span>{formatDate(submittedAt)}</span>
          </div>
          <div className="text-sm text-gray-600">
            Bài nộp: <span className="font-medium text-gray-900">{assignment.title}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        {score !== null ? (
          <span className={`text-xl font-bold ${getScoreColor(score)}`}>
            {score.toLocaleString('vi-VN')} điểm
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-500">Chưa chấm</span>
        )}
        <Link
          to={'/course/$id/$name/$stuname' as any}
          params={{ id: courseId, name: assignment.id, stuname } as any}
          className="rounded-lg bg-[#0329E9] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Xem bài nộp
        </Link>
      </div>
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const course = courseStore.getById(id);
  const [searchEmail, setSearchEmail] = useState('');
  const [sortOrder, setSortOrder] = useState('Cũ nhất');
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = Route.useNavigate();
  const viewerContext = useMemo(() => getCurrentSubmissionViewerContext(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api
      .getSubmissions({
        courseId: id,
        viewerRole: viewerContext.viewerRole,
        studentEmail: viewerContext.viewerRole === 'student'
          ? viewerContext.studentEmail
          : undefined,
      })
      .then((response) => {
        if (active) setSubmissions(response.data.items.filter((item) => item.submittedAt));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof ApiError ? reason.message : 'Không thể tải bài nộp.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, viewerContext]);

  const displayedSubmissions = useMemo(
    () =>
      [...submissions]
        .filter((entry) => entry.student.email.toLowerCase().includes(searchEmail.toLowerCase()))
        .sort((a, b) => {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return sortOrder === 'Mới nhất' ? dateB - dateA : dateA - dateB;
        }),
    [searchEmail, sortOrder, submissions],
  );

  if (!course) {
    return <StudyLayout><div className="p-8 text-center text-gray-500">Khóa học không tồn tại.</div></StudyLayout>;
  }

  return (
    <StudyLayout>
      <button
        onClick={() => navigate({ to: `/course/${id}` })}
        className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
      >
        <ArrowLeft className="size-5" />
        <span className="font-medium">Quay lại</span>
      </button>

      <div
        className="relative mb-8 rounded-lg p-8 text-white shadow-lg"
        style={{ backgroundImage: `url(${course.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '250px' }}
      >
        <div className="relative z-10">
          <p className="mb-2 text-sm font-medium text-gray-200">{course.code}</p>
          <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
          <p className="text-lg text-gray-100">Giảng viên: {course.instructor}</p>
          <div className="mt-6 flex gap-4">
            <button onClick={() => navigate({ to: `/course/${id}` })} className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] transition hover:bg-white/80">Tổng quan</button>
            <button onClick={() => navigate({ to: `/course/${id}/rating` })} className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] transition hover:bg-white/80">Đánh giá</button>
          </div>
        </div>
      </div>

      <h1 className="mb-6 text-3xl font-bold text-gray-800">Tất cả bài nộp</h1>
      <div className="flex w-full items-center gap-4 bg-white pb-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="size-5 text-gray-400" aria-hidden="true" /></div>
          <input type="text" name="searchEmail" id="searchEmail" className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6" placeholder="Nhập email học sinh để tìm kiếm ..." value={searchEmail} onChange={(event) => setSearchEmail(event.target.value)} />
        </div>
        <select aria-label="Sắp xếp bài nộp theo" id="sort" name="sort" className="block min-w-[120px] rounded-lg border-gray-300 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option>Cũ nhất</option>
          <option>Mới nhất</option>
        </select>
      </div>

      {loading ? <div className="py-10 text-center text-gray-500">Đang tải bài nộp...</div> : null}
      {error ? <div className="py-10 text-center text-red-600">{error}</div> : null}
      {!loading && !error ? (
        <div className="space-y-6">
          {displayedSubmissions.length > 0 ? displayedSubmissions.map((entry) => <SubmissionItem key={entry.id} entry={entry} courseId={id} />) : <div className="py-10 text-center text-gray-500">Không tìm thấy bài nộp nào.</div>}
        </div>
      ) : null}
    </StudyLayout>
  );
}
