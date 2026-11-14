import type { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';
import { supabaseAdmin } from './supabase';

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(io: SocketIOServer): void {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const authHeader = (socket.handshake.headers.authorization as string | undefined) ?? '';
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

      if (!rawToken) {
        return next(new Error('Authentication token required'));
      }

      const { data, error } = await supabaseAdmin.auth.getUser(rawToken);
      if (error || !data.user) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = data.user.id;
      return next();
    } catch (err) {
      logger.error({ err }, 'Socket authentication error');
      return next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const userRoom = `user:${userId}`;
      void socket.join(userRoom);
      logger.debug({ socketId: socket.id, userId }, `Socket joined room ${userRoom}`);
    }

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id, userId }, 'Socket disconnected');
    });
  });
}

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}

export function emitToUser(userId: string, event: string, payload: unknown): boolean {
  if (!ioInstance) {
    logger.debug({ userId, event }, 'Socket server not initialized, skipping real-time push');
    return false;
  }
  ioInstance.to(`user:${userId}`).emit(event, payload);
  return true;
}

export function emitNotificationToUser(userId: string, notification: unknown): boolean {
  return emitToUser(userId, 'notification:new', notification);
}

export function emitBroadcast(event: string, payload: unknown): boolean {
  if (!ioInstance) return false;
  ioInstance.emit(event, payload);
  return true;
}

