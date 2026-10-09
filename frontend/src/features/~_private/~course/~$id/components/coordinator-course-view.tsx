import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { Course } from '@/components/data/~mock-courses';
import { getCurrentViewerContext } from '@/services/viewer-context';

import { CoursePageHeader } from './course-detail-header';
import { getCourseHeaderVisibility, type CourseHeaderActiveTab } from './course-header-tabs';

type CoordinatorCourseViewProps = {
  course: Course;
  onBack: () => void;
  onRate: () => void;
  onOverview?: () => void;
  activeTab?: CourseHeaderActiveTab;
  children?: ReactNode;
};

const statisticCards = [
  { key: 'documents', label: 'Tài liệu học tập', className: 'text-[#0329E9]' },
  { key: 'links', label: 'Đường dẫn tham khảo', className: 'text-green-600' },
  { key: 'assignments', label: 'Bài tập được giao', className: 'text-orange-600' },
] as const;

export function CoordinatorCourseView({
  course,
  onBack,
  onRate,
  onOverview,
  activeTab = 'overview',
  children,
}: CoordinatorCourseViewProps) {
  const { viewerRole } = getCurrentViewerContext();
  const { showTermsTab, showManagerTabs } = getCourseHeaderVisibility(course.id, viewerRole);

  return (
    <div>
      <CoursePageHeader
        course={course}
        id={course.id}
        active={activeTab}
        showTermsTab={showTermsTab}
        showManagerTabs={showManagerTabs}
        backAction={onBack}
        onOverview={onOverview}
        onRating={onRate}
      />

      <div className="mt-6">
        {children ?? <CoordinatorCourseOverviewContent course={course} />}
      </div>
    </div>
  );
}

export function CoordinatorCourseOverviewContent({ course }: { course: Course }) {
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        {statisticCards.map(({ key, label, className }) => (
          <div
            key={key}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <div className={`mb-2 text-3xl font-bold ${className}`}>
              {course.stats[key]}
            </div>
            <div className="text-sm font-medium text-gray-600">{label}</div>
          </div>
        ))}
        <div
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
        >
          <div className="mb-2 text-3xl font-bold text-purple-600">
            {course.sessionsOrganized}
          </div>
          <div className="text-sm font-medium text-gray-600">
            Buổi học đã tổ chức
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <InfoCard title="Thông tin khóa học">
          <div className="space-y-3 text-gray-600">
            <p><span className="font-semibold">Mã khóa học:</span> {course.code}</p>
            <p><span className="font-semibold">Tên khóa học:</span> {course.title}</p>
            <p><span className="font-semibold">Giảng viên:</span> {course.instructor}</p>
          </div>
        </InfoCard>

        <InfoCard title="Mô tả khóa học">
          <p className="text-gray-600">
            Đây là khóa học {course.title}. Khóa học cung cấp kiến thức nền tảng
            và thực hành về lĩnh vực này. Sinh viên sẽ được học tập qua các tài
            liệu, bài giảng và bài tập thực hành.
          </p>
        </InfoCard>

        <InfoCard title="Tài liệu học tập">
          <div className="text-gray-600">
            <p className="mb-2">
              Có <span className="font-semibold">{course.stats.documents}</span>{' '}
              tài liệu có sẵn trong khóa học này.
            </p>
            <p className="text-sm text-gray-500">
              Tài liệu sẽ được cập nhật trong các phiên bản tương lai.
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Danh sách học viên">
          <div className="text-gray-600">
            <p className="mb-4">
              Tổng số học viên:{' '}
              <span className="font-semibold">{course.students.length}</span>
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <TableHeader>STT</TableHeader>
                    <TableHeader>Họ và tên</TableHeader>
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Số bài nộp</TableHeader>
                    <TableHeader>Số buổi tham gia</TableHeader>
                    <TableHeader>Điểm trung bình</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {course.students.map((student, index) => (
                    <tr key={`${student.email}-${index}`} className="hover:bg-gray-50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Link to={`/profile/$id` as string} className="text-sm font-medium text-gray-800">
                          {student.name}
                        </Link>
                      </TableCell>
                      <TableCell muted>{student.email}</TableCell>
                      <TableCell centered>
                        {student.numberOfSubmissions ?? 0} / {course.stats.assignments}
                      </TableCell>
                      <TableCell centered>
                        {student.numberOfJoinedSessions ?? 0} / {course.numberTotalSessions ?? 0}
                      </TableCell>
                      <TableCell centered>{student.averageScore ?? 0}</TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </InfoCard>
      </div>
    </>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
    >
      <h2 className="mb-4 text-2xl font-bold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
  centered = false,
  muted = false,
}: {
  children: ReactNode;
  centered?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-sm ${
        centered ? 'text-center' : 'text-left'
      } ${muted ? 'text-gray-600' : 'text-gray-900'}`}
    >
      {children}
    </td>
  );
}
