import type { Dispatch, SetStateAction } from 'react';

import type { Course } from '@/components/data/~mock-courses';
import Icon from '@/components/icons/icon';

import { RatingCourseHeader } from './rating-course-header';
import type { RatingItem } from './rating-types';
import { StarRating } from './star-rating';

type StudentRatingViewProps = {
  course: Course;
  id: string;
  ratings: RatingItem[];
  comment: string;
  setComment: Dispatch<SetStateAction<string>>;
  onRate: (itemId: string, rating: number) => void;
  onConfirm: () => void;
};

export function StudentRatingView({
  course,
  id,
  ratings,
  comment,
  setComment,
  onRate,
  onConfirm,
}: StudentRatingViewProps) {
  return (
    <div className="w-full font-['Archivo']">
      <RatingCourseHeader course={course} id={id} />
      <div className="flex w-full items-start gap-6">
        <div className="mt-8 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="bg-[#4A5568] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Đánh giá môn học</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {ratings.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-6 px-6 py-4 transition hover:bg-gray-50"
              >
                <p className="flex-1 text-sm text-gray-700">{item.title}</p>
                <StarRating rating={item.rating} onRate={(rating) => onRate(item.id, rating)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <FeedbackField
        label="Bạn có nhận xét thế nào về giảng viên"
        placeholder="Đánh giá của bạn về giảng viên"
        comment={comment}
        setComment={setComment}
      />
      <button
        onClick={onConfirm}
        className="mt-8 flex items-center justify-center self-end rounded-lg bg-primary px-4 py-2"
      >
        <p className="font-bold text-white">Xác nhận</p>
      </button>
    </div>
  );
}

export function FeedbackField({
  label,
  placeholder,
  comment,
  setComment,
  className = 'mt-4',
}: {
  label: string;
  placeholder: string;
  comment: string;
  setComment: Dispatch<SetStateAction<string>>;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-row items-center justify-start space-x-4">
        <Icon className="size-6" />
        <p className="font-bold">{label}</p>
      </div>
      <input
        className="mt-4 h-36 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm focus:outline-none"
        style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
        type="text"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
