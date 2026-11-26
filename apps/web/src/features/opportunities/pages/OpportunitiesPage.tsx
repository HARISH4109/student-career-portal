import type { OpportunityListQuery } from '@career-portal/shared-types';
import { Briefcase } from 'lucide-react';
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
import { Button, EmptyState, ErrorState, SkeletonCard } from '@/shared/components/ui';

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
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Opportunities
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStudent
              ? 'Browse and apply to available campus job and internship opportunities'
              : 'Browse active placement drives and campus opportunities'}
          </p>
        </div>
        {(isFaculty || isAdmin) && (
          <Button
            onClick={() => { void (navigate('/dashboard/opportunities/manage')); }}
            className="gap-2"
          >
            <Briefcase className="h-4 w-4" />
            <span>Manage Opportunities</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <OpportunityFilters filters={filters} onChange={setFilters} />

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load opportunities"
          message="We encountered an issue fetching available positions. Please try again."
          onRetry={() => {
            setFilters((f) => ({ ...f }));
          }}
        />
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No opportunities found"
          description="Try adjusting your filters, searching for a different skill, or check back later."
          action={{
            label: 'Clear Filters',
            onClick: () => {
              setFilters({ page: 1, pageSize: 20, sortBy: 'newest' });
            },
          }}
        />
      ) : (
        <>
          {/* Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-mono tabular-nums">
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
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) })); }}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground font-mono tabular-nums">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  { setFilters((f) => ({ ...f, page: Math.min(meta.totalPages, (f.page ?? 1) + 1) })); }
                }
                disabled={filters.page === meta.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
