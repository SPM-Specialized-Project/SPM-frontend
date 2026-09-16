import { Link } from '@tanstack/react-router';

import type { Course } from '@/components/data/~mock-courses';
import { ArrowLeft } from '@/components/icons';

type RatingCourseHeaderProps = {
  course: Course;
  id: string;
  backLink?: boolean;
};

export function RatingCourseHeader({
  course,
  id,
  backLink = true,
}: RatingCourseHeaderProps) {
  return (
    <>
      {backLink ? (
        <Link
          to="/dashboard"
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>
      ) : (
        <button className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </button>
      )}

      <div
        className="relative rounded-lg p-8 text-white shadow-lg"
        style={{
          backgroundImage: `url(${course.bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '250px',
        }}
      >
        <div className="relative z-10">
          <p className="mb-2 text-sm font-medium text-gray-200">{course.code}</p>
          <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
          <p className="text-lg text-gray-100">Giảng viên: {course.instructor}</p>
          <div className="mt-6 flex gap-4">
            <Link
              to={`/course/${id}` as any}
              className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
            >
              Tổng quan
            </Link>
            <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
              Đánh giá
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
