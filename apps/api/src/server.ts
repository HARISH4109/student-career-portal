import 'dotenv/config';
import { createServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';

const app = createApp();
const httpServer = createServer(app);

// Socket.io instance is created here at the composition root and will be
// injected into modules that need real-time push (Notifications, Notice
// Board) once those are built in Phase 5 — never instantiated ad-hoc inside
// a service.
export const io = new SocketIOServer(httpServer, {
  cors: { origin: env.CORS_ALLOWED_ORIGINS, credentials: true },
});

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'Socket connected');
  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Socket disconnected');
  });
});

httpServer.listen(env.API_PORT, () => {
  logger.info(`🚀 API listening on port ${String(env.API_PORT)} [${env.NODE_ENV}]`);
});

function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received — shutting down gracefully`);
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
