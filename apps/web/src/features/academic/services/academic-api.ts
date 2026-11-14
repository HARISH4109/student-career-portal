import type {
  AcademicProgramWithStreamsDto,
  AcademicStreamDto,
  CreateAcademicProgramDto,
  CreateAcademicStreamDto,
  UpdateAcademicProgramDto,
  UpdateAcademicStreamDto,
} from '@career-portal/shared-types';
import { apiClient } from '@/shared/lib/api-client';

export async function getAcademicPrograms(): Promise<AcademicProgramWithStreamsDto[]> {
  const res = await apiClient.get<{ data: AcademicProgramWithStreamsDto[] }>('/api/v1/academic/programs');
  return res.data.data;
}

export async function createAcademicProgram(
  payload: CreateAcademicProgramDto,
): Promise<AcademicProgramWithStreamsDto> {
  const res = await apiClient.post<{ data: AcademicProgramWithStreamsDto }>('/api/v1/academic/programs', payload);
  return res.data.data;
}

export async function updateAcademicProgram(
  id: string,
  payload: UpdateAcademicProgramDto,
): Promise<AcademicProgramWithStreamsDto> {
  const res = await apiClient.put<{ data: AcademicProgramWithStreamsDto }>(`/api/v1/academic/programs/${id}`, payload);
  return res.data.data;
}

export async function deleteAcademicProgram(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/academic/programs/${id}`);
}

export async function getAcademicStreams(programId?: string): Promise<AcademicStreamDto[]> {
  const url = programId
    ? `/api/v1/academic/streams?programId=${encodeURIComponent(programId)}`
    : '/api/v1/academic/streams';
  const res = await apiClient.get<{ data: AcademicStreamDto[] }>(url);
  return res.data.data;
}

export async function createAcademicStream(
  payload: CreateAcademicStreamDto,
): Promise<AcademicStreamDto> {
  const res = await apiClient.post<{ data: AcademicStreamDto }>('/api/v1/academic/streams', payload);
  return res.data.data;
}

export async function updateAcademicStream(
  id: string,
  payload: UpdateAcademicStreamDto,
): Promise<AcademicStreamDto> {
  const res = await apiClient.put<{ data: AcademicStreamDto }>(`/api/v1/academic/streams/${id}`, payload);
  return res.data.data;
}

export async function deleteAcademicStream(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/academic/streams/${id}`);
}

