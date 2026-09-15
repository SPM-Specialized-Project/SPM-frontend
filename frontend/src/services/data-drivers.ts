/**
 * Public data-driver surface for the temporary JSON backend.
 * Components should import drivers from here; seed arrays remain an
 * implementation detail of the mock-data modules.
 */
export {
  courseCreationRequestDriver,
} from '@/components/data/~mock-coordinator-requests';
export {
  courseDetailDriver,
  courseDriver,
} from '@/components/data/~mock-courses';
export { pastRegistrationDriver } from '@/components/data/~mock-register';
export { sessionDriver } from '@/components/data/~mock-session';
export { submissionDriver } from '@/components/data/~mock-submissions';
export { tutorRegistrationDriver } from '@/components/data/~mock-tutor-register';
export { backendDriver, getCurrentViewerContext } from '@/services/backend-driver';

export type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
export type { Course, DataCourses } from '@/components/data/~mock-courses';
export type { PastRegistration } from '@/components/data/~mock-register';
export type { Session, SessionMember } from '@/components/data/~mock-session';
export type { SubmissionRecord } from '@/types/submission';
export type {
  BackendListQuery,
  BackendMutationRequest,
  CreateCourseRequestRequest,
  CreateRegistrationRequest,
  CreateSessionRequest,
  RegistrationQuery,
  UpdateCourseRequestRequest,
  UpdateRegistrationRequest,
  UpdateSessionRequest,
} from '@/services/backend-driver';
export type {
  BackendListResponse,
  BackendResource,
  ResourceMeta,
  ResourcePermissions,
  UserRole,
} from '@/types/backend';
