import type { ProfileCompletionResponseDto } from '@career-portal/shared-types';
import { motion } from 'framer-motion';
import { AlertCircle, Award, CheckCircle2, Sparkles } from 'lucide-react';
import React from 'react';

interface ProfileCompletionWidgetProps {
  completion?: ProfileCompletionResponseDto | undefined;
  isLoading?: boolean | undefined;
}

export function ProfileCompletionWidget({
  completion,
  isLoading,
}: ProfileCompletionWidgetProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-1/3 rounded bg-muted/60" />
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-2/3 rounded bg-muted/40" />
      </div>
    );
  }

  if (!completion) return <></>;

  const { percentage, isComplete, categories, missingSections } = completion;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-normal text-foreground">Profile Readiness</h3>
            <p className="text-xs text-muted-foreground">Placement eligibility & visibility index</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono border ${
            isComplete
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              : percentage >= 60
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
          }`}
        >
          {isComplete ? (
            <>
              <Award className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              Ready for Drives
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" />
              {percentage >= 60 ? 'Almost Ready' : 'Incomplete'}
            </>
          )}
        </span>
      </div>

      {/* Progress Bar with Swiss Tabular Numbering */}
      <div className="space-y-1.5 mb-6">
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>Overall Completion</span>
          <span className="font-bold font-mono tabular-nums text-foreground">{percentage}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50 border border-border/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${String(percentage)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full transition-[width] duration-300 ${
              percentage >= 85
                ? 'bg-emerald-500'
                : percentage >= 60
                  ? 'bg-primary'
                  : 'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Categories Checklist */}
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/20 p-3 transition-colors hover:bg-muted/30"
          >
            {category.isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-muted-foreground/40 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${category.isCompleted ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {category.name}
                </span>
                <span className="text-[11px] font-semibold font-mono text-muted-foreground">
                  {category.score}/{category.weight}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">{category.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {missingSections.length > 0 && (
        <div className="mt-5 rounded-lg bg-primary/10 border border-primary/20 p-3.5">
          <p className="text-xs font-medium text-foreground">
            <span className="font-semibold text-primary">Next step:</span> Complete{' '}
            <span className="font-semibold text-primary">{missingSections[0]}</span> to boost your application match score.
          </p>
        </div>
      )}
    </div>
  );
}
