import type { OpportunityResponseDto } from '@career-portal/shared-types';
import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  Monitor,
} from 'lucide-react';

import { EligibilityTag } from './EligibilityTag';

interface OpportunityCardProps {
  opportunity: OpportunityResponseDto;
  showStudentContext?: boolean;
  onViewDetail: (id: string) => void;
  onToggleSave?: ((id: string, isSaved: boolean) => void) | undefined;
}

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  job: { label: 'Job', className: 'bg-blue-100 text-blue-700' },
  internship: { label: 'Internship', className: 'bg-violet-100 text-violet-700' },
};

const WORK_MODE_ICON: Record<string, string> = {
  remote: '🏠',
  onsite: '🏢',
  hybrid: '🔄',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'border-l-slate-400',
  pending_review: 'border-l-amber-400',
  published: 'border-l-emerald-500',
  closed: 'border-l-red-400',
  expired: 'border-l-slate-300',
  rejected: 'border-l-red-500',
};

export function OpportunityCard({
  opportunity: opp,
  showStudentContext = false,
  onViewDetail,
  onToggleSave,
}: OpportunityCardProps): React.JSX.Element {
  const typeBadge = TYPE_BADGE[opp.type] ?? { label: opp.type, className: 'bg-blue-100 text-blue-700' };
  const deadline = opp.applicationDeadline ? new Date(opp.applicationDeadline) : null;
  const isClosingSoon =
    opp.isClosingSoon ||
    (deadline && deadline.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000 && deadline.getTime() > Date.now());
  const isExpired = deadline && deadline.getTime() < Date.now();

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

  return (
    <div
      className={`group relative rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 border-l-4 ${STATUS_COLORS[opp.status] ?? 'border-l-slate-200'} cursor-pointer`}
      onClick={() => { onViewDetail(opp.id); }}
    >
      <div className="p-5">
        {/* Top row: Type badge + Save button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadge.className}`}>
              {typeBadge.label}
            </span>
            {opp.status === 'closed' && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                Closed
              </span>
            )}
            {isClosingSoon && !isExpired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/60">
                <Clock className="h-3 w-3" />
                Closing Soon
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                Expired
              </span>
            )}
            {showStudentContext && opp.hasApplied && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Applied
              </span>
            )}
          </div>

          {showStudentContext && onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(opp.id, !!opp.isSaved);
              }}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
              title={opp.isSaved ? 'Unsave' : 'Save'}
            >
              {opp.isSaved ? (
                <BookmarkCheck className="h-5 w-5 text-blue-600" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Title & Company */}
        <h3 className="mt-3 text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
          {opp.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {opp.company?.name ?? 'Company'}
        </p>

        {/* Description excerpt */}
        <p className="mt-2 text-sm text-slate-500 line-clamp-2">{opp.description}</p>

        {/* Meta tags */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {opp.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {opp.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Monitor className="h-3.5 w-3.5" />
            {WORK_MODE_ICON[opp.workMode]} {opp.workMode.charAt(0).toUpperCase() + opp.workMode.slice(1)}
          </span>
          {salary && (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                salary === 'Unpaid'
                  ? 'text-amber-700'
                  : salary === 'Not Provided'
                    ? 'text-slate-400'
                    : 'text-slate-700'
              }`}
            >
              {salary !== 'Unpaid' && salary !== 'Not Provided' && <IndianRupee className="h-3.5 w-3.5" />}
              {salary}
            </span>
          )}
          {deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Skills */}
        {opp.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {opp.skills.slice(0, 5).map((s) => (
              <span
                key={s.skillId}
                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {s.name}
              </span>
            ))}
            {opp.skills.length > 5 && (
              <span className="inline-flex items-center text-xs text-slate-400">
                +{opp.skills.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Eligibility */}
        {showStudentContext && opp.isEligible !== undefined && (
          <div className="mt-3">
            <EligibilityTag isEligible={opp.isEligible} compact />
          </div>
        )}
      </div>
    </div>
  );
}
