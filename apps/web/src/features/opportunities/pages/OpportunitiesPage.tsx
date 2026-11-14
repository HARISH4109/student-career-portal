import type { OpportunityListQuery } from '@career-portal/shared-types';
import { Briefcase, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { useHasRole } from '@/features/auth/use-permission';
import {
  useOpportunities,
  useSaveOpportunity,
  useUnsaveOpportunity,
} from '@/features/opportunities/api/opportunities-api';
import { OpportunityCard } from '@/features/opportunities/components/OpportunityCard';
import { OpportunityFilters } from '@/features/opportunities/components/OpportunityFilters';

export function OpportunitiesPage(): React.JSX.Element {
  const navigate = useNavigate();
  const isStudent = useHasRole('STUDENT');
  const isFaculty = useHasRole('PLACEMENT_FACULTY');
  const isAdmin = useHasRole('ADMIN');


  const [filters, setFilters] = useState<Partial<OpportunityListQuery>>({
    page: 1,
    pageSize: 20,
    sortBy: 'newest',
  });

  const { data, isLoading, error } = useOpportunities(filters);
  const saveMutation = useSaveOpportunity();
  const unsaveMutation = useUnsaveOpportunity();

  const handleViewDetail = useCallback(
    (id: string) => navigate(`/dashboard/opportunities/${id}`),
    [navigate],
  );

  const handleToggleSave = useCallback(
    (id: string, isSaved: boolean) => {
      if (isSaved) {
        unsaveMutation.mutate(id);
      } else {
        saveMutation.mutate(id);
      }
    },
    [saveMutation, unsaveMutation],
  );

  const opportunities = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-600" /> Opportunities
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isStudent
              ? 'Browse and apply to available campus job and internship opportunities'
              : 'Browse active placement drives and campus opportunities'}
          </p>
        </div>
        {(isFaculty || isAdmin) && (
          <button
            onClick={() => { void (navigate('/dashboard/opportunities/manage')); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <Briefcase className="h-4 w-4" />
            <span>Manage Opportunities</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <OpportunityFilters filters={filters} onChange={setFilters} />

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">Failed to load opportunities</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No opportunities found</h3>
          <p className="mt-2 text-sm text-slate-500">
            Try adjusting your filters or check back later for new postings.
          </p>
        </div>
      ) : (
        <>
          {/* Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {opportunities.length} of {meta?.totalItems ?? 0} opportunities
            </p>
          </div>

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                showStudentContext={isStudent}
                onViewDetail={(id) => { void handleViewDetail(id); }}
                onToggleSave={isStudent ? handleToggleSave : undefined}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => { setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) })); }}
                disabled={filters.page === 1}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() =>
                  { setFilters((f) => ({ ...f, page: Math.min(meta.totalPages, (f.page ?? 1) + 1) })); }
                }
                disabled={filters.page === meta.totalPages}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
