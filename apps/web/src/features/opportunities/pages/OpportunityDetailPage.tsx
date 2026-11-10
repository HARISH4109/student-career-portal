import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CheckCircle,
  CheckCircle2,
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">Opportunity not found or you don't have permission to view it.</p>
        <button
          onClick={() => { void (navigate('/dashboard/opportunities')); }}
          className="mt-4 text-sm font-medium text-blue-600 hover:underline"
        >
          Back to Opportunities
        </button>
      </div>
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
    <div className="mx-auto max-w-4xl space-y-6">
      {isStudent && <button className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white" onClick={() => { void navigate(`/dashboard/skill-gap?opportunityId=${id ?? ''}`); }}>Analyze my skill gaps for this opportunity</button>}
      {/* Back button & Action buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { void (navigate('/dashboard/opportunities')); }}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Opportunities
        </button>

        {canManage && (
          <button
            onClick={() => { setShowEditForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Opportunity
          </button>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Type + Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  opp.type === 'job' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                }`}
              >
                {opp.type === 'job' ? '💼 Job' : '🎓 Internship'}
              </span>
              {opp.status === 'closed' && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  Closed
                </span>
              )}
              {isClosingSoon && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  ⏰ Closing Soon
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                  Expired
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">{opp.title}</h1>
            <p className="mt-2 text-lg font-medium text-slate-600">
              {opp.company?.name ?? 'Company'}
            </p>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {opp.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {opp.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="h-4 w-4" />
                {opp.workMode.charAt(0).toUpperCase() + opp.workMode.slice(1)}
              </span>
              {salary && (
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    salary === 'Unpaid'
                      ? 'text-amber-700'
                      : salary === 'Not Provided'
                        ? 'text-slate-400'
                        : 'text-slate-700'
                  }`}
                >
                  {salary !== 'Unpaid' && salary !== 'Not Provided' && <IndianRupee className="h-4 w-4" />}
                  {salary}
                </span>
              )}
              {deadline && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Deadline: {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {opp.applyUrl && (
                <a
                  href={opp.applyUrl.startsWith('http') ? opp.applyUrl : `https://${opp.applyUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apply Link
                </a>
              )}
              {opp.applicationEmail && (
                <a
                  href={`mailto:${opp.applicationEmail}`}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-800 hover:underline font-medium"
                >
                  <Mail className="h-4 w-4" />
                  {opp.applicationEmail}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {opp.applicationCount} applications
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {isStudent && (
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                onClick={() =>
                  { if (opp.isSaved) {
                    unsaveMutation.mutate(opp.id, { onSuccess: () => { void refetch(); } });
                  } else {
                    saveMutation.mutate(opp.id, { onSuccess: () => { void refetch(); } });
                  } }
                }
                className="rounded-lg border border-slate-200 p-2.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
              >
                {opp.isSaved ? (
                  <BookmarkCheck className="h-5 w-5 text-blue-600" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Eligibility + Direct Student Actions */}
        {isStudent && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {opp.isEligible !== undefined && <EligibilityTag isEligible={opp.isEligible} />}
              {!opp.isEligible && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
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
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apply on Company Site
                </a>
              )}

              {/* Email application CTA */}
              {!opp.applyUrl && opp.applicationEmail && (
                <a
                  href={`mailto:${opp.applicationEmail}?subject=${encodeURIComponent(`Application for ${opp.title}`)}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
                >
                  <Mail className="h-4 w-4" />
                  Send Application Email
                </a>
              )}

              {/* 1-Click Application Tracker */}
              {hasApplied ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
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
                      className="ml-2 text-xs text-slate-400 hover:text-red-600 underline font-normal transition-colors"
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50"
                  title="Mark that you applied so you can track it in your dashboard"
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>{applyMutation.isPending ? 'Tracking...' : 'Mark as Applied'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Description</h2>
        <div className="mt-4 prose prose-slate prose-sm max-w-none">
          {opp.description.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      {/* Skills */}
      {opp.skills.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Required Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {opp.skills.map((s) => (
              <span
                key={s.skillId}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                  s.isRequired
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.name}
                {!s.isRequired && (
                  <span className="ml-1 text-xs text-slate-400">(nice-to-have)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility criteria */}
      {opp.eligibility.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Eligibility Criteria</h2>
          <div className="mt-4 space-y-2">
            {opp.eligibility.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
              >
                {e.departmentName && (
                  <span className="font-medium">{e.departmentName}</span>
                )}
                {e.programName && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{e.programName}</span>
                  </>
                )}
                {e.graduationYear && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Batch {e.graduationYear}</span>
                  </>
                )}
                {e.minCgpa && (
                  <>
                    <span className="text-slate-300">•</span>
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
