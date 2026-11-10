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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-6 w-1/3 rounded bg-slate-200 mb-4" />
        <div className="h-4 w-full rounded bg-slate-100 mb-2" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
      </div>
    );
  }

  if (!completion) return <></>;

  const { percentage, isComplete, categories, missingSections } = completion;

  // Determine color scheme based on score
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'from-blue-500 to-indigo-600 text-blue-700 bg-blue-50 border-blue-200';
    return 'from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-200';
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Profile Readiness</h3>
            <p className="text-xs text-slate-500">Placement eligibility & visibility score</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${getScoreColor(percentage)}`}
        >
          {isComplete ? (
            <>
              <Award className="h-3.5 w-3.5 text-emerald-600" />
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

      {/* Progress Bar with Gradient */}
      <div className="space-y-1.5 mb-6">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span>Overall Completion</span>
          <span className="font-bold text-slate-900">{percentage}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${String(percentage)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${
              percentage >= 85
                ? 'from-emerald-500 to-teal-500'
                : percentage >= 60
                  ? 'from-blue-500 to-indigo-500'
                  : 'from-amber-500 to-orange-500'
            }`}
          />
        </div>
      </div>

      {/* Categories Checklist */}
      <div className="space-y-2.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50"
          >
            {category.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${category.isCompleted ? 'text-slate-900' : 'text-slate-700'}`}>
                  {category.name}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {category.score}/{category.weight}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">{category.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {missingSections.length > 0 && (
        <div className="mt-5 rounded-xl bg-blue-50/70 border border-blue-100 p-3.5">
          <p className="text-xs font-medium text-blue-900">
            💡 Next step: Complete{' '}
            <span className="font-semibold">{missingSections[0]}</span> to boost your application match score.
          </p>
        </div>
      )}
    </div>
  );
}
