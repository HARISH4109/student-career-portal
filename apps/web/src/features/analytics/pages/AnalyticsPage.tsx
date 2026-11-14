import type {
  AdminAnalyticsResponse,
  FacultyAnalyticsResponse,
  StudentAnalyticsResponse,
} from '@career-portal/shared-types';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Route,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import React from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAuth } from '@/features/auth/use-auth';
import {
  getAdminAnalytics,
  getFacultyAnalytics,
  getStudentAnalytics,
} from '../services/analytics-api';

/** Custom glassmorphic tooltip for clean data display */
function CustomChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 px-3.5 py-2 text-xs text-white shadow-xl backdrop-blur-md">
        <p className="font-semibold text-slate-300">{label}</p>
        <div className="mt-1 space-y-1">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || '#60a5fa' }}
              />
              <span className="text-sm font-bold text-white">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
              <span className="text-slate-400 text-[11px] font-normal">
                {item.name || 'records'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ── Student Analytics View ────────────────────────────────────────────────

function StudentAnalyticsView({ data }: { data: StudentAnalyticsResponse }) {
  const navigate = useNavigate();
  const funnelData = Object.entries(data.applicationsByStatus).map(([status, count]) => ({
    status: status.replace('_', ' ').toUpperCase(),
    count,
  }));

  // Standard CSE Career Roadmap stages
  const standardStages = [
    {
      num: 1,
      title: 'Foundations & DSA',
      tagline: 'Core CS Foundations',
      description: 'Data Structures, Algorithms, OOP, and problem-solving benchmarks.',
    },
    {
      num: 2,
      title: 'Core Systems & Stack',
      tagline: 'Technical Competence',
      description: 'Full-stack frameworks, database design, REST APIs, and Git.',
    },
    {
      num: 3,
      title: 'System Design & Distributed Services',
      tagline: 'Scalable Architecture',
      description: 'Caching, microservices, asynchronous queues, and clean architecture.',
    },
    {
      num: 4,
      title: 'Placement Drives & Interview Mastery',
      tagline: 'Hiring Conversion',
      description: 'Technical rounds, behavioral assessments, and mock interviews.',
    },
  ];

  const completedStages = data.roadmapProgress.completedStages;
  const totalStages = 4;

  const getPlacementStanding = () => {
    if (data.selectionsCount > 0) {
      return {
        title: 'Offer Accepted / Placed',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-50 text-emerald-600',
        subtext: `${data.selectionsCount} selection offer${data.selectionsCount > 1 ? 's' : ''} confirmed`,
        value: `${data.selectionsCount} Offer${data.selectionsCount > 1 ? 's' : ''}`,
      };
    }
    if (data.interviewsCount > 0) {
      return {
        title: 'Active in Interview Rounds',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        iconBg: 'bg-purple-50 text-purple-600',
        subtext: `${data.interviewsCount} technical/HR interview milestone${data.interviewsCount > 1 ? 's' : ''}`,
        value: `${data.interviewsCount} Active`,
      };
    }
    if (data.applicationsCount > 0) {
      return {
        title: 'Application Pipeline Active',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        iconBg: 'bg-blue-50 text-blue-600',
        subtext: `${data.applicationsCount} submitted application${data.applicationsCount > 1 ? 's' : ''} under review`,
        value: `${data.applicationsCount} Submitted`,
      };
    }
    return {
      title: 'Preparation & Readiness Phase',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      iconBg: 'bg-slate-100 text-slate-600',
      subtext: 'Complete mock tests and resume review to begin campus applications',
      value: 'In Progress',
    };
  };

  const placementStanding = getPlacementStanding();

  return (
    <div className="space-y-6">
      {/* Standalone Deep-Dive Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Placement Preparation Analytics</h3>
            <p className="text-xs text-slate-500">
              Looking for your full test attempt history, topic accuracy breakdown, and weak categories?
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/preparation/analytics"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          Open Preparation Analytics <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Top Student KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Completion */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Profile Completion</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {data.profileCompletionPercentage}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Target: 100% for placement eligibility</p>
        </div>

        {/* ATS Resume Score */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ATS Resume Score</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">
              {data.resumeScore != null ? `${data.resumeScore}/100` : '—'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {data.resumeScore != null ? 'Latest ATS analysis benchmark' : 'No resume scored yet'}
          </p>
        </div>

        {/* Mock Tests */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Mock Tests</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.testsAttempted}</span>
            <span className="text-xs font-medium text-slate-500">(Avg: {data.averageTestScore}%)</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Submitted assessment attempts</p>
        </div>

        {/* Placement Standing */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Placement Standing</span>
            <div className={`p-2 rounded-xl ${placementStanding.iconBg}`}>
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {placementStanding.value}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${placementStanding.badgeClass}`}>
              {placementStanding.title}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {placementStanding.subtext}
          </p>
        </div>
      </div>

      {/* Visualized Career Roadmap Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Career Path Roadmap Progress</h3>
              <p className="text-xs text-slate-500">
                Structured stage-by-stage progression toward campus placement readiness
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.roadmapProgress.hasActiveRoadmap && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 text-blue-700 text-xs font-bold rounded-full">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                {data.roadmapProgress.careerPathTitle || 'Active Roadmap'}
              </span>
            )}
            <button
              onClick={() => {
                void navigate(data.roadmapProgress.hasActiveRoadmap ? '/dashboard/roadmap' : '/dashboard/careers');
              }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>{data.roadmapProgress.hasActiveRoadmap ? 'View Roadmap' : 'Explore Paths'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {data.roadmapProgress.hasActiveRoadmap ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-sm">
                  {data.roadmapProgress.percentage}%
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Track Completion: {completedStages} of {totalStages} Stages Cleared
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {completedStages === totalStages
                      ? 'All roadmap milestones completed.'
                      : `Progressing through Stage ${completedStages + 1}: ${standardStages[Math.min(completedStages, standardStages.length - 1)]?.title ?? 'Core'}`}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, data.roadmapProgress.percentage)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              {standardStages.map((stage, idx) => {
                const isCompleted = idx < completedStages;
                const isCurrent = idx === completedStages;
                const isUpcoming = idx > completedStages;

                return (
                  <div
                    key={stage.num}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/30 shadow-sm'
                        : isCurrent
                        ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-md'
                        : 'border-slate-200 bg-white opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                            isCompleted
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isCurrent
                              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted ? '✓' : stage.num}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted ? 'Completed' : isCurrent ? 'Active Focus' : 'Upcoming'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{stage.title}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{stage.tagline}</p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{stage.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Milestone {stage.num} of 4</span>
                      {isCompleted && <span className="text-emerald-700 font-semibold">100% Cleared</span>}
                      {isCurrent && <span className="text-blue-700 font-semibold">In Progress ⚡</span>}
                      {isUpcoming && <span className="text-slate-400">Locked</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
            <Route className="mx-auto h-10 w-10 text-slate-400" />
            <h4 className="mt-3 text-base font-bold text-slate-800">No Active Career Roadmap Selected</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Select your goal career path to track your stage-by-stage placement readiness.
            </p>
            <button
              onClick={() => { void navigate('/dashboard/careers'); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              <span>Explore CSE Career Paths</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Applications Pipeline Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" /> Application Pipeline Status
        </h3>
        {funnelData.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No applications submitted yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="studentFunnelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="status"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                <Bar dataKey="count" name="Applications" fill="url(#studentFunnelGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Faculty Analytics View ────────────────────────────────────────────────

function FacultyAnalyticsView({ data }: { data: FacultyAnalyticsResponse }) {
  const funnelStages = [
    { stage: 'Applied', count: data.applicationFunnel.applied, color: '#4f46e5' },
    { stage: 'Review', count: data.applicationFunnel.under_review, color: '#06b6d4' },
    { stage: 'Shortlisted', count: data.applicationFunnel.shortlisted, color: '#f59e0b' },
    { stage: 'Assessment', count: data.applicationFunnel.assessment, color: '#8b5cf6' },
    { stage: 'Interview', count: data.applicationFunnel.interview, color: '#ec4899' },
    { stage: 'Selected', count: data.applicationFunnel.selected, color: '#10b981' },
  ];

  const shortlistConversionRate = data.applicationFunnel.applied > 0
    ? Math.round((data.applicationFunnel.shortlisted / data.applicationFunnel.applied) * 100)
    : 0;

  const selectionConversionRate = data.applicationFunnel.applied > 0
    ? Math.round((data.applicationFunnel.selected / data.applicationFunnel.applied) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Placement Officer KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Recruitment Drives</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {data.opportunitiesPublished}
            </span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {data.activeOpportunities} Active
            </span>
          </div>
          <p className="text-xs text-slate-400">Total campus opportunities managed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Applications Handled</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-indigo-600">{data.totalApplications}</span>
          </div>
          <p className="text-xs text-slate-400">Submitted by students across all drives</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Assessment Participation</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600">
              {data.testParticipation.totalAttempts}
            </span>
            <span className="text-xs text-slate-500">
              across {data.testParticipation.totalTests} tests
            </span>
          </div>
          <p className="text-xs text-slate-400">Student diagnostic assessment attempts</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cohort Benchmark Score</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">
              {data.testParticipation.averageScore}%
            </span>
            <span className="text-xs text-slate-500">average accuracy</span>
          </div>
          <p className="text-xs text-slate-400">Department technical assessment standing</p>
        </div>
      </div>

      {/* Placement Drive Funnel & Conversion Rates */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" /> Campus Recruitment Pipeline & Conversion Funnel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Stage-by-stage progression from initial job application to final offer selection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-50 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 font-medium">
              Shortlist Rate: <strong className="text-indigo-600">{shortlistConversionRate}%</strong>
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200 font-medium">
              Selection Rate: <strong className="text-emerald-700">{selectionConversionRate}%</strong>
            </span>
          </div>
        </div>

        {/* Funnel Stage Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {funnelStages.map((st, idx) => (
            <div key={st.stage} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {st.stage}
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {st.count}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {idx === 0 ? 'Total Pool' : `${Math.round((st.count / (data.applicationFunnel.applied || 1)) * 100)}% of pool`}
              </span>
            </div>
          ))}
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelStages} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="stage"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                allowDecimals={false}
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
              <Bar dataKey="count" name="Students in Stage" radius={[6, 6, 0, 0]}>
                {funnelStages.map((entry) => (
                  <Cell key={entry.stage} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Program Placement Readiness & Industry Skill Deficiencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Degree Program Placement Readiness */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" /> Placement Readiness by Academic Program
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Diagnostic assessment readiness across departmental degree programs
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.studentReadinessTrends.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No academic programs registered yet.</p>
            ) : (
              data.studentReadinessTrends.map((trend) => {
                const readinessPercentage = trend.studentCount > 0
                  ? Math.round((trend.readyStudentCount / trend.studentCount) * 100)
                  : 0;

                return (
                  <div key={trend.departmentName} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{trend.departmentName}</h4>
                        <p className="text-xs text-slate-500">
                          {trend.studentCount} student{trend.studentCount === 1 ? '' : 's'} enrolled • {trend.readyStudentCount} drive ready
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                          {trend.averageTestScore}% Avg
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          readinessPercentage >= 70
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : readinessPercentage >= 40
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {readinessPercentage}% Ready
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          readinessPercentage >= 70
                            ? 'bg-emerald-500'
                            : readinessPercentage >= 40
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${readinessPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Campus Placement Conversion & Hiring Health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" /> Campus Placement Conversion & Hiring Health
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time hiring conversion velocity, candidate milestone standing, and drive conversion
                </p>
              </div>
            </div>

            {/* Top Conversion Metrics Ribbon */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Placement Rate
                </span>
                <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
                  {data.placementStats?.placementRate ?? selectionConversionRate}%
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {data.placementStats?.uniquePlaced ?? data.applicationFunnel.selected} candidate(s) placed
                </span>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-center">
                <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider block">
                  Interview Conversion
                </span>
                <span className="text-xl font-extrabold text-purple-700 mt-0.5 block">
                  {data.placementStats?.interviewClearanceRate ?? (
                    data.applicationFunnel.interview + data.applicationFunnel.selected > 0
                      ? Math.round(
                          (data.applicationFunnel.selected /
                            (data.applicationFunnel.interview + data.applicationFunnel.selected)) *
                            100,
                        )
                      : 0
                  )}%
                </span>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  final round clearance
                </span>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center">
                <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider block">
                  Shortlist Rate
                </span>
                <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">
                  {shortlistConversionRate}%
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5">
                  resume screening pass
                </span>
              </div>
            </div>

            {/* Candidate Milestone Standing Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Confirmed Placement Offers</span>
                    <span className="text-[11px] text-slate-400 block">Verified company job selections</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-700">{data.applicationFunnel.selected}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                    Offer
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Active Interview Rounds</span>
                    <span className="text-[11px] text-slate-400 block">Technical & behavioral interviews underway</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-purple-700">{data.applicationFunnel.interview}</span>
                  <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Assessment & Screening Pool</span>
                    <span className="text-[11px] text-slate-400 block">Online tests & shortlist reviews</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-blue-700">
                    {data.applicationFunnel.assessment + data.applicationFunnel.shortlisted}
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                    In Review
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Drive-Ready Diagnostic Pool</span>
                    <span className="text-[11px] text-slate-400 block">Scored &ge; 70% on mock preparation assessments</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-amber-700">
                    {data.studentReadinessTrends.reduce((acc, t) => acc + t.readyStudentCount, 0)}
                  </span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Faculty Placement Directive */}
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <span className="font-bold">Faculty Operational Takeaway:</span>
              <p className="mt-0.5 text-indigo-800 text-[11px]">
                {data.applicationFunnel.selected > 0
                  ? `Conversion momentum active with ${data.applicationFunnel.selected} confirmed placement offer(s). Focus on mock interviews for ${data.applicationFunnel.interview} candidate(s) currently in final rounds.`
                  : data.applicationFunnel.interview > 0
                  ? `High interview engagement: ${data.applicationFunnel.interview} candidate(s) are in active interview rounds. Ensure behavioral and technical preparation is completed.`
                  : `Drive preparation active: ${data.studentReadinessTrends.reduce((acc, t) => acc + t.readyStudentCount, 0)} student(s) meet diagnostic placement benchmarks across ${data.activeOpportunities} active drives.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Analytics View ──────────────────────────────────────────────────

function AdminAnalyticsView({ data }: { data: AdminAnalyticsResponse }) {
  const totalStudents = data.users.students || 1;

  // Use real programs from programBreakdown if present, or fallback
  const programsList = data.programBreakdown && data.programBreakdown.length > 0
    ? data.programBreakdown
    : [
        { programId: '1', programName: 'B.Tech Computer Science & Engineering', degreeLevel: 'Bachelors', studentCount: Math.round(data.users.students * 0.65) },
        { programId: '2', programName: 'Master of Computer Applications (MCA)', degreeLevel: 'Masters', studentCount: Math.round(data.users.students * 0.20) },
        { programId: '3', programName: 'M.Tech Computer Science & Engineering', degreeLevel: 'Masters', studentCount: Math.round(data.users.students * 0.15) },
      ];

  return (
    <div className="space-y-6">
      {/* Top Institutional Governance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Registered Accounts</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.users.total}</span>
          </div>
          <p className="text-xs text-slate-400">
            {data.users.students} Students • {data.users.faculty} Faculty • {data.users.admins} Admins
          </p>
        </div>

        {/* Placement Success Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Placement Success Rate</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">
              {data.applications.placementRate}%
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {data.applications.selectedCount} Offers
            </span>
          </div>
          <p className="text-xs text-slate-400">Verified student selections across all drives</p>
        </div>

        {/* Campus Opportunities */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Campus Drives Managed</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600">{data.opportunities.total}</span>
            <span className="text-xs text-slate-500">
              ({data.opportunities.published} published)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {data.opportunities.jobs} Full-Time Jobs • {data.opportunities.internships} Internships
          </p>
        </div>

        {/* Communication Reach */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Notice Delivery & Reach</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600">
              {data.notificationDelivery.readRate}%
            </span>
            <span className="text-xs text-slate-500">read engagement</span>
          </div>
          <p className="text-xs text-slate-400">
            {data.notificationDelivery.readCount} of {data.notificationDelivery.totalNotifications} notifications read
          </p>
        </div>
      </div>

      {/* Program Enrollment & Cohort Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Degree Programs Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" /> Computer Science Academic Programs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active student enrollment distribution across degree programs
              </p>
            </div>
            <Link
              to="/dashboard/programs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Programs →
            </Link>
          </div>

          <div className="space-y-4 pt-1">
            {programsList.map((prog) => {
              const share = Math.round((prog.studentCount / totalStudents) * 100);

              return (
                <div key={prog.programId} className="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{prog.programName}</h4>
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 mt-0.5">
                        {prog.degreeLevel}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">{prog.studentCount} Students</span>
                      <span className="text-xs text-slate-400 block">{share}% of department</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Graduation Batches */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" /> Graduation Cohorts & Batches
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Student cohort breakdown across active graduating classes
              </p>
            </div>
            <Link
              to="/dashboard/admin#academic"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Academic Config →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data.batchBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No graduation batches registered.</p>
            ) : (
              data.batchBreakdown.map((batch) => (
                <div key={batch.batchId} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs">
                      {batch.graduationYear}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900">
                        Class of {batch.graduationYear}
                      </span>
                      <span className="text-xs text-slate-400 block">Graduating cohort</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100">
                    {batch.studentCount} student{batch.studentCount === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Technical Preparation & Platform Adoption */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" /> Technical Assessment & Readiness Telemetry
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500 block">Mock Practice Tests</span>
            <span className="text-2xl font-bold text-purple-700 mt-1 block">{data.preparation.totalTests}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Configured assessment modules</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500 block">Total Assessment Submissions</span>
            <span className="text-2xl font-bold text-indigo-700 mt-1 block">{data.preparation.totalAttempts}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Student test attempts recorded</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-slate-500 block">AI Mock Interviews Conducted</span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">{data.preparation.totalInterviews}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Technical & behavioral interview sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Analytics Page Export ────────────────────────────────────────────

export function AnalyticsPage(): React.JSX.Element {
  const { user } = useAuth();

  const isStudent = user?.roles?.includes('STUDENT');
  const isFaculty = user?.roles?.includes('PLACEMENT_FACULTY');
  const isAdmin = user?.roles?.includes('ADMIN');

  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['analytics', 'student', user?.id],
    queryFn: getStudentAnalytics,
    enabled: Boolean(isStudent && user?.id),
  });

  const { data: facultyData, isLoading: facultyLoading } = useQuery({
    queryKey: ['analytics', 'faculty'],
    queryFn: getFacultyAnalytics,
    enabled: Boolean(isFaculty && !isAdmin),
  });

  const { data: adminData, isLoading: adminLoading } = useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: getAdminAnalytics,
    enabled: Boolean(isAdmin),
  });

  const isLoading = studentLoading || facultyLoading || adminLoading;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> Placement & Performance Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isStudent
              ? 'Track your career preparation metrics, application pipeline, and test performance'
              : isFaculty
              ? 'Department of Computer Science & Engineering • Campus recruitment pipeline, student readiness, and skill gap telemetry'
              : 'Department of Computer Science & Engineering • Institutional placement outcomes, academic programs, and platform governance'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-sm">Loading analytics metrics…</div>
      ) : isStudent && studentData ? (
        <StudentAnalyticsView data={studentData} />
      ) : isFaculty && !isAdmin && facultyData ? (
        <FacultyAnalyticsView data={facultyData} />
      ) : isAdmin && adminData ? (
        <AdminAnalyticsView data={adminData} />
      ) : (
        <div className="p-8 text-center text-slate-400">No analytics data available.</div>
      )}
    </div>
  );
}
