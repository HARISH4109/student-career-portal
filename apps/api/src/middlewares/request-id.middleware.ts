import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

/**
 * Assigns a unique request ID to every incoming request for structured
 * log correlation across the entire request lifecycle.
 *
 * Behaviour:
 * - If the client sends an `X-Request-Id` header, re-use it (supports
 *   distributed tracing across services, e.g. Express → AI FastAPI).
 * - Otherwise, generate a random UUID v4.
 * - Attach to `req.id` (for downstream middleware / pino-http) and echo
 *   back via the `X-Request-Id` response header (for client debugging).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) ||
    crypto.randomUUID();

  // Attach for pino-http's `genReqId` and any downstream code
  (req as Request & { id: string }).id = id;

  // Echo back so clients / load balancers can correlate
  res.setHeader('X-Request-Id', id);

  next();
}
