import { CheckCircle, XCircle } from 'lucide-react';

interface EligibilityTagProps {
  isEligible: boolean;
  compact?: boolean;
}

export function EligibilityTag({ isEligible, compact = false }: EligibilityTagProps): React.JSX.Element {
  if (compact) {
    return isEligible ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-3.5 w-3.5" />
        Eligible
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Not Eligible
      </span>
    );
  }

  return isEligible ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/60 dark:ring-emerald-800/50">
      <CheckCircle className="h-3.5 w-3.5" />
      You're Eligible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-300 ring-1 ring-red-200/60 dark:ring-red-800/50">
      <XCircle className="h-3.5 w-3.5" />
      Not Eligible
    </span>
  );
}
