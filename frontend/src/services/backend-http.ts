import axios from 'axios';

import type { BackendResponse } from './backend-driver-types';

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export const backendApi = axios.create({
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

export const toBackendError = (error: unknown): BackendDriverError => {
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

export async function backendRequest<T>(
  request: () => Promise<{ status: number; data: T }>,
): Promise<BackendResponse<T>> {
  try {
    const response = await request();
    return { status: response.status, data: response.data };
  } catch (error: unknown) {
    throw toBackendError(error);
  }
}
