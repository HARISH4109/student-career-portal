import 'dotenv/config';
import { createServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { cronManager } from '@/infrastructure/cron';
import { logger } from '@/infrastructure/logger';
import { initSocketServer } from '@/infrastructure/socket';

const app = createApp();
const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: { origin: env.CORS_ALLOWED_ORIGINS, credentials: true },
});

initSocketServer(io);

httpServer.listen(env.API_PORT, () => {
  logger.info(`🚀 API listening on port ${String(env.API_PORT)} [${env.NODE_ENV}]`);
  cronManager.startAll();
});

function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received — shutting down gracefully`);
  cronManager.stopAll();
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force-exit if shutdown hangs (e.g. open sockets)
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => { gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { gracefulShutdown('SIGINT'); });

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
