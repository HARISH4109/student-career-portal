import type { ApplicationResponseDto } from '@career-portal/shared-types';
import {
  Award,
  Briefcase,
  Calendar,
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
    badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80',
    icon: CheckCircle,
  },
  under_review: {
    value: 'under_review',
    label: 'Under Review / Screening',
    badgeLabel: 'In Review',
    description: 'Resume is being screened by the hiring team',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
    icon: Clock,
  },
  shortlisted: {
    value: 'shortlisted',
    label: 'Shortlisted 🎯',
    badgeLabel: 'Shortlisted',
    description: 'Resume cleared screening; shortlisted for next stage',
    badgeClass: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80 font-semibold',
    icon: Target,
  },
  assessment: {
    value: 'assessment',
    label: 'Online Assessment / Test 📝',
    badgeLabel: 'Online Assessment',
    description: 'Received coding / aptitude test link or scheduled test',
    badgeClass: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/80 font-semibold',
    icon: FileText,
  },
  interview: {
    value: 'interview',
    label: 'Interview Round / Call 📞',
    badgeLabel: 'Interview Call',
    description: 'Invited for technical, managerial, or HR interview round',
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 font-bold',
    icon: Calendar,
  },
  selected: {
    value: 'selected',
    label: 'Selected / Got Offer! 🎉',
    badgeLabel: 'Offer Secured / Succeeded',
    description: 'Cleared rounds successfully and received job/internship offer!',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 font-extrabold',
    icon: Award,
  },
  rejected: {
    value: 'rejected',
    label: 'Not Selected / Rejected ✕',
    badgeLabel: 'Not Selected',
    description: 'Not progressing or received rejection communication',
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 font-medium',
    icon: XCircle,
  },
  withdrawn: {
    value: 'withdrawn',
    label: 'Withdrawn',
    badgeLabel: 'Withdrawn',
    description: 'Voluntarily withdrew candidacy',
    badgeClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" /> Application Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage your application stages, interview rounds, offers, and recruiter updates
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Tracked</p>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Jobs</p>
          <p className="mt-1.5 text-2xl font-extrabold text-blue-600">{stats.jobs}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Internships</p>
          <p className="mt-1.5 text-2xl font-extrabold text-violet-600">{stats.internships}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Shortlisted</p>
          <p className="mt-1.5 text-2xl font-extrabold text-purple-700">{stats.shortlisted}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Interviews</p>
          <p className="mt-1.5 text-2xl font-extrabold text-indigo-700">{stats.interviews}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Offers Got 🎉</p>
          <p className="mt-1.5 text-2xl font-black text-emerald-600">{stats.selected}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <nav
        aria-label="Application types"
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm"
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
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">Failed to load applications</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No applications tracked yet</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Browse campus postings, apply directly on company portals, and click &ldquo;Mark as Applied&rdquo; to keep all your active applications organized here.
          </p>
          <button
            onClick={() => {
              void (navigate('/dashboard/opportunities'));
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
          >
            <Briefcase className="h-4 w-4" />
            Browse Opportunities
          </button>
        </div>
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
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left Column: Role & Company Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3
                        onClick={() => {
                          void (navigate(`/dashboard/opportunities/${app.opportunityId}`));
                        }}
                        className="text-lg font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        {opp?.title ?? 'Opportunity'}
                      </h3>
                      {opp?.type && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            opp.type === 'job'
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
                              : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60'
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

                    <p className="text-sm font-medium text-slate-600">
                      {opp?.company?.name ?? 'Company'}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      {opp?.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {opp.location}
                        </span>
                      )}
                      {opp?.workMode && (
                        <span className="inline-flex items-center gap-1">
                          <Monitor className="h-3.5 w-3.5 text-slate-400" />
                          {opp.workMode.charAt(0).toUpperCase() + opp.workMode.slice(1)}
                        </span>
                      )}
                      {salary && salary !== 'Not Provided' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          {salary !== 'Unpaid' && <IndianRupee className="h-3.5 w-3.5 text-slate-400" />}
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
                          className={`inline-flex items-center gap-1 ${
                            isExpired ? 'text-red-600 font-medium' : 'text-slate-500'
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
                      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 text-xs">
                        <MessageSquare className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>Status Update & Note</span>
                            {latestHistory?.changedAt && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                {new Date(latestHistory.changedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-slate-600 leading-relaxed whitespace-pre-wrap">
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100"
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100"
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100"
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
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    >
                      View Role
                    </button>

                    {/* Remove from tracker */}
                    <button
                      onClick={() => {
                        handleWithdraw(app.id, opp?.title);
                      }}
                      disabled={withdrawMutation.isPending}
                      className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" /> Update Application Outcome
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editingApp.opportunity?.title} &bull; {editingApp.opportunity?.company?.name}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {saveError}
              </div>
            )}

            <form onSubmit={(e) => { void handleSaveStatus(e); }} className="mt-4 space-y-5">
              {/* Status Radio Choices */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                        className={`w-full text-left rounded-xl border p-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/30 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`h-4 w-4 ${
                                isSelected ? 'text-indigo-600' : 'text-slate-400'
                              }`}
                            />
                            <span
                              className={`text-xs font-bold ${
                                isSelected ? 'text-indigo-950 font-extrabold' : 'text-slate-800'
                              }`}
                            >
                              {opt.label}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Notes & Reminder Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Personal Notes / Recruiter Communication
                </label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => {
                    setEditRemarks(e.target.value);
                  }}
                  rows={3}
                  placeholder="e.g., Round 1 technical interview scheduled on Thursday at 3 PM via Google Meet; HR Contact: Pooja (recruiter@company.com)..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Update this whenever you receive an email or test link to keep yourself reminded.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStudentStatusMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
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
