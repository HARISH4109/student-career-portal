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

export function createApp(): Express {
  const app = express();

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
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ── Core middleware ──────────────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Request-ID before pino-http so every log line carries the correlation ID
  app.use(requestId);
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
      },
    }),
  );

  // ── Routes ───────────────────────────────────────────────────────────
  app.use('/api/v1', apiRouter);

  // ── Error handling (always last) ────────────────────────────────────
  app.use(errorHandler);

  return app;
}
