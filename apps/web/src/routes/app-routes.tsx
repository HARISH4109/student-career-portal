import { lazy, Suspense } from 'react';
const CareerPathsPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.CareerPathsPage })));
const CareerDetailPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.CareerDetailPage })));
const RoadmapPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.RoadmapPage })));
const ResourcesPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.ResourcesPage })));
const SkillGapPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.SkillGapPage })));
const CareerManagePage = lazy(() => import('@/features/career/CareerManagePage').then((m) => ({ default: m.CareerManagePage })));
const NoticesPage = lazy(() => import('@/features/engagement/pages/NoticesPage').then((m) => ({ default: m.NoticesPage })));
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ProgramsManagePage = lazy(() => import('@/features/academic/pages/ProgramsManagePage').then((m) => ({ default: m.ProgramsManagePage })));
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
import { Link, Route, Routes } from 'react-router';

import { AuthLandingPage } from '@/features/auth/pages/AuthLandingPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const ManageOpportunitiesPage = lazy(() => import('@/features/opportunities/pages/ManageOpportunitiesPage').then((module) => ({ default: module.ManageOpportunitiesPage })));
const DraftReviewPage = lazy(() => import('@/features/opportunities/pages/DraftReviewPage').then((module) => ({ default: module.DraftReviewPage })));
const MyApplicationsPage = lazy(() => import('@/features/opportunities/pages/MyApplicationsPage').then((module) => ({ default: module.MyApplicationsPage })));
const OpportunitiesPage = lazy(() => import('@/features/opportunities/pages/OpportunitiesPage').then((module) => ({ default: module.OpportunitiesPage })));
const OpportunityDetailPage = lazy(() => import('@/features/opportunities/pages/OpportunityDetailPage').then((module) => ({ default: module.OpportunityDetailPage })));
const ResumeBuilderPage = lazy(() => import('@/features/resume/pages/ResumeBuilderPage').then((module) => ({ default: module.ResumeBuilderPage })));
const ResumeListPage = lazy(() => import('@/features/resume/pages/ResumeListPage').then((module) => ({ default: module.ResumeListPage })));
const ProfilePage = lazy(() => import('@/features/student/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const TestsPage = lazy(() => import('@/features/preparation/pages/TestsPage').then((module) => ({ default: module.TestsPage })));
const TestTakingPage = lazy(() => import('@/features/preparation/pages/TestTakingPage').then((module) => ({ default: module.TestTakingPage })));
const TestResultPage = lazy(() => import('@/features/preparation/pages/TestResultPage').then((module) => ({ default: module.TestResultPage })));
const TestAuthoringPage = lazy(() => import('@/features/preparation/pages/TestAuthoringPage').then((module) => ({ default: module.TestAuthoringPage })));
const MockInterviewsPage = lazy(() => import('@/features/preparation/pages/MockInterviewsPage').then((module) => ({ default: module.MockInterviewsPage })));
const PreparationAnalyticsPage = lazy(() => import('@/features/preparation/pages/PreparationAnalyticsPage').then((module) => ({ default: module.PreparationAnalyticsPage })));
import { DashboardShell } from '@/shared/components/DashboardShell';
import { DashboardRoleStickAnimation } from '@/shared/components/RoleStickAnimations';
import { GuestRoute } from '@/shared/components/GuestRoute';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { DashboardNotificationsFeed } from '@/features/engagement/components/DashboardNotificationsFeed';
import { AnimatedCounter, Button, Card, SkeletonCard } from '@/shared/components/ui';

import { useAuth } from '@/features/auth/use-auth';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  GraduationCap,
  Laptop,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

/** Quiet Slate Bento Grid Dashboard with Swiss Typographic Grid & placement metrics */
function DashboardHome(): React.JSX.Element {
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const isFaculty = user?.roles?.includes('PLACEMENT_FACULTY');
  const isAdmin = user?.roles?.includes('ADMIN');

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-8">
      {/* ── Top Row: Welcome Banner (Full Width Executive Oxford Banner) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7 text-foreground shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-8">
        <div className="relative z-10 md:w-[340px] lg:w-[400px] xl:w-[440px] shrink-0">
          {/* Eyebrow Pill: Only for Student (Removed for Faculty & Admin) */}
          {isStudent && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-border px-3 py-0.5 text-xs font-medium text-foreground mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Academic Year 2025–2026
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isStudent ? 'Student Career Dashboard' : isFaculty ? 'Faculty Placement Console' : 'Administration Dashboard'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {isStudent
              ? 'Track your placement readiness, active recruitment drives, and interview preparation.'
              : isFaculty
                ? 'Manage recruitment drives, review student readiness pipelines, and broadcast notices.'
                : 'Campus-wide placement metrics, department breakdowns, and administrative governance.'}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              <Link to={isFaculty ? '/dashboard/opportunities/manage' : isAdmin ? '/dashboard/admin' : '/dashboard/opportunities'}>
                {isFaculty ? 'Manage Drives' : isAdmin ? 'Admin Console' : 'Explore Opportunities'} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 border-border bg-card hover:bg-accent/40 text-foreground shadow-xs">
              <Link to="/dashboard/analytics">
                <BarChart3 className="h-4 w-4 text-accent" /> Analytics
              </Link>
            </Button>
          </div>
        </div>

        {/* Role-Specific Actionable Workflow & Stick Animation Stage */}
        <div className="hidden sm:flex flex-1 min-w-0 justify-end">
          <DashboardRoleStickAnimation
            role={isAdmin ? 'ADMIN' : isFaculty ? 'PLACEMENT_FACULTY' : 'STUDENT'}
            className="w-full max-w-[760px]"
          />
        </div>
      </div>

      {/* ── Middle Row: 3-Column Operations Section (Tailored to Role) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Deadline Events (Urgent Closing Windows) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-foreground">Deadline Events</h3>
              </div>
              <Link to={isStudent ? '/dashboard/applications' : '/dashboard/opportunities/manage'} className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">TechCorp SDE Drive</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      Closing in 18 hours
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  Cutoff
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Aptitude Assessment</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      Nov 12, 11:59 PM
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Window
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Minimal Role-Specific Content */}
        {isStudent ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">Recommended for You</h3>
                </div>
                <Link to="/dashboard/roadmap" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground leading-snug">
                      Data Science Career Roadmap 2026
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      Learn the skills, explore the path
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium py-1.5 shadow-xs">
                  <Link to="/dashboard/roadmap">
                    Explore Roadmap
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : isFaculty ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Pending Drive Actions</h3>
                </div>
                <Link to="/dashboard/opportunities/manage" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                  Action Queue <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">2</span>
                    <span className="text-xs font-semibold text-foreground">Draft drives awaiting publish</span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">Review</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-600 font-mono">4</span>
                    <span className="text-xs font-semibold text-foreground">Eligibility criteria approvals</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600">Pending</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Platform Telemetry</h3>
                </div>
                <Link to="/dashboard/admin" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                  System Health <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs font-semibold text-foreground">AI Job Queue Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> 0 Pending
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs font-semibold text-foreground">DB Connection Pool</span>
                  <span className="text-xs font-mono font-semibold text-primary">12ms avg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Column 3: Minimal Role-Specific Operational Detail (Replaces Latest Notices) */}
        {isStudent ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Next Career Milestone</h3>
                </div>
                <Link to="/dashboard/resumes" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                  Optimize <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">ATS Resume Check</span>
                    <span className="text-[11px] font-mono font-bold text-primary">Action Required</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Run ATS keyword scanner to unlock 12 new campus job matches.</p>
                </div>
              </div>
            </div>
          </div>
        ) : isFaculty ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">AI Opportunity Extraction</h3>
                </div>
                <Link to="/dashboard/opportunities/drafts" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                  Drafts Queue <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">3</span>
                    <span className="text-xs font-semibold text-foreground">AI brochure drafts pending review</span>
                  </div>
                  <Link to="/dashboard/opportunities/drafts" className="text-[11px] font-semibold text-primary hover:underline">Verify</Link>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-600 font-mono">100%</span>
                    <span className="text-xs font-semibold text-foreground">Prerequisite extraction accuracy</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Governance Queue</h3>
                </div>
                <Link to="/dashboard/admin" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                  Audit Logs <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs font-semibold text-foreground">Graduation Batch Rollover</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">Configured</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs font-semibold text-foreground">Security Audit Compliance</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">100% Pass</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Asymmetric Quiet Slate Bento Grid (Swiss Informational Density) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Bento Hero Cell 1: Placement Readiness Gauge / Institutional Overview (Span 2) */}
        <div className="md:col-span-2">
          <Card className="h-full border-border bg-card p-6 sm:p-8">
            {isStudent ? (
              <div className="flex flex-col justify-between h-full gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span>Placement Readiness Score</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Placement Readiness Benchmark</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Cohort readiness index calculated from diagnostic benchmarks</p>
                  </div>

                  <div className="flex items-center gap-4 bg-muted/40 border border-border rounded-xl px-5 py-3 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary font-mono tabular-nums tracking-tight">
                        <AnimatedCounter value={88} suffix="%" />
                      </div>
                      <div className="text-xs text-muted-foreground">Overall Index</div>
                    </div>
                    <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span className="text-xs font-normal">ATS Resume</span>
                      <span className="font-mono tabular-nums text-emerald-500 font-medium">
                        <AnimatedCounter value={92} suffix="%" />
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span className="text-xs font-normal">Mock Tests</span>
                      <span className="font-mono tabular-nums text-primary font-medium">
                        <AnimatedCounter value={85} suffix="%" />
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span className="text-xs font-normal">Skill Alignment</span>
                      <span className="font-mono tabular-nums text-emerald-500 font-medium">
                        <AnimatedCounter value={87} suffix="%" />
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '87%' }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Eligible for 42 active campus recruitment drives
                  </span>
                  <Link to="/dashboard/skill-gap" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                    Analyze Gaps →
                  </Link>
                </div>
              </div>
            ) : isFaculty ? (
              /* Faculty Academic Curriculum & Assessment Verification Hub */
              <div className="flex flex-col justify-between h-full gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                    <GraduationCap className="h-4 w-4" />
                    <span>Academic Curriculum & Verification</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Curriculum & Assessment Moderation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage degree programs, question authoring rubrics, and specialization milestones</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link to="/dashboard/programs" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-foreground font-mono tabular-nums group-hover:text-primary transition-colors">
                      <AnimatedCounter value={4} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Degree Programs</div>
                  </Link>
                  <Link to="/dashboard/careers/manage" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums group-hover:text-emerald-500 transition-colors">
                      <AnimatedCounter value={6} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Career Tracks</div>
                  </Link>
                  <Link to="/dashboard/preparation" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-primary font-mono tabular-nums group-hover:text-primary transition-colors">
                      <AnimatedCounter value={24} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Authored Tests</div>
                  </Link>
                  <Link to="/dashboard/opportunities/drafts" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-foreground font-mono tabular-nums group-hover:text-primary transition-colors">
                      <AnimatedCounter value={8} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Pending AI Drafts</div>
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span>Department curriculum: All technical rubrics aligned with 2026 cohort standards</span>
                  <Link to="/dashboard/programs" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                    Configure Programs →
                  </Link>
                </div>
              </div>
            ) : (
              /* Admin Platform Governance & System Infrastructure Control */
              <div className="flex flex-col justify-between h-full gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Platform Governance & Infrastructure</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">System Governance & Infrastructure Telemetry</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Role-based access control, background AI workers, service health, and audit logs</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link to="/dashboard/admin" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
                      99.98%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Service Uptime</div>
                  </Link>
                  <Link to="/dashboard/admin" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-primary font-mono tabular-nums">
                      4 Roles
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">RBAC Enforced</div>
                  </Link>
                  <Link to="/dashboard/admin" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                      0 Failures
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">AI Job Queue</div>
                  </Link>
                  <Link to="/dashboard/admin" className="rounded-lg border border-border bg-muted/20 p-4 text-center hover:border-primary/40 transition-colors group">
                    <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
                      100%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Audit Verified</div>
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span>Security telemetry: Database connection pool & background microservices operational</span>
                  <Link to="/dashboard/admin" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                    Open Admin Console →
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Bento Cell 2: Notice Board (1x1) */}
        <Link to="/dashboard/notices" className="group block h-full">
          <Card className="h-full border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground">Notice Board</span>
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Bell className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Campus Notices</h3>
              <p className="text-xs text-muted-foreground mt-1">Real-time drive schedules, interview slots & institutional alerts</p>
            </div>
            <div className="pt-4 text-xs font-medium text-primary inline-flex items-center gap-1">
              View Notice Board →
            </div>
          </Card>
        </Link>

        {/* Bento Cell 3: Opportunities / Manage Drives */}
        <Link
          to={isAdmin || isFaculty ? '/dashboard/opportunities/manage' : '/dashboard/opportunities'}
          className="group block h-full"
        >
          <Card className="h-full border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground">Opportunities</span>
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {isAdmin || isFaculty ? 'Manage Drives' : 'Jobs & Internships'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin || isFaculty ? 'Publish and manage campus recruitment drives' : 'Explore tier-1 roles matching your technical profile'}
              </p>
            </div>
            <div className="pt-4 text-xs font-medium text-primary inline-flex items-center gap-1">
              {isAdmin || isFaculty ? 'Manage Opportunities →' : 'Explore Opportunities →'}
            </div>
          </Card>
        </Link>

        {/* Bento Cell 4: Preparation Arena / Academic Catalog */}
        <Link
          to={
            isAdmin
              ? '/dashboard/programs'
              : isFaculty
                ? '/dashboard/careers/manage'
                : '/dashboard/preparation'
          }
          className="group block h-full"
        >
          <Card className="h-full border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground">
                  {isAdmin ? 'Academic Programs' : isFaculty ? 'Career Catalog' : 'Preparation Arena'}
                </span>
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {isAdmin ? (
                    <GraduationCap className="h-4 w-4" />
                  ) : isFaculty ? (
                    <Settings2 className="h-4 w-4" />
                  ) : (
                    <BookOpen className="h-4 w-4" />
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {isAdmin
                  ? 'Programs & Streams'
                  : isFaculty
                    ? 'Manage Career Tracks'
                    : 'Mock Tests & Practice'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin
                  ? 'Configure degree programs and specialization streams'
                  : isFaculty
                    ? 'Curate career paths, milestones & roadmaps'
                    : 'Timed coding assessments and AI mock interviews'}
              </p>
            </div>
            <div className="pt-4 text-xs font-medium text-primary inline-flex items-center gap-1">
              {isAdmin ? 'Manage Programs →' : isFaculty ? 'Manage Catalog →' : 'Start Practice →'}
            </div>
          </Card>
        </Link>

        {/* Bento Cell 5: Career Roadmap / Cohort Breakdown */}
        <Link
          to={isStudent ? '/dashboard/roadmap' : '/dashboard/analytics?view=cohort'}
          className="group block h-full"
        >
          <Card className="h-full border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground">
                  {isStudent ? 'Career Roadmap' : 'Cohort Analysis'}
                </span>
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {isStudent ? 'Active Track' : 'Cohort Breakdown'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isStudent ? 'Step-by-step milestone progression for target role' : 'Departmental readiness and student status analytics'}
              </p>
            </div>
            <div className="pt-4 text-xs font-medium text-primary inline-flex items-center gap-1">
              {isStudent ? 'View Roadmap →' : 'View Cohort Breakdown →'}
            </div>
          </Card>
        </Link>
      </div>

      {/* Embedded Live Notifications & Announcements Feed */}
      <DashboardNotificationsFeed />
    </div>
  );
}

/**
 * Application route table. Auth pages wrapped in GuestRoute (redirect if
 * already authenticated). Dashboard and feature pages wrapped in ProtectedRoute.
 */
export function AppRoutes(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-8 space-y-4">
          <SkeletonCard />
        </div>
      }
    >
      <Routes>
        {/* ── Guest Routes (redirect to dashboard if authenticated) ──── */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── Protected Routes (require authentication) ──────────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="careers" element={<ProtectedRoute requiredPermission="resources.view"><CareerPathsPage /></ProtectedRoute>} />
          <Route path="careers/manage" element={<ProtectedRoute requiredPermission="career_paths.manage"><CareerManagePage /></ProtectedRoute>} />
          <Route path="careers/:id" element={<ProtectedRoute requiredPermission="resources.view"><CareerDetailPage /></ProtectedRoute>} />
          <Route path="roadmap" element={<ProtectedRoute requiredPermission="roadmaps.manage_own"><RoadmapPage /></ProtectedRoute>} />
          <Route path="resources" element={<ProtectedRoute requiredPermission="resources.view"><ResourcesPage /></ProtectedRoute>} />
          <Route path="skill-gap" element={<ProtectedRoute requiredPermission="skill_gap.analyze_own"><SkillGapPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="resumes" element={<ResumeListPage />} />
          <Route path="resumes/new" element={<ResumeBuilderPage />} />
          <Route path="resumes/:id/edit" element={<ResumeBuilderPage />} />

          {/* Phase 3: Opportunities & Applications */}
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/manage" element={<ProtectedRoute requiredPermission="opportunities.create"><ManageOpportunitiesPage /></ProtectedRoute>} />
          <Route path="opportunities/drafts/:id/review" element={<ProtectedRoute requiredPermission="opportunities.create"><DraftReviewPage /></ProtectedRoute>} />
          <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="applications" element={<MyApplicationsPage />} />

          {/* Preparation & Mock Practice */}
          <Route path="preparation" element={<TestsPage />} />
          <Route path="preparation/tests/:id/take" element={<ProtectedRoute requiredPermission="mock_tests.attempt"><TestTakingPage /></ProtectedRoute>} />
          <Route path="preparation/attempts/:id/result" element={<TestResultPage />} />
          <Route path="preparation/tests/new" element={<ProtectedRoute requiredPermission="mock_tests.manage"><TestAuthoringPage /></ProtectedRoute>} />
          <Route path="preparation/tests/:id/edit" element={<ProtectedRoute requiredPermission="mock_tests.manage"><TestAuthoringPage /></ProtectedRoute>} />
          <Route path="preparation/interviews" element={<ProtectedRoute requiredRole="STUDENT"><MockInterviewsPage /></ProtectedRoute>} />
          <Route path="preparation/analytics" element={<ProtectedRoute requiredRole="STUDENT"><PreparationAnalyticsPage /></ProtectedRoute>} />

          {/* Phase 7: Notice Board, Analytics & Academic Programs */}
          <Route path="notices" element={<ProtectedRoute requiredPermission="notices.view"><NoticesPage /></ProtectedRoute>} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="programs" element={<ProtectedRoute requiredRole="ADMIN"><ProgramsManagePage /></ProtectedRoute>} />

          {/* Phase 8: Administration, Audit, Security & Governance */}
          <Route path="admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminDashboardPage /></ProtectedRoute>} />
        </Route>

        {/* ── Root Landing / Guest Experience ───────────────────────── */}
        <Route
          path="/"
          element={
            <GuestRoute>
              <AuthLandingPage />
            </GuestRoute>
          }
        />


        {/* ── 404 catch-all ──────────────────────────────────────────── */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="text-center">
                <h1 className="text-6xl font-bold font-mono text-muted-foreground/30">404</h1>
                <p className="mt-2 text-sm text-muted-foreground">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
