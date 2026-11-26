import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        active: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
        published: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
        pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
        pending_review: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
        rejected: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50',
        draft: 'bg-muted/50 text-muted-foreground border border-border/70',
        review: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50',
        closed: 'bg-muted/40 text-muted-foreground border border-border/60',
        expired: 'bg-muted/40 text-muted-foreground border border-border/60',
        shortlisted: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50',
        applied: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50',
        hired: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
      },
    },
    defaultVariants: {
      status: 'draft',
    },
  },
);

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof statusBadgeVariants> {
  /** Shows a colored dot indicator before the label */
  dot?: boolean;
}

/**
 * Semantic status indicator for applications, opportunities, and system states.
 * Uses distinct background + foreground combinations that do not rely on color alone.
 */
export function StatusBadge({ className, status, dot = true, children, ...props }: StatusBadgeProps) {
  const dotColorMap: Record<string, string> = {
    active: 'bg-emerald-500',
    published: 'bg-emerald-500',
    pending: 'bg-amber-500',
    pending_review: 'bg-amber-500',
    rejected: 'bg-rose-500',
    draft: 'bg-muted-foreground',
    review: 'bg-teal-400',
    closed: 'bg-muted-foreground',
    expired: 'bg-muted-foreground',
    shortlisted: 'bg-indigo-500',
    applied: 'bg-sky-500',
    hired: 'bg-emerald-500',
  };

  const defaultLabel = status
    ? status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {dot && status && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColorMap[status] || 'bg-slate-400')}
          aria-hidden="true"
        />
      )}
      {children ?? defaultLabel}
    </span>
  );
}
