import type { OpportunityListQuery, OpportunityResponseDto } from '@career-portal/shared-types';
import {
  ArrowLeft,
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

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  draft: { className: 'bg-slate-100 text-slate-600', label: 'Draft' },
  pending_review: { className: 'bg-amber-100 text-amber-700', label: 'Pending Review' },
  published: { className: 'bg-emerald-100 text-emerald-700', label: 'Published' },
  closed: { className: 'bg-red-100 text-red-700', label: 'Closed' },
  expired: { className: 'bg-slate-100 text-slate-500', label: 'Expired' },
  rejected: { className: 'bg-red-100 text-red-600', label: 'Rejected' },
};

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { void (navigate('/dashboard/opportunities')); }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Opportunities</h1>
            <p className="mt-1 text-sm text-slate-500">Create, edit, and publish placement opportunities</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Create Opportunity
        </button>
      </div>

      {(deleteMutation.error || statusMutation.error) && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>
            {
              (deleteMutation.error ?? statusMutation.error)?.message ||
              'An error occurred.'}
          </span>
          <button
            onClick={() => {
              deleteMutation.reset();
              statusMutation.reset();
            }}
            className="text-xs font-semibold text-red-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tabs: Published Opportunities vs AI Ingestion Queue */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => { setMainTab('published'); }}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            mainTab === 'published'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Published & Direct Opportunities
        </button>

        <button
          type="button"
          onClick={() => { setMainTab('drafts'); }}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            mainTab === 'drafts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI Agent Extraction & Ingestion
          {pendingDraftsCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {pendingDraftsCount} pending
            </span>
          )}
        </button>
      </div>

      {mainTab === 'drafts' ? (
        <DraftReviewQueue />
      ) : (
        <>
          {/* Filters */}
          <OpportunityFilters filters={filters} onChange={setFilters} showStatusFilter />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">Failed to load opportunities</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Opportunity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Apps
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      No opportunities found. Create your first one!
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => {
                    const badge = STATUS_BADGES[opp.status] ?? {
                      className: 'bg-slate-100 text-slate-600',
                      label: opp.status,
                    };
                    const deadline = opp.applicationDeadline
                      ? new Date(opp.applicationDeadline)
                      : null;
                    return (
                      <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{opp.title}</p>
                              <p className="text-xs text-slate-500">
                                {opp.company?.name ?? 'Company'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              opp.type === 'job'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-violet-50 text-violet-700'
                            }`}
                          >
                            {opp.type === 'job' ? 'Job' : 'Internship'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {deadline
                            ? deadline.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {opp.applicationCount}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                { void (navigate(`/dashboard/opportunities/${opp.id}`)); }
                              }
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setEditingOpportunity(opp); }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Edit Opportunity"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {opp.status === 'draft' && (
                              <button
                                onClick={() => { handleStatusChange(opp.id, 'published'); }}
                                disabled={statusMutation.isPending}
                                className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 transition-colors"
                                title="Publish"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {opp.status === 'published' && (
                              <button
                                onClick={() => { handleStatusChange(opp.id, 'closed'); }}
                                disabled={statusMutation.isPending}
                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                                title="Close"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            {(opp.status === 'closed' || opp.status === 'expired') && (
                              <button
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
                                className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Go Live (Activate)"
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            <button
                                onClick={() => { handleDelete(opp.id, opp.title); }}
                                disabled={deleteMutation.isPending}
                                className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Delete Opportunity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
              <p className="text-xs text-slate-500">
                {meta.totalItems} total opportunities
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    { setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) })); }
                  }
                  disabled={filters.page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  {meta.page} / {meta.totalPages}
                </span>
                <button
                  onClick={() =>
                    { setFilters((f) => ({
                      ...f,
                      page: Math.min(meta.totalPages, (f.page ?? 1) + 1),
                    })); }
                  }
                  disabled={filters.page === meta.totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
