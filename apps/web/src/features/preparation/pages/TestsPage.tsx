import type { RoleName } from '@career-portal/shared-types';
import {
  Award,
  BookOpen,
  Brain,
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  FileQuestion,
  Filter,
  Lock,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  useDeleteMockTest,
  useMockTests,
  useUpdateMockTest,
} from '../api/preparation-api';
import { FacultyInterviewTracksModal } from '../components/FacultyInterviewTracksModal';

import { useAuth } from '@/features/auth/use-auth';

const CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'quantitative_aptitude', label: 'Quantitative Aptitude' },
  { key: 'logical_reasoning', label: 'Logical Reasoning' },
  { key: 'verbal', label: 'Verbal Ability' },
  { key: 'technical', label: 'Technical MCQ' },
  { key: 'programming', label: 'Programming' },
  { key: 'sql', label: 'SQL & Database' },
  { key: 'role_specific', label: 'Role Specific' },
];

export function TestsPage(): React.JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isTracksModalOpen, setIsTracksModalOpen] = useState(false);

  const isStaff = user?.roles.some((r: RoleName) => r === 'PLACEMENT_FACULTY' || r === 'ADMIN');

  const { data, isLoading } = useMockTests({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery ? searchQuery : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  const updateMutation = useUpdateMockTest();
  const deleteMutation = useDeleteMockTest();

  const tests = data?.data ?? [];

  const handleToggleStatus = (testId: string, currentActive: boolean) => {
    updateMutation.mutate({
      id: testId,
      data: {
        isActive: !currentActive,
      },
    });
  };

  const handleDeleteTest = (testId: string, testTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${testTitle}" entirely?\n\nThis will permanently delete the test, all sections, questions, answer keys, and student attempts. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(testId);
    deleteMutation.mutate(testId, {
      onSettled: () => { setDeletingId(null); },
    });
  };

  return (
    <div className="space-y-8">
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Placement Tests & Mock Practice
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Test your readiness across quantitative aptitude, logical reasoning, core computer science, and role-specific assessments with timed evaluations and instant server-graded performance analytics.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isStaff ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/dashboard/preparation/tests/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-450 hover:shadow-indigo-500/40 transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Mock Test</span>
                </Link>
                <button
                  type="button"
                  onClick={() => { setIsTracksModalOpen(true); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm border border-white/10 transition-all shadow-sm"
                >
                  <Briefcase className="h-4 w-4 text-indigo-300" />
                  <span>Manage Interview Tracks</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/dashboard/preparation/interviews"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm border border-white/10 transition-all"
                >
                  <Brain className="h-4 w-4 text-indigo-300" />
                  <span>Mock Interviews</span>
                </Link>
                <Link
                  to="/dashboard/preparation/analytics"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm border border-white/10 transition-all"
                >
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                  <span>Performance Analytics</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters & Category Bar ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests by title or topic..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setSelectedStatus('all'); }}
                className={`rounded-lg px-3 py-1.5 transition ${
                  selectedStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setSelectedStatus('active'); }}
                className={`rounded-lg px-3 py-1.5 transition ${
                  selectedStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => { setSelectedStatus('closed'); }}
                className={`rounded-lg px-3 py-1.5 transition ${
                  selectedStatus === 'closed'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Closed
              </button>
            </div>

            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Showing {tests.length} tests</span>
            </div>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { setSelectedCategory(cat.key); }}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tests Grid ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-4"
            >
              <div className="h-5 w-24 bg-slate-200 rounded-md" />
              <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
              <div className="h-16 w-full bg-slate-100 rounded-md" />
              <div className="h-8 w-full bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">No mock tests found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery
              ? 'Try modifying your search criteria or selecting a different category.'
              : 'New placement practice tests will be published soon by faculty.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const isClosed = !test.isActive;

            return (
              <div
                key={test.id}
                className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 overflow-hidden ${
                  !isClosed
                    ? 'border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-200'
                    : 'border-slate-200/80 bg-gradient-to-br from-white/95 via-slate-50/70 to-slate-100/50 backdrop-blur-md p-6 shadow-xs'
                }`}
              >
                {/* Glass Mirror Specular Reflection Effect for Closed Tests */}
                {isClosed ? (
                  <>
                    <div className="pointer-events-none absolute -inset-full top-0 block -rotate-45 transform bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60" />
                    <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-slate-300/20 blur-xl" />
                  </>
                ) : null}

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        isClosed ? 'bg-slate-200/70 text-slate-700' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {test.category.replace('_', ' ')}
                    </span>
                    {test.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 backdrop-blur-sm shadow-2xs">
                        <Lock className="h-3 w-3 text-amber-600" />
                        <span>Closed</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3
                      className={`text-lg font-bold transition-colors ${
                        isClosed ? 'text-slate-800' : 'text-slate-900 group-hover:text-indigo-600'
                      }`}
                    >
                      {test.title}
                    </h3>
                    {test.description ? (
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {test.description}
                      </p>
                    ) : null}
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{test.durationMinutes} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-slate-400" />
                      <span>{test.totalMarks} Marks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Pass: {test.passingMarks}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileQuestion className="h-3.5 w-3.5 text-slate-400" />
                      <span>{test.questionsCount} Questions</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 relative z-10">
                  <div className="flex items-center gap-2">
                    {!isStaff ? (
                      test.isActive ? (
                        <button
                          type="button"
                          onClick={() => { void navigate(`/dashboard/preparation/tests/${test.id}/take`); }}
                          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                        >
                          Start Test
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100/90 border border-slate-200/90 py-2.5 text-center text-xs font-semibold text-slate-500 backdrop-blur-sm shadow-inner cursor-not-allowed select-none">
                            <Lock className="h-3.5 w-3.5 text-slate-400" />
                            <span>Access Closed</span>
                          </div>
                          <p className="text-[11px] text-center text-slate-400 font-medium">
                            Closed by faculty • Not accepting attempts
                          </p>
                        </div>
                      )
                    ) : (
                      <Link
                        to={`/dashboard/preparation/tests/${test.id}/edit`}
                        className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Manage & Edit Test
                      </Link>
                    )}
                  </div>

                  {/* Faculty Quick Controls: Status Toggle & Delete Option */}
                  {isStaff ? (
                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => { handleToggleStatus(test.id, test.isActive); }}
                        disabled={updateMutation.isPending}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition ${
                          test.isActive
                            ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                            : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                        title={test.isActive ? 'Hide from students' : 'Make visible to students'}
                      >
                        {test.isActive ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Close Test</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Set Active</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => { handleDeleteTest(test.id, test.title); }}
                        disabled={deleteMutation.isPending && deletingId === test.id}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                        title="Delete this test entirely"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Faculty Interview Tracks Management Modal */}
      <FacultyInterviewTracksModal
        isOpen={isTracksModalOpen}
        onClose={() => { setIsTracksModalOpen(false); }}
      />
    </div>
  );
}
