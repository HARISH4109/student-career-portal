import type {
  CreateNoticeInput,
  NoticeCategory,
  NoticeResponse,
  PaginationMeta,
  UpdateNoticeInput,
} from '@career-portal/shared-types';
import { apiClient } from '@/shared/lib/api-client';

export interface NoticeQueryParams {
  category?: NoticeCategory | undefined;
  search?: string | undefined;
  isPinned?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export async function getStudentNotices(
  params?: NoticeQueryParams,
): Promise<{ data: NoticeResponse[]; meta?: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.isPinned !== undefined) query.set('isPinned', String(params.isPinned));
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const url = `/api/v1/notices${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<{ data: NoticeResponse[]; meta?: PaginationMeta }>(url);
  return res.data;
}

export async function getStaffNotices(
  params?: NoticeQueryParams,
): Promise<{ data: NoticeResponse[]; meta?: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.isPinned !== undefined) query.set('isPinned', String(params.isPinned));
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const url = `/api/v1/notices/manage${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<{ data: NoticeResponse[]; meta?: PaginationMeta }>(url);
  return res.data;
}

export async function getNoticeById(id: string): Promise<NoticeResponse> {
  const res = await apiClient.get<{ data: NoticeResponse }>(`/api/v1/notices/${id}`);
  return res.data.data;
}

export async function createNotice(input: CreateNoticeInput): Promise<NoticeResponse> {
  const res = await apiClient.post<{ data: NoticeResponse }>('/api/v1/notices', input);
  return res.data.data;
}

export async function updateNotice(id: string, input: UpdateNoticeInput): Promise<NoticeResponse> {
  const res = await apiClient.put<{ data: NoticeResponse }>(`/api/v1/notices/${id}`, input);
  return res.data.data;
}

export async function setNoticePin(id: string, isPinned: boolean): Promise<NoticeResponse> {
  const res = await apiClient.patch<{ data: NoticeResponse }>(`/api/v1/notices/${id}/pin`, { isPinned });
  return res.data.data;
}

export async function expireNotice(id: string): Promise<NoticeResponse> {
  const res = await apiClient.patch<{ data: NoticeResponse }>(`/api/v1/notices/${id}/expire`);
  return res.data.data;
}

export async function publishNotice(id: string): Promise<NoticeResponse> {
  const res = await apiClient.patch<{ data: NoticeResponse }>(`/api/v1/notices/${id}/publish`);
  return res.data.data;
}

export async function uploadNoticePoster(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ data: { url: string } }>('/api/v1/notices/upload-poster', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
}
