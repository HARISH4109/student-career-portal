import type {
  AcademicProgramDto,
  BatchDto,
  DepartmentDto,
  ProficiencyLevel,
  ProfileCompletionResponseDto,
  SkillDto,
  StudentProfileResponseDto,
  UpdateStudentProfileDto,
} from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/lib/api-client';

export const studentKeys = {
  all: ['students'] as const,
  me: () => [...studentKeys.all, 'me'] as const,
  completion: () => [...studentKeys.all, 'completion'] as const,
  departments: () => ['academic', 'departments'] as const,
  programs: (departmentId?: string) => ['academic', 'programs', departmentId] as const,
  batches: () => ['academic', 'batches'] as const,
  skills: (search?: string, category?: string) => ['skills', search, category] as const,
};

// ── Query Hooks ─────────────────────────────────────────────────────────

export function useStudentProfile() {
  return useQuery({
    queryKey: studentKeys.me(),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: StudentProfileResponseDto }>(
        '/api/v1/students/me',
      );
      return res.data.data;
    },
    retry: false,
  });
}

export function useProfileCompletion() {
  return useQuery({
    queryKey: studentKeys.completion(),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ProfileCompletionResponseDto }>(
        '/api/v1/students/me/completion',
      );
      return res.data.data;
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: studentKeys.departments(),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: DepartmentDto[] }>(
        '/api/v1/academic/departments',
      );
      return res.data.data;
    },
  });
}

export function usePrograms(departmentId?: string) {
  return useQuery({
    queryKey: studentKeys.programs(departmentId),
    queryFn: async () => {
      const params = departmentId ? { departmentId } : undefined;
      const res = await apiClient.get<{ success: true; data: AcademicProgramDto[] }>(
        '/api/v1/academic/programs',
        { params },
      );
      return res.data.data;
    },
    enabled: departmentId ? Boolean(departmentId) : true,
  });
}

export function useBatches() {
  return useQuery({
    queryKey: studentKeys.batches(),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: BatchDto[] }>('/api/v1/academic/batches');
      return res.data.data;
    },
  });
}

export function useSkillsCatalog(search?: string, category?: string) {
  return useQuery({
    queryKey: studentKeys.skills(search, category),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await apiClient.get<{ success: true; data: SkillDto[] }>('/api/v1/skills', { params });
      return res.data.data;
    },
  });
}

// ── Mutation Hooks ──────────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateStudentProfileDto) => {
      const res = await apiClient.put<{ success: true; data: StudentProfileResponseDto }>(
        '/api/v1/students/me',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studentKeys.me() });
      void queryClient.invalidateQueries({ queryKey: studentKeys.completion() });
    },
  });
}

export function useAddStudentSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { skillId: string; proficiency: ProficiencyLevel }) => {
      const res = await apiClient.post<{ success: true; data: StudentProfileResponseDto }>(
        '/api/v1/students/me/skills',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studentKeys.me() });
      void queryClient.invalidateQueries({ queryKey: studentKeys.completion() });
    },
  });
}

export function useRemoveStudentSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (skillId: string) => {
      const res = await apiClient.delete<{ success: true; data: StudentProfileResponseDto }>(
        `/api/v1/students/me/skills/${skillId}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studentKeys.me() });
      void queryClient.invalidateQueries({ queryKey: studentKeys.completion() });
    },
  });
}
