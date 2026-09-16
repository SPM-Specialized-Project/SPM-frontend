import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';

import type {
  BackendMutationRequest,
  BackendResourceResponse,
  BackendResponse,
  CreateCourseRequestRequest,
  CourseRequestListResponse,
  CourseRequestQuery,
  UpdateCourseRequestRequest,
} from './backend-driver-types';
import { backendApi, backendRequest } from './backend-http';

export const courseRequestApi = {
  getCourseCreationRequests(
    query: CourseRequestQuery,
  ): Promise<BackendResponse<CourseRequestListResponse>> {
    return backendRequest(() =>
      backendApi.get<CourseRequestListResponse>('/course-requests', { params: query }),
    );
  },

  createCourseCreationRequest(
    request: CreateCourseRequestRequest,
  ): Promise<BackendResponse<BackendResourceResponse<CourseCreationRequest>>> {
    return backendRequest(() =>
      backendApi.post<BackendResourceResponse<CourseCreationRequest>>(
        '/course-requests',
        request,
      ),
    );
  },

  updateCourseCreationRequest(
    request: UpdateCourseRequestRequest,
  ): Promise<BackendResponse<BackendResourceResponse<CourseCreationRequest>>> {
    return backendRequest(() =>
      backendApi.patch<BackendResourceResponse<CourseCreationRequest>>(
        '/course-requests/' + encodeURIComponent(request.requestId),
        request,
      ),
    );
  },

  deleteCourseCreationRequest(
    requestId: string,
    request: BackendMutationRequest,
  ): Promise<BackendResponse<{ deleted: boolean }>> {
    return backendRequest(() =>
      backendApi.delete<{ deleted: boolean }>(
        '/course-requests/' + encodeURIComponent(requestId),
        { data: request },
      ),
    );
  },
};
