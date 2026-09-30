import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { useDataStore } from '@/services/use-data-store';

import { RatingCourseHeader } from '../components/rating-course-header';
import { readCourseRating } from '../components/rating-data';
import { StarRating } from '../~index';

export const Route = createFileRoute('/_private/course/$id/rating/$ratingid/$index')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id: courseId, ratingid: ratingId } = Route.useParams();
  const courses = useDataStore(courseStore);
  const course = courses.find((item) => item.id === courseId);
  const ratingRecord = useMemo(
    () => (course ? readCourseRating(courseId, ratingId, course.students) : undefined),
    [course, courseId, ratingId],
  );

  if (!course) {
    return (
      <StudyLayout>
        <div className="p-8 text-center text-gray-500">Khóa học không tồn tại.</div>
      </StudyLayout>
    );
  }

  return (
    <StudyLayout>
      <div className="w-full font-['Archivo']">
        <RatingCourseHeader course={course} id={courseId} />

        {/* User Info Card */}
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex size-24 items-center justify-center rounded-full bg-[#4A5568]">
            <svg
              className="size-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* User Details */}
          <div>
            <h2 className="mb-1 text-xl font-semibold text-[#4A5568]">
              {ratingRecord?.studentName ?? 'Không tìm thấy sinh viên'}
            </h2>
            <p className="mb-3 text-sm text-gray-500">
              {ratingRecord?.studentEmail ?? 'Bản đánh giá không thuộc khóa học này.'}
            </p>
            <div className="flex items-center gap-2 text-gray-600">
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">
                {ratingRecord
                  ? new Date(ratingRecord.submittedAt).toLocaleString('vi-VN')
                  : 'Chưa có dữ liệu'}
              </span>
            </div>
          </div>
        </div>

        {ratingRecord ? (
          <>
            <div className="flex w-full items-start gap-6">
              <div className="mt-8 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <div className="bg-[#4A5568] px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">
                    Đánh giá sinh viên: {ratingRecord.studentName}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {ratingRecord.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-6 px-6 py-4 transition hover:bg-gray-50"
                    >
                      <p className="flex-1 text-sm text-gray-700">{item.title}</p>
                      <StarRating rating={item.rating} onRate={() => undefined} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div
              className="mt-4 h-fit w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h3 className="mb-2 font-semibold text-gray-900">Nhận xét của giảng viên</h3>
              <p className="text-gray-700">{ratingRecord.comment}</p>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            Không tìm thấy bản đánh giá thuộc khóa học {courseId}. Vui lòng quay lại danh sách đánh giá.
          </div>
        )}
      </div>
    </StudyLayout>
  );
}
