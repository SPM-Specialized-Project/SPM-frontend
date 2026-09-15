import { ClockIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { createFileRoute, Link } from '@tanstack/react-router'

import { courseDriver } from '@/components/data/~mock-courses'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

// 1. Dữ liệu mockup dựa trên hình ảnh
// Sinh ra nhiều khóa học khác nhau (đa dạng tên khoa và nhiều bản ghi)
// Lấy tên môn trực tiếp từ mockCourses để luôn đồng bộ
// (dùng mockCourses.map để tạo dữ liệu hiển thị)

const sampleTimes = [
  '19:00 10/10/2024',
  '18:30 11/10/2024',
  '20:00 12/10/2024',
  '08:30 13/10/2024',
]

// Tạo dữ liệu hiển thị từ mockCourses (mỗi entry lấy title từ mockCourses)
type CourseStat = {
  id: string;
  title: string;
  time: string;
};

const toCourseStats = (courses: ReadonlyArray<{ id: string; title: string }>): CourseStat[] => courses.map((c, i) => ({
  id: c.id,
  title: c.title,
  time: sampleTimes[i % sampleTimes.length],
}))

// 2. Component Con: Card cho mỗi khóa học (để code sạch hơn)
function CourseStatsCard({
  course,
}: {
  course: CourseStat
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-600 bg-white p-5 shadow-custom-yellow">
      {/* Phần thông tin (Tên + Thời gian) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{course.title}</h2>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <ClockIcon className="mr-1.5 size-4 shrink-0" />
          <span>{course.time}</span>
        </div>
      </div>

      {/* Phần nút bấm (Link) */}
      <div>
        <Link
          // Liên kết đến trang reports như bạn yêu cầu
          to="/statistical/reports"
          // Thêm params nếu cần, ví dụ: search: { courseId: course.id }
          className="whitespace-nowrap rounded-md bg-[#0329E9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Xem thống kê
        </Link>
      </div>
    </div>
  )
}

// 3. Component chính của Route
export const Route = createFileRoute('/_private/statistical/overview/')({
  component: RouteComponent,
})

function RouteComponent() {
  const courses = useJsonData(courseDriver);
  const courseData = toCourseStats(courses);

  return (
    <StudyLayout>
      <div className="min-h-full bg-gray-50 p-4 md:p-8">
        {/* 1. Header "Quay lại" */}
        <Link
          to="/statistical"
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>
        <div className="mx-auto max-w-5xl">
          <div className="space-y-4">
            {courseData.map((course) => (
              <CourseStatsCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </div>
    </StudyLayout>
  )
}
