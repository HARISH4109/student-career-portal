import type {
  AdminTestQuestionDto,
  AttemptResultDto,
  AutosaveAnswerDto,
  CreateMockInterviewDto,
  CreateMockInterviewTemplateDto,
  CreateMockTestDto,
  CreateTestQuestionDto,
  CreateTestSectionDto,
  FacultyTestAggregateAnalyticsDto,
  MockInterviewDto,
  MockInterviewTemplateDto,
  MockTestDetailDto,
  PaginationMeta,
  StartTestResponseDto,
  TestSectionDto,
  StudentAttemptSummaryDto,
  StudentPreparationAnalyticsDto,
  SubmitInterviewAnswersDto,
  SubmitMockTestDto,
  UpdateMockInterviewTemplateDto,
  UpdateMockTestDto,
} from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/lib/api-client';

export const preparationKeys = {
  all: ['preparation'] as const,
  tests: (params?: { category?: string | undefined; search?: string | undefined; status?: 'active' | 'closed' | 'all' | undefined }  ) => [...preparationKeys.all, 'tests', params] as const,
  testDetail: (id: string) => [...preparationKeys.all, 'test', id] as const,
  testAuthor: (id: string) => [...preparationKeys.all, 'test-author', id] as const,
  attemptResult: (id: string) => [...preparationKeys.all, 'attempt-result', id] as const,
  myAttempts: () => [...preparationKeys.all, 'my-attempts'] as const,
  myAnalytics: () => [...preparationKeys.all, 'my-analytics'] as const,
  facultyAnalytics: (testId: string) => [...preparationKeys.all, 'faculty-analytics', testId] as const,
  interviews: () => [...preparationKeys.all, 'interviews'] as const,
  interviewDetail: (id: string) => [...preparationKeys.all, 'interview', id] as const,
  interviewTemplates: () => [...preparationKeys.all, 'interview-templates'] as const,
};

// ── Tests Queries & Mutations ────────────────────────────────────────────

