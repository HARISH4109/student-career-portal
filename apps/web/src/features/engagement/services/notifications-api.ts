import type {
  NotificationPreferencesResponse,
  NotificationResponse,
  PaginationMeta,
  UpdateNotificationPreferencesInput,
} from '@career-portal/shared-types';
import { apiClient } from '@/shared/lib/api-client';

export interface NotificationQueryParams {
  isRead?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export async function getNotifications(
  params?: NotificationQueryParams,
): Promise<{ data: NotificationResponse[]; meta?: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.isRead !== undefined) query.set('isRead', String(params.isRead));
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const url = `/api/v1/notifications${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<{ data: NotificationResponse[]; meta?: PaginationMeta }>(url);
  return res.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiClient.get<{ data: { unreadCount: number } }>('/api/v1/notifications/unread-count');
  return res.data.data.unreadCount;
}

export async function markNotificationAsRead(id: string): Promise<NotificationResponse> {
  const res = await apiClient.patch<{ data: NotificationResponse }>(`/api/v1/notifications/${id}/read`);
  return res.data.data;
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const res = await apiClient.post<{ data: { markedCount: number } }>('/api/v1/notifications/mark-all-read');
  return res.data.data.markedCount;
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  const res = await apiClient.get<{ data: NotificationPreferencesResponse }>('/api/v1/notifications/preferences');
  return res.data.data;
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferencesResponse> {
  const res = await apiClient.put<{ data: NotificationPreferencesResponse }>('/api/v1/notifications/preferences', input);
  return res.data.data;
}
