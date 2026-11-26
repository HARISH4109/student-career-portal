import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Loader2,
  Route,
  Target,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { useAuth } from '@/features/auth/use-auth';
import { ApiClientError } from '@/shared/lib/api-client';

export const input =
  'w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:bg-muted disabled:text-muted-foreground';

export const button =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const secondaryButton =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const card =
  'min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors duration-150 hover:border-primary/40 hover:shadow-md sm:p-6';

export const prettyLabel = (value: string): string =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold tracking-wide text-foreground">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = error instanceof ApiClientError ? error.payload.error : undefined;
  const details = Object.values(apiError?.details ?? {}).flat();
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive shadow-sm"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold text-destructive">
          {apiError?.message ??
            (error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'Unable to complete the request. Please try again.')}
        </p>
        {details.length > 0 && (
          <ul className="list-inside list-disc space-y-0.5 text-xs text-destructive/80">
            {details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className={`${card} flex items-center justify-center gap-3 py-10 text-muted-foreground`}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className={`${card} py-14 text-center`}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="text-base font-bold text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

export function Frame({ title, children }: { title: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const own = isStudent && user?.permissions?.includes('roadmaps.manage_own');
  const gaps = isStudent && user?.permissions?.includes('skill_gap.analyze_own');
  const isManage = pathname.includes('/manage');

  const tabs = [
    { to: '/dashboard/careers', label: 'Career paths', Icon: Compass, show: !isManage },
    {
      to: '/dashboard/roadmap',
      label: 'My roadmap',
      Icon: Route,
      show: Boolean(own && !isManage),
    },
    { to: '/dashboard/resources', label: 'Learning resources', Icon: BookOpen, show: !isManage },
    {
      to: '/dashboard/skill-gap',
      label: 'Skill gaps',
      Icon: Target,
      show: Boolean(gaps && !isManage),
    },
  ];

  const active = isManage
    ? '/dashboard/careers/manage'
    : (tabs.find((tab) => tab.to !== '/dashboard/careers' && pathname.startsWith(tab.to))?.to ??
      '/dashboard/careers');

  const description = active.endsWith('/manage')
    ? 'Curate career paths, connect learning resources, and help students prepare with a clear next step.'
    : active.endsWith('/roadmap')
      ? 'Build momentum one stage at a time. Track your learning, apply your skills, and see how far you have come.'
      : active.endsWith('/resources')
        ? 'Discover practical guides, projects, and courses selected to help you build the skills your next role needs.'
        : active.endsWith('/skill-gap')
          ? 'Understand where you stand, see the evidence behind each recommendation, and choose what to work on next.'
          : 'Explore your next role and turn your career interests into a practical learning journey.';

  const visibleTabs = tabs.filter((tab) => tab.show);

  return (
    <div className="min-w-0 space-y-6 text-sm leading-relaxed text-muted-foreground w-full max-w-[1536px] mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" /> {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {/* ── Secondary Pill Tab Navigation (only displayed when multiple navigation options exist) ── */}
      {visibleTabs.length > 1 && (
        <nav
          aria-label="Career preparation"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm"
        >
          {visibleTabs.map(({ to, label, Icon: TabIcon }) => {
            const isTabActive = active === to;
            return (
              <Link
                key={to}
                to={to}
                aria-current={isTabActive ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-sm ${
                  isTabActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {children}
    </div>
  );
}

export function Paging({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (value: number) => void;
}) {
  if (total <= 1 && page === 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
    >
      <p className="text-xs font-medium text-muted-foreground font-mono tabular-nums">
        Page {page} of {Math.max(1, total)}
      </p>
      <div className="flex gap-2">
        <button
          className={secondaryButton}
          disabled={page <= 1}
          onClick={() => {
            setPage(page - 1);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          className={secondaryButton}
          disabled={page >= total}
          onClick={() => {
            setPage(page + 1);
          }}
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
