const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  applied: { label: 'Applied', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  under_review: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  shortlisted: { label: 'Shortlisted', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  assessment: { label: 'Assessment', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  interview: { label: 'Interview', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  selected: { label: 'Selected', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export function ApplicationStatusBadge({ status }: { status: string }): React.JSX.Element {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
