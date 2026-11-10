import type {
  CreateResumeDto,
  ResumeAnalysisResponseDto,
  ResumeEnhanceTextRequestDto,
  ResumeEnhanceTextResponseDto,
  ResumeMatchRequestDto,
  ResumeMatchResponseDto,
  ResumeResponseDto,
  UpdateResumeDto,
  UploadResumeDto,
} from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/lib/api-client';

export const resumeKeys = {
  all: ['resumes'] as const,
  list: () => [...resumeKeys.all, 'list'] as const,
  detail: (id: string) => [...resumeKeys.all, 'detail', id] as const,
  analyses: (id: string) => [...resumeKeys.all, 'analyses', id] as const,
};

// ── Query Hooks ─────────────────────────────────────────────────────────

export function useResumes() {
  return useQuery({
    queryKey: resumeKeys.list(),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ResumeResponseDto[] }>('/api/v1/resumes');
      return res.data.data;
    },
  });
}

export function useResume(id: string) {
  return useQuery({
    queryKey: resumeKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ResumeResponseDto }>(`/api/v1/resumes/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useResumeAnalyses(id: string) {
  return useQuery({
    queryKey: resumeKeys.analyses(id),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ResumeAnalysisResponseDto[] }>(
        `/api/v1/resumes/${id}/analyses`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

// ── Mutation Hooks ──────────────────────────────────────────────────────

export function useCreateResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateResumeDto) => {
      const res = await apiClient.post<{ success: true; data: ResumeResponseDto }>('/api/v1/resumes', dto);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UploadResumeDto) => {
      const res = await apiClient.post<{ success: true; data: ResumeResponseDto }>('/api/v1/resumes/upload', dto);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useUpdateResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateResumeDto }) => {
      const res = await apiClient.put<{ success: true; data: ResumeResponseDto }>(
        `/api/v1/resumes/${id}`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useDuplicateResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ success: true; data: ResumeResponseDto }>(
        `/api/v1/resumes/${id}/duplicate`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useSetPrimaryResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<{ success: true; data: ResumeResponseDto }>(
        `/api/v1/resumes/${id}/primary`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: true; data: { message: string } }>(
        `/api/v1/resumes/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useAnalyzeResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ success: true; data: ResumeAnalysisResponseDto }>(
        `/api/v1/resumes/${id}/analyze`,
      );
      return res.data.data;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: resumeKeys.analyses(id) });
      void queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
    },
  });
}

export function useEnhanceResumeText() {
  return useMutation({
    mutationFn: async (payload: ResumeEnhanceTextRequestDto) => {
      const res = await apiClient.post<{ success: true; data: ResumeEnhanceTextResponseDto }>(
        '/api/v1/resumes/enhance-text',
        payload,
      );
      return res.data.data;
    },
  });
}

export function useMatchOpportunity() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ResumeMatchRequestDto }) => {
      const res = await apiClient.post<{ success: true; data: ResumeMatchResponseDto }>(
        `/api/v1/resumes/${id}/match`,
        payload,
      );
      return res.data.data;
    },
  });
}
