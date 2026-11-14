import type {
  AcademicProgramDto,
  AcademicProgramWithStreamsDto,
  AcademicStreamDto,
  BatchDto,
  CreateAcademicProgramDto,
  CreateAcademicStreamDto,
  CreateBatchDto,
  CreateDepartmentDto,
  DepartmentDto,
  PaginationMeta,
  RoleName,
  UpdateAcademicProgramDto,
  UpdateAcademicStreamDto,
  UpdateBatchDto,
  UpdateDepartmentDto,
} from '@career-portal/shared-types';

import { apiClient } from '@/shared/lib/api-client';

import type {
  AdminHealthStatus,
  AuditFilterOptions,
  AuditLogEntry,
  AuditLogQueryParams,
  FailedAiJob,
  UserListItem,
  UserQueryParams,
} from '../types';

// ── Audit Logs ─────────────────────────────────────────────────────────────

export async function getAuditLogs(
  params?: AuditLogQueryParams,
): Promise<{ data: AuditLogEntry[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.action) query.set('action', params.action);
  if (params?.entityType) query.set('entityType', params.entityType);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.requestId) query.set('requestId', params.requestId);
  if (params?.origin) query.set('origin', params.origin);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  if (params?.search) query.set('search', params.search);

  const url = `/api/v1/admin/audit-logs${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<{ data: AuditLogEntry[]; meta: PaginationMeta }>(url);
  return {
    data: res.data.data,
    meta: res.data.meta,
  };
}

export async function getAuditFilterOptions(): Promise<AuditFilterOptions> {
  const res = await apiClient.get<{ data: AuditFilterOptions }>('/api/v1/admin/audit-logs/filter-options');
  return res.data.data;
}

// ── Failed AI Jobs ─────────────────────────────────────────────────────────

export async function getFailedAiJobs(params?: {
  page?: number | undefined;
  pageSize?: number | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  taskType?: string | undefined;
}): Promise<{ data: FailedAiJob[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  if (params?.taskType) query.set('taskType', params.taskType);

  const url = `/api/v1/admin/audit-logs/failed-ai-jobs${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<{ data: FailedAiJob[]; meta: PaginationMeta }>(url);
  return {
    data: res.data.data,
    meta: res.data.meta,
  };
}

// ── User Management ────────────────────────────────────────────────────────

export async function getUsers(
  params?: UserQueryParams,
): Promise<{ data: UserListItem[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.role) query.set('role', params.role);
  if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));

  const url = `/api/v1/admin/users${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<{ data: UserListItem[]; meta: PaginationMeta }>(url);
  return {
    data: res.data.data,
    meta: res.data.meta ?? { page: 1, pageSize: 20, totalItems: res.data.data.length, totalPages: 1 },
  };
}

export async function activateUser(userId: string): Promise<void> {
  await apiClient.patch(`/api/v1/admin/users/${userId}/activate`);
}

export async function deactivateUser(userId: string): Promise<void> {
  await apiClient.patch(`/api/v1/admin/users/${userId}/deactivate`);
}

export async function assignUserRole(userId: string, role: RoleName): Promise<void> {
  await apiClient.post(`/api/v1/admin/users/${userId}/roles`, { role });
}

export async function revokeUserRole(userId: string, role: RoleName): Promise<void> {
  await apiClient.delete(`/api/v1/admin/users/${userId}/roles/${role}`);
}

// ── System Health ──────────────────────────────────────────────────────────

export async function getAdminHealth(): Promise<AdminHealthStatus> {
  const res = await apiClient.get<{ data: AdminHealthStatus }>('/api/v1/admin/health');
  return res.data.data;
}

// ── Academic Master Data (Departments & Batches) ───────────────────────────

export async function getDepartments(): Promise<DepartmentDto[]> {
  const res = await apiClient.get<{ data: DepartmentDto[] }>('/api/v1/academic/departments');
  return res.data.data;
}

export async function createDepartment(payload: CreateDepartmentDto): Promise<DepartmentDto> {
  const res = await apiClient.post<{ data: DepartmentDto }>('/api/v1/academic/departments', payload);
  return res.data.data;
}

export async function updateDepartment(id: string, payload: UpdateDepartmentDto): Promise<DepartmentDto> {
  const res = await apiClient.put<{ data: DepartmentDto }>(`/api/v1/academic/departments/${id}`, payload);
  return res.data.data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/academic/departments/${id}`);
}

export async function getBatches(): Promise<BatchDto[]> {
  const res = await apiClient.get<{ data: BatchDto[] }>('/api/v1/academic/batches');
  return res.data.data;
}

export async function createBatch(payload: CreateBatchDto): Promise<BatchDto> {
  const res = await apiClient.post<{ data: BatchDto }>('/api/v1/academic/batches', payload);
  return res.data.data;
}

export async function updateBatch(id: string, payload: UpdateBatchDto): Promise<BatchDto> {
  const res = await apiClient.put<{ data: BatchDto }>(`/api/v1/academic/batches/${id}`, payload);
  return res.data.data;
}

export async function deleteBatch(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/academic/batches/${id}`);
}

// ── Academic Courses (Degree Programs) & Specialization Streams ───────────

export async function getCourses(departmentId?: string): Promise<AcademicProgramWithStreamsDto[]> {
  const url = departmentId ? `/api/v1/academic/programs?departmentId=${departmentId}` : '/api/v1/academic/programs';
  const res = await apiClient.get<{ data: AcademicProgramWithStreamsDto[] }>(url);
  return res.data.data;
}

export async function createCourse(payload: CreateAcademicProgramDto): Promise<AcademicProgramDto> {
  const res = await apiClient.post<{ data: AcademicProgramDto }>('/api/v1/academic/programs', payload);
  return res.data.data;
}

export async function updateCourse(id: string, payload: UpdateAcademicProgramDto): Promise<AcademicProgramDto> {
  const res = await apiClient.put<{ data: AcademicProgramDto }>(`/api/v1/academic/programs/${id}`, payload);
  return res.data.data;
}

export async function deleteCourse(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/academic/programs/${id}`);
}

export async function getStreams(programId?: string): Promise<AcademicStreamDto[]> {
  const url = programId ? `/api/v1/academic/streams?programId=${programId}` : '/api/v1/academic/streams';
  const res = await apiClient.get<{ data: AcademicStreamDto[] }>(url);
  return res.data.data;
}

export async function createStream(payload: CreateAcademicStreamDto): Promise<AcademicStreamDto> {
  const res = await apiClient.post<{ data: AcademicStreamDto }>('/api/v1/academic/streams', payload);
  return res.data.data;
}

export async function updateStream(id: string, payload: UpdateAcademicStreamDto): Promise<AcademicStreamDto> {
  const res = await apiClient.put<{ data: AcademicStreamDto }>(`/api/v1/academic/streams/${id}`, payload);
  return res.data.data;
}

export async function deleteStream(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/academic/streams/${id}`);
}
