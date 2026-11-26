import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useHasPermission, useHasRole } from '@/features/auth/use-permission';
import {
  useApplyToOpportunity,
  useMyApplications,
  useOpportunity,
  useSaveOpportunity,
  useUnsaveOpportunity,
  useWithdrawApplication,
} from '@/features/opportunities/api/opportunities-api';
import { CreateOpportunityForm } from '@/features/opportunities/components/CreateOpportunityForm';
import { EligibilityTag } from '@/features/opportunities/components/EligibilityTag';
import { ErrorState, Skeleton } from '@/shared/components/ui';

export function OpportunityDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isStudent = useHasRole('STUDENT');
  const canManage = useHasPermission('opportunities.create') || useHasPermission('opportunities.edit');
  const [showEditForm, setShowEditForm] = useState(false);
  const { data: opp, isLoading, error, refetch } = useOpportunity(id ?? '');
  const saveMutation = useSaveOpportunity();
  const unsaveMutation = useUnsaveOpportunity();
  const applyMutation = useApplyToOpportunity();
  const withdrawMutation = useWithdrawApplication();
  const { data: myAppsData } = useMyApplications({ opportunityId: id });
  const myApp = myAppsData?.data[0];
  const hasApplied = !!(opp?.hasApplied || myApp);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1536px] mx-auto space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-36" />
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <ErrorState
        title="Opportunity not found"
        message="This posting may have expired or you don't have permission to view it."
        onRetry={() => { void refetch(); }}
      />
    );
  }

  const deadline = opp.applicationDeadline ? new Date(opp.applicationDeadline) : null;
  const isExpired = deadline && deadline.getTime() < Date.now();
  const isClosingSoon = deadline && !isExpired && deadline.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000;

  const formatSalary = (min: number | null | undefined, max: number | null | undefined) => {
    if ((min === 0 && (max === 0 || max == null)) || (max === 0 && (min === 0 || min == null))) {
      return 'Unpaid';
    }
    if (min == null && max == null) {
      return 'Not Provided';
    }
    const fmt = (n: number) => {
      if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
      if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
      return `₹${String(n)}`;
    };
    if (min != null && max != null && min > 0 && max > 0) return `${fmt(min)} – ${fmt(max)}`;
    if (min != null && min > 0) return `${fmt(min)}+`;
    if (max != null && max > 0) return `Up to ${fmt(max)}`;
    return 'Not Provided';
  };

  const salary = formatSalary(opp.salaryMin, opp.salaryMax);

  const canApply = isStudent && opp.isEligible && !opp.hasApplied && !isExpired && opp.status === 'published';

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-6">
      {isStudent && (
        <button
          className="min-h-11 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          onClick={() => { void navigate(`/dashboard/skill-gap?opportunityId=${id ?? ''}`); }}
        >
          Analyze my skill gaps for this opportunity
        </button>
      )}
      {/* Back button & Action buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { void (navigate('/dashboard/opportunities')); }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Opportunities
        </button>

        {canManage && (
          <button
            onClick={() => { setShowEditForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-primary transition shadow-xs cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Opportunity
          </button>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Type + Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${opp.type === 'job'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                  }`}
              >
                {opp.type === 'job' ? 'Job' : 'Internship'}
              </span>
              {opp.status === 'closed' && (
                <span className="inline-flex items-center rounded-full bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border">
                  Closed
                </span>
              )}
              {isClosingSoon && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" /> Closing Soon
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  Expired
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold text-foreground">{opp.title}</h1>
            <p className="mt-2 text-lg font-medium text-muted-foreground">
              {opp.company?.name ?? 'Company'}
            </p>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono tabular-nums">
              {opp.location && (
                <span className="inline-flex items-center gap-1.5 font-sans">
                  <MapPin className="h-4 w-4" />
                  {opp.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-sans">
                <Monitor className="h-4 w-4" />
                {opp.workMode.charAt(0).toUpperCase() + opp.workMode.slice(1)}
              </span>
              {salary && (
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${salary === 'Unpaid'
                    ? 'text-amber-700 dark:text-amber-400 font-sans'
                    : salary === 'Not Provided'
                      ? 'text-muted-foreground font-sans'
                      : 'text-foreground font-mono'
                    }`}
                >
                  {salary !== 'Unpaid' && salary !== 'Not Provided' && <IndianRupee className="h-4 w-4" />}
                  {salary}
                </span>
              )}
              {deadline && (
                <span className="inline-flex items-center gap-1.5 font-sans">
                  <Calendar className="h-4 w-4" />
                  Deadline: {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {opp.applyUrl && (
                <a
                  href={opp.applyUrl.startsWith('http') ? opp.applyUrl : `https://${opp.applyUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium font-sans"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apply Link
                </a>
              )}
              {opp.applicationEmail && (
                <a
                  href={`mailto:${opp.applicationEmail}`}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline font-medium font-sans"
                >
                  <Mail className="h-4 w-4" />
                  {opp.applicationEmail}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5 font-sans">
                <Users className="h-4 w-4" />
                {opp.applicationCount} applications
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {isStudent && (
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                onClick={() => {
                  if (opp.isSaved) {
                    unsaveMutation.mutate(opp.id, { onSuccess: () => { void refetch(); } });
                  } else {
                    saveMutation.mutate(opp.id, { onSuccess: () => { void refetch(); } });
                  }
                }
                }
                className="rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary cursor-pointer"
              >
                {opp.isSaved ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Eligibility + Direct Student Actions */}
        {isStudent && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {opp.isEligible !== undefined && <EligibilityTag isEligible={opp.isEligible} />}
              {!opp.isEligible && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <XCircle className="h-4 w-4" />
                  You don't meet college criteria for this opportunity
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Primary External Application Link */}
              {opp.applyUrl && (
                <a
                  href={opp.applyUrl.startsWith('http') ? opp.applyUrl : `https://${opp.applyUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apply on Company Site
                </a>
              )}

              {/* Email application CTA */}
              {!opp.applyUrl && opp.applicationEmail && (
                <a
                  href={`mailto:${opp.applicationEmail}?subject=${encodeURIComponent(`Application for ${opp.title}`)}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <Mail className="h-4 w-4" />
                  Send Application Email
                </a>
              )}

              {/* 1-Click Application Tracker */}
              {hasApplied ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Applied & Tracked</span>
                  {myApp && (
                    <button
                      onClick={() => {
                        if (window.confirm('Remove this opportunity from your applied tracker?')) {
                          withdrawMutation.mutate(myApp.id, {
                            onSuccess: () => {
                              void refetch();
                            },
                          });
                        }
                      }}
                      disabled={withdrawMutation.isPending}
                      className="ml-2 text-xs text-muted-foreground hover:text-destructive underline font-normal transition-colors cursor-pointer"
                      title="Remove from your applications tracker"
                    >
                      {withdrawMutation.isPending ? 'Removing...' : 'Untrack'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    applyMutation.mutate(
                      { opportunityId: opp.id },
                      {
                        onSuccess: () => {
                          void refetch();
                        },
                      },
                    );
                  }}
                  disabled={applyMutation.isPending || !canApply}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50 cursor-pointer"
                  title="Mark that you applied so you can track it in your dashboard"
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  )}
                  <span>{applyMutation.isPending ? 'Tracking...' : 'Mark as Applied'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Description</h2>
        <div className="mt-4 text-sm text-muted-foreground space-y-2 leading-relaxed">
          {opp.description.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      {/* Skills */}
      {opp.skills.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Required Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {opp.skills.map((s) => (
              <span
                key={s.skillId}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${s.isRequired
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 border border-border/60 text-muted-foreground'
                  }`}
              >
                {s.name}
                {!s.isRequired && (
                  <span className="ml-1 text-xs text-muted-foreground/60">(nice-to-have)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility criteria */}
      {opp.eligibility.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Eligibility Criteria</h2>
          <div className="mt-4 space-y-2">
            {opp.eligibility.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-4 py-2.5 text-sm text-foreground"
              >
                {e.departmentName && (
                  <span className="font-medium">{e.departmentName}</span>
                )}
                {e.programName && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>{e.programName}</span>
                  </>
                )}
                {e.graduationYear && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>Batch {e.graduationYear}</span>
                  </>
                )}
                {e.minCgpa && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>Min CGPA: {e.minCgpa}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Edit Form Modal for Faculty */}
      {showEditForm && (
        <CreateOpportunityForm
          opportunity={opp}
          onClose={() => { setShowEditForm(false); }}
          onSuccess={() => {
            setShowEditForm(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
