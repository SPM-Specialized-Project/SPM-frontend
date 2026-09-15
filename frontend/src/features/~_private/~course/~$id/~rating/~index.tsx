/* eslint-disable @typescript-eslint/no-unused-vars */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, useEffect } from 'react';

import { courseDriver } from '@/components/data/~mock-courses';
import { ArrowLeft } from '@/components/icons';
import Icon from '@/components/icons/icon';
import StudyLayout from '@/components/study-layout';
import { useJsonData } from '@/services/use-json-data';
import storage from '@/utils/storage';

export const Route = createFileRoute('/_private/course/$id/rating/')({
  component: RouteComponent,
});

export interface RatingItem {
  id: string;
  title: string;
  rating: number;
}

interface User {
  address: string;
  appleId: string | null;
  createdAt: string;
  dateOfBirth: string | null;
  email: string;
  firstName: string;
  googleId: string;
  highSchool: string | null;
  isChairman: boolean;
  isCoordinator: boolean;
  isManager: boolean;
  isStudent: boolean;
  isTutor: boolean;
  lastName: string;
  phone: string | null;
  picture: string | null;
  statisticalPermission: boolean;
  updatedAt: string;
  _id: string;
}

interface UserStoreState {
  balance: number;
  isStudent: boolean;
  lastUpdatedDate: string;
  user: User;
}

interface UserStore {
  state: UserStoreState;
  version: number;
}

