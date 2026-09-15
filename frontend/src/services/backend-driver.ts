import axios from 'axios';

import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import { courseDriver, type Course, type DataCourses } from '@/components/data/~mock-courses';
import type { PastRegistration } from '@/components/data/~mock-register';
import type { Session } from '@/components/data/~mock-session';
import { type User } from '@/types';
import type {
  BackendListResponse,
  BackendResource,
  ResourcePermissions,
  UserRole,
} from '@/types/backend';
import type {
  SubmissionView,
  SubmissionViewerRole,
} from '@/types/submission';

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

export const getCurrentViewerContext = (): {
  viewerRole: UserRole;
  viewerEmail?: string;
} => {
  if (typeof window === 'undefined') return { viewerRole: 'coordinator' };

  const rawUserStore = window.localStorage.getItem('userStore');
  const rawRole = window.localStorage.getItem('role');
  let user: Partial<User> | undefined;

  try {
    user = rawUserStore
      ? (JSON.parse(rawUserStore) as { state?: { user?: Partial<User> } }).state?.user
      : undefined;
  } catch {
    user = undefined;
  }

  const viewerRole: UserRole = rawRole === 'student' || rawRole === 'tutor'
    || rawRole === 'coordinator' || rawRole === 'chairman'
    ? rawRole
    : user?.isStudent
      ? 'student'
      : user?.isTutor
        ? 'tutor'
        : user?.isChairman
          ? 'chairman'
          : 'coordinator';

  return { viewerRole, viewerEmail: user?.email };
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

const backendApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

export class BackendDriverError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'BackendDriverError';
  }
}

const toBackendError = (error: unknown): BackendDriverError => {
  if (error instanceof BackendDriverError) return error;

  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return new BackendDriverError(
      error.response?.data?.message ?? 'Không thể kết nối backend.',
      error.response?.status ?? 500,
      error.response?.data?.code ?? 'BACKEND_ERROR',
    );
  }

  return new BackendDriverError('Không thể kết nối backend.', 500, 'BACKEND_ERROR');
};

const getCourseWithLocalPresentation = <T extends Course>(serverCourse: T): T => {
  const localCourse = courseDriver.getById(serverCourse.id);
  if (!localCourse) return serverCourse;

  return {
    ...localCourse,
    ...serverCourse,
    stats: { ...localCourse.stats, ...serverCourse.stats },
    students: serverCourse.students?.length ? serverCourse.students : localCourse.students,
    bgImage: localCourse.bgImage,
  } as T;
};

