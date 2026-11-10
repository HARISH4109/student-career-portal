import type { PaginationMeta } from '@career-portal/shared-types';
import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { useAuth } from '@/features/auth/use-auth';

// The endpoint determines the response type; callers supply it just as with Axios.get<T>.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useCareerData<T>(
  path: string | null,
): UseQueryResult<{ data: T; meta?: PaginationMeta }> {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['career', user?.id, path],
    enabled: Boolean(path),
    staleTime: 30_000,
    queryFn: async ({ signal }) =>
      (await apiClient.get<{ data: T; meta?: PaginationMeta }>(`/api/v1/${path ?? ''}`, { signal }))
        .data,
  });
}

// Selectors must include later pages rather than silently truncating catalogs at 100 rows.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function useCareerOptions<T>(path: string): UseQueryResult<{ data: T[] }> {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['career', user?.id, 'options', path],
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const data: T[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await apiClient.get<{ data: T[]; meta?: PaginationMeta }>(
          `/api/v1/${path}${path.includes('?') ? '&' : '?'}pageSize=100&page=${String(page)}`,
          { signal },
        );
        data.push(...response.data.data);
        totalPages = response.data.meta?.totalPages ?? 1;
        page++;
      } while (page <= totalPages);
      return { data };
    },
  });
}
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  return debounced;
}
type ActionInput = { path: string; body: unknown; method?: 'post' | 'put' | 'patch' };
export function useCareerAction<T>(): UseMutationResult<T, Error, ActionInput> {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      path,
      body,
      method = 'post',
    }: {
      path: string;
      body: unknown;
      method?: 'post' | 'put' | 'patch';
    }) => (await apiClient[method]<{ data: T }>(`/api/v1/${path}`, body)).data.data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['career', user?.id] });
    },
  });
}
