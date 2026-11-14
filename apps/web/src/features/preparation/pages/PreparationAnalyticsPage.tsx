import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';

import { useMyAttempts, useMyPreparationAnalytics } from '../api/preparation-api';

export function PreparationAnalyticsPage(): React.JSX.Element {
  const { data: analytics, isLoading: analyticsLoading } = useMyPreparationAnalytics();
  const { data: attempts = [], isLoading: attemptsLoading } = useMyAttempts();

  if (analyticsLoading || attemptsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const totalAttempts = analytics?.totalAttempts ?? 0;
  const passedAttempts = analytics?.passedAttempts ?? 0;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const avgScore = analytics?.averageScorePercentage ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-600" /> Placement Preparation Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Historical assessment performance, category strengths, and weak area tracking
          </p>
        </div>

        <Link
          to="/dashboard/preparation"
          className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tests</span>
        </Link>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500">Total Assessments</p>
          <p className="text-2xl font-bold text-slate-900">{totalAttempts}</p>
          <p className="text-[11px] text-slate-400">Completed test attempts</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500">Average Score</p>
          <p className="text-2xl font-bold text-indigo-600">{avgScore}%</p>
          <p className="text-[11px] text-slate-400">Across all topics</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500">Passed Tests</p>
          <p className="text-2xl font-bold text-emerald-600">{passedAttempts}</p>
          <p className="text-[11px] text-slate-400">Met passing threshold</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500">Success Rate</p>
          <p className="text-2xl font-bold text-amber-600">{passRate}%</p>
          <p className="text-[11px] text-slate-400">Overall qualification rate</p>
        </div>
      </div>

      {/* ── Topic Accuracy & Weak Categories ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Topic Accuracy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <span>Topic Accuracy Distribution</span>
          </h2>

          {analytics?.topicAccuracies && analytics.topicAccuracies.length > 0 ? (
            <div className="space-y-3 pt-2">
              {analytics.topicAccuracies.map((stat) => (
                <div key={stat.topic} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{stat.topic}</span>
                    <span className="font-bold">{stat.accuracyPercentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stat.accuracyPercentage >= 70
                          ? 'bg-emerald-500'
                          : stat.accuracyPercentage >= 40
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${String(stat.accuracyPercentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">
              No topic accuracy data available yet. Complete a mock test to populate analytics.
            </p>
          )}
        </div>

        {/* Weak Categories */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Target Areas for Improvement</span>
          </h2>

          {analytics?.weakCategories && analytics.weakCategories.length > 0 ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Categories currently scoring under 50% accuracy:
              </p>
              <div className="flex flex-wrap gap-2">
                {analytics.weakCategories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 pt-2 leading-relaxed">
                Focus your preparation efforts on these topics before interview shortlist cutoffs.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800 space-y-1">
              <p className="font-bold">No Weak Areas Flagged</p>
              <p>You have maintained solid benchmark scores across all attempted topics.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Attempt History Table ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <span>Historical Test Attempts</span>
        </h2>

        {attempts.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No assessments completed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-medium">
                <tr>
                  <th className="pb-3">Test Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attempts.map((att) => (
                  <tr key={att.attemptId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 font-semibold text-slate-900">{att.testTitle}</td>
                    <td className="py-3 capitalize text-slate-500">{att.category.replace('_', ' ')}</td>
                    <td className="py-3 font-mono font-bold">
                      {att.score}/{att.totalMarks}
                    </td>
                    <td className="py-3">
                      {att.isPassed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Passed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          <XCircle className="h-3 w-3" />
                          <span>Needs Work</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(att.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/dashboard/preparation/attempts/${att.attemptId}/result`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View Report &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
