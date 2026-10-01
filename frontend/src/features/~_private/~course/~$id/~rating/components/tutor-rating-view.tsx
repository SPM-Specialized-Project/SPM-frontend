import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import type { Course } from '@/components/data/~mock-courses';

import { RatingCourseHeader } from './rating-course-header';
import { FeedbackField } from './student-rating-view';

type TutorRatingViewProps = {
  course: Course;
  id: string;
  comment: string;
  setComment: Dispatch<SetStateAction<string>>;
  onConfirm: () => void;
};

export function TutorRatingView({
  course,
  id,
  comment,
  setComment,
  onConfirm,
}: TutorRatingViewProps) {
  const [studentComments, setStudentComments] = useState<Record<string, string>>({});

  const updateStudentComment = (studentEmail: string, value: SetStateAction<string>) => {
    setStudentComments((current) => ({
      ...current,
      [studentEmail]: typeof value === 'function'
        ? value(current[studentEmail] ?? '')
        : value,
    }));
  };

  return (
    <div className="w-full font-['Archivo']">
      <RatingCourseHeader course={course} id={id} />
      {course.students.length > 0 ? course.students.map((student) => (
        <FeedbackField
          key={student.email}
          label={`Bạn có nhận xét thế nào về ${student.name}`}
          placeholder={`Nhận xét dành cho ${student.name}`}
          comment={studentComments[student.email] ?? ''}
          setComment={(value) => updateStudentComment(student.email, value)}
          className="mt-6"
        />
      )) : (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
          Chưa có sinh viên ACTIVE trong khóa học này để đánh giá.
        </div>
      )}
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
