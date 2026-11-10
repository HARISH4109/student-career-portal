import type { ApiSuccessResponse, PaginationMeta } from '@career-portal/shared-types';
import type { Response } from 'express';

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
  const body: ApiSuccessResponse<unknown> = { success: true, data, ...(meta ? { meta } : {}) };
  res.status(statusCode).json(body);
}
