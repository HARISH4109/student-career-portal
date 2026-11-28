import type { ApiErrorResponse } from '@career-portal/shared-types';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';
import { getUploadsDir } from '@/infrastructure/uploads';
import { errorHandler } from '@/middlewares/error-handler.middleware';
import { requestId } from '@/middlewares/request-id.middleware';
import { apiRouter } from '@/routes';
import { NotFoundError } from '@/shared/errors/app-error';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (e.g. Nginx) so req.ip & rate limiters see real client IPs
  app.set('trust proxy', env.TRUST_PROXY);

  // ── Security ─────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ALLOWED_ORIGINS.length > 0 ? env.CORS_ALLOWED_ORIGINS : false,
      credentials: true,
    }),
  );
  // Request-ID before rate limiting & pino-http so every response (including 429) carries the correlation ID
  app.use(requestId);

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        const reqId =
          (req as express.Request & { id?: string }).id ??
          (typeof res.getHeader('X-Request-Id') === 'string'
            ? (res.getHeader('X-Request-Id') as string)
            : undefined);
        const body: ApiErrorResponse = {
          success: false,
          data: null,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
          meta: {
            ...(reqId ? { requestId: reqId } : {}),
          },
        };
        res.status(429).json(body);
      },
    }),
  );

  // ── Core middleware ──────────────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as Express.Request & { id: string }).id,
    }),
  );

  // ── Static assets ────────────────────────────────────────────────────
  const uploadsDir = getUploadsDir();
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      },
    }),
  );

  // ── Routes ───────────────────────────────────────────────────────────
  app.use('/api/v1', apiRouter);

  // ── 404 catch-all for unmatched routes ───────────────────────────────
  app.use((_req, _res, next) => {
    next(new NotFoundError('Endpoint'));
  });

  // ── Error handling (always last) ────────────────────────────────────
  app.use(errorHandler);

  return app;
}
