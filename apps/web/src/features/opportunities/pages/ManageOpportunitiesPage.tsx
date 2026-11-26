import type { OpportunityListQuery, OpportunityResponseDto } from '@career-portal/shared-types';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle,
  Eye,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import {
  useDeleteOpportunity,
  useDraftCounts,
  useOpportunities,
  useUpdateOpportunityStatus,
} from '@/features/opportunities/api/opportunities-api';
import { CreateOpportunityForm } from '@/features/opportunities/components/CreateOpportunityForm';
import { DraftReviewQueue } from '@/features/opportunities/components/DraftReviewQueue';
import { OpportunityFilters } from '@/features/opportunities/components/OpportunityFilters';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  StatusBadge,
} from '@/shared/components/ui';

export function ManageOpportunitiesPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'published' | 'drafts'>('published');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityResponseDto | null>(null);
  const [filters, setFilters] = useState<Partial<OpportunityListQuery>>({
    page: 1,
    pageSize: 20,
    sortBy: 'newest',
  });

  const { data: draftCounts } = useDraftCounts();
  const pendingDraftsCount = draftCounts?.pending_review ?? 0;

  const { data, isLoading, error } = useOpportunities(filters);
  const statusMutation = useUpdateOpportunityStatus();
  const deleteMutation = useDeleteOpportunity();

  const opportunities = data?.data ?? [];
  const meta = data?.meta;

  const handleStatusChange = (id: string, status: 'draft' | 'published' | 'closed' | 'expired' | 'rejected') => {
    if (status === 'published') {
      const current = opportunities.find((o) => o.id === id);
      if (current) {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const currentTitle = normalize(current.title);
        const currentCompany = normalize(current.company?.name || '');

        const duplicate = opportunities.find((o) => {
          if (o.id === id || o.status !== 'published') return false;
          const oTitle = normalize(o.title);
          const oCompany = normalize(o.company?.name || '');

          const companyMatches =
            oCompany === currentCompany ||
            (oCompany.length >= 2 && currentCompany.includes(oCompany)) ||
            (currentCompany.length >= 2 && oCompany.includes(currentCompany));

          if (!companyMatches) return false;

          const titleMatches =
            oTitle === currentTitle ||
            (oTitle.length >= 3 && currentTitle.includes(oTitle)) ||
            (currentTitle.length >= 3 && oTitle.includes(currentTitle));

          return titleMatches;
        });

        if (duplicate) {
          alert(
            `Cannot publish this opportunity!\n\nA published opportunity with matching title ("${duplicate.title}") for company ("${(duplicate.company?.name ?? '')}") already exists in the portal.\n\nTo prevent duplicate job postings, publishing is strictly restricted.`,
          );
          return;
        }
      }
    }

    if (window.confirm(`Change status to "${status}"?`)) {
      statusMutation.mutate({ id, dto: { status } });
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { void (navigate('/dashboard/opportunities')); }}
            title="Back to Opportunities"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> Manage Opportunities
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Create, edit, and publish campus placement opportunities</p>
          </div>
        </div>
        <Button
          onClick={() => { setShowCreateForm(true); }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Opportunity</span>
        </Button>
      </div>

      {(deleteMutation.error || statusMutation.error) && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>
            {
              (deleteMutation.error ?? statusMutation.error)?.message ||
              'An error occurred.'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              deleteMutation.reset();
              statusMutation.reset();
            }}
            className="text-xs font-semibold text-destructive underline"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Tabs: Published Opportunities vs AI Ingestion Queue */}
      <nav
        aria-label="Manage opportunities sections"
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xs"
      >
        <button
          type="button"
          onClick={() => { setMainTab('published'); }}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            mainTab === 'published'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>Published & Direct Opportunities</span>
        </button>

        <button
          type="button"
          onClick={() => { setMainTab('drafts'); }}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            mainTab === 'drafts'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>AI Agent Extraction & Ingestion</span>
          {pendingDraftsCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold font-mono ${
                mainTab === 'drafts' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              }`}
            >
              {pendingDraftsCount} pending
            </span>
          )}
        </button>
      </nav>

      {mainTab === 'drafts' ? (
        <DraftReviewQueue />
      ) : (
        <>
          {/* Filters */}
          <OpportunityFilters filters={filters} onChange={setFilters} showStatusFilter />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-semibold">Failed to load opportunities</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0 shadow-xs border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-normal text-muted-foreground">
                    Opportunity
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-normal text-muted-foreground">
                    Type
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-normal text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-normal text-muted-foreground">
                    Deadline
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold tracking-normal text-muted-foreground">
                    Apps
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold tracking-normal text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      <EmptyState
                        icon={Briefcase}
                        title="No opportunities found"
                        description="Try modifying your filters or create a new campus placement opportunity."
                        action={{
                          label: 'Create Opportunity',
                          onClick: () => { setShowCreateForm(true); },
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => {
                    const deadline = opp.applicationDeadline
                      ? new Date(opp.applicationDeadline)
                      : null;
                    return (
                      <tr key={opp.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{opp.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {opp.company?.name ?? 'Company'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={opp.type === 'job' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {opp.type === 'job' ? 'Job' : 'Internship'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={opp.status} />
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                          {deadline
                            ? deadline.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono font-medium text-foreground">
                          {opp.applicationCount}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { void (navigate(`/dashboard/opportunities/${opp.id}`)); }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingOpportunity(opp); }}
                              title="Edit Opportunity"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {opp.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { handleStatusChange(opp.id, 'published'); }}
                                disabled={statusMutation.isPending}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Publish"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {opp.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { handleStatusChange(opp.id, 'closed'); }}
                                disabled={statusMutation.isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Close"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(opp.status === 'closed' || opp.status === 'expired') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const isDeadlinePast = opp.applicationDeadline && new Date(opp.applicationDeadline).getTime() <= Date.now();
                                  if (isDeadlinePast) {
                                    if (window.confirm(`The application deadline for "${opp.title}" has passed. Would you like to edit it to set a future deadline and go live?`)) {
                                      setEditingOpportunity(opp);
                                    }
                                    return;
                                  }
                                  handleStatusChange(opp.id, 'published');
                                }}
                                disabled={statusMutation.isPending}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Go Live (Activate)"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { handleDelete(opp.id, opp.title); }}
                              disabled={deleteMutation.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete Opportunity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <p className="text-xs text-muted-foreground font-mono">
                {meta.totalItems} total opportunities
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) })); }}
                  disabled={filters.page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {meta.page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters((f) => ({
                      ...f,
                      page: Math.min(meta.totalPages, (f.page ?? 1) + 1),
                    }));
                  }}
                  disabled={filters.page === meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      </>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateOpportunityForm
          onClose={() => { setShowCreateForm(false); }}
          onSuccess={() => { setShowCreateForm(false); }}
        />
      )}

      {/* Edit Form Modal */}
      {editingOpportunity && (
        <CreateOpportunityForm
          opportunity={editingOpportunity}
          onClose={() => { setEditingOpportunity(null); }}
          onSuccess={() => { setEditingOpportunity(null); }}
        />
      )}
    </div>
  );
}