/** Axios client for the separate local backend server. */
export const backendDriver = {
  async login(request: LoginRequest): Promise<BackendResponse<LoginResponse>> {
    try {
      const response = await backendApi.post<LoginResponse>('/auth/login', request);
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async getCourseDetail(
    courseId: string,
  ): Promise<BackendResponse<CourseDetailResponse>> {
    try {
      const response = await backendApi.get<CourseDetailResponse>(
        `/courses/${encodeURIComponent(courseId)}/detail`,
      );

      return {
        status: response.status,
        data: {
          ...response.data,
          course: getCourseWithLocalPresentation(response.data.course),
        },
      };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async getSubmissions(
    query: SubmissionQuery,
  ): Promise<BackendResponse<SubmissionListResponse>> {
    try {
      const response = await backendApi.get<SubmissionListResponse>(
        `/courses/${encodeURIComponent(query.courseId)}/submissions`,
        {
          params: {
            assignmentId: query.assignmentId,
            viewerRole: query.viewerRole,
            studentId: query.studentId,
            studentEmail: query.studentEmail,
          },
        },
      );

      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async updateSubmission(
    request: UpdateSubmissionRequest,
  ): Promise<BackendResponse<SubmissionUpdateResponse>> {
    try {
      const response = await backendApi.patch<SubmissionUpdateResponse>(
        `/submissions/${encodeURIComponent(request.submissionId)}`,
        request,
      );

      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async getCourses(
    query: BackendListQuery,
  ): Promise<BackendResponse<CourseListResponse>> {
    try {
      const response = await backendApi.get<CourseListResponse>('/courses', {
        params: query,
      });
      return {
        status: response.status,
        data: {
          ...response.data,
          items: response.data.items.map((item) => getCourseWithLocalPresentation(item)),
        },
      };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async getSessions(
    query: BackendListQuery,
  ): Promise<BackendResponse<SessionListResponse>> {
    try {
      const response = await backendApi.get<SessionListResponse>('/sessions', {
        params: query,
      });
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async createSession(
    request: CreateSessionRequest,
  ): Promise<BackendResponse<BackendResourceResponse<Session>>> {
    try {
      const response = await backendApi.post<BackendResourceResponse<Session>>(
        '/sessions',
        request,
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async updateSession(
    request: UpdateSessionRequest,
  ): Promise<BackendResponse<BackendResourceResponse<Session>>> {
    try {
      const response = await backendApi.patch<BackendResourceResponse<Session>>(
        `/sessions/${encodeURIComponent(request.sessionId)}`,
        request,
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async deleteSession(
    sessionId: string,
    request: BackendMutationRequest,
  ): Promise<BackendResponse<{ deleted: boolean }>> {
    try {
      const response = await backendApi.delete<{ deleted: boolean }>(
        `/sessions/${encodeURIComponent(sessionId)}`,
        { data: request },
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async getRegistrations(
    query: RegistrationQuery,
  ): Promise<BackendResponse<RegistrationListResponse>> {
    try {
      const response = await backendApi.get<RegistrationListResponse>('/registrations', {
        params: query,
      });
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async createRegistration(
    request: CreateRegistrationRequest,
  ): Promise<BackendResponse<BackendResourceResponse<PastRegistration>>> {
    try {
      const response = await backendApi.post<BackendResourceResponse<PastRegistration>>(
        '/registrations',
        request,
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async updateRegistration(
    request: UpdateRegistrationRequest,
  ): Promise<BackendResponse<BackendResourceResponse<PastRegistration>>> {
    try {
      const response = await backendApi.patch<BackendResourceResponse<PastRegistration>>(
        `/registrations/${encodeURIComponent(request.registrationId)}`,
        request,
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async deleteRegistration(
    registrationId: string,
    request: BackendMutationRequest,
  ): Promise<BackendResponse<{ deleted: boolean }>> {
    try {
      const response = await backendApi.delete<{ deleted: boolean }>(
        `/registrations/${encodeURIComponent(registrationId)}`,
        { data: request },
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async getCourseCreationRequests(
    query: CourseRequestQuery,
  ): Promise<BackendResponse<CourseRequestListResponse>> {
    try {
      const response = await backendApi.get<CourseRequestListResponse>('/course-requests', {
        params: query,
      });
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async createCourseCreationRequest(
    request: CreateCourseRequestRequest,
  ): Promise<BackendResponse<BackendResourceResponse<CourseCreationRequest>>> {
    try {
      const response = await backendApi.post<BackendResourceResponse<CourseCreationRequest>>(
        '/course-requests',
        request,
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async updateCourseCreationRequest(
    request: UpdateCourseRequestRequest,
  ): Promise<BackendResponse<BackendResourceResponse<CourseCreationRequest>>> {
    try {
      const response = await backendApi.patch<BackendResourceResponse<CourseCreationRequest>>(
        `/course-requests/${encodeURIComponent(request.requestId)}`,
        request,
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },

  async deleteCourseCreationRequest(
    requestId: string,
    request: BackendMutationRequest,
  ): Promise<BackendResponse<{ deleted: boolean }>> {
    try {
      const response = await backendApi.delete<{ deleted: boolean }>(
        `/course-requests/${encodeURIComponent(requestId)}`,
        { data: request },
      );
      return { status: response.status, data: response.data };
    } catch (error: unknown) {
      throw toBackendError(error);
    }
  },
};
