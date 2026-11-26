import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  FileCheck,
  Target,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';

import { useMyAttempts, useMyPreparationAnalytics } from '../api/preparation-api';
import { AnimatedCounter, Card } from '@/shared/components/ui';

export function PreparationAnalyticsPage(): React.JSX.Element {
  const { data: analytics, isLoading: analyticsLoading } = useMyPreparationAnalytics();
  const { data: attempts = [], isLoading: attemptsLoading } = useMyAttempts();

  if (analyticsLoading || attemptsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalAttempts = analytics?.totalAttempts ?? 0;
  const passedAttempts = analytics?.passedAttempts ?? 0;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const avgScore = analytics?.averageScorePercentage ?? 0;

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* ── Academic Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Placement Preparation Analytics
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Assessment performance benchmarks, category proficiency breakdown, and weak area telemetry
          </p>
        </div>

        <Link
          to="/dashboard/preparation"
          className="inline-flex items-center gap-2 rounded-lg bg-card hover:bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-foreground border border-border/70 shadow-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Back to Assessments</span>
        </Link>
      </div>

      {/* ── Symmetrical Executive KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Assessments</span>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="pt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              <AnimatedCounter value={totalAttempts} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed test evaluations</p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Average Score</span>
            <Award className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="pt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              <AnimatedCounter value={avgScore} suffix="%" />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Across all attempted categories</p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Passed Assessments</span>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="pt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              <AnimatedCounter value={passedAttempts} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Met passing benchmark cutoff</p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="pt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              <AnimatedCounter value={passRate} suffix="%" />
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Overall qualification rate</p>
          </div>
        </Card>
      </div>

      {/* ── Topic Accuracy & Weak Categories ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Topic Accuracy */}
        <Card className="p-6 space-y-4 border-border/80">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Topic Accuracy Distribution</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {analytics?.topicAccuracies?.length ?? 0} Categories
            </span>
          </div>

          {analytics?.topicAccuracies && analytics.topicAccuracies.length > 0 ? (
            <div className="space-y-3.5 pt-1">
              {analytics.topicAccuracies.map((stat) => (
                <div key={stat.topic} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-foreground">{stat.topic}</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {stat.accuracyPercentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        stat.accuracyPercentage >= 70
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : stat.accuracyPercentage >= 40
                            ? 'bg-amber-500 dark:bg-amber-400'
                            : 'bg-rose-600 dark:bg-rose-500'
                      }`}
                      style={{ width: `${String(stat.accuracyPercentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                No topic accuracy data available yet
              </p>
              <p className="text-[11px] text-muted-foreground">
                Complete assessments from the catalog to populate your proficiency telemetry.
              </p>
            </div>
          )}
        </Card>

        {/* Weak Categories */}
        <Card className="p-6 space-y-4 flex flex-col justify-between border-border/80">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Target Areas for Improvement</h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                &lt; 50% Threshold
              </span>
            </div>

            {analytics?.weakCategories && analytics.weakCategories.length > 0 ? (
              <div className="pt-3 space-y-2.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The following assessment domains require focused practice before drive deadlines:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {analytics.weakCategories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5"
                    >
                      <XCircle className="h-3 w-3 shrink-0" />
                      <span>{cat}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-4">
                <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 p-4 text-xs space-y-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Proficiency Benchmarks Satisfied</span>
                  </p>
                  <p className="text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                    You have maintained solid benchmark scores (&ge; 50%) across all attempted assessment categories.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
            <span>Adaptive placement telemetry</span>
            <Link to="/dashboard/preparation" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              Browse Assessments <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Historical Assessment Attempts Table ─────────────────────────── */}
      <Card className="p-6 space-y-4 border-border/80">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Historical Assessment Attempts</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {attempts.length} {attempts.length === 1 ? 'Attempt' : 'Attempts'}
          </span>
        </div>

        {attempts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No assessments completed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="pb-3 pl-2">Assessment Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {attempts.map((att) => (
                  <tr key={att.attemptId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 pl-2 font-medium text-foreground">{att.testTitle}</td>
                    <td className="py-3 capitalize text-muted-foreground">{att.category.replace('_', ' ')}</td>
                    <td className="py-3 font-mono font-semibold tabular-nums">
                      {att.score}/{att.totalMarks}
                    </td>
                    <td className="py-3">
                      {att.isPassed ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Passed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-mono">
                          <XCircle className="h-3 w-3" />
                          <span>Needs Work</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground font-mono">
                      {new Date(att.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <Link
                        to={`/dashboard/preparation/attempts/${att.attemptId}/result`}
                        className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Transcript &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
