import type { ApplicationResponseDto } from '@career-portal/shared-types';
import {
  Award,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Sparkles,
  Target,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  useMyApplications,
  useUpdateStudentApplicationStatus,
  useWithdrawApplication,
} from '@/features/opportunities/api/opportunities-api';
import { Card, EmptyState, ErrorState, SkeletonCard } from '@/shared/components/ui';

type TypeFilter = 'all' | 'job' | 'internship';

type ApplicationStatusKey =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'assessment'
  | 'interview'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

interface StatusConfigItem {
  value: ApplicationStatusKey;
  label: string;
  badgeLabel: string;
  description: string;
  badgeClass: string;
  icon: typeof CheckCircle;
}

const STATUS_CONFIG: Record<ApplicationStatusKey, StatusConfigItem> = {
  applied: {
    value: 'applied',
    label: 'Applied / Submitted',
    badgeLabel: 'Applied',
    description: 'Application submitted to company or campus portal',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
    icon: CheckCircle,
  },
  under_review: {
    value: 'under_review',
    label: 'Under Review / Screening',
    badgeLabel: 'In Review',
    description: 'Resume is being screened by the hiring team',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    icon: Clock,
  },
  shortlisted: {
    value: 'shortlisted',
    label: 'Shortlisted',
    badgeLabel: 'Shortlisted',
    description: 'Resume cleared screening; shortlisted for next stage',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 font-semibold',
    icon: Target,
  },
  assessment: {
    value: 'assessment',
    label: 'Online Assessment',
    badgeLabel: 'Online Assessment',
    description: 'Received coding / aptitude test link or scheduled test',
    badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-semibold',
    icon: FileText,
  },
  interview: {
    value: 'interview',
    label: 'Interview Round',
    badgeLabel: 'Interview Call',
    description: 'Invited for technical, managerial, or HR interview round',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 font-semibold',
    icon: Calendar,
  },
  selected: {
    value: 'selected',
    label: 'Offer Received',
    badgeLabel: 'Offer Secured',
    description: 'Cleared rounds successfully and received job/internship offer.',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-semibold',
    icon: Award,
  },
  rejected: {
    value: 'rejected',
    label: 'Not Selected',
    badgeLabel: 'Not Selected',
    description: 'Not progressing or received rejection communication',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 font-medium',
    icon: XCircle,
  },
  withdrawn: {
    value: 'withdrawn',
    label: 'Withdrawn',
    badgeLabel: 'Withdrawn',
    description: 'Voluntarily withdrew candidacy',
    badgeClass: 'bg-muted/40 text-muted-foreground border border-border',
    icon: Trash2,
  },
};

const STATUS_SELECT_OPTIONS: StatusConfigItem[] = [
  STATUS_CONFIG.applied,
  STATUS_CONFIG.under_review,
  STATUS_CONFIG.shortlisted,
  STATUS_CONFIG.assessment,
  STATUS_CONFIG.interview,
  STATUS_CONFIG.selected,
  STATUS_CONFIG.rejected,
  STATUS_CONFIG.withdrawn,
];

function getLatestStatusHistory(app: ApplicationResponseDto) {
  if (!app.statusHistory || app.statusHistory.length === 0) return null;
  return (
    [...app.statusHistory].sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
    )[0] ?? null
  );
}

