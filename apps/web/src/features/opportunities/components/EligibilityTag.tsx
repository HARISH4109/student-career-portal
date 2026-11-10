import { CheckCircle, XCircle } from 'lucide-react';

interface EligibilityTagProps {
  isEligible: boolean;
  compact?: boolean;
}

export function EligibilityTag({ isEligible, compact = false }: EligibilityTagProps): React.JSX.Element {
  if (compact) {
    return isEligible ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle className="h-3.5 w-3.5" />
        Eligible
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
        <XCircle className="h-3.5 w-3.5" />
        Not Eligible
      </span>
    );
  }

  return isEligible ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
      <CheckCircle className="h-3.5 w-3.5" />
      You're Eligible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200/60">
      <XCircle className="h-3.5 w-3.5" />
      Not Eligible
    </span>
  );
}
