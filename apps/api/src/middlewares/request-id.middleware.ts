import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { requestContextStorage } from '@/shared/context/request-context';

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
 * - Establishes AsyncLocalStorage context for automatic audit & log correlation.
 */
const SAFE_REQUEST_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const rawHeader = req.headers['x-request-id'];
  const id =
    typeof rawHeader === 'string' && SAFE_REQUEST_ID_RE.test(rawHeader)
      ? rawHeader
      : crypto.randomUUID();

  // Attach for pino-http's `genReqId` and any downstream code
  (req as Request & { id: string }).id = id;

  // Echo back so clients / load balancers can correlate
  res.setHeader('X-Request-Id', id);

  const ipAddress =
    req.ip ||
    (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : undefined);

  const userAgent =
    typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

  const origin =
    (typeof req.headers['origin'] === 'string' && req.headers['origin']) ||
    (typeof req.headers['referer'] === 'string' && req.headers['referer']) ||
    (typeof req.headers['host'] === 'string' && req.headers['host']) ||
    undefined;

  requestContextStorage.run(
    {
      requestId: id,
      ipAddress,
      userAgent,
      origin,
    },
    () => {
      next();
    },
  );
}
