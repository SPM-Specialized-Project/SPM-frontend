import { Link } from '@tanstack/react-router';

import type { Course } from '@/components/data/~mock-courses';
import ArrowLeft from '@/components/icons/arrow-left';

type CourseDetailHeaderProps = {
  course: Course;
  id: string;
  changing: boolean;
  isManager: boolean;
  onBack: () => void;
  onRate: () => void;
  onToggleChanging: () => void;
};

export function CourseDetailHeader({
  course,
  id,
  changing,
  isManager,
  onBack,
  onRate,
  onToggleChanging,
}: CourseDetailHeaderProps) {
  return (
    <>
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
      >
        <ArrowLeft className="size-5" />
        <span className="font-medium">Quay lại</span>
      </button>

      <div
        className="relative rounded-lg p-8 text-white shadow-lg"
        style={{
          backgroundImage: 'url(' + course.bgImage + ')',
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
            <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
              Tổng quan
            </button>
            <Link
              to={'/course/' + id + '/roster' as any}
              className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
            >
              Danh sách lớp
            </Link>
            {changing && (
              <>
                <Link
                  to={'/course/' + id + '/submissions' as any}
                  className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Bài nộp
                </Link>
                <Link
                  to={'/course/' + id + '/stastical' as any}
                  className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Xem thống kê
                </Link>
              </>
            )}
            {!changing && (
              <button
                onClick={onRate}
                className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
              >
                Đánh giá
              </button>
            )}
          </div>
        </div>

        {isManager && (
          <div className="absolute bottom-4 right-4">
            <label
              htmlFor="editing-toggle"
              className="flex cursor-pointer items-center gap-2 text-white"
            >
              <input
                id="editing-toggle"
                type="checkbox"
                checked={changing}
                onChange={onToggleChanging}
                aria-label="Chỉnh sửa chế độ"
                title="Bật/tắt chế độ chỉnh sửa"
                className="size-4"
              />
              <span className="ml-1">Chỉnh sửa</span>
            </label>
          </div>
        )}
      </div>
    </>
  );
}
