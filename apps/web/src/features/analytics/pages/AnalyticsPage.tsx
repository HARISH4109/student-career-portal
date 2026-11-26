import type {
  AdminAnalyticsResponse,
  FacultyAnalyticsResponse,
  StudentAnalyticsResponse,
} from '@career-portal/shared-types';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Route,
  Shield,
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
      <div className="rounded-xl border border-border bg-card/95 px-3.5 py-2 text-xs text-foreground shadow-xl backdrop-blur-md">
        <p className="font-semibold text-muted-foreground">{label}</p>
        <div className="mt-1 space-y-1">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || '#3b82f6' }}
              />
              <span className="text-sm font-bold text-foreground">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
              <span className="text-muted-foreground text-[11px] font-normal">
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
        badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
        subtext: `${data.interviewsCount} technical/HR interview milestone${data.interviewsCount > 1 ? 's' : ''}`,
        value: `${data.interviewsCount} Active`,
      };
    }
    if (data.applicationsCount > 0) {
      return {
        title: 'Application Pipeline Active',
        badgeClass: 'bg-primary/10 text-primary border-primary/20',
        iconBg: 'bg-primary/10 text-primary',
        subtext: `${data.applicationsCount} submitted application${data.applicationsCount > 1 ? 's' : ''} under review`,
        value: `${data.applicationsCount} Submitted`,
      };
    }
    return {
      title: 'Preparation & Readiness Phase',
      badgeClass: 'bg-muted/40 text-muted-foreground border-border',
      iconBg: 'bg-muted/30 text-muted-foreground',
      subtext: 'Complete mock tests and resume review to begin campus applications',
      value: 'In Progress',
    };
  };

  const placementStanding = getPlacementStanding();

  return (
    <div className="space-y-6">
      {/* Standalone Deep-Dive Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Placement Preparation Analytics</h3>
            <p className="text-xs text-muted-foreground">
              Looking for your full test attempt history, topic accuracy breakdown, and weak categories?
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/preparation/analytics"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          Open Preparation Analytics <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Top Student KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Completion */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Profile Completion</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
              {data.profileCompletionPercentage}%
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">Target: 100% for placement eligibility</p>
        </div>

        {/* ATS Resume Score */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">ATS Resume Score</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {data.resumeScore != null ? `${data.resumeScore}/100` : '—'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            {data.resumeScore != null ? 'Latest ATS analysis benchmark' : 'No resume scored yet'}
          </p>
        </div>

        {/* Mock Tests */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Mock Tests</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">{data.testsAttempted}</span>
            <span className="text-xs font-mono text-muted-foreground">(Avg: {data.averageTestScore}%)</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">Submitted assessment attempts</p>
        </div>

        {/* Placement Standing */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Placement Standing</span>
            <div className={`p-2 rounded-lg ${placementStanding.iconBg}`}>
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-foreground font-mono">
              {placementStanding.value}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${placementStanding.badgeClass}`}>
              {placementStanding.title}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            {placementStanding.subtext}
          </p>
        </div>
      </div>

      {/* Visualized Career Roadmap Stepper */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Career Path Roadmap Progress</h3>
              <p className="text-xs text-muted-foreground">
                Structured stage-by-stage progression toward campus placement readiness
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.roadmapProgress.hasActiveRoadmap && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {data.roadmapProgress.careerPathTitle || 'Active Roadmap'}
              </span>
            )}
            <button
              onClick={() => {
                void navigate(data.roadmapProgress.hasActiveRoadmap ? '/dashboard/roadmap' : '/dashboard/careers');
              }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer"
            >
              <span>{data.roadmapProgress.hasActiveRoadmap ? 'View Roadmap' : 'Explore Paths'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {data.roadmapProgress.hasActiveRoadmap ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono font-bold text-sm shadow-sm">
                  {data.roadmapProgress.percentage}%
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Track Completion: {completedStages} of {totalStages} Stages Cleared
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {completedStages === totalStages
                      ? 'All roadmap milestones completed.'
                      : `Progressing through Stage ${completedStages + 1}: ${standardStages[Math.min(completedStages, standardStages.length - 1)]?.title ?? 'Core'}`}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-48 bg-muted/40 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-[width] duration-700"
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
                    className={`relative flex flex-col justify-between rounded-lg border p-4 transition-colors ${isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5 shadow-sm'
                      : isCurrent
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-md'
                        : 'border-border bg-card opacity-60'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold font-mono ${isCompleted
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : isCurrent
                              ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40'
                              : 'bg-muted/40 text-muted-foreground'
                            }`}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stage.num}
                        </span>
                        <span
                          className={`text-[10px] font-semibold tracking-normal px-2 py-0.5 rounded-full ${isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                            : isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/30 text-muted-foreground'
                            }`}
                        >
                          {isCompleted ? 'Completed' : isCurrent ? 'Active Focus' : 'Upcoming'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground leading-snug">{stage.title}</h4>
                      <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{stage.tagline}</p>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{stage.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-mono">Milestone {stage.num} of 4</span>
                      {isCompleted && <span className="text-emerald-700 dark:text-emerald-400 font-semibold font-mono">100% Cleared</span>}
                      {isCurrent && <span className="text-primary font-semibold font-mono">In Progress</span>}
                      {isUpcoming && <span className="text-muted-foreground/60 font-mono">Locked</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
            <Route className="mx-auto h-10 w-10 text-muted-foreground" />
            <h4 className="mt-3 text-base font-bold text-foreground">No Active Career Roadmap Selected</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              Select your goal career path to track your stage-by-stage placement readiness.
            </p>
            <button
              onClick={() => { void navigate('/dashboard/careers'); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <span>Explore CSE Career Paths</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Applications Pipeline Breakdown */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Application Pipeline Status
        </h3>
        {funnelData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No applications submitted yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="studentFunnelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262A36" />
                <XAxis
                  dataKey="status"
                  stroke="#64748B"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#262A36' }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#64748B"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                <Bar dataKey="count" name="Applications" fill="url(#studentFunnelGrad)" radius={[4, 4, 0, 0]} />
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
  const applicationFunnel = data?.applicationFunnel ?? {
    applied: 0,
    under_review: 0,
    shortlisted: 0,
    assessment: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
  };
  const testParticipation = data?.testParticipation ?? {
    totalTests: 0,
    totalAttempts: 0,
    averageScore: 0,
  };
  const studentReadinessTrends = data?.studentReadinessTrends ?? [];

  const funnelStages = [
    { stage: 'Applied', count: applicationFunnel.applied ?? 0, color: '#4f46e5' },
    { stage: 'Review', count: applicationFunnel.under_review ?? 0, color: '#06b6d4' },
    { stage: 'Shortlisted', count: applicationFunnel.shortlisted ?? 0, color: '#f59e0b' },
    { stage: 'Assessment', count: applicationFunnel.assessment ?? 0, color: '#8b5cf6' },
    { stage: 'Interview', count: applicationFunnel.interview ?? 0, color: '#ec4899' },
    { stage: 'Selected', count: applicationFunnel.selected ?? 0, color: '#10b981' },
  ];

  const shortlistConversionRate = (applicationFunnel.applied ?? 0) > 0
    ? Math.round(((applicationFunnel.shortlisted ?? 0) / applicationFunnel.applied) * 100)
    : 0;

  const selectionConversionRate = (applicationFunnel.applied ?? 0) > 0
    ? Math.round(((applicationFunnel.selected ?? 0) / applicationFunnel.applied) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Placement Officer KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Recruitment Drives</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
              {data?.opportunitiesPublished ?? 0}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {data?.activeOpportunities ?? 0} Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">Total campus opportunities managed</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Applications Handled</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-primary">{data?.totalApplications ?? 0}</span>
          </div>
          <p className="text-xs text-muted-foreground/70">Submitted by students across all drives</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Assessment Participation</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
              {testParticipation.totalAttempts ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              across {testParticipation.totalTests ?? 0} tests
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">Student diagnostic assessment attempts</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cohort Benchmark Score</span>
            <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {testParticipation.averageScore ?? 0}%
            </span>
            <span className="text-xs text-muted-foreground">average accuracy</span>
          </div>
          <p className="text-xs text-muted-foreground/70">Department technical assessment standing</p>
        </div>
      </div>

      {/* Placement Drive Funnel & Conversion Rates */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Campus Recruitment Pipeline & Conversion Funnel
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stage-by-stage progression from initial job application to final offer selection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-muted/20 text-foreground px-3 py-1 rounded-lg border border-border font-medium font-mono">
              Shortlist Rate: <strong className="text-primary">{shortlistConversionRate}%</strong>
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20 font-medium font-mono">
              Selection Rate: <strong>{selectionConversionRate}%</strong>
            </span>
          </div>
        </div>

        {/* Funnel Stage Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {funnelStages.map((st, idx) => (
            <div key={st.stage} className="rounded-lg border border-border bg-muted/20 p-3.5 text-center">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                {st.stage}
              </span>
              <span className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1 block">
                {st.count}
              </span>
              <span className="text-[10px] text-muted-foreground/70 block mt-0.5 font-mono">
                {idx === 0 ? 'Total Pool' : `${Math.round((st.count / (applicationFunnel.applied || 1)) * 100)}% of pool`}
              </span>
            </div>
          ))}
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelStages} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262A36" />
              <XAxis
                dataKey="stage"
                stroke="#64748B"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#262A36' }}
              />
              <YAxis
                allowDecimals={false}
                stroke="#64748B"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
              <Bar dataKey="count" name="Students in Stage" radius={[4, 4, 0, 0]}>
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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Placement Readiness by Academic Program
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Diagnostic assessment readiness across departmental degree programs
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {studentReadinessTrends.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No academic programs registered yet.</p>
            ) : (
              studentReadinessTrends.map((trend) => {
                const readinessPercentage = trend.studentCount > 0
                  ? Math.round((trend.readyStudentCount / trend.studentCount) * 100)
                  : 0;

                return (
                  <div key={trend.departmentName} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{trend.departmentName}</h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {trend.studentCount} student{trend.studentCount === 1 ? '' : 's'} enrolled • {trend.readyStudentCount} drive ready
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                          {trend.averageTestScore}% Avg
                        </span>
                        <span className={`text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full border ${readinessPercentage >= 70
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : readinessPercentage >= 40
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}>
                          {readinessPercentage}% Ready
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${readinessPercentage >= 70
                          ? 'bg-emerald-500'
                          : readinessPercentage >= 40
                            ? 'bg-primary'
                            : 'bg-amber-400'
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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Campus Placement Conversion & Hiring Health
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time hiring conversion velocity, candidate milestone standing, and drive conversion
                </p>
              </div>
            </div>

            {/* Top Conversion Metrics Ribbon */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-normal block">
                  Placement Rate
                </span>
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {data?.placementStats?.placementRate ?? selectionConversionRate}%
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 block mt-0.5 font-mono">
                  {data?.placementStats?.uniquePlaced ?? applicationFunnel.selected} placed
                </span>
              </div>

              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 dark:bg-indigo-950/30 p-3 text-center">
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 tracking-normal block">
                  Interview Conversion
                </span>
                <span className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-0.5 block">
                  {data?.placementStats?.interviewClearanceRate ?? (
                    (applicationFunnel.interview ?? 0) + (applicationFunnel.selected ?? 0) > 0
                      ? Math.round(
                        ((applicationFunnel.selected ?? 0) /
                          ((applicationFunnel.interview ?? 0) + (applicationFunnel.selected ?? 0))) *
                        100,
                      )
                      : 0
                  )}%
                </span>
                <span className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 block mt-0.5 font-mono">
                  final round clearance
                </span>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-center">
                <span className="text-[10px] font-semibold text-primary tracking-normal block">
                  Shortlist Rate
                </span>
                <span className="text-xl font-bold font-mono text-primary mt-0.5 block">
                  {shortlistConversionRate}%
                </span>
                <span className="text-[10px] text-primary/80 block mt-0.5 font-mono">
                  resume screening pass
                </span>
              </div>
            </div>

            {/* Candidate Milestone Standing Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-foreground">Confirmed Placement Offers</span>
                    <span className="text-[11px] text-muted-foreground block">Verified company job selections</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">{applicationFunnel.selected ?? 0}</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 font-semibold border border-emerald-500/20">
                    Offer
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  <div>
                    <span className="text-xs font-bold text-foreground">Active Interview Rounds</span>
                    <span className="text-[11px] text-muted-foreground block">Technical & behavioral interviews underway</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-indigo-700 dark:text-indigo-300">{applicationFunnel.interview ?? 0}</span>
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded ml-1 font-semibold border border-indigo-500/20">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <span className="text-xs font-bold text-foreground">Assessment & Screening Pool</span>
                    <span className="text-[11px] text-muted-foreground block">Online tests & shortlist reviews</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-primary">
                    {(applicationFunnel.assessment ?? 0) + (applicationFunnel.shortlisted ?? 0)}
                  </span>
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1 font-semibold border border-primary/20">
                    In Review
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-foreground">Drive-Ready Diagnostic Pool</span>
                    <span className="text-[11px] text-muted-foreground block">Scored &ge; 70% on mock preparation assessments</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
                    {studentReadinessTrends.reduce((acc, t) => acc + (t.readyStudentCount ?? 0), 0)}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1 font-semibold border border-amber-500/20">
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Faculty Placement Directive */}
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-foreground flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div>
              <span className="font-bold text-primary">Faculty Operational Takeaway:</span>
              <p className="mt-0.5 text-muted-foreground text-[11px]">
                {(applicationFunnel.selected ?? 0) > 0
                  ? `Conversion momentum active with ${applicationFunnel.selected} confirmed placement offer(s). Focus on mock interviews for ${applicationFunnel.interview ?? 0} candidate(s) currently in final rounds.`
                  : (applicationFunnel.interview ?? 0) > 0
                    ? `High interview engagement: ${applicationFunnel.interview} candidate(s) are in active interview rounds. Ensure behavioral and technical preparation is completed.`
                    : `Drive preparation active: ${studentReadinessTrends.reduce((acc, t) => acc + (t.readyStudentCount ?? 0), 0)} student(s) meet diagnostic placement benchmarks across ${data?.activeOpportunities ?? 0} active drives.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Analytics View (Institutional Governance & Telemetry) ───────────

function AdminAnalyticsView({ data }: { data: AdminAnalyticsResponse }) {
  const activeUsersCount = data.systemOperations?.activeUsersCount ?? data.users.total;
  const activePercentage = Math.round((activeUsersCount / (data.users.total || 1)) * 100);
  const recentLogs = data.systemOperations?.recentAuditLogs ?? [];

  const deptBenchmarkData = (data.departmentBreakdown ?? []).map((d) => ({
    name: d.departmentCode,
    fullName: d.departmentName,
    placementRate:
      d.placementRate ??
      (d.studentCount > 0 && d.placedCount ? Math.round((d.placedCount / d.studentCount) * 100) : 0),
    averageScore: d.averageScore ?? 0,
    studentCount: d.studentCount,
    placedCount: d.placedCount ?? 0,
    readyCount: d.readyStudentCount ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top Institutional Governance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Registered Accounts</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">{data.users.total}</span>
          </div>
          <p className="text-xs text-muted-foreground/70 font-mono">
            {data.users.students} Students • {data.users.faculty} Faculty • {data.users.admins} Admins
          </p>
        </div>

        {/* Placement Success Rate */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Institutional Placement Rate</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {data.applications.placementRate}%
            </span>
            <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {data.applications.selectedCount} Placed
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">College-wide verified student selections</p>
        </div>

        {/* Campus Opportunities Managed */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Campus Opportunities</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-primary">{data.opportunities.total}</span>
            <span className="text-xs text-muted-foreground font-mono">
              ({data.opportunities.published} published)
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 font-mono">
            {data.opportunities.jobs} Jobs • {data.opportunities.internships} Internships
          </p>
        </div>

        {/* Communication Reach */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Notice Delivery & Reach</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
              {data.notificationDelivery.readRate}%
            </span>
            <span className="text-xs text-muted-foreground font-mono">read engagement</span>
          </div>
          <p className="text-xs text-muted-foreground/70 font-mono">
            {data.notificationDelivery.readCount} of {data.notificationDelivery.totalNotifications} notifications read
          </p>
        </div>
      </div>

      {/* Cross-Department Placement & Readiness Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Comparative Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Department Benchmark Comparison
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Side-by-side placement rate vs. technical readiness score (%)
              </p>
            </div>
            <Link
              to="/dashboard/admin"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Academic Config →
            </Link>
          </div>

          {deptBenchmarkData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-12 text-center">No academic departments registered.</p>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBenchmarkData} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262A36" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#262A36' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748B"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                  <Bar dataKey="placementRate" name="Placement Rate (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="averageScore" name="Avg Test Score (%)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Department Detailed Breakdown List */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Department Performance Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Headcounts, placed student conversion, and readiness metrics
              </p>
            </div>
            <span className="text-xs font-medium font-mono text-muted-foreground">
              {data.departmentBreakdown.length} Department{data.departmentBreakdown.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="divide-y divide-border">
            {data.departmentBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No academic departments registered.</p>
            ) : (
              data.departmentBreakdown.map((dept) => {
                const placementRate =
                  dept.placementRate ??
                  (dept.studentCount > 0 && dept.placedCount
                    ? Math.round((dept.placedCount / dept.studentCount) * 100)
                    : 0);
                const avgScore = dept.averageScore ?? 0;

                return (
                  <div key={dept.departmentId} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-10 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold font-mono text-primary border border-primary/20">
                          {dept.departmentCode}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{dept.departmentName}</h4>
                          <span className="text-xs text-muted-foreground font-mono">
                            {dept.studentCount} student{dept.studentCount === 1 ? '' : 's'} enrolled
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {dept.placedCount ?? 0} Placed ({placementRate}%)
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono block mt-0.5">
                          Avg Score: {avgScore}% • {dept.readyStudentCount ?? 0} Ready
                        </span>
                      </div>
                    </div>

                    {/* Mini visual conversion bar */}
                    <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, placementRate))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* System Operations & User Activity Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operations Telemetry Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> System Operations & Account Activity
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active account telemetry, communication reach, and platform metrics
              </p>
            </div>
            <Link
              to="/dashboard/admin"
              className="text-xs font-semibold text-primary hover:underline"
            >
              User Registry →
            </Link>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground tracking-normal">
                  Active User Accounts
                </span>
                <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  {activePercentage}% Active
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-foreground">{activeUsersCount}</span>
                <span className="text-xs text-muted-foreground font-mono">of {data.users.total} total registered accounts</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-foreground font-mono">
                <span className="rounded-md bg-card px-2 py-1 border border-border">
                  {data.users.students} Students
                </span>
                <span className="rounded-md bg-card px-2 py-1 border border-border">
                  {data.users.faculty} Faculty
                </span>
                <span className="rounded-md bg-card px-2 py-1 border border-border">
                  {data.users.admins} Admins
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                  Communication Reach
                </span>
                <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                  {data.notificationDelivery.totalNotifications}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono mt-0.5 block">
                  {data.notificationDelivery.readRate}% read confirmation rate
                </span>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                  Recorded Audit Logs
                </span>
                <span className="text-xl font-bold font-mono text-primary mt-1 block">
                  {data.systemOperations?.totalAuditLogs ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Immutable administrative actions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Administrative Audit Trail Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Administrative Audit Trail
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time log of security events and administrative actions
              </p>
            </div>
            <Link
              to="/dashboard/admin"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open Audit Viewer →
            </Link>
          </div>

          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">
                No administrative audit events recorded yet.
              </p>
            ) : (
              recentLogs.map((log) => {
                const formattedAction = log.action.replace(/\./g, ' › ').replace(/_/g, ' ');
                const formattedDate = new Date(log.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-muted/30 px-2 py-0.5 text-[11px] font-semibold font-mono text-foreground border border-border">
                          {formattedAction}
                        </span>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {log.entityType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        By <span className="font-medium text-foreground">{log.actorName || 'System Admin'}</span>
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                      {formattedDate}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Graduation Cohorts & Opportunities Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graduation Batches */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Graduation Cohorts & Batches
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Student cohort breakdown across active graduating classes
              </p>
            </div>
            <Link
              to="/dashboard/admin"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Academic Config →
            </Link>
          </div>

          <div className="divide-y divide-border">
            {data.batchBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No graduation batches registered.</p>
            ) : (
              data.batchBreakdown.map((batch) => (
                <div key={batch.batchId} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold font-mono text-xs border border-emerald-500/20">
                      {batch.graduationYear}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        Class of {batch.graduationYear}
                      </span>
                      <span className="text-xs text-muted-foreground block font-mono">Graduating cohort</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20">
                    {batch.studentCount} student{batch.studentCount === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Opportunities Portfolio Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Campus Drives Portfolio Lifecycle
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Institutional distribution of opportunities across stages and types
              </p>
            </div>
            <Link
              to="/dashboard/opportunities"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View Drives →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg border border-border bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                Published & Active
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">
                {data.opportunities.published}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Accepting student applications</span>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                In-Draft Pipeline
              </span>
              <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 block">
                {data.opportunities.draft}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Pending faculty publication</span>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                Full-Time Jobs
              </span>
              <span className="text-2xl font-bold font-mono text-primary mt-1 block">
                {data.opportunities.jobs}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Graduating career placements</span>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3.5">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-normal block">
                Internships
              </span>
              <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-1 block">
                {data.opportunities.internships}
              </span>
              <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Pre-graduation industry training</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Preparation & Platform Telemetry */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Platform Infrastructure & Telemetry
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold text-muted-foreground block">Assessment Question Banks</span>
            <span className="text-2xl font-bold font-mono text-foreground mt-1 block">{data.preparation.totalTests}</span>
            <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Configured assessment modules</span>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold text-muted-foreground block">Total Assessment Submissions</span>
            <span className="text-2xl font-bold font-mono text-primary mt-1 block">{data.preparation.totalAttempts}</span>
            <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Student test attempts recorded</span>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold text-muted-foreground block">AI Mock Interviews Conducted</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">{data.preparation.totalInterviews}</span>
            <span className="text-[11px] text-muted-foreground/70 mt-0.5 block">Technical & behavioral interview sessions</span>
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
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Placement & Performance Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStudent
              ? 'Track your career preparation metrics, application pipeline, and test performance'
              : isFaculty
                ? 'Department of Computer Science & Engineering • Campus recruitment pipeline, student readiness, and skill gap telemetry'
                : 'Institutional Governance • Academic programs distribution, graduation cohorts, and platform telemetry'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground text-sm">Loading analytics metrics…</div>
      ) : isStudent && studentData ? (
        <StudentAnalyticsView data={studentData} />
      ) : isFaculty && !isAdmin && facultyData ? (
        <FacultyAnalyticsView data={facultyData} />
      ) : isAdmin && adminData ? (
        <AdminAnalyticsView data={adminData} />
      ) : (
        <div className="p-8 text-center text-muted-foreground">No analytics data available.</div>
      )}
    </div>
  );
}
