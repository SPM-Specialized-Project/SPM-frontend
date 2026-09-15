import { createJsonDataDriver } from '@/services/json-data-driver';
import type { SubmissionRecord } from '@/types/submission';

import { courseDriver } from './~mock-courses';

type SubmissionSeed = {
  assignmentId: string;
  memberId: number;
  score?: number;
  feedback?: string;
  submittedAt?: string;
};

const getStudent = (courseId: string, memberId: number) => {
  const course = courseDriver.getById(courseId);
  const courseStudent = course?.students[memberId - 1];

  return {
    id: `${courseId}-student-${memberId}`,
    memberId,
    name: courseStudent?.name ?? `Sinh viên ${memberId}`,
    email: courseStudent?.email ?? `student-${memberId}@student.hcmut.edu.vn`,
  };
};

const toRecord = (seed: SubmissionSeed, courseId = '4'): SubmissionRecord => ({
  id: `${courseId}-${seed.assignmentId}-${seed.memberId}`,
  courseId,
  assignmentId: seed.assignmentId,
  student: getStudent(courseId, seed.memberId),
  status: seed.submittedAt
    ? seed.score === undefined
      ? 'submitted'
      : 'graded'
    : 'not-submitted',
  score: seed.score ?? null,
  feedback: seed.feedback ?? '',
  submittedAt: seed.submittedAt ?? null,
  fileUrl: null,
});

const initialData: SubmissionSeed[] = [
  { assignmentId: 's1', memberId: 1, score: 8.5, feedback: 'Bài làm tốt, logic rõ ràng.', submittedAt: '2024-10-12T20:00:00' },
  { assignmentId: 's1', memberId: 2, score: 7.0, feedback: 'Cần cải thiện phần xử lý lỗi.', submittedAt: '2024-10-12T19:30:00' },
  { assignmentId: 's1', memberId: 3, score: 9.0, feedback: 'Xuất sắc! Code sạch và có documentation.', submittedAt: '2024-10-12T21:15:00' },
  { assignmentId: 's1', memberId: 4, score: 6.5, feedback: 'Đúng yêu cầu nhưng thiếu comments.', submittedAt: '2024-10-12T18:50:00' },
  { assignmentId: 's1', memberId: 5, submittedAt: '' },
  { assignmentId: 's1', memberId: 6, score: 7.5, feedback: 'Tốt, nhưng có thể tối ưu thêm.', submittedAt: '2024-10-12T20:10:00' },
  { assignmentId: 's1', memberId: 7, score: 8.0, feedback: 'Rất tốt, logic chặt chẽ.', submittedAt: '2024-10-12T20:30:00' },
  { assignmentId: 's1', memberId: 8, score: 9.5, feedback: 'Hoàn hảo! Có test cases đầy đủ.', submittedAt: '2024-10-12T21:30:00' },
  { assignmentId: 's2', memberId: 1, score: 7.5, feedback: 'Schema thiết kế tốt.', submittedAt: '2024-11-01T14:30:00' },
  { assignmentId: 's2', memberId: 2, score: 8.0, feedback: 'Queries hiệu quả.', submittedAt: '2024-11-01T15:00:00' },
  { assignmentId: 's2', memberId: 3, submittedAt: '2024-11-01T15:10:00' },
  { assignmentId: 's2', memberId: 4, score: 6.0, feedback: 'Cần optimize queries thêm.', submittedAt: '2024-11-01T13:50:00' },
  { assignmentId: 's2', memberId: 5, score: 7.0, feedback: 'Đạt yêu cầu cơ bản.', submittedAt: '2024-11-01T14:10:00' },
  { assignmentId: 's2', memberId: 6, score: 9.0, feedback: 'Rất tốt! Index đúng chỗ.', submittedAt: '2024-11-01T16:00:00' },
  { assignmentId: 's3', memberId: 1, score: 8.5, feedback: 'Tổng hợp tốt các kiến thức.', submittedAt: '2024-12-01T10:00:00' },
  { assignmentId: 's3', memberId: 2, score: 7.5, feedback: 'Đầy đủ nhưng có thể chi tiết hơn.', submittedAt: '2024-12-01T10:15:00' },
  { assignmentId: 's3', memberId: 3, score: 9.0, feedback: 'Xuất sắc! Hiểu sâu vấn đề.', submittedAt: '2024-12-01T10:30:00' },
  { assignmentId: 's3', memberId: 4, submittedAt: '2024-12-01T11:00:00' },
  { assignmentId: 's3', memberId: 5, score: 6.5, feedback: 'Cần bổ sung thêm ví dụ.', submittedAt: '2024-12-01T11:15:00' },
  { assignmentId: 's3', memberId: 6, score: 8.0, feedback: 'Tốt, trình bày rõ ràng.', submittedAt: '2024-12-01T11:30:00' },
  { assignmentId: 's3', memberId: 7, score: 7.0, feedback: 'Đạt yêu cầu.', submittedAt: '2024-12-01T12:00:00' },
  { assignmentId: 's3', memberId: 8, score: 8.5, feedback: 'Rất hay! Có so sánh các phương pháp.', submittedAt: '2024-12-01T12:15:00' },
  { assignmentId: 's3', memberId: 9, score: 9.5, feedback: 'Hoàn hảo! Phân tích sâu sắc.', submittedAt: '2024-12-01T12:30:00' },
  { assignmentId: 's3', memberId: 10, score: 7.5, feedback: 'Tốt, nhưng thiếu một số chi tiết.', submittedAt: '2024-12-01T12:45:00' },
];

/** Canonical in-memory JSON driver for submission records. */
export const submissionDriver = createJsonDataDriver(
  initialData.map((seed) => toRecord(seed)),
);

export function getSubmissionKey(assignmentId: string, memberId: number): string {
  return `4-${assignmentId}-${memberId}`;
}

/** Compatibility helper for older screens; all reads now go through the driver. */
export function getSubmission(
  assignmentId: string,
  memberId: number,
): SubmissionRecord | undefined {
  return submissionDriver.getById(getSubmissionKey(assignmentId, memberId));
}

export function getSubmissionSubmissions(assignmentId: string): SubmissionRecord[] {
  return submissionDriver.list().filter((item) => item.assignmentId === assignmentId);
}

/** Compatibility helper for older screens; updates are persisted by the driver. */
export function updateSubmission(
  assignmentId: string,
  memberId: number,
  updates: Partial<Pick<SubmissionRecord, 'score' | 'feedback' | 'submittedAt' | 'fileUrl'>> & {
    comment?: string;
  },
): SubmissionRecord {
  const id = getSubmissionKey(assignmentId, memberId);
  const current = submissionDriver.getById(id) ?? toRecord({ assignmentId, memberId });
  const score = updates.score !== undefined ? updates.score : current.score;
  const submittedAt = updates.submittedAt !== undefined ? updates.submittedAt : current.submittedAt;
  const updated: SubmissionRecord = {
    ...current,
    score,
    submittedAt,
    feedback: updates.feedback ?? updates.comment ?? current.feedback,
    fileUrl: updates.fileUrl !== undefined ? updates.fileUrl : current.fileUrl,
    status: submittedAt ? (score === null ? 'submitted' : 'graded') : 'not-submitted',
  };

  return submissionDriver.upsert(updated);
}

export function getAllSubmissions(): SubmissionRecord[] {
  return submissionDriver.list();
}

export const getSubmissionBySubmissionId = (assignmentId: string): SubmissionRecord[] =>
  getSubmissionSubmissions(assignmentId);
