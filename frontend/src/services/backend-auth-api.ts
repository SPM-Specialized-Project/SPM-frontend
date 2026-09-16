import type { BackendResponse, LoginRequest, LoginResponse } from './backend-driver-types';
import { backendApi, backendRequest } from './backend-http';

export const authApi = {
  login(request: LoginRequest): Promise<BackendResponse<LoginResponse>> {
    return backendRequest(() =>
      backendApi.post<LoginResponse>('/auth/login', request),
    );
  },
};