export function StarRating({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <svg
            className="size-6"
            fill={star <= (hover || rating) ? '#FFC107' : '#D1D5DB'}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const courses = useJsonData(courseDriver);
  const course = useMemo(() => {
    return courses.find((c) => c.id === id) ?? courses[0];
  }, [courses, id]);
  const [comment, setComment] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('Cũ nhất');

  const userStore = storage.getItem('userStore') as UserStore | null;

  const navigate = useNavigate();
  // console.log('userStore', userStore);

  // Role checking variables
  const isStudent = userStore?.state?.user?.isStudent ?? false;

  const isCoordinator = userStore?.state?.user?.isCoordinator ?? false;
  const isTutor = userStore?.state?.user?.isTutor ?? false;
  // const isTutor = true;
  const hasStatisticalPermission =
    userStore?.state?.user?.statisticalPermission ?? false;

  const [ratings, setRatings] = useState<RatingItem[]>(() => {
    const saved = localStorage.getItem(`course-ratings-${id}`);
    if (saved) {
      return JSON.parse(saved);
    }
    // Default data
    return Array.from({ length: 11 }, (_, i) => ({
      id: `rating-${i + 1}`,
      title:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ipsum magna, rutrum tempus urna quis, cursus porttitor neque. Aliquam commodo enim sit.',
      rating: 3,
    }));
  });

  useEffect(() => {
    localStorage.setItem(`course-ratings-${id}`, JSON.stringify(ratings));
  }, [ratings, id]);

  const handleRate = (itemId: string, newRating: number) => {
    setRatings((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, rating: newRating } : item,
      ),
    );
  };

  // When the user confirms their ratings/comments, persist and navigate
  const handleConfirm = () => {
    // Ensure we persist the latest ratings (effect also keeps localStorage up-to-date)
    // localStorage.setItem(`course-ratings-${id}`, JSON.stringify(ratings));
    alert('Đã lưu đánh giá');
    // Navigate back to the overview page
    setTimeout(() => {
    window.location.assign(`/course/${id}`)
    }, 500);
  };

  if (isStudent)
    return (
      <StudyLayout>
        <div className="w-full font-['Archivo']">
          {/* Back button */}
          <Link
            // onClick={() => navigate({ to: '/dashboard' })}
            to="/dashboard"
            className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
          >
            <ArrowLeft className="size-5" />
            <span className="font-medium">Quay lại</span>
          </Link>

          {/* Course header */}
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
              <p className="mb-2 text-sm font-medium text-gray-200">
                {course.code}
              </p>
              <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-gray-100">
                Giảng viên: {course.instructor}
              </p>

              {/* Button "tổng quan" + "Đánh giá" */}
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

          <div className="flex w-full items-start gap-6">
            {/* Rating Table */}
            <div className="mt-8 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
              <div className="bg-[#4A5568] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">
                  Đánh giá môn học
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {ratings.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-6 px-6 py-4 transition hover:bg-gray-50"
                  >
                    <p className="flex-1 text-sm text-gray-700">{item.title}</p>
                    <StarRating
                      rating={item.rating}
                      onRate={(newRating) => handleRate(item.id, newRating)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về giảng viên</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Đánh giá của bạn về giảng viên"
          ></input>
        </div>
        <button
          onClick={handleConfirm}
          className="mt-8 flex items-center justify-center self-end rounded-lg bg-primary px-4 py-2"
        >
          <p className="font-bold text-white">Xác nhận</p>
        </button>
      </StudyLayout>
    );
  else if (isTutor) {
    return (
      <StudyLayout>
        <div className="w-full font-['Archivo']">
          {/* Back button */}
          <button
            //   onClick={() => navigate({ to: '/dashboard' })}
            className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
          >
            <ArrowLeft className="size-5" />
            <span className="font-medium">Quay lại</span>
          </button>

          {/* Course header */}
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
              <p className="mb-2 text-sm font-medium text-gray-200">
                {course.code}
              </p>
              <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-gray-100">
                Giảng viên: {course.instructor}
              </p>

              {/* Button "tổng quan" + "Đánh giá" */}
              <div className="mt-6 flex gap-4">
                <Link
                  to={`/course/${id}` as any}
                  className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Tổng quan
                </Link>

                {/* {!changing && ( */}
                <button
                  // onClick={() => {
                  //   navigate({ to: `/course/${id}/rating` });
                  // }}
                  className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80"
                >
                  Đánh giá
                </button>
                {/* )} */}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về sinh viên A</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
          <div className="mt-6 flex flex-row items-center justify-start space-x-4">
            <Icon className="size-6" />
            <p className="font-bold">Bạn có nhận xét thế nào về môn học</p>
          </div>
          <input
            className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
            style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            type="text"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
            }}
            placeholder="Nhận xét"
          ></input>
        </div>
        <button 
          onClick={handleConfirm}
        className="mt-8 flex items-center justify-center self-end rounded-lg bg-primary px-4 py-2">
          <p className="font-bold text-white">Xác nhận</p>
        </button>
      </StudyLayout>
    );
  } else if (isCoordinator) {
    return (
      <StudyLayout>
        <div className="w-full font-['Archivo']">
          {/* Back button */}
          <Link
            to='/dashboard'
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700">
            <ArrowLeft className="size-5" />
            <span className="font-medium">Quay lại</span>
          </Link>

          {/* Course header */}
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
              <p className="mb-2 text-sm font-medium text-gray-200">
                {course.code}
              </p>
              <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-gray-100">
                Giảng viên: {course.instructor}
              </p>

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

          {/* Search and Filter Section */}
          <div className="mt-8 flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập tên người dùng để tìm kiếm ..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
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

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập email học sinh để tìm kiếm ..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
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

            <select
              aria-label="Selection filter status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-6 py-3 focus:border-blue-500 focus:outline-none"
            >
              <option>Cũ nhất</option>
              <option>Mới nhất</option>
            </select>
          </div>

          {/* Student Rating Cards */}
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="relative rounded-lg border-2 border-gray-400 bg-white p-6 shadow-custom-yellow"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-gray-300">
                      <svg
                        className="size-8 text-gray-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Nguyễn Trần Văn AAA
                      </h3>
                      <p className="text-sm text-gray-500">
                        nguyentranvanaaa123456789@gmail.com
                      </p>
                    </div>
                  </div>
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
                    <span className="text-sm">19:00 {10 + index}/10/2024</span>
                  </div>
                </div>
                <div className="absolute bottom-10 right-3 ">
                  <StarRating
                    rating={4}
                    onRate={(newRating) => {
                      void newRating;
                    }}
                  />
                </div>

                <p className="text-[12px] italic">
                  In MiniGo, an identifier is the name used to identify
                  variables, constants, types, functions...
                </p>
                <button
                  onClick={() => {
                    navigate({ to: `/course/${id}/rating/1/$index` });
                  }}
                  className="mt-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  Xem đánh giá
                </button>
              </div>
            ))}
          </div>
        </div>
      </StudyLayout>
    );
  }
}
