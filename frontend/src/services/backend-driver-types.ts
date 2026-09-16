import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import type { Course, DataCourses } from '@/components/data/~mock-courses';
import type { PastRegistration } from '@/components/data/~mock-register';
import type { Session } from '@/components/data/~mock-session';
import type { User } from '@/types';
import type {
  BackendListResponse,
  BackendResource,
  ResourcePermissions,
  UserRole,
} from '@/types/backend';
import type { SubmissionView, SubmissionViewerRole } from '@/types/submission';

export type BackendResponse<T> = {
  data: T;
  status: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type { UserRole } from '@/types/backend';

export type LoginResponse = {
  accessToken: string;
  user: User;
  role: UserRole;
};

export type CourseDetailResponse = {
  course: BackendResource<Course>;
  detail: DataCourses;
};

export type SubmissionQuery = {
  courseId: string;
  assignmentId?: string;
  viewerRole: SubmissionViewerRole;
  studentId?: string;
  studentEmail?: string;
};

export type SubmissionListResponse = {
  items: SubmissionView[];
  viewerRole: SubmissionViewerRole;
  permissions?: ResourcePermissions;
  meta?: BackendListResponse<SubmissionView>['meta'];
};

export type UpdateSubmissionRequest = {
  submissionId: string;
  viewerRole: SubmissionViewerRole;
  score?: number | null;
  feedback?: string;
  submittedAt?: string | null;
  fileUrl?: string | null;
};

export type SubmissionUpdateResponse = {
  item: SubmissionView;
};

export type BackendListQuery = {
  viewerRole: UserRole;
  viewerEmail?: string;
  courseId?: string;
};

export type BackendMutationRequest = {
  viewerRole: UserRole;
  viewerEmail?: string;
};

export type BackendResourceResponse<T> = {
  item: BackendResource<T>;
};

export type SessionListResponse = BackendListResponse<Session>;
export type RegistrationListResponse = BackendListResponse<PastRegistration>;
export type CourseRequestListResponse = BackendListResponse<CourseCreationRequest>;
export type CourseListResponse = BackendListResponse<Course>;

export type CreateSessionRequest = BackendMutationRequest & {
  item: Omit<Session, 'id' | 'createdAt'> & { id?: string; createdAt?: string };
};

export type UpdateSessionRequest = BackendMutationRequest & {
  sessionId: string;
  patch: Partial<Session>;
};

export type RegistrationQuery = BackendListQuery & {
  registrationType?: 'student' | 'tutor';
};

export type CreateRegistrationRequest = BackendMutationRequest & {
  registrationType: 'student' | 'tutor';
  item: PastRegistration;
};

export type UpdateRegistrationRequest = BackendMutationRequest & {
  registrationId: string;
  registrationType: 'student' | 'tutor';
  patch: Partial<PastRegistration>;
};

export type CourseRequestQuery = BackendListQuery;

export type CreateCourseRequestRequest = BackendMutationRequest & {
  item: CourseCreationRequest;
};

export type UpdateCourseRequestRequest = BackendMutationRequest & {
  requestId: string;
  patch: Partial<CourseCreationRequest>;
};
