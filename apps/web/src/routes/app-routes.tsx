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
import { Link, Navigate, Route, Routes } from 'react-router';

const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
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
import { GuestRoute } from '@/shared/components/GuestRoute';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { DashboardNotificationsFeed } from '@/features/engagement/components/DashboardNotificationsFeed';

import { useAuth } from '@/features/auth/use-auth';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  GraduationCap,
  Settings2,
  Sparkles,
} from 'lucide-react';

/** Minimal role-based Dashboard summary with deep-dive navigation */
function DashboardHome(): React.JSX.Element {
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const isFaculty = user?.roles?.includes('PLACEMENT_FACULTY');
  const isAdmin = user?.roles?.includes('ADMIN');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.fullName || 'User'} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isStudent
              ? 'Track your career preparation, roadmaps, and latest placement announcements.'
              : isFaculty
              ? 'Manage recruitment drives, review student readiness, and broadcast notices.'
              : 'Institutional overview, campus analytics, and administrative management.'}
          </p>
        </div>

        <Link
          to="/dashboard/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl border border-blue-200 transition-colors self-start sm:self-auto"
        >
          <BarChart3 className="h-4 w-4" /> View Full Analytics <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Quick Minimal KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Notice Board */}
        <Link
          to="/dashboard/notices"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Notice Board</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-bold text-slate-900">Campus Notices</p>
            <p className="text-xs text-slate-500 mt-1">Announcements, events & schedules</p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
            View Notice Board →
          </div>
        </Link>

        {/* Opportunities / Manage Drives */}
        <Link
          to={isAdmin || isFaculty ? '/dashboard/opportunities/manage' : '/dashboard/opportunities'}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Opportunities</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-bold text-slate-900">
              {isAdmin || isFaculty ? 'Manage Drives' : 'Jobs & Internships'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin || isFaculty ? 'Post and manage opportunities' : 'Explore roles matching your skills'}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
            {isAdmin || isFaculty ? 'Manage Opportunities →' : 'Explore Opportunities →'}
          </div>
        </Link>

        {/* Role-specific 3rd Card: Admin -> Programs, Faculty -> Career Catalog, Student -> Mock Tests */}
        <Link
          to={
            isAdmin
              ? '/dashboard/programs'
              : isFaculty
              ? '/dashboard/careers/manage'
              : '/dashboard/preparation'
          }
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isAdmin ? 'Academic Programs' : isFaculty ? 'Career Catalog' : 'Preparation'}
            </span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              {isAdmin ? (
                <GraduationCap className="h-5 w-5" />
              ) : isFaculty ? (
                <Settings2 className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-bold text-slate-900">
              {isAdmin
                ? 'Programs & Streams'
                : isFaculty
                ? 'Manage Career Tracks'
                : 'Mock Tests & Practice'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? 'Configure degree programs and specialization streams'
                : isFaculty
                ? 'Curate career paths, milestones & roadmaps'
                : 'Assessments and mock interviews'}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
            {isAdmin
              ? 'Manage Programs →'
              : isFaculty
              ? 'Manage Catalog →'
              : 'Start Practice →'}
          </div>
        </Link>

        {/* Roadmap / Cohort Analysis */}
        <Link
          to={isStudent ? '/dashboard/roadmap' : '/dashboard/analytics?view=cohort'}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isStudent ? 'Career Roadmap' : 'Cohort Analysis'}
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-bold text-slate-900">
              {isStudent ? 'Active Track' : 'Cohort Breakdown'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isStudent ? 'Track step-by-step milestones' : 'Batch breakdown, streams & readiness'}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
            {isStudent ? 'View Roadmap →' : 'View Cohort Breakdown →'}
          </div>
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
    <Suspense fallback={<div role="status" className="p-8 text-slate-500">Loading page…</div>}>
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

      {/* ── Root redirect ──────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />


      {/* ── 404 catch-all ──────────────────────────────────────────── */}
      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-slate-300">404</h1>
              <p className="mt-2 text-slate-500">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
    </Suspense>
  );
}
