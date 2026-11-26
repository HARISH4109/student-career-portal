import type {
  OpportunityDraftListQuery,
  OpportunityDraftResponseDto,
} from '@career-portal/shared-types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileImage,
  FileText,
  Globe,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import {
  useDeleteDraft,
  useDraftCounts,
  useOpportunityDrafts,
  useRetryExtraction,
} from '@/features/opportunities/api/opportunities-api';
import { OpportunityExtractor } from '@/features/opportunities/components/OpportunityExtractor';

const STATUS_TABS = [
  { key: 'all', label: 'All Drafts' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'needs_correction', label: 'Needs Correction' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const;

export function DraftReviewQueue(): React.JSX.Element {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<NonNullable<OpportunityDraftListQuery['status']> | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  const queryParams: Partial<OpportunityDraftListQuery> = {
    page,
    pageSize: 15,
    sortBy: 'newest',
    ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
  };

  const { data, isLoading, isError, refetch } = useOpportunityDrafts(queryParams);
  const { data: counts } = useDraftCounts();
  const retryMutation = useRetryExtraction();
  const deleteMutation = useDeleteDraft();

  const drafts = data?.data ?? [];
  const meta = data?.meta;

  // Filter in memory for search query (title or company)
  const filteredDrafts = drafts.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = d.title?.toLowerCase().includes(q) ?? false;
    const companyMatch = d.companyName?.toLowerCase().includes(q) ?? false;
    return titleMatch || companyMatch;
  });

  const renderConfidenceBadge = (confidence: number | null | undefined) => {
    if (confidence == null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          N/A
        </span>
      );
    }
    const score = Math.round(confidence);
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-3 w-3" />
          {score}% High
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          {score}% Med
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
        <AlertTriangle className="h-3 w-3" />
        {score}% Low
      </span>
    );
  };

  const renderSourceTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'image':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            <FileImage className="h-3 w-3" /> Image
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/50">
            <FileText className="h-3 w-3" /> PDF
          </span>
        );
      case 'url':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            <Globe className="h-3 w-3" /> Web Link
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Mail className="h-3 w-3" /> Email
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded border border-border">
            <FileText className="h-3 w-3" /> Text
          </span>
        );
    }
  };

  const renderStatusBadge = (status: OpportunityDraftResponseDto['status']) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Pending Review
          </span>
        );
      case 'approved':
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      case 'needs_correction':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-700">
            Needs Correction
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Ingest Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-primary shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">AI Extraction & Ingestion Queue</h2>
            <p className="text-sm text-muted-foreground">
              Ingest job flyers, circulars, or links. Fields are automatically extracted into drafts for faculty approval.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setIsIngestModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          Ingest New Source (AI Agent)
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === 'all'
                ? Object.values(counts ?? {}).reduce((acc, c) => acc + c, 0)
                : counts?.[tab.key] ?? 0;
            const isActive = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-muted/40 border border-border'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-xs font-semibold ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drafts..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Queue Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading AI Agent drafts queue...</p>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm font-medium text-red-800">Failed to load drafts queue</p>
          <button
            type="button"
            onClick={() => { void (refetch()); }}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-red-700 underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No drafts in this view</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? 'No drafts match your search filter.'
              : 'Upload a placement poster flyer or submit a URL to extract and ingest with AI Agent.'}
          </p>
          <button
            type="button"
            onClick={() => { setIsIngestModalOpen(true); }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4" /> Ingest Source (AI Agent)
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Opportunity / Role</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">AI Agent Confidence</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Duplicate Warning</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrafts.map((draft) => {
                  const isDup = draft.duplicateCheck?.isDuplicate;
                  const isFailedRun = draft.extractionRun?.status === 'failed';

                  return (
                    <tr key={draft.id} className="hover:bg-muted/20/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="font-semibold text-foreground hover:text-primary">
                          {draft.title || (
                            <span className="italic text-muted-foreground">Untitled Opportunity</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                          <span className="capitalize">{draft.type ?? 'Job'}</span>
                          {draft.location && <span>• {draft.location}</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          {draft.companyName || <span className="italic text-muted-foreground">Unknown</span>}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {renderSourceTypeIcon(draft.source?.sourceType)}
                      </td>

                      <td className="px-6 py-4">
                        {renderConfidenceBadge(draft.extractionRun?.confidenceScore)}
                      </td>

                      <td className="px-6 py-4">
                        {renderStatusBadge(draft.status)}
                      </td>

                      <td className="px-6 py-4">
                        {isDup ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800" title={draft.duplicateCheck?.similarityReason ?? 'Possible duplicate found'}>
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Possible Match
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{draft.duplicateCheck ? 'None detected' : 'Check in review'}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isFailedRun ? (
                            <button
                              type="button"
                              onClick={() => { retryMutation.mutate(draft.id); }}
                              disabled={retryMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                            >
                              <RefreshCw className={`h-3 w-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                              Retry AI
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { void (navigate(`/dashboard/opportunities/drafts/${draft.id}/review`)); }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-primary hover:text-white transition shadow-sm"
                            >
                              Review Draft
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete draft "${draft.title || 'Untitled'}"? This action cannot be undone.`)) {
                                deleteMutation.mutate(draft.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            title="Delete Draft"
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
              <span>
                Showing page {meta.page} of {meta.totalPages} ({meta.totalItems} total drafts)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                  disabled={page <= 1}
                  className="rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/20 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => { setPage((p) => Math.min(meta.totalPages, p + 1)); }}
                  disabled={page >= meta.totalPages}
                  className="rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/20 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingest Source Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl shadow-2xl rounded-xl">
            <OpportunityExtractor
              mode="ingest"
              onClose={() => { setIsIngestModalOpen(false); }}
              onIngested={(newDraft) => {
                setIsIngestModalOpen(false);
                void navigate(`/dashboard/opportunities/drafts/${newDraft.id}/review`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