export function useMockTests(params?: {
  category?: string | undefined;
  search?: string | undefined;
  status?: 'active' | 'closed' | 'all' | undefined;
}) {
  return useQuery({
    queryKey: preparationKeys.tests(params),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: Array<
          MockTestDetailDto & {
            sectionsCount: number;
            questionsCount: number;
          }
        >;
        meta: PaginationMeta;
      }>('/api/v1/tests', { params });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useMockTestDetail(id: string) {
  return useQuery({
    queryKey: preparationKeys.testDetail(id),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: MockTestDetailDto;
      }>(`/api/v1/tests/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useMockTestAuthorDetail(id: string) {
  return useQuery({
    queryKey: preparationKeys.testAuthor(id),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: MockTestDetailDto & { questions: AdminTestQuestionDto[] };
      }>(`/api/v1/tests/${id}/author`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateMockTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMockTestDto) => {
      const res = await apiClient.post<{
        success: true;
        data: MockTestDetailDto;
      }>('/api/v1/tests', dto);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.all });
    },
  });
}

export function useUpdateMockTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMockTestDto }) => {
      const res = await apiClient.patch<{
        success: true;
        data: MockTestDetailDto;
      }>(`/api/v1/tests/${id}`, data);
      return res.data.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testDetail(vars.id) });
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testAuthor(vars.id) });
      void queryClient.invalidateQueries({ queryKey: preparationKeys.tests() });
    },
  });
}

export function useDeleteMockTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: true }>(`/api/v1/tests/${id}`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.all });
    },
  });
}

// ── Section & Question Authoring Mutations ───────────────────────────────

export function useAddTestSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, data }: { testId: string; data: CreateTestSectionDto }) => {
      const res = await apiClient.post<{ success: true; data: TestSectionDto }>(`/api/v1/tests/${testId}/sections`, data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testAuthor(vars.testId) });
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testDetail(vars.testId) });
    },
  });
}

export function useAddTestQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, data }: { testId: string; data: CreateTestQuestionDto }) => {
      const res = await apiClient.post<{
        success: true;
        data: AdminTestQuestionDto;
      }>(`/api/v1/tests/${testId}/questions`, data);
      return res.data.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testAuthor(vars.testId) });
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testDetail(vars.testId) });
    },
  });
}

export function useDeleteTestQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, questionId }: { testId: string; questionId: string }) => {
      const res = await apiClient.delete<{ success: true; data: { success: boolean } }>(`/api/v1/tests/${testId}/questions/${questionId}`);
      return res.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.testAuthor(vars.testId) });
    },
  });
}

// ── Test Taking, Autosave & Submission ───────────────────────────────────

export function useStartTest() {
  return useMutation({
    mutationFn: async (testId: string) => {
      const res = await apiClient.post<{
        success: true;
        data: StartTestResponseDto;
      }>(`/api/v1/tests/${testId}/start`);
      return res.data.data;
    },
  });
}

export function useAutosaveAnswer() {
  return useMutation({
    mutationFn: async ({ attemptId, data }: { attemptId: string; data: AutosaveAnswerDto }) => {
      const res = await apiClient.post<{ success: true }>(`/api/v1/attempts/${attemptId}/autosave`, data);
      return res.data;
    },
  });
}

export function useSubmitTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attemptId, data }: { attemptId: string; data: SubmitMockTestDto }) => {
      const res = await apiClient.post<{
        success: true;
        data: AttemptResultDto;
      }>(`/api/v1/attempts/${attemptId}/submit`, data);
      return res.data.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.attemptResult(data.attemptId) });
      void queryClient.invalidateQueries({ queryKey: preparationKeys.myAttempts() });
      void queryClient.invalidateQueries({ queryKey: preparationKeys.myAnalytics() });
    },
  });
}

export function useAttemptResult(attemptId: string) {
  return useQuery({
    queryKey: preparationKeys.attemptResult(attemptId),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: AttemptResultDto;
      }>(`/api/v1/attempts/${attemptId}/result`);
      return res.data.data;
    },
    enabled: Boolean(attemptId),
  });
}

export function useMyAttempts() {
  return useQuery({
    queryKey: preparationKeys.myAttempts(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: StudentAttemptSummaryDto[];
      }>('/api/v1/attempts/me');
      return res.data.data;
    },
  });
}

export function useMyPreparationAnalytics() {
  return useQuery({
    queryKey: preparationKeys.myAnalytics(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: StudentPreparationAnalyticsDto;
      }>('/api/v1/preparation/analytics/me');
      return res.data.data;
    },
  });
}

export function useFacultyTestAnalytics(testId: string) {
  return useQuery({
    queryKey: preparationKeys.facultyAnalytics(testId),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: FacultyTestAggregateAnalyticsDto;
      }>(`/api/v1/tests/${testId}/analytics`);
      return res.data.data;
    },
    enabled: Boolean(testId),
  });
}

// ── Mock Interview Queries & Mutations ───────────────────────────────────

export function useMyMockInterviews() {
  return useQuery({
    queryKey: preparationKeys.interviews(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: MockInterviewDto[];
      }>('/api/v1/mock-interviews/me');
      return res.data.data;
    },
  });
}

export function useScheduleMockInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMockInterviewDto) => {
      const res = await apiClient.post<{
        success: true;
        data: MockInterviewDto;
      }>('/api/v1/mock-interviews', data);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.interviews() });
    },
  });
}

export function useSubmitAIInterviewAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SubmitInterviewAnswersDto }) => {
      const res = await apiClient.post<{
        success: true;
        data: MockInterviewDto;
      }>(`/api/v1/mock-interviews/${id}/submit`, data);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.interviews() });
    },
  });
}

export function useDeleteMockInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: true }>(`/api/v1/mock-interviews/${id}`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.interviews() });
    },
  });
}

// ── Mock Interview Tracks / Templates (Faculty Curated) ───────────────────

export function useMockInterviewTemplates() {
  return useQuery({
    queryKey: preparationKeys.interviewTemplates(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: MockInterviewTemplateDto[];
      }>('/api/v1/mock-interviews/templates');
      return res.data.data;
    },
  });
}

export function useCreateMockInterviewTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMockInterviewTemplateDto) => {
      const res = await apiClient.post<{
        success: true;
        data: MockInterviewTemplateDto;
      }>('/api/v1/mock-interviews/templates', data);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.interviewTemplates() });
    },
  });
}

export function useUpdateMockInterviewTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMockInterviewTemplateDto }) => {
      const res = await apiClient.patch<{
        success: true;
        data: MockInterviewTemplateDto;
      }>(`/api/v1/mock-interviews/templates/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.interviewTemplates() });
    },
  });
}

export function useDeleteMockInterviewTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: true }>(`/api/v1/mock-interviews/templates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preparationKeys.interviewTemplates() });
    },
  });
}
