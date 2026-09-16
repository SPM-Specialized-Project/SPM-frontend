import { authApi } from './backend-auth-api';
import { courseApi } from './backend-course-api';
import { courseRequestApi } from './backend-course-request-api';
import { registrationApi } from './backend-registration-api';
import { sessionApi } from './backend-session-api';
import { submissionApi } from './backend-submission-api';

export type {
  BackendListQuery,
  BackendMutationRequest,
  BackendResourceResponse,
  BackendResponse,
  CourseDetailResponse,
  CourseListResponse,
  CourseRequestListResponse,
  CourseRequestQuery,
  CreateCourseRequestRequest,
  CreateRegistrationRequest,
  CreateSessionRequest,
  LoginRequest,
  LoginResponse,
  RegistrationListResponse,
  RegistrationQuery,
  SessionListResponse,
  SubmissionListResponse,
  SubmissionQuery,
  SubmissionUpdateResponse,
  UpdateCourseRequestRequest,
  UpdateRegistrationRequest,
  UpdateSessionRequest,
  UpdateSubmissionRequest,
} from './backend-driver-types';
export type { UserRole } from './backend-driver-types';
export { BackendDriverError } from './backend-http';
export { getCurrentViewerContext } from './backend-viewer-context';

export const backendDriver = {
  ...authApi,
  ...courseApi,
  ...submissionApi,
  ...sessionApi,
  ...registrationApi,
  ...courseRequestApi,
};
