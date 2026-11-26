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
  job: { label: 'Job', className: 'bg-primary/10 text-primary border border-primary/20' },
  internship: { label: 'Internship', className: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50' },
};


const STATUS_COLORS: Record<string, string> = {
  draft: 'border-l-slate-500',
  pending_review: 'border-l-amber-500',
  published: 'border-l-emerald-500',
  closed: 'border-l-slate-600',
  expired: 'border-l-slate-700',
  rejected: 'border-l-rose-500',
};

export function OpportunityCard({
  opportunity: opp,
  showStudentContext = false,
  onViewDetail,
  onToggleSave,
}: OpportunityCardProps): React.JSX.Element {
  const typeBadge = TYPE_BADGE[opp.type] ?? { label: opp.type, className: 'bg-primary/10 text-primary border border-primary/20' };
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
      className={`group relative rounded-xl border border-border bg-card shadow-xs transition-colors duration-150 hover:border-primary/40 border-l-4 ${STATUS_COLORS[opp.status] ?? 'border-l-border'} cursor-pointer`}
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
              <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                Closed
              </span>
            )}
            {isClosingSoon && !isExpired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Clock className="h-3 w-3" />
                Closing Soon
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-500/20">
                Expired
              </span>
            )}
            {showStudentContext && opp.hasApplied && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
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
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              title={opp.isSaved ? 'Unsave' : 'Save'}
            >
              {opp.isSaved ? (
                <BookmarkCheck className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Title & Company */}
        <h3 className="mt-3 text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {opp.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {opp.company?.name ?? 'Company'}
        </p>

        {/* Description excerpt */}
        <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2">{opp.description}</p>

        {/* Meta tags */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono tabular-nums">
          {opp.location && (
            <span className="inline-flex items-center gap-1 font-sans">
              <MapPin className="h-3.5 w-3.5" />
              {opp.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-sans capitalize">
            <Monitor className="h-3.5 w-3.5" />
            {opp.workMode}
          </span>
          {salary && (
            <span
              className={`inline-flex items-center gap-1 font-medium ${salary === 'Unpaid'
                ? 'text-amber-700 dark:text-amber-400'
                : salary === 'Not Provided'
                  ? 'text-muted-foreground'
                  : 'text-foreground'
                }`}
            >
              {salary !== 'Unpaid' && salary !== 'Not Provided' && <IndianRupee className="h-3.5 w-3.5" />}
              {salary}
            </span>
          )}
          {deadline && (
            <span className="inline-flex items-center gap-1 font-sans">
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
                className="inline-flex items-center rounded-md bg-muted/50 border border-border/60 px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {s.name}
              </span>
            ))}
            {opp.skills.length > 5 && (
              <span className="inline-flex items-center text-xs text-muted-foreground/60">
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
