import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useAttemptResult } from '../api/preparation-api';
import { Button, Card, Skeleton } from '@/shared/components/ui';

export function TestResultPage(): React.JSX.Element {
  const { id: attemptId } = useParams<{ id: string }>();
  const { data: result, isLoading, isError } = useAttemptResult(attemptId || '');

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-[1536px] mx-auto py-8">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-xs">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-base font-bold text-foreground">Result Not Available</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          The test result could not be retrieved. Ensure the assessment has been submitted.
        </p>
        <Link to="/dashboard/preparation">
          <Button className="mt-6" size="sm">
            Back to Assessments
          </Button>
        </Link>
      </div>
    );
  }

  const percentage = Math.round((result.score / (result.totalMarks || 1)) * 100);
  const correctCount = result.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questions.length - correctCount;

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* ── Top Navigation Link ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/preparation"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Assessments</span>
        </Link>
        <Link to="/dashboard/preparation/analytics">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Overall Analytics</span>
          </Button>
        </Link>
      </div>

      {/* ── Score Overview Academic Transcript ──────────────────────────── */}
      <div className="rounded-xl bg-card p-6 md:p-8 text-card-foreground shadow-xs border border-border/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
              <span className="text-xs font-medium text-muted-foreground font-mono">
                Official Assessment Transcript
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{result.testTitle}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Completed: {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString() : 'Today'}
            </p>
          </div>

          <div className="flex items-center gap-5 bg-muted/30 p-4 rounded-xl border border-border/60">
            <div className="text-center">
              <span className="text-2xl md:text-3xl font-bold text-foreground font-mono tabular-nums">{result.score}</span>
              <span className="text-xs text-muted-foreground font-mono">/{result.totalMarks}</span>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Marks Awarded</p>
            </div>

            <div className="h-8 w-px bg-border/70" />

            <div className="text-center">
              <span className="text-2xl md:text-3xl font-bold text-foreground font-mono tabular-nums">{percentage}%</span>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Score Rate</p>
            </div>

            <div className="h-8 w-px bg-border/70" />

            <div>
              {result.isPassed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Passed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Needs Practice</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick summary strip with disciplined monochrome icons */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span><strong className="font-mono text-foreground tabular-nums">{correctCount}</strong> Correct</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span><strong className="font-mono text-foreground tabular-nums">{incorrectCount}</strong> Incorrect</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span><strong className="font-mono text-foreground tabular-nums">{Math.round(result.timeSpentSeconds / 60)}</strong> Mins Spent</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Cutoff: <strong className="font-mono text-foreground tabular-nums">{result.passingMarks}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Topic Accuracy & Weak Categories ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Topic Accuracy Breakdown */}
        <Card className="p-5 space-y-4 border-border/80">
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>Topic Performance Breakdown</span>
          </h3>

          <div className="space-y-3.5">
            {result.topicAccuracies.map((topicStat) => (
              <div key={topicStat.topic} className="space-y-1.5">
                <div className="flex justify-between text-xs text-foreground">
                  <span className="font-medium">{topicStat.topic}</span>
                  <span className="font-mono font-semibold tabular-nums text-muted-foreground">
                    {topicStat.accuracyPercentage}% ({topicStat.correctQuestions}/{topicStat.totalQuestions})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      topicStat.accuracyPercentage >= 70
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : topicStat.accuracyPercentage >= 40
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-rose-600 dark:bg-rose-500'
                    }`}
                    style={{ width: `${String(topicStat.accuracyPercentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Weak Categories Recommendations */}
        <Card className="p-5 space-y-4 flex flex-col justify-between border-border/80">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span>Placement Readiness Insights</span>
            </h3>

            {result.weakCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Identified focus areas with accuracy below 50%:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {result.weakCategories.map((weak) => (
                    <span
                      key={weak}
                      className="rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
                    >
                      {weak}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Recommendation: Schedule interview simulation practice for flagged topics prior to campus drives.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 p-4 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-semibold">Proficiency Benchmarks Satisfied</p>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                  All assessed topics scored at or above benchmark qualification levels.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3.5 border-t border-border/60">
            <Link to="/dashboard/preparation/interviews" className="w-full">
              <Button variant="outline" className="w-full text-xs" size="sm">
                Schedule Mock Interview
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Question-by-Question Review with Explanations ────────────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Detailed Solutions & Explanations</h2>
          <span className="text-xs text-muted-foreground font-mono">{result.questions.length} Questions Reviewed</span>
        </div>

        <div className="space-y-3.5">
          {result.questions.map((q, idx) => {
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            return (
              <Card
                key={q.questionId}
                className={`p-5 border-border/80 ${
                  q.isCorrect ? 'border-l-4 border-l-emerald-600 dark:border-l-emerald-500' : 'border-l-4 border-l-rose-600 dark:border-l-rose-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-muted-foreground">
                        Question {idx + 1}
                      </span>
                      {q.topic ? (
                        <span className="text-xs text-muted-foreground font-medium">
                          • {q.topic}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-card-foreground pt-0.5 leading-relaxed">
                      {q.questionText}
                    </p>
                  </div>

                  <div>
                    {q.isCorrect ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 font-mono">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>+{q.awardedMarks}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-mono">
                        <XCircle className="h-3 w-3" />
                        <span>0/{q.maxMarks}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="mt-3.5 space-y-2">
                  {q.options.map((optText, optIdx) => {
                    const isStudentChoice = q.selectedIndex === optIdx;
                    const isAnswerKey = q.correctAnswerIndex === optIdx;

                    let optionBorder = 'border-border/60 bg-card text-foreground';
                    if (isAnswerKey) {
                      optionBorder = 'border-emerald-500/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-medium';
                    } else if (isStudentChoice && !q.isCorrect) {
                      optionBorder = 'border-destructive/60 bg-destructive/10 text-destructive font-medium';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between rounded-lg border p-3 text-xs ${optionBorder}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-mono font-bold">
                            {letters[optIdx] || optIdx + 1}
                          </span>
                          <span>{optText}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAnswerKey ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Correct Answer</span>
                            </span>
                          ) : null}
                          {isStudentChoice && !isAnswerKey ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Your Response</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation ? (
                  <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground border border-border/50 flex items-start gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Explanation: </strong>
                      <span>{q.explanation}</span>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
