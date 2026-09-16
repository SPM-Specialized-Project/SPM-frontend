import { useState } from 'react';

import type { Course } from '@/components/data/~mock-courses';

import { RatingCourseHeader } from './rating-course-header';
import { StarRating } from './star-rating';


type CoordinatorRatingViewProps = {
  course: Course;
  id: string;
  onViewRating: (id: string) => void;
};

export function CoordinatorRatingView({
  course,
  id,
  onViewRating,
}: CoordinatorRatingViewProps) {
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('Cũ nhất');

  return (
    <div className="w-full font-['Archivo']">
      <RatingCourseHeader course={course} id={id} />
      <div className="mt-8 flex items-center gap-4">
        <SearchField
          value={searchName}
          onChange={setSearchName}
          placeholder="Nhập tên người dùng để tìm kiếm ..."
        />
        <SearchField
          value={searchEmail}
          onChange={setSearchEmail}
          placeholder="Nhập email học sinh để tìm kiếm ..."
        />
        <select
          aria-label="Selection filter status"
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="rounded-lg border border-gray-300 px-6 py-3 focus:border-blue-500 focus:outline-none"
        >
          <option>Cũ nhất</option>
          <option>Mới nhất</option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className="relative rounded-lg border-2 border-gray-400 bg-white p-6 shadow-custom-yellow"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-gray-300">
                  <UserIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Nguyễn Trần Văn AAA</h3>
                  <p className="text-sm text-gray-500">nguyentranvanaaa123456789@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <ClockIcon />
                <span className="text-sm">19:00 {10 + index}/10/2024</span>
              </div>
            </div>
            <div className="absolute bottom-10 right-3">
              <StarRating rating={4} onRate={() => undefined} />
            </div>
            <p className="text-[12px] italic">
              In MiniGo, an identifier is the name used to identify variables,
              constants, types, functions...
            </p>
            <button
              onClick={() => onViewRating(`/course/${id}/rating/1/${index}`)}
              className="mt-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              Xem đánh giá
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none"
      />
      <svg
        className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
}

function UserIcon() {
  return (
    <svg className="size-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
