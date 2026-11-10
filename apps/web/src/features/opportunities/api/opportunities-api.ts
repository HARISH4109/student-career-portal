import type {
  ApplicationListQuery,
  ApplicationResponseDto,
  ApproveDraftDto,
  CompanyResponseDto,
  CreateApplicationDto,
  CreateOpportunityDto,
  ExtractedOpportunityDto,
  IngestOpportunitySourceDto,
  OpportunityDraftListQuery,
  OpportunityDraftResponseDto,
  OpportunityListQuery,
  OpportunityResponseDto,
  PaginationMeta,
  RejectDraftDto,
  SavedOpportunityResponseDto,
  UpdateApplicationStatusDto,
  UpdateOpportunityDraftDto,
  UpdateOpportunityDto,
  UpdateOpportunityStatusDto,
} from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/lib/api-client';

// ── Query Keys ──────────────────────────────────────────────────────────

export const opportunityKeys = {
  all: ['opportunities'] as const,
  list: (params?: Partial<OpportunityListQuery>) => [...opportunityKeys.all, 'list', params] as const,
  detail: (id: string) => [...opportunityKeys.all, 'detail', id] as const,
  companies: (search?: string) => ['companies', search] as const,
  applications: ['applications'] as const,
  myApplications: (params?: Partial<ApplicationListQuery>) => ['applications', 'me', params] as const,
  applicationDetail: (id: string) => ['applications', 'detail', id] as const,
  opportunityApplications: (oppId: string) => ['applications', 'by-opportunity', oppId] as const,
  savedOpportunities: ['saved-opportunities'] as const,
};

export const draftKeys = {
  all: ['opportunity-drafts'] as const,
  list: (params?: Partial<OpportunityDraftListQuery>) => [...draftKeys.all, 'list', params] as const,
  detail: (id: string) => [...draftKeys.all, 'detail', id] as const,
  counts: () => [...draftKeys.all, 'counts'] as const,
};

// ── Opportunity Queries ─────────────────────────────────────────────────

export function useOpportunities(params?: Partial<OpportunityListQuery>) {
  return useQuery({
    queryKey: opportunityKeys.list(params),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: OpportunityResponseDto[];
        meta: PaginationMeta;
      }>('/api/v1/opportunities', { params });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: OpportunityResponseDto }>(
        `/api/v1/opportunities/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

// ── Company Queries ─────────────────────────────────────────────────────

export function useCompanies(search?: string) {
  return useQuery({
    queryKey: opportunityKeys.companies(search),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const res = await apiClient.get<{ success: true; data: CompanyResponseDto[] }>(
        '/api/v1/companies',
        { params },
      );
      return res.data.data;
    },
  });
}

// ── Application Queries ─────────────────────────────────────────────────

export function useMyApplications(params?: Partial<ApplicationListQuery>) {
  return useQuery({
    queryKey: opportunityKeys.myApplications(params),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: ApplicationResponseDto[];
        meta: PaginationMeta;
      }>('/api/v1/applications/me', { params });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: opportunityKeys.applicationDetail(id),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: ApplicationResponseDto }>(
        `/api/v1/applications/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useOpportunityApplications(oppId: string, statusFilter?: string) {
  return useQuery({
    queryKey: opportunityKeys.opportunityApplications(oppId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get<{
        success: true;
        data: ApplicationResponseDto[];
        meta: PaginationMeta;
      }>(`/api/v1/applications/by-opportunity/${oppId}`, { params });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: Boolean(oppId),
  });
}

// ── Saved Opportunities ─────────────────────────────────────────────────

export function useSavedOpportunities() {
  return useQuery({
    queryKey: opportunityKeys.savedOpportunities,
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: SavedOpportunityResponseDto[];
      }>('/api/v1/saved-opportunities');
      return res.data.data;
    },
  });
}

// ── Mutations ───────────────────────────────────────────────────────────

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateOpportunityDto) => {
      const res = await apiClient.post<{ success: true; data: OpportunityResponseDto }>(
        '/api/v1/opportunities',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateOpportunityDto }) => {
      const res = await apiClient.put<{ success: true; data: OpportunityResponseDto }>(
        `/api/v1/opportunities/${id}`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useUpdateOpportunityStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateOpportunityStatusDto }) => {
      const res = await apiClient.patch<{ success: true; data: OpportunityResponseDto }>(
        `/api/v1/opportunities/${id}/status`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/opportunities/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useApplyToOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateApplicationDto) => {
      const res = await apiClient.post<{ success: true; data: ApplicationResponseDto }>(
        '/api/v1/applications',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.applications });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: true; data: ApplicationResponseDto }>(
        `/api/v1/applications/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.applications });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateApplicationStatusDto }) => {
      const res = await apiClient.patch<{ success: true; data: ApplicationResponseDto }>(
        `/api/v1/applications/${id}/status`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.applications });
    },
  });
}

export function useSaveOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opportunityId: string) => {
      const res = await apiClient.post<{ success: true; data: SavedOpportunityResponseDto }>(
        '/api/v1/saved-opportunities',
        { opportunityId },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.savedOpportunities });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useUnsaveOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opportunityId: string) => {
      await apiClient.delete(`/api/v1/saved-opportunities/${opportunityId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.savedOpportunities });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

