import type { Dispatch, SetStateAction } from 'react';

import type { Course } from '@/components/data/~mock-courses';

import { FeedbackField } from './student-rating-view';
import { RatingCourseHeader } from './rating-course-header';

type TutorRatingViewProps = {
  course: Course;
  id: string;
  comment: string;
  setComment: Dispatch<SetStateAction<string>>;
  onConfirm: () => void;
};

const studentFeedbackCount = 7;

export function TutorRatingView({
  course,
  id,
  comment,
  setComment,
  onConfirm,
}: TutorRatingViewProps) {
  return (
    <div className="w-full font-['Archivo']">
      <RatingCourseHeader course={course} id={id} backLink={false} />
      {Array.from({ length: studentFeedbackCount }, (_, index) => (
        <FeedbackField
          key={`student-feedback-${index}`}
          label="Bạn có nhận xét thế nào về sinh viên A"
          placeholder="Nhận xét"
          comment={comment}
          setComment={setComment}
          className="mt-6"
        />
      ))}
      <FeedbackField
        label="Bạn có nhận xét thế nào về môn học"
        placeholder="Nhận xét"
        comment={comment}
        setComment={setComment}
        className="mt-6"
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
