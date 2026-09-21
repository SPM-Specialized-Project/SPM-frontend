import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { courseStore } from '@/components/data/~mock-courses';
import ArrowLeft from '@/components/icons/arrow-left';
import StudyLayout from '@/components/study-layout';
import { useDataStore } from '@/services/use-data-store';


export const Route = createFileRoute('/_private/statistical/$id/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const courses = useDataStore(courseStore);
  const course = courses.find((c) => c.id === id);

  // Refs for scroll spy - now using string keys from content types
  if (!course) {
    return (
      <StudyLayout>
        <div className="p-6">
          <div className="rounded bg-white p-6">
            <p className="text-gray-700">Khóa học không tồn tại hoặc đã bị xóa.</p>
            <div className="mt-4">
              <button
                onClick={() => navigate({ to: '/statistical/overview' })}
                className="rounded-md bg-blue-700 px-4 py-2 text-white"
              >
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      </StudyLayout>
    );
  }
  return (
    <StudyLayout>
      <div>
        {/* Back button */}
        <button
          onClick={() => navigate({ to: '/statistical' })}
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </button>

        {/* Course header with background */}
        <div
          className="relative mb-8 rounded-lg p-8 text-white shadow-lg"
          style={{
            backgroundImage: `url(${course.bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '250px',
          }}
        >
          <div className="relative z-10">
            <p className="mb-2 text-sm font-medium text-gray-200">
              {course.code}
            </p>
            <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
            <p className="text-lg text-gray-100">
              Giảng viên: {course.instructor}
            </p>

            {/* Button "tổng quan" + "Đánh giá" */}
            <div className="mt-6 flex gap-4">
              <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
                Tổng quan
              </button>
              <button
                onClick={() => {
                  navigate({ to: `/course/${id}/rating` });
                }}
                className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
              >
                Đánh giá
              </button>
            </div>
          </div>
  </div>

        {/* Course statistics */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <div className="mb-2 text-3xl font-bold text-[#0329E9]">
              {course.stats.documents}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Tài liệu học tập
            </div>
          </div>
          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <div className="mb-2 text-3xl font-bold text-green-600">
              {course.stats.links}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Đường dẫn tham khảo
            </div>
          </div>
          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <div className="mb-2 text-3xl font-bold text-orange-600">
              {course.stats.assignments}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Bài tập được giao
            </div>
          </div>
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

        {/* Course content sections */}
        <div className="space-y-6">
          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Thông tin khóa học
            </h2>
            <div className="space-y-3 text-gray-600">
              <p>
                <span className="font-semibold">Mã khóa học:</span>{" "}
                {course.code}
              </p>
              <p>
                <span className="font-semibold">Tên khóa học:</span>{" "}
                {course.title}
              </p>
              <p>
                <span className="font-semibold">Giảng viên:</span>{" "}
                {course.instructor}
              </p>
            </div>
          </div>

          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Mô tả khóa học
            </h2>
            <p className="text-gray-600">
              Đây là khóa học {course.title}. Khóa học cung cấp kiến thức nền
              tảng và thực hành về lĩnh vực này. Sinh viên sẽ được học tập qua
              các tài liệu, bài giảng và bài tập thực hành.
            </p>
          </div>

          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Tài liệu học tập
            </h2>
            <div className="text-gray-600">
              <p className="mb-2">
                Có{' '}
                <span className="font-semibold">{course.stats.documents}</span>{" "}
                tài liệu có sẵn trong khóa học này.
              </p>
              <p className="text-sm text-gray-500">
                Tài liệu sẽ được cập nhật trong các phiên bản tương lai.
              </p>
            </div>
          </div>

          <div
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Danh sách học viên
            </h2>
            <div className="text-gray-600">
              <p className="mb-4">
                Tổng số học viên:{' '}
                <span className="font-semibold">{course.students.length}</span>
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        STT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Họ và tên
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {course.students.map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {student.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {student.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
}
