import {
  Briefcase,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useMyApplications, useWithdrawApplication } from '@/features/opportunities/api/opportunities-api';

type TypeFilter = 'all' | 'job' | 'internship';

export function MyApplicationsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const { data, isLoading, error } = useMyApplications();
  const withdrawMutation = useWithdrawApplication();

  const applications = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredApplications = useMemo(() => {
    if (typeFilter === 'all') return applications;
    return applications.filter((app) => app.opportunity?.type === typeFilter);
  }, [applications, typeFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const jobs = applications.filter((a) => a.opportunity?.type === 'job').length;
    const internships = applications.filter((a) => a.opportunity?.type === 'internship').length;
    return { total, jobs, internships };
  }, [applications]);

  const handleWithdraw = (id: string, title?: string) => {
    const name = title ? `for "${title}"` : 'this application';
    if (window.confirm(`Are you sure you want to remove ${name} from your application tracker?`)) {
      withdrawMutation.mutate(id);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Application Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and revisit the job and internship applications you have submitted
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Tracked</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Jobs</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.jobs}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Internships</p>
          <p className="mt-2 text-3xl font-bold text-violet-600">{stats.internships}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'all' as const, label: `All (${String(stats.total)})` },
          { id: 'job' as const, label: `Jobs (${String(stats.jobs)})` },
          { id: 'internship' as const, label: `Internships (${String(stats.internships)})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setTypeFilter(tab.id); }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              typeFilter === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
            onClick={() => { void (navigate('/dashboard/opportunities')); }}
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
                        onClick={() => { void (navigate(`/dashboard/opportunities/${app.opportunityId}`)); }}
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Applied
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
                        Applied on: {new Date(app.createdAt).toLocaleDateString('en-IN', {
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
                          Deadline: {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {isExpired && ' (Closed)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Practical Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
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
                      onClick={() => { void (navigate(`/dashboard/opportunities/${app.opportunityId}`)); }}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    >
                      View Role
                    </button>

                    {/* Remove from tracker */}
                    <button
                      onClick={() => { handleWithdraw(app.id, opp?.title); }}
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
    </div>
  );
}
