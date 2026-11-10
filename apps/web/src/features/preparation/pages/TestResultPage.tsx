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

export function TestResultPage(): React.JSX.Element {
  const { id: attemptId } = useParams<{ id: string }>();
  const { data: result, isLoading, isError } = useAttemptResult(attemptId || '');

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-600">Retrieving test evaluation details...</p>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">Result Not Available</h3>
        <p className="mt-2 text-sm text-slate-600">
          The test result could not be retrieved. Ensure the assessment has been submitted.
        </p>
        <Link
          to="/dashboard/preparation"
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Back to Tests
        </Link>
      </div>
    );
  }

  const percentage = Math.round((result.score / (result.totalMarks || 1)) * 100);
  const correctCount = result.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questions.length - correctCount;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* ── Top Navigation Link ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/preparation"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tests Catalog</span>
        </Link>
        <Link
          to="/dashboard/preparation/analytics"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Overall Analytics</span>
        </Link>
      </div>

      {/* ── Score Overview Hero Banner ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Evaluation Completed
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{result.testTitle}</h1>
            <p className="text-xs text-slate-400">
              Attempt completed on {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString() : 'Today'}
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-white">{result.score}</span>
              <span className="text-xs text-slate-400">/{result.totalMarks}</span>
              <p className="text-[11px] font-semibold text-indigo-300">Marks Awarded</p>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="text-center">
              <span className="text-3xl font-extrabold text-indigo-300">{percentage}%</span>
              <p className="text-[11px] font-semibold text-slate-400">Score Percentage</p>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div>
              {result.isPassed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Passed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 px-3.5 py-1 text-xs font-bold text-rose-300">
                  <XCircle className="h-4 w-4" />
                  <span>Needs Practice</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span><strong>{correctCount}</strong> Correct Answers</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-400" />
            <span><strong>{incorrectCount}</strong> Incorrect Answers</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span><strong>{Math.round(result.timeSpentSeconds / 60)}</strong> Mins Spent</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <span>Pass Threshold: <strong>{result.passingMarks}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Topic Accuracy & Weak Categories ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Topic Accuracy Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span>Topic Performance Breakdown</span>
          </h3>

          <div className="space-y-4">
            {result.topicAccuracies.map((topicStat) => (
              <div key={topicStat.topic} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{topicStat.topic}</span>
                  <span className="font-bold">{topicStat.accuracyPercentage}% ({topicStat.correctQuestions}/{topicStat.totalQuestions})</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      topicStat.accuracyPercentage >= 70
                        ? 'bg-emerald-500'
                        : topicStat.accuracyPercentage >= 40
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${String(topicStat.accuracyPercentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Categories Recommendations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Placement Readiness Insights</span>
            </h3>

            {result.weakCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Identified focus areas with accuracy below 50%:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {result.weakCategories.map((weak) => (
                    <span
                      key={weak}
                      className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200"
                    >
                      {weak}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 pt-2">
                  Tip: Target these specific weak topics using practice questions and mock interview simulation before campus drive deadlines.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800 space-y-1">
                <p className="font-bold">Excellent Performance!</p>
                <p>No critical weak areas detected in this assessment. All assessed categories scored at or above benchmark.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/dashboard/preparation/interviews"
              className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <span>Practice Mock Interview</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Question-by-Question Review with Explanations ────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Detailed Solution & Explanations</h2>
          <span className="text-xs text-slate-500">{result.questions.length} Questions Reviewed</span>
        </div>

        <div className="space-y-4">
          {result.questions.map((q, idx) => {
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            return (
              <div
                key={q.questionId}
                className={`rounded-2xl border p-6 bg-white shadow-sm transition ${
                  q.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                        Q{idx + 1}
                      </span>
                      {q.topic ? (
                        <span className="text-xs font-medium text-slate-500">
                          {q.topic}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-base font-semibold text-slate-900 pt-1">
                      {q.questionText}
                    </p>
                  </div>

                  <div>
                    {q.isCorrect ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>+{q.awardedMarks} Marks</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>0/{q.maxMarks} Marks</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="mt-4 space-y-2">
                  {q.options.map((optText, optIdx) => {
                    const isStudentChoice = q.selectedIndex === optIdx;
                    const isAnswerKey = q.correctAnswerIndex === optIdx;

                    let optionBorder = 'border-slate-200 bg-white text-slate-700';
                    if (isAnswerKey) {
                      optionBorder = 'border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-900';
                    } else if (isStudentChoice && !q.isCorrect) {
                      optionBorder = 'border-rose-400 bg-rose-50/60 font-semibold text-rose-900';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs md:text-sm ${optionBorder}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold">
                            {letters[optIdx] || optIdx + 1}
                          </span>
                          <span>{optText}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAnswerKey ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Correct Answer</span>
                            </span>
                          ) : null}
                          {isStudentChoice && !isAnswerKey ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Your Choice</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-100 flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">Explanation: </strong>
                      <span>{q.explanation}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
