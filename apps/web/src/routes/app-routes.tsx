import { lazy, Suspense } from 'react';
const CareerPathsPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.CareerPathsPage })));
const CareerDetailPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.CareerDetailPage })));
const RoadmapPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.RoadmapPage })));
const ResourcesPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.ResourcesPage })));
const SkillGapPage = lazy(() => import('@/features/career/CareerPages').then((m) => ({ default: m.SkillGapPage })));
const CareerManagePage = lazy(() => import('@/features/career/CareerManagePage').then((m) => ({ default: m.CareerManagePage })));
import { Navigate, Route, Routes } from 'react-router';

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

/** Dashboard home; broader aggregate analytics are a separate milestone. */
function DashboardHome(): React.JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-500">
        Welcome to the Career Portal. Explore careers, build your roadmap, and prepare for your next opportunity.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Opportunities', value: '—', color: 'bg-blue-50 text-blue-700' },
          { label: 'Applications', value: '—', color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Upcoming Events', value: '—', color: 'bg-amber-50 text-amber-700' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color} inline-flex rounded-lg px-2 py-1`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
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
