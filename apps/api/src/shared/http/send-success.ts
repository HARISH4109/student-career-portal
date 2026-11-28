import type { ApiSuccessResponse, PaginationMeta } from '@career-portal/shared-types';
import type { Response } from 'express';

import { requestContextStorage } from '@/shared/context/request-context';

/**
 * `data` is intentionally `unknown` rather than a generic — this function
 * returns `void`, so a type parameter here would give callers no inference
 * benefit while looking like it does. Type safety for the payload is
 * enforced by the caller constructing `data` from a typed source.
 */
export function sendSuccess(
  res: Response,
  data: unknown,
  statusCode = 200,
  meta?: PaginationMeta,
): void {
  const requestId =
    requestContextStorage.getStore()?.requestId ??
    (typeof res.getHeader('X-Request-Id') === 'string'
      ? (res.getHeader('X-Request-Id') as string)
      : undefined);

  const responseMeta = {
    ...(meta ?? {}),
    ...(requestId ? { requestId } : {}),
  };

  const body: ApiSuccessResponse<unknown> = {
    success: true,
    data,
    error: null,
    meta: responseMeta,
  };
  res.status(statusCode).json(body);
}
