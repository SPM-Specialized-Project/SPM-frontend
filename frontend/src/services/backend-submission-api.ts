import type {
  BackendResponse,
  SubmissionListResponse,
  SubmissionQuery,
  SubmissionUpdateResponse,
  UpdateSubmissionRequest,
} from './backend-driver-types';
import { backendApi, backendRequest } from './backend-http';

export const submissionApi = {
  getSubmissions(
    query: SubmissionQuery,
  ): Promise<BackendResponse<SubmissionListResponse>> {
    return backendRequest(() =>
      backendApi.get<SubmissionListResponse>(
        '/courses/' + encodeURIComponent(query.courseId) + '/submissions',
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
    request: UpdateSubmissionRequest,
  ): Promise<BackendResponse<SubmissionUpdateResponse>> {
    return backendRequest(() =>
      backendApi.patch<SubmissionUpdateResponse>(
        '/submissions/' + encodeURIComponent(request.submissionId),
        request,
      ),
    );
  },
};
