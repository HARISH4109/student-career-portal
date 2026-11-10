import type { ApiErrorResponse } from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '@/infrastructure/logger';
import { AppError, ConflictError, ValidationError } from '@/shared/errors/app-error';

/**
 * Registered last in the middleware chain. Controllers never catch errors
 * themselves — they call `next(error)` (or rely on express-async-errors-style
 * wrapping) and let this middleware decide the response shape. This keeps
 * error formatting consistent across all ~17 modules.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
   
  _next: NextFunction,
): void {
  // Drizzle wraps driver failures; inspect the cause without exposing SQL or values.
  let databaseError = error;
  for (let depth = 0; depth < 5; depth++) {
    if (typeof databaseError !== 'object' || databaseError === null || !('cause' in databaseError)) break;
    databaseError = databaseError.cause;
  }
  if (typeof databaseError === 'object' && databaseError !== null && 'code' in databaseError) {
    if (databaseError.code === '23505') error = new ConflictError('A record with these details already exists');
    else if (databaseError.code === '23503') error = new ValidationError('The referenced record is missing or is still in use');
    else if (databaseError.code === '22P02') error = new ValidationError('Invalid record identifier or value');
  }
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_root';
      (details[key] ??= []).push(issue.message);
    }
    error = new ValidationError('Invalid request data', details);
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    if (error.code === '23505') error = new ConflictError('A record with these details already exists');
    else if (error.code === '23503') error = new ValidationError('The referenced record is missing or is still in use');
    else if (error.code === '22P02') error = new ValidationError('Invalid record identifier or value');
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') error = new ValidationError('Invalid JSON request body');
    else if (error.type === 'entity.too.large') error = new ValidationError('Request body is too large');
  }
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, path: req.path }, error.message);
    } else {
      logger.warn({ err: error, path: req.path }, error.message);
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    res.status(error.statusCode).json(response);
    return;
  }

  // Unrecognized error — never leak internals to the client.
  logger.error({ err: error, path: req.path }, 'Unhandled error');
  const response: ApiErrorResponse = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  };
  res.status(500).json(response);
}
