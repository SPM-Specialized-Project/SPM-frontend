import axios, { type AxiosResponse } from 'axios';

import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import type { PastRegistration } from '@/components/data/~mock-register';
import type { Session } from '@/components/data/~mock-session';

import type {
  ApiListQuery,
  ApiMutationRequest,
  ApiResourceResponse,
  ApiResponse,
  AddMembershipRequest,
  CourseDetailResponse,
  CourseListResponse,
  CourseRequestListResponse,
  CourseRequestQuery,
  CreateCourseRequestRequest,
  CreateRegistrationRequest,
  CreateSessionRequest,
  LoginRequest,
  LoginResponse,
  MembershipListResponse,
  MembershipMutationResponse,
  MembershipQuery,
  RevokeMembershipRequest,
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
} from './api-types';

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return new ApiError(
      error.response?.data?.message ?? 'Không thể kết nối API.',
      error.response?.status ?? 500,
      error.response?.data?.code ?? 'API_ERROR',
    );
  }

  return new ApiError('Không thể kết nối API.', 500, 'API_ERROR');
};

async function request<T>(send: () => Promise<AxiosResponse<T>>): Promise<ApiResponse<T>> {
  try {
    const response = await send();
    return { status: response.status, data: response.data };
  } catch (error: unknown) {
    throw toApiError(error);
  }
}

export const api = {
  login(loginRequest: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return request(() => apiClient.post<LoginResponse>('/auth/login', loginRequest));
  },

  getCourses(query: ApiListQuery): Promise<ApiResponse<CourseListResponse>> {
    return request(() => apiClient.get<CourseListResponse>('/courses', { params: query }));
  },

  getCourseDetail(
    courseId: string,
    query?: MembershipQuery,
  ): Promise<ApiResponse<CourseDetailResponse>> {
    return request(() =>
      apiClient.get<CourseDetailResponse>(
        `/courses/${encodeURIComponent(courseId)}/detail`,
        { params: query },
      ),
    );
  },

  getMemberships(
    classroomId: string,
    query: MembershipQuery,
  ): Promise<ApiResponse<MembershipListResponse>> {
    return request(() =>
      apiClient.get<MembershipListResponse>(
        `/classrooms/${encodeURIComponent(classroomId)}/memberships`,
        { params: query },
      ),
    );
  },

  addMembership(
    addRequest: AddMembershipRequest,
  ): Promise<ApiResponse<MembershipMutationResponse>> {
    return request(() =>
      apiClient.post<MembershipMutationResponse>(
        `/classrooms/${encodeURIComponent(addRequest.classroomId)}/memberships`,
        addRequest,
      ),
    );
  },

  revokeMembership(
    revokeRequest: RevokeMembershipRequest,
  ): Promise<ApiResponse<MembershipMutationResponse>> {
    return request(() =>
      apiClient.patch<MembershipMutationResponse>(
        `/classrooms/${encodeURIComponent(revokeRequest.classroomId)}/memberships/${encodeURIComponent(revokeRequest.membershipId)}`,
        { ...revokeRequest, status: 'REVOKED' },
      ),
    );
  },

  getSubmissions(query: SubmissionQuery): Promise<ApiResponse<SubmissionListResponse>> {
    return request(() =>
      apiClient.get<SubmissionListResponse>(
        `/courses/${encodeURIComponent(query.courseId)}/submissions`,
        {
          params: {
            assignmentId: query.assignmentId,
            viewerRole: query.viewerRole,
            studentId: query.studentId,
            studentEmail: query.studentEmail,
          },
        },
      ),
    );
  },

  updateSubmission(
    updateRequest: UpdateSubmissionRequest,
  ): Promise<ApiResponse<SubmissionUpdateResponse>> {
    return request(() =>
      apiClient.patch<SubmissionUpdateResponse>(
        `/submissions/${encodeURIComponent(updateRequest.submissionId)}`,
        updateRequest,
      ),
    );
  },

  getSessions(query: ApiListQuery): Promise<ApiResponse<SessionListResponse>> {
    return request(() => apiClient.get<SessionListResponse>('/sessions', { params: query }));
  },

  createSession(
    createRequest: CreateSessionRequest,
  ): Promise<ApiResponse<ApiResourceResponse<Session>>> {
    return request(() =>
      apiClient.post<ApiResourceResponse<Session>>(
        '/sessions',
        createRequest,
      ),
    );
  },

  updateSession(
    updateRequest: UpdateSessionRequest,
  ): Promise<ApiResponse<ApiResourceResponse<Session>>> {
    return request(() =>
      apiClient.patch<ApiResourceResponse<Session>>(
        `/sessions/${encodeURIComponent(updateRequest.sessionId)}`,
        updateRequest,
      ),
    );
  },

  deleteSession(
    sessionId: string,
    mutation: ApiMutationRequest,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return request(() =>
      apiClient.delete<{ deleted: boolean }>(
        `/sessions/${encodeURIComponent(sessionId)}`,
        { data: mutation },
      ),
    );
  },

  getRegistrations(query: RegistrationQuery): Promise<ApiResponse<RegistrationListResponse>> {
    return request(() =>
      apiClient.get<RegistrationListResponse>('/registrations', { params: query }),
    );
  },

  createRegistration(
    createRequest: CreateRegistrationRequest,
  ): Promise<ApiResponse<ApiResourceResponse<PastRegistration>>> {
    return request(() =>
      apiClient.post<ApiResourceResponse<PastRegistration>>(
        '/registrations',
        createRequest,
      ),
    );
  },

  updateRegistration(
    updateRequest: UpdateRegistrationRequest,
  ): Promise<ApiResponse<ApiResourceResponse<PastRegistration>>> {
    return request(() =>
      apiClient.patch<ApiResourceResponse<PastRegistration>>(
        `/registrations/${encodeURIComponent(updateRequest.registrationId)}`,
        updateRequest,
      ),
    );
  },

  deleteRegistration(
    registrationId: string,
    mutation: ApiMutationRequest,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return request(() =>
      apiClient.delete<{ deleted: boolean }>(
        `/registrations/${encodeURIComponent(registrationId)}`,
        { data: mutation },
      ),
    );
  },

  getCourseCreationRequests(
    query: CourseRequestQuery,
  ): Promise<ApiResponse<CourseRequestListResponse>> {
    return request(() =>
      apiClient.get<CourseRequestListResponse>('/course-requests', { params: query }),
    );
  },

  createCourseCreationRequest(
    createRequest: CreateCourseRequestRequest,
  ): Promise<ApiResponse<ApiResourceResponse<CourseCreationRequest>>> {
    return request(() =>
      apiClient.post<ApiResourceResponse<CourseCreationRequest>>(
        '/course-requests',
        createRequest,
      ),
    );
  },

  updateCourseCreationRequest(
    updateRequest: UpdateCourseRequestRequest,
  ): Promise<ApiResponse<ApiResourceResponse<CourseCreationRequest>>> {
    return request(() =>
      apiClient.patch<ApiResourceResponse<CourseCreationRequest>>(
        `/course-requests/${encodeURIComponent(updateRequest.requestId)}`,
        updateRequest,
      ),
    );
  },

  deleteCourseCreationRequest(
    requestId: string,
    mutation: ApiMutationRequest,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return request(() =>
      apiClient.delete<{ deleted: boolean }>(
        `/course-requests/${encodeURIComponent(requestId)}`,
        { data: mutation },
      ),
    );
  },
};
