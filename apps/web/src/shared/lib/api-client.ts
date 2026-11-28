import { API_ERROR_CODES, type ApiErrorResponse } from '@career-portal/shared-types';
import axios, { type AxiosError } from 'axios';
import { z } from 'zod';

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.enum(API_ERROR_CODES), message: z.string(), details: z.record(z.string(), z.array(z.string())).optional() }),
});

/**
 * Thrown by the response interceptor below so every failure surfaced to
 * calling code (React Query error handlers, etc.) is a real `Error` instance
 * carrying the typed API error payload — never a bare object literal.
 */
export class ApiClientError extends Error {
  readonly payload: ApiErrorResponse;

  constructor(payload: ApiErrorResponse) {
    super(payload.error.message);
    this.name = 'ApiClientError';
    this.payload = payload;
  }
}

/**
 * Single Axios instance for the whole app. Feature modules never call
 * `axios.get(...)` directly — they go through this instance so auth headers,
 * error normalization, and base URL are handled in exactly one place.
 */
export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '').replace(/\/$/, ''),
  timeout: 90_000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Normalize network/timeout errors into the same shape as API errors so
    // calling code (React Query error handlers) only ever deals with one type.
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout');
      return Promise.reject(
        new ApiClientError({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: isTimeout
              ? 'Request timed out — the AI service or server took longer than expected. Please try again.'
              : 'Network error — unable to reach the server. Please check your connection.',
          },
        }),
      );
    }
    const parsed = errorResponseSchema.safeParse(error.response.data);
    return Promise.reject(new ApiClientError(parsed.success ? (parsed.data as ApiErrorResponse) : {
      success: false,
      error: {
        code: error.response.status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR',
        message: error.response.status === 429 ? 'Too many requests. Please wait and try again.' : 'The server could not complete the request. Please try again.',
      },
    }));
  },
);
