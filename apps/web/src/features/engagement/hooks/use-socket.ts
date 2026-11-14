import type { NotificationResponse } from '@career-portal/shared-types';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/features/auth/use-auth';

export function useNotificationSocket(onNewNotification?: (notification: NotificationResponse) => void) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('supabase_access_token');
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin)
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/$/, '');

    const socket = io(apiBaseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('notification:new', (notification: NotificationResponse) => {
      onNewNotification?.(notification);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, onNewNotification]);

  return socketRef;
}

