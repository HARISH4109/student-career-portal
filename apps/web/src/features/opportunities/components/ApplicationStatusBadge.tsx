const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  applied: {
    label: 'Applied',
    bg: 'bg-primary/10 text-primary border border-primary/20',
    text: '',
    dot: 'bg-primary',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    text: '',
    dot: 'bg-amber-600 dark:bg-amber-400',
  },
  shortlisted: {
    label: 'Shortlisted',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50',
    text: '',
    dot: 'bg-indigo-600 dark:bg-indigo-400',
  },
  assessment: {
    label: 'Assessment',
    bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50',
    text: '',
    dot: 'bg-purple-600 dark:bg-purple-400',
  },
  interview: {
    label: 'Interview',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50',
    text: '',
    dot: 'bg-cyan-600 dark:bg-cyan-400',
  },
  selected: {
    label: 'Selected',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
    text: '',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-destructive/10 text-destructive border border-destructive/20',
    text: '',
    dot: 'bg-destructive',
  },
  withdrawn: {
    label: 'Withdrawn',
    bg: 'bg-muted/40 text-muted-foreground border border-border',
    text: '',
    dot: 'bg-muted-foreground',
  },
};

export function ApplicationStatusBadge({ status }: { status: string }): React.JSX.Element {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: 'bg-muted/40 text-muted-foreground border border-border',
    text: '',
    dot: 'bg-muted-foreground',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
