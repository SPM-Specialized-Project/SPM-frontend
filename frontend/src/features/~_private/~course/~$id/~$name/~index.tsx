import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type SVGProps } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import ArrowLeft from '@/components/icons/arrow-left';
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

export const Route = createFileRoute('/_private/course/$id/$name/')({
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

const getSubmittedAtColor = (submittedAt: string | null, dueDate: string) => {
  if (!submittedAt || !dueDate) return 'text-gray-500';
  const submitted = new Date(submittedAt).getTime();
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return 'text-gray-500';
  return submitted <= due ? 'text-green-600' : 'text-red-600';
};

function SubmissionRow({ entry }: { entry: SubmissionView }) {
  const stuname = entry.student.email.split('@')[0];

  return (
    <tr className="border-b last-of-type:border-0">
      <td className="px-4 py-3">
        <Link to={`/profile/$id` as string} className="font-medium text-blue-600">{entry.student.name}</Link>
        <div className="text-xs text-gray-500">{entry.student.email}</div>
      </td>
      <td className="px-4 py-3">
        <div className={`font-medium ${getScoreColor(entry.score)}`}>
          {entry.score !== null ? entry.score.toFixed(1) : 'Chưa chấm'}
        </div>
      </td>
      <td className="px-4 py-3"><div className="text-gray-700">{entry.feedback || 'Không có nhận xét'}</div></td>
      <td className="px-4 py-3">
        {entry.submittedAt ? (
          <div className={getSubmittedAtColor(entry.submittedAt, entry.assignment.dueDate)}>
            {formatDate(entry.submittedAt)}
            {entry.assignment.dueDate ? <span> (Hạn: {entry.assignment.dueDate})</span> : null}
          </div>
        ) : <div className="text-gray-500">Chưa nộp</div>}
      </td>
      <td className="px-4 py-3">
        <Link to={'/course/$id/$name/$stuname' as any} params={{ id: entry.courseId, name: entry.assignment.id, stuname } as any} className="text-blue-600 hover:underline">
          Xem bài nộp
        </Link>
      </td>
    </tr>
  );
}

function RouteComponent() {
  const { id, name } = Route.useParams();
  const course = courseStore.getById(id);
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerContext] = useState(getCurrentSubmissionViewerContext);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api
      .getSubmissions({
        courseId: id,
        assignmentId: name,
        viewerRole: viewerContext.viewerRole,
        studentEmail: viewerContext.viewerRole === 'student' ? viewerContext.studentEmail : undefined,
      })
      .then((response) => {
        if (active) setSubmissions(response.data.items);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof ApiError ? reason.message : 'Không thể tải dữ liệu bài nộp.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, name, viewerContext]);

  if (!course) {
    return <StudyLayout><div className="p-8 text-center text-gray-500">Khóa học không tồn tại.</div></StudyLayout>;
  }

  return (
    <StudyLayout>
      <div className="w-full font-['Archivo']">
        <Link to={`/course/${id}/` as string} className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>

        <div className="relative rounded-lg p-8 text-white shadow-lg" style={{ backgroundImage: `url(${course.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '250px' }}>
          <div className="relative z-10">
            <p className="mb-2 text-sm font-medium text-gray-200">{course.code}</p>
            <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
            <p className="text-lg text-gray-100">Giảng viên: {course.instructor}</p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[800px] table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tên sinh viên</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Điểm số</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Nhận xét</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Ngày nộp</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Xem bài nộp</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((entry) => <SubmissionRow key={entry.id} entry={entry} />)}
            </tbody>
          </table>
        </div>

        {loading ? <div className="py-10 text-center text-gray-500">Đang tải bài nộp...</div> : null}
        {error ? <div className="py-10 text-center text-red-600">{error}</div> : null}
        {!loading && !error && submissions.length === 0 ? <div className="py-10 text-center text-gray-500">Chưa có dữ liệu bài nộp.</div> : null}
      </div>
    </StudyLayout>
  );
}
