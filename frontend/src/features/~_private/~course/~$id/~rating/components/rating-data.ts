import type { Course } from '@/components/data/~mock-courses';

import type { RatingItem, StudentRatingRecord } from './rating-types';

export const RATING_CRITERIA: Array<Pick<RatingItem, 'id' | 'title'>> = [
  { id: 'concepts', title: 'Nắm vững các khái niệm về cấu trúc dữ liệu.' },
  { id: 'analysis', title: 'Phân tích được độ phức tạp thời gian và bộ nhớ.' },
  { id: 'algorithm', title: 'Chọn và áp dụng thuật toán phù hợp cho bài toán.' },
  { id: 'implementation', title: 'Cài đặt lời giải rõ ràng, đúng và có thể bảo trì.' },
  { id: 'testing', title: 'Kiểm thử được các trường hợp biên và dữ liệu lỗi.' },
  { id: 'debugging', title: 'Tự phát hiện và sửa lỗi trong quá trình thực hành.' },
  { id: 'explanation', title: 'Giải thích được ý tưởng và quyết định kỹ thuật.' },
  { id: 'progress', title: 'Có tiến bộ qua các bài thực hành trong học kỳ.' },
];

const COMMENTS = [
  'Em hoàn thành bài thực hành đúng hạn và giải thích được hướng tiếp cận.',
  'Cần bổ sung kiểm thử cho các trường hợp biên, nhưng phần cài đặt chính xác.',
  'Khả năng phân tích thuật toán tốt, nên trình bày lời giải ngắn gọn hơn.',
  'Có tiến bộ rõ rệt qua các bài nộp và chủ động sửa lỗi sau khi nhận phản hồi.',
  'Bài làm đạt yêu cầu; cần chú ý thêm đến tên biến và cấu trúc mã nguồn.',
  'Nắm được kiến thức nền tảng và đang cải thiện tốc độ triển khai lời giải.',
];

const clampRating = (rating: number) => Math.min(5, Math.max(1, rating));

export const getStudentRatingId = (
  courseId: string,
  student: Course['students'][number],
) => {
  const studentKey = student.id
    ?? student.email.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return `${courseId}-rating-${studentKey}`;
};

const getRatingItems = (student: Course['students'][number], index: number): RatingItem[] => {
  const baseRating = clampRating(Math.round((student.averageScore ?? 70) / 20));

  return RATING_CRITERIA.map((criterion, criterionIndex) => ({
    ...criterion,
    rating: clampRating(baseRating + ((criterionIndex + index) % 3 === 0 ? 1 : 0) - (criterionIndex % 5 === 0 ? 1 : 0)),
  }));
};

export const createCourseRatingRecords = (
  courseId: string,
  students: Course['students'],
): StudentRatingRecord[] => students.map((student, index) => ({
  id: getStudentRatingId(courseId, student),
  courseId,
  studentId: student.id ?? `${courseId}-student-${index + 1}`,
  studentName: student.name,
  studentEmail: student.email,
  submittedAt: `2026-09-${String(10 + index).padStart(2, '0')}T${String(8 + index).padStart(2, '0')}:30:00.000Z`,
  comment: COMMENTS[index % COMMENTS.length],
  items: getRatingItems(student, index),
}));

export const readCourseRatingRecords = (
  courseId: string,
  students: Course['students'],
): StudentRatingRecord[] => {
  const seeded = createCourseRatingRecords(courseId, students);

  if (typeof window === 'undefined') return seeded;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(`course-rating-records-${courseId}`) ?? 'null',
    ) as StudentRatingRecord[] | null;

    if (!Array.isArray(stored)) return seeded;

    return seeded.map((record) => {
      const savedRecord = stored.find((item) => item.id === record.id);
      return savedRecord ? { ...record, ...savedRecord, courseId } : record;
    });
  } catch {
    return seeded;
  }
};

export const readCourseRating = (
  courseId: string,
  ratingId: string,
  students: Course['students'],
) => readCourseRatingRecords(courseId, students).find((record) => record.id === ratingId);
