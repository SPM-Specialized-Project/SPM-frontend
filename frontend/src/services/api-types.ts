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

export type ApiResponse<T> = {
  data: T;
  status: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
  role: UserRole;
};

// The Node API does not own frontend-only presentation fields such as images.
export type ApiCourse = Omit<Course, 'bgImage'> & {
  bgImage?: string;
};

export type CourseDetailResponse = {
  course: BackendResource<ApiCourse>;
  detail: DataCourses;
};

export type MembershipStatus = 'ACTIVE' | 'REVOKED';

export type Membership = {
  id: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: MembershipStatus;
  enrolledAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProvisionedStudent = {
  id: string;
  name: string;
  email: string;
};

export type MembershipListResponse = {
  items: Array<BackendResource<Membership>>;
  classroomId: string;
  viewerRole: UserRole;
  permissions: ResourcePermissions;
  availableStudents?: ProvisionedStudent[];
  meta: BackendListResponse<Membership>['meta'];
};

export type MembershipQuery = {
  viewerRole: UserRole;
  viewerEmail?: string;
};

export type AddMembershipRequest = MembershipQuery & {
  classroomId: string;
  studentEmail: string;
};

export type RevokeMembershipRequest = MembershipQuery & {
  classroomId: string;
  membershipId: string;
};

export type MembershipMutationResponse = {
  item: BackendResource<Membership>;
  created?: boolean;
  reactivated?: boolean;
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
  viewerEmail?: string;
  score?: number | null;
  feedback?: string;
  submittedAt?: string | null;
  fileUrl?: string | null;
};

export type SubmissionUpdateResponse = {
  item: SubmissionView;
};

export type ApiListQuery = {
  viewerRole: UserRole;
  viewerEmail?: string;
  courseId?: string;
};

export type ApiMutationRequest = {
  viewerRole: UserRole;
  viewerEmail?: string;
};

export type ApiResourceResponse<T> = {
  item: BackendResource<T>;
};

export type SessionListResponse = BackendListResponse<Session>;
export type RegistrationListResponse = BackendListResponse<PastRegistration>;
export type MatchingCandidate = {
  tutorRegistrationId: string;
  rankingScore: number | null;
  features: Record<string, number>;
  reasons: Array<{
    code: string;
    value?: string | string[];
    evidence?: { student: string[]; tutor: string[] };
  }>;
  hardConstraints: Array<{ constraint: string; passed: boolean; reason: string }>;
};
export type MatchingExclusion = {
  tutorRegistrationId: string;
  reasons: Array<{ constraint: string; passed: boolean; reason: string }>;
};
export type MatchingRecommendation = {
  id: string;
  studentRegistrationId: string;
  createdAt: string;
  updatedAt?: string;
  status: 'PENDING_COORDINATOR_DECISION' | 'ACCEPTED' | 'REJECTED';
  matchingSchemaVersion: number;
  extractionVersion: string;
  model: 'TFIDF' | 'BGE_M3';
  modelVersion: string;
  ranking: string;
  scoreSemantics: 'ranking_score_not_probability';
  reviewWarnings: string[];
  candidates: MatchingCandidate[];
  excluded: MatchingExclusion[];
  decidedTutorRegistrationIds?: string[];
  counts: { evaluated: number; eligible: number; excluded: number };
};
export type MatchingAssignment = {
  id: string;
  recommendationId: string;
  decisionId: string;
  studentRegistrationId: string;
  tutorRegistrationId: string;
  studentName: string | null;
  tutorName: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
};
export type MatchingDecisionResponse = {
  decision: {
    id: string;
    recommendationId: string;
    studentRegistrationId: string;
    tutorRegistrationId: string;
    assignmentId: string | null;
    decision: 'ACCEPT' | 'REJECT';
    reason: string | null;
    decidedAt: string;
  };
};
export type CourseRequestListResponse = BackendListResponse<CourseCreationRequest>;
export type CourseListResponse = BackendListResponse<ApiCourse>;

export type CreateSessionRequest = ApiMutationRequest & {
  item: Omit<Session, 'id' | 'createdAt'> & { id?: string; createdAt?: string };
};

export type UpdateSessionRequest = ApiMutationRequest & {
  sessionId: string;
  patch: Partial<Session>;
};

export type RegistrationQuery = ApiListQuery & {
  registrationType?: 'student' | 'tutor';
};

export type CreateMatchingRecommendationRequest = {
  studentRegistrationId: string;
  model?: 'TFIDF' | 'BGE_M3';
  topK?: number;
};

export type MatchingDecisionRequest = {
  tutorRegistrationId: string;
  decision: 'ACCEPT' | 'REJECT';
  reason?: string;
};

export type CreateRegistrationRequest = ApiMutationRequest & {
  registrationType: 'student' | 'tutor';
  item: PastRegistration;
};

export type UpdateRegistrationRequest = ApiMutationRequest & {
  registrationId: string;
  registrationType: 'student' | 'tutor';
  patch: Partial<PastRegistration>;
};

export type CourseRequestQuery = ApiListQuery;

export type CreateCourseRequestRequest = ApiMutationRequest & {
  item: CourseCreationRequest;
};

export type UpdateCourseRequestRequest = ApiMutationRequest & {
  requestId: string;
  patch: Partial<CourseCreationRequest>;
};
