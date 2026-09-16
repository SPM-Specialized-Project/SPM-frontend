import type { PastRegistration } from '@/components/data/~mock-register';

import { backendApi, backendRequest } from './backend-http';
import type {
  BackendMutationRequest,
  BackendResourceResponse,
  BackendResponse,
  CreateRegistrationRequest,
  RegistrationListResponse,
  RegistrationQuery,
  UpdateRegistrationRequest,
} from './backend-driver-types';

export const registrationApi = {
  getRegistrations(
    query: RegistrationQuery,
  ): Promise<BackendResponse<RegistrationListResponse>> {
    return backendRequest(() =>
      backendApi.get<RegistrationListResponse>('/registrations', { params: query }),
    );
  },

  createRegistration(
    request: CreateRegistrationRequest,
  ): Promise<BackendResponse<BackendResourceResponse<PastRegistration>>> {
    return backendRequest(() =>
      backendApi.post<BackendResourceResponse<PastRegistration>>('/registrations', request),
    );
  },

  updateRegistration(
    request: UpdateRegistrationRequest,
  ): Promise<BackendResponse<BackendResourceResponse<PastRegistration>>> {
    return backendRequest(() =>
      backendApi.patch<BackendResourceResponse<PastRegistration>>(
        '/registrations/' + encodeURIComponent(request.registrationId),
        request,
      ),
    );
  },

  deleteRegistration(
    registrationId: string,
    request: BackendMutationRequest,
  ): Promise<BackendResponse<{ deleted: boolean }>> {
    return backendRequest(() =>
      backendApi.delete<{ deleted: boolean }>(
        '/registrations/' + encodeURIComponent(registrationId),
        { data: request },
      ),
    );
  },
};
