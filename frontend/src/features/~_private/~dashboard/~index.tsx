import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';

import boxSvg from '@/assets/box.svg';
import { courseDriver, type Course } from '@/components/data/~mock-courses';
// removed pagination-specific chevron SVG imports - using emoji in controls now
import ChevronRight from '@/components/icons/arrow-right';
import ChevronDown from '@/components/icons/chevron';
import Search from '@/components/icons/search';
import StudyLayout from '@/components/study-layout';
import { useJsonData } from '@/services/use-json-data';

const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  const navigate = useNavigate();  

  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
      onClick={() =>
        navigate({ to: '/course/$id', params: { id: course.id } })
      }
    >
      <div
        className="relative flex h-48 flex-col justify-between bg-black p-4 text-white"
        style={{
          backgroundImage: `url(${course.bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div>
          <p className="text-xs font-medium text-gray-200">{course.code}</p>
          <h3 className="text-xl font-bold leading-tight text-white">
            {course.title}
          </h3>
          <p className="mt-1 text-sm text-gray-100">{course.instructor}</p>
        </div>
        <button
          aria-label="Mở khóa học"
          title="Mở khóa học"
          className="absolute bottom-4 right-4 flex size-10 items-center justify-center rounded-full bg-white text-blue-700 shadow-md transition duration-300 hover:scale-110"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="bg-white p-4">
        <div className="flex justify-around text-center">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-gray-800">
              {course.stats.documents}
            </span>
            <span className="text-xs text-gray-500">Tài liệu</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-gray-800">
              {course.stats.links}
            </span>
            <span className="text-xs text-gray-500">Đường dẫn</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-gray-800">
              {course.stats.assignments}
            </span>
            <span className="text-xs text-gray-500">Bài tập</span>
          </div>
        </div>
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

export const Route = createFileRoute('/_private/dashboard/')({
  component: DashboardComponent,
});

function DashboardComponent() {
  const courses = useJsonData(courseDriver);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter courses by search query
  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      course.title.toLowerCase().includes(query) ||
      course.code.toLowerCase().includes(query) ||
      course.instructor.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedCourses = filteredCourses.slice(startIndex, endIndex);
  

  // Pagination window logic: show up to `maxPageButtons` pages, centered on currentPage when possible
  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  return (
    <StudyLayout>
      <h1
        className="mb-8 text-4xl font-bold text-gray-800"
        style={{ fontFamily: 'Archivo' }}
      >
        Khóa học
      </h1>

      <div
        className="rounded-lg border border-gray-500 bg-white p-6 shadow-sm"
        style={{ fontFamily: 'Archivo' }}
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-700">
          Danh sách khóa học của bạn
        </h2>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="size-5" />
            </span>
            <input
              type="text"
              placeholder="Nhập tên khóa học để tìm kiếm..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
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

        {filteredCourses.length === 0 ? (
          <div className="mb-8 flex flex-col items-center justify-center py-12">
            <img
              src={boxSvg}
              alt="Không có khóa học"
              className="mb-6 size-28 opacity-90"
            />
            <p className="text-gray-500">
              {searchQuery 
                ? `Không tìm thấy khóa học với từ khóa "${searchQuery}"`
                : 'Hiện không có khóa học nào'}
            </p>
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {displayedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}

  <nav className="flex items-center justify-center gap-4 border-t border-gray-100 bg-white p-4">
          <button
            aria-label="First page"
            onClick={() => setCurrentPage(1)}
            className={currentPage === 1 ? 'pagination-btn-disabled' : 'pagination-btn'}
            disabled={currentPage === 1}
          >
            <ChevronDoubleLeftIcon className="size-4" />
          </button>

          <button
            aria-label="Previous page"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            className={currentPage === 1 ? 'pagination-btn-disabled' : 'pagination-btn'}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          <div className="flex items-center gap-4">
              {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                const pageNumber = startPage + i;
                const isActive = pageNumber === currentPage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                      className={isActive ? 'page-number-active' : 'page-number'}
                  >
                    {pageNumber}
                  </button>
                );
              })}
          </div>

          <button
            aria-label="Next page"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            className={currentPage === totalPages ? 'pagination-btn-disabled' : 'pagination-btn'}
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon className="size-4" />
          </button>

          <button
            aria-label="Last page"
            onClick={() => setCurrentPage(totalPages)}
            className={currentPage === totalPages ? 'pagination-btn-disabled' : 'pagination-btn'}
            disabled={currentPage === totalPages}
          >
            <ChevronDoubleRightIcon className="size-4" />
          </button>
        </nav>
      </div>
    </StudyLayout>
  );
}
