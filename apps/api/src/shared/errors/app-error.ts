import type { ApiErrorCode } from '@career-portal/shared-types';

/**
 * Base class for all intentional, handled errors in the application.
 * Services and repositories throw these; they carry an HTTP status and a
 * machine-readable code so the error-handling middleware never has to guess
 * how to translate a thrown error into a response.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: ApiErrorCode;
  readonly details?: Record<string, string[]>;

  constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = this.constructor.name;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly code: ApiErrorCode = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code: ApiErrorCode = 'UNAUTHORIZED';

  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code: ApiErrorCode = 'FORBIDDEN';

  constructor(message = 'You do not have permission to perform this action') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code: ApiErrorCode = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code: ApiErrorCode = 'CONFLICT';
}

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code: ApiErrorCode = 'INTERNAL_ERROR';

  constructor(message = 'An unexpected error occurred') {
    super(message);
  }
}
