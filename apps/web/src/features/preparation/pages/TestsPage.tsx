import type { RoleName } from '@career-portal/shared-types';
import {
  Award,
  BookOpen,
  Brain,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
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
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  SkeletonCard,
  StatusBadge,
} from '@/shared/components/ui';

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
  const [testToDelete, setTestToDelete] = useState<{ id: string; title: string } | null>(null);
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

  const handleConfirmDelete = () => {
    if (!testToDelete) return;
    deleteMutation.mutate(testToDelete.id, {
      onSettled: () => {
        setTestToDelete(null);
      },
    });
  };

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* ── Academic Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Assessments & Mock Practice
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Timed university placement assessments, technical evaluations, and scored benchmarks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isStaff ? (
            <>
              <Link to="/dashboard/preparation/tests/new">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  <span>Create Assessment</span>
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setIsTracksModalOpen(true); }}
              >
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>Interview Tracks</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/dashboard/preparation/interviews">
                <Button variant="outline" size="sm">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span>Mock Interviews</span>
                </Button>
              </Link>
              <Link to="/dashboard/preparation/analytics">
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>Performance Analytics</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Filters & Category Bar ───────────────────────────────────────── */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search assessments by title or topic..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented Status Filter */}
            <div className="inline-flex items-center rounded-lg bg-muted/40 p-1 border border-border/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setSelectedStatus('all'); }}
                className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setSelectedStatus('active'); }}
                className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                  selectedStatus === 'active'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => { setSelectedStatus('closed'); }}
                className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                  selectedStatus === 'closed'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Closed
              </button>
            </div>

            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              <span>{tests.length} tests</span>
            </span>
          </div>
        </div>

        {/* Categories Taxonomy Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { setSelectedCategory(cat.key); }}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-card text-muted-foreground border border-border/70 hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Assessments Grid ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No assessments found"
          description={
            searchQuery
              ? 'Try modifying your search criteria or selecting a different category.'
              : 'New placement practice assessments will be published soon by faculty.'
          }
          {...(searchQuery || selectedCategory !== 'all'
            ? {
                action: {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  },
                },
              }
            : {})}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {tests.map((test) => {
            const isClosed = !test.isActive;

            return (
              <Card
                key={test.id}
                className={`group flex flex-col justify-between p-5 border-border/80 transition-colors duration-150 hover:border-primary/40 ${
                  isClosed ? 'opacity-75 bg-muted/10' : 'bg-card'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground capitalize">
                      {test.category.replace('_', ' ')}
                    </span>
                    <StatusBadge status={test.isActive ? 'active' : 'closed'} />
                  </div>

                  <div>
                    <h3
                      title={test.title}
                      className={`text-base font-semibold transition-colors line-clamp-1 ${
                        isClosed ? 'text-muted-foreground' : 'text-card-foreground group-hover:text-primary'
                      }`}
                    >
                      {test.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                      {test.description || 'Standard university placement practice assessment.'}
                    </p>
                  </div>

                  {/* Structured Dossier Telemetry Box */}
                  <div className="rounded-lg bg-muted/30 border border-border/50 p-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-mono text-foreground font-semibold tabular-nums">{test.durationMinutes}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">mins</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-mono text-foreground font-semibold tabular-nums">{test.totalMarks}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">marks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-[11px] text-muted-foreground mr-1">Pass:</span>
                        <span className="font-mono text-foreground font-semibold tabular-nums">{test.passingMarks}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-mono text-foreground font-semibold tabular-nums">{test.questionsCount}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">questions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3.5 border-t border-border/60 space-y-2">
                  <div className="flex items-center gap-2">
                    {!isStaff ? (
                      test.isActive ? (
                        <Button
                          className="w-full text-xs h-9"
                          onClick={() => { void navigate(`/dashboard/preparation/tests/${test.id}/take`); }}
                        >
                          Start Assessment
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/40 border border-border/60 py-2 w-full text-center text-xs font-medium text-muted-foreground select-none">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Assessment Closed</span>
                        </div>
                      )
                    ) : (
                      <Link to={`/dashboard/preparation/tests/${test.id}/edit`} className="w-full">
                        <Button variant="outline" className="w-full text-xs h-9">
                          Manage Assessment
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Faculty Quick Controls */}
                  {isStaff ? (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => { handleToggleStatus(test.id, test.isActive); }}
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {test.isActive ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Close</span>
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
                        onClick={() => { setTestToDelete({ id: test.id, title: test.title }); }}
                        disabled={deleteMutation.isPending && deleteMutation.variables === test.id}
                        className="inline-flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(testToDelete)}
        onOpenChange={(open) => {
          if (!open) setTestToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &quot;{testToDelete?.title}&quot;?
              This will remove all questions, sections, answer keys, and student attempts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setTestToDelete(null); }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteMutation.isPending}
            >
              Delete Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Faculty Interview Tracks Management Modal */}
      <FacultyInterviewTracksModal
        isOpen={isTracksModalOpen}
        onClose={() => { setIsTracksModalOpen(false); }}
      />
    </div>
  );
}
