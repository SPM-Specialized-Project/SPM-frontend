import { backendApi, backendRequest } from './backend-http';
import type { BackendResponse, LoginRequest, LoginResponse } from './backend-driver-types';

export const authApi = {
  login(request: LoginRequest): Promise<BackendResponse<LoginResponse>> {
    return backendRequest(() =>
      backendApi.post<LoginResponse>('/auth/login', request),
    );
  },
};
