import type { Session } from '@/components/data/~mock-session';

import type {
  BackendListQuery,
  BackendMutationRequest,
  BackendResourceResponse,
  BackendResponse,
  CreateSessionRequest,
  SessionListResponse,
  UpdateSessionRequest,
} from './backend-driver-types';
import { backendApi, backendRequest } from './backend-http';

export const sessionApi = {
  getSessions(query: BackendListQuery): Promise<BackendResponse<SessionListResponse>> {
    return backendRequest(() =>
      backendApi.get<SessionListResponse>('/sessions', { params: query }),
    );
  },

  createSession(
    request: CreateSessionRequest,
  ): Promise<BackendResponse<BackendResourceResponse<Session>>> {
    return backendRequest(() =>
      backendApi.post<BackendResourceResponse<Session>>('/sessions', request),
    );
  },

  updateSession(
    request: UpdateSessionRequest,
  ): Promise<BackendResponse<BackendResourceResponse<Session>>> {
    return backendRequest(() =>
      backendApi.patch<BackendResourceResponse<Session>>(
        '/sessions/' + encodeURIComponent(request.sessionId),
        request,
      ),
    );
  },

  deleteSession(
    sessionId: string,
    request: BackendMutationRequest,
  ): Promise<BackendResponse<{ deleted: boolean }>> {
    return backendRequest(() =>
      backendApi.delete<{ deleted: boolean }>(
        '/sessions/' + encodeURIComponent(sessionId),
        { data: request },
      ),
    );
  },
};