export function MyApplicationsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Modal editing state for student self-update
  const [editingApp, setEditingApp] = useState<ApplicationResponseDto | null>(null);
  const [editStatus, setEditStatus] = useState<ApplicationStatusKey>('applied');
  const [editRemarks, setEditRemarks] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error } = useMyApplications();
  const withdrawMutation = useWithdrawApplication();
  const updateStudentStatusMutation = useUpdateStudentApplicationStatus();

  const applications = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredApplications = useMemo(() => {
    if (typeFilter === 'all') return applications;
    return applications.filter((app) => app.opportunity?.type === typeFilter);
  }, [applications, typeFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const jobs = applications.filter((a) => a.opportunity?.type === 'job').length;
    const internships = applications.filter((a) => a.opportunity?.type === 'internship').length;
    const selected = applications.filter((a) => a.status === 'selected').length;
    const interviews = applications.filter((a) => a.status === 'interview').length;
    const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
    return { total, jobs, internships, selected, interviews, shortlisted };
  }, [applications]);

  const handleWithdraw = (id: string, title?: string) => {
    const name = title ? `for "${title}"` : 'this application';
    if (window.confirm(`Are you sure you want to remove ${name} from your application tracker?`)) {
      withdrawMutation.mutate(id);
    }
  };

  const openEditModal = (app: ApplicationResponseDto) => {
    setEditingApp(app);
    setEditStatus((app.status as ApplicationStatusKey) || 'applied');
    const latestHistory = getLatestStatusHistory(app);
    setEditRemarks(latestHistory?.remarks || '');
    setSaveError(null);
  };

  const closeEditModal = () => {
    setEditingApp(null);
    setSaveError(null);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setSaveError(null);
    try {
      await updateStudentStatusMutation.mutateAsync({
        id: editingApp.id,
        dto: {
          status: editStatus,
          remarks: editRemarks.trim() || undefined,
        },
      });
      closeEditModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update application status';
      setSaveError(msg);
    }
  };

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

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Application Tracker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage your application stages, interview rounds, offers, and recruiter updates
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Tracked</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground font-mono tabular-nums">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Jobs</p>
          <p className="mt-1.5 text-2xl font-bold text-primary font-mono tabular-nums">{stats.jobs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Internships</p>
          <p className="mt-1.5 text-2xl font-bold text-violet-600 font-mono tabular-nums">{stats.internships}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-purple-600">Shortlisted</p>
          <p className="mt-1.5 text-2xl font-bold text-purple-700 font-mono tabular-nums">{stats.shortlisted}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-indigo-600">Interviews</p>
          <p className="mt-1.5 text-2xl font-bold text-indigo-700 font-mono tabular-nums">{stats.interviews}</p>
        </Card>
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Offers Received</p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{stats.selected}</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <nav
        aria-label="Application types"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm"
      >
        {[
          { id: 'all' as const, label: 'All Tracked', count: stats.total },
          { id: 'job' as const, label: 'Jobs', count: stats.jobs },
          { id: 'internship' as const, label: 'Internships', count: stats.internships },
        ].map((tab) => {
          const isActive = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setTypeFilter(tab.id);
              }}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono tabular-nums font-bold ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load applications"
          message="We encountered an issue fetching your tracked applications. Please try again."
        />
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications tracked yet"
          description="Browse campus postings, apply directly on company portals, and click 'Mark as Applied' to keep all your active applications organized here."
          action={{
            label: 'Browse Opportunities',
            onClick: () => {
              void navigate('/dashboard/opportunities');
            },
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const opp = app.opportunity;
            const deadline = opp?.applicationDeadline ? new Date(opp.applicationDeadline) : null;
            const isExpired = deadline ? deadline.getTime() < Date.now() : false;
            const salary = formatSalary(opp?.salaryMin, opp?.salaryMax);

            const statusKey = (app.status as ApplicationStatusKey) || 'applied';
            const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.applied;
            const StatusIcon = statusConfig.icon;

            const latestHistory = getLatestStatusHistory(app);
            const noteText = latestHistory?.remarks || app.coverNote;

            return (
              <div
                key={app.id}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40 card-lift"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left Column: Role & Company Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3
                        onClick={() => {
                          void (navigate(`/dashboard/opportunities/${app.opportunityId}`));
                        }}
                        className="text-lg font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                      >
                        {opp?.title ?? 'Opportunity'}
                      </h3>
                      {opp?.type && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${opp.type === 'job'
                            ? 'bg-primary/15 text-primary border border-primary/25'
                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25'
                            }`}
                        >
                          {opp.type === 'job' ? 'Job' : 'Internship'}
                        </span>
                      )}

                      {/* Dynamic Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeClass}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig.badgeLabel}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-muted-foreground">
                      {opp?.company?.name ?? 'Company'}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 font-mono">
                      {opp?.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {opp.location}
                        </span>
                      )}
                      {opp?.workMode && (
                        <span className="inline-flex items-center gap-1">
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                          {opp.workMode.charAt(0).toUpperCase() + opp.workMode.slice(1)}
                        </span>
                      )}
                      {salary && salary !== 'Not Provided' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          {salary !== 'Unpaid' && <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />}
                          {salary}
                        </span>
                      )}
                      <span>
                        Applied on:{' '}
                        {new Date(app.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {deadline && (
                        <span
                          className={`inline-flex items-center gap-1 ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'
                            }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Deadline:{' '}
                          {deadline.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {isExpired && ' (Closed)'}
                        </span>
                      )}
                    </div>

                    {/* Latest Status Note / Reminder Box */}
                    {noteText && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                        <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between font-semibold text-foreground">
                            <span>Status Update & Note</span>
                            {latestHistory?.changedAt && (
                              <span className="text-[10px] text-muted-foreground font-normal font-mono">
                                {new Date(latestHistory.changedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {noteText}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    {/* Update Outcome / Status Button */}
                    <button
                      onClick={() => {
                        openEditModal(app);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/20"
                      title="Update status (e.g. interview call, offer, rejected) and add notes"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Update Outcome
                    </button>

                    {/* Direct Company Link */}
                    {opp?.applyUrl && (
                      <a
                        href={opp.applyUrl.startsWith('http') ? opp.applyUrl : `https://${opp.applyUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/40"
                        title="Revisit external application portal"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Company Site
                      </a>
                    )}

                    {/* Email link */}
                    {!opp?.applyUrl && opp?.applicationEmail && (
                      <a
                        href={`mailto:${opp.applicationEmail}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    )}

                    {/* View Details */}
                    <button
                      onClick={() => {
                        void (navigate(`/dashboard/opportunities/${app.opportunityId}`));
                      }}
                      className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/40"
                    >
                      View Role
                    </button>

                    {/* Remove from tracker */}
                    <button
                      onClick={() => {
                        handleWithdraw(app.id, opp?.title);
                      }}
                      disabled={withdrawMutation.isPending}
                      className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Remove from your application tracker"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Outcome / Status Edit Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-card border border-border p-6 shadow-2xl transition-colors">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Update Application Outcome
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editingApp.opportunity?.title} &bull; {editingApp.opportunity?.company?.name}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                {saveError}
              </div>
            )}

            <form onSubmit={(e) => { void handleSaveStatus(e); }} className="mt-4 space-y-5">
              {/* Status Radio Choices */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Current Stage / Outcome
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STATUS_SELECT_OPTIONS.map((opt) => {
                    const isSelected = editStatus === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => {
                          setEditStatus(opt.value);
                        }}
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/20 shadow-xs'
                          : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'
                                }`}
                            />
                            <span
                              className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'
                                }`}
                            >
                              {opt.label}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Notes & Reminder Textarea */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Personal Notes / Recruiter Communication
                </label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => {
                    setEditRemarks(e.target.value);
                  }}
                  rows={3}
                  placeholder="e.g., Round 1 technical interview scheduled on Thursday at 3 PM via Google Meet; HR Contact: Pooja (recruiter@company.com)..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Update this whenever you receive an email or test link to keep yourself reminded.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStudentStatusMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
                >
                  {updateStudentStatusMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
