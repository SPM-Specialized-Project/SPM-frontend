export type UnifiedRegistration = {
  id: string;
  courseCode: string;
  name: string;
  language: string;
  type: string;
  role: 'Student' | 'Tutor';
  location: string;
  request: string;
  status: 'Pending' | 'Approved' | 'Declined';
};

export type MatchedCourseGroup = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sessions: Session[];
};
import type { Session } from '@/components/data/~mock-session';
