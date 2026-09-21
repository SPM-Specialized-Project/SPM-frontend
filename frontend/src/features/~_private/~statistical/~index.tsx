import { ClockIcon } from '@heroicons/react/24/outline'
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import React, { useState } from 'react';

import boxSvg from '@/assets/box.svg';
import { courseStore } from '@/components/data/~mock-courses';
import ChevronLeft from '@/components/icons/arrow-left';
import ChevronRight from '@/components/icons/arrow-right';
import ChevronDown from '@/components/icons/chevron';
// replaced local double-chevron icons with Heroicons to fix rendering issues
import Search from '@/components/icons/search';
import StudyLayout from '@/components/study-layout';
import { useDataStore } from '@/services/use-data-store';


export const Route = createFileRoute('/statistical/' as any)({
  beforeLoad: async () => {
    document.title = 'Dashboard -  Tutor Support System';
    if (!localStorage.getItem('userStore')) {
      window.location.assign('/login');
    };
    const rawUserStore = localStorage.getItem('userStore');
    const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
    const State = userStore?.state ?? null;
    const userLocalStore = State.user ?? null;
    if (!userLocalStore || !userLocalStore.isCoordinator) {
      window.location.assign('/dashboard');
    }
  },
  component: RouteComponent,
})

const sampleTimes = [
  '19:00 10/10/2024',
  '18:30 11/10/2024',
  '20:00 12/10/2024',
  '08:30 13/10/2024',
]

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

const CourseStatsCard: React.FC<{ course: CourseStat }> = ({ course }) => {
  const navigate = useNavigate();

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

      {/* Phần nút bấm */}
      <div>
        <button
          onClick={() => navigate({ to: '/statistical/reports' })}
          className="whitespace-nowrap rounded-md bg-[#0329E9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Xem thống kê
        </button>
      </div>
    </div>
  );
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  ...props
}) => {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 leading-tight text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <ChevronDown className="size-4" />
      </div>
    </div>
  );
};



function RouteComponent() {
  const courses = useDataStore(courseStore);
  const courseData = toCourseStats(courses);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [sortOrder, setSortOrder] = useState('newest');

  const isFirstDisabled = currentPage === 1;
  const totalPages = Math.max(1, Math.ceil(courseData.length / itemsPerPage));
  const isLastDisabled = currentPage === totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedCourses = courseData.slice(startIndex, endIndex);

  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages;

  return (
    <StudyLayout>
      <div
        className="rounded-lg border border-gray-500 bg-white p-6 shadow-sm"
        style={{ fontFamily: 'Archivo' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">
            Danh sách khóa học
          </h2>
          {/* <Link to={userLocalStore?.isChairman ? '/statistical/overview' : '/statistical/reports'} className="mb-2  rounded-xl bg-[#0329E9] px-10 py-2 text-white hover:bg-gray-50 hover:text-[#0329E9]"> */}
          <Link to={'/statistical/reports'} className="mb-2  rounded-xl bg-[#0329E9] px-10 py-2 text-white hover:bg-gray-50 hover:text-[#0329E9]">

            Phân tích
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="size-5" />
            </span>
            <input
              type="text"
              placeholder="Nhập tên khóa học để tìm kiếm..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
            </Select>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="nameAZ">Tên A-Z</option>
            </Select>
          </div>
        </div>

        {courseData.length === 0 ? (
          <div className="mb-8 flex flex-col items-center justify-center py-12">
            <img
              src={boxSvg}
              alt="Không có khóa học"
              className="mb-6 size-28 opacity-90"
            />
            <p className="text-gray-500">Hiện không có khóa học nào</p>
          </div>
        ) : (
          <div className="mb-8 space-y-4">
            {displayedCourses.map((course) => {
              const courseStat = courseData.find((c) => c.id === course.id)
              return <CourseStatsCard key={course.id} course={courseStat!} />
            })}
          </div>
        )}

        <nav className="flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setCurrentPage(1)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            disabled={isFirstDisabled}
            aria-label="Trang đầu"
            title="Trang đầu"
          >
            <ChevronDoubleLeftIcon className="size-4" />
          </button>

          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            disabled={isPrevDisabled}
            aria-label="Trang trước"
            title="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`size-8 rounded-full transition-colors ${currentPage === i + 1
                ? 'bg-[#0329E9] font-semibold text-white shadow'
                : 'bg-white text-gray-800 shadow-sm hover:bg-blue-50'
                }`}
              aria-label={`Trang ${i + 1}`}
              title={`Trang ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            disabled={isNextDisabled}
            aria-label="Trang sau"
            title="Trang sau"
          >
            <ChevronRight className="size-4" />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            disabled={isLastDisabled}
            aria-label="Trang cuối"
            title="Trang cuối"
          >
            <ChevronDoubleRightIcon className="size-4" />
          </button>
        </nav>
      </div>
    </StudyLayout>
  );
}