// ── AI Extraction ───────────────────────────────────────────────────────

export function useExtractOpportunity() {
  return useMutation({
    mutationFn: async (payload: {
      sourceType: 'url' | 'text' | 'image';
      content: string;
      fileName?: string;
      mimeType?: string;
    }) => {
      const res = await apiClient.post<{ success: true; data: ExtractedOpportunityDto }>(
        '/api/v1/opportunities/extract',
        payload,
        { timeout: 210_000 },
      );
      return res.data.data;
    },
  });
}

// ── Opportunity Draft Queries & Mutations (Phase 4 Pipeline) ────────────

export function useOpportunityDrafts(params?: Partial<OpportunityDraftListQuery>) {
  return useQuery({
    queryKey: draftKeys.list(params),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: OpportunityDraftResponseDto[];
        meta: PaginationMeta;
      }>('/api/v1/opportunity-drafts', { params });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useOpportunityDraft(id: string) {
  return useQuery({
    queryKey: draftKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: OpportunityDraftResponseDto }>(
        `/api/v1/opportunity-drafts/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useDraftCounts() {
  return useQuery({
    queryKey: draftKeys.counts(),
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Record<string, number> }>(
        '/api/v1/opportunity-drafts/counts',
      );
      return res.data.data;
    },
  });
}

export function useIngestSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: IngestOpportunitySourceDto) => {
      const res = await apiClient.post<{ success: true; data: OpportunityDraftResponseDto }>(
        '/api/v1/opportunity-drafts/ingest',
        payload,
        { timeout: 210_000 },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOpportunityDraftDto }) => {
      const res = await apiClient.patch<{ success: true; data: OpportunityDraftResponseDto }>(
        `/api/v1/opportunity-drafts/${id}`,
        data,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: draftKeys.list() });
      void queryClient.invalidateQueries({ queryKey: draftKeys.counts() });
    },
  });
}

export function useApproveDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ApproveDraftDto }) => {
      const res = await apiClient.post<{ success: true; data: OpportunityDraftResponseDto }>(
        `/api/v1/opportunity-drafts/${id}/approve`,
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

export function useRejectDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RejectDraftDto }) => {
      const res = await apiClient.post<{ success: true; data: OpportunityDraftResponseDto }>(
        `/api/v1/opportunity-drafts/${id}/reject`,
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}

export function useRetryExtraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const res = await apiClient.post<{ success: true; data: OpportunityDraftResponseDto }>(
        `/api/v1/opportunity-drafts/${draftId}/retry`,
        {},
        { timeout: 210_000 },
      );
      return res.data.data;
    },
    onSuccess: (_data, draftId) => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.detail(draftId) });
      void queryClient.invalidateQueries({ queryKey: draftKeys.list() });
      void queryClient.invalidateQueries({ queryKey: draftKeys.counts() });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/opportunity-drafts/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}

