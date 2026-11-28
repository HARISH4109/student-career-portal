import { useState } from 'react';
import { useAuth } from '@/features/auth/use-auth';
import { safeHref } from '@/shared/lib/safe-url';
import {
  ArrowLeft,
  Settings2,
  ArrowUpRight,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  Layers3,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  RESOURCE_TYPES,
  type CareerPathDto,
  type LearningResourceDto,
  type ResourceStatus,
  type RoadmapDto,
  type SkillGapDto,
} from '@career-portal/shared-types';
import { useCareerAction, useCareerData, useCareerOptions, useDebouncedValue } from './career-api';
import {
  Frame,
  Field,
  ErrorMessage,
  Paging,
  LoadingState,
  EmptyState,
  input,
  button,
  secondaryButton,
  card,
  prettyLabel,
} from './components/CareerLayout';

export function CareerPathsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const query = useCareerData<CareerPathDto[]>(
    `career-paths?search=${encodeURIComponent(debouncedSearch)}&page=${String(page)}`,
  );

  return (
    <Frame title="Find your career direction">
      {/* ── Intro Strip ── */}
      <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
        Choose a goal and turn it into skills, projects, and practical next steps.
      </p>

      {/* ── Search Bar ── */}
      <div className="relative max-w-xl">
        <Field label="Search careers">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className={`${input} pl-10`}
              placeholder="Filter by role (e.g. Frontend Developer, Data Scientist)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </Field>
      </div>

      <ErrorMessage error={query.error} />
      {query.isLoading && <LoadingState label="Loading career paths…" />}

      {/* ── Career Cards Grid ── */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.data.map((path) => (
          <article
            className={`${card} group flex flex-col justify-between transition-colors duration-150 hover:border-primary/40`}
            key={path.id}
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-primary group-hover:scale-105 transition-transform">
                  <Code2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border font-mono">
                  Career path
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {path.title}
              </h2>
              <p className="my-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {path.description}
              </p>
            </div>

            <div className="pt-4 border-t border-border mt-4 space-y-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Layers3 className="h-4 w-4 text-primary" />
                <span className="font-mono tabular-nums">{path.stages.filter((stage) => stage.isActive).length}</span> learning stages
              </p>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                to={`/dashboard/careers/${path.id}`}
              >
                <span>Explore path</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {query.data?.data.length === 0 && (
        <EmptyState
          title="No careers found"
          description="Try another search or ask your placement faculty to publish a path."
        />
      )}
      <Paging page={page} total={query.data?.meta?.totalPages ?? 1} setPage={setPage} />
    </Frame>
  );
}

export function CareerDetailPage() {
  const { id = '' } = useParams();
  const query = useCareerData<CareerPathDto>(`career-paths/${id}`);
  const start = useCareerAction<RoadmapDto>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const isStaff = user?.roles?.some((r: string) => r === 'ADMIN' || r === 'PLACEMENT_FACULTY');
  const canManage = user?.permissions?.includes('career_paths.manage');
  const own = isStudent && user?.permissions?.includes('roadmaps.manage_own');
  const skills = useCareerData<Array<{ id: string; name: string }>>('skills');

  return (
    <Frame title={query.data?.data.title ?? 'Career path'}>
      <Link
        to="/dashboard/careers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Career Paths</span>
      </Link>

      <ErrorMessage error={query.error ?? start.error} />
      {query.isLoading && <LoadingState label="Loading path…" />}

      {query.data && (
        <>
          {/* ── Path Overview Card ── */}
          <div className={`${card} space-y-4 bg-card border-border`}>
            <p className="text-base text-foreground/90 leading-relaxed max-w-3xl">
              {query.data.data.description}
            </p>

            {own && (
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-sm text-muted-foreground">
                  Starting this goal archives your previous active roadmap and keeps its progress.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={button}
                    disabled={start.isPending}
                    onClick={() => {
                      start.mutate(
                        { path: 'roadmaps', body: { careerPathId: id } },
                        {
                          onSuccess: () => {
                            void navigate('/dashboard/roadmap');
                          },
                        },
                      );
                    }}
                  >
                    <Compass className="h-4 w-4" />
                    <span>{start.isPending ? 'Starting…' : 'Start this roadmap'}</span>
                  </button>
                  <Link
                    className="inline-flex items-center gap-1.5 ml-4 font-semibold text-primary hover:underline transition text-sm"
                    to={`/dashboard/skill-gap?careerPathId=${id}`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze my skills</span>
                  </Link>
                </div>
              </div>
            )}

            {isStaff && (
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground font-mono">Curriculum Preview</span>
                {canManage && (
                  <Link
                    to="/dashboard/careers/manage"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span>Manage in Career Catalog</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Stages Curriculum Timeline ── */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-primary" />
              <span>Curriculum & Milestones</span>
            </h3>

            <ol className="space-y-4">
              {query.data.data.stages
                .filter((s) => s.isActive)
                .map((stage, i) => (
                  <li key={i} className={`${card} border-l-4 border-l-primary space-y-3`}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-foreground">
                        {i + 1}. {stage.title}
                      </h2>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20 font-mono">
                        Stage {i + 1}
                      </span>
                    </div>

                    <p className="my-2 text-muted-foreground leading-relaxed text-sm">
                      {stage.description}
                    </p>

                    <div className="pt-2 border-t border-border space-y-2">
                      <p className="text-xs font-semibold text-foreground/80">
                        Skills:{' '}
                        {stage.skills
                          .map(
                            (s) =>
                              `${skills.data?.data.find((known) => known.id === s.skillId)?.name ?? 'Skill'} (${s.proficiency})`,
                          )
                          .join(', ')}
                      </p>

                      {stage.activities.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {stage.activities.map((a, index) => (
                            <p key={index} className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border">
                              <strong className="text-foreground">{a.title}</strong> — {a.description}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </>
      )}
    </Frame>
  );
}

export function RoadmapPage() {
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const isStaff = user?.roles?.some((r: string) => r === 'ADMIN' || r === 'PLACEMENT_FACULTY');
  const query = useCareerData<RoadmapDto[]>('roadmaps/me');
  const action = useCareerAction<RoadmapDto>();
  const progress = useCareerAction<unknown>();
  const [selected, setSelected] = useState('');
  const maps = query.data?.data ?? [];
  const map =
    maps.find((m) => m.id === selected) ?? maps.find((m) => m.status === 'active') ?? maps[0];

  if (!isStudent && isStaff) {
    return (
      <Frame title="Roadmap Management">
        <div className={`${card} py-12 text-center space-y-3`}>
          <Compass className="mx-auto h-12 w-12 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Student Roadmap Tracker</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Interactive roadmap milestone tracking is student-specific. To author or review curriculum roadmaps for your academic programs, please visit Career Catalog Management.
          </p>
          <div className="pt-4">
            <Link className={button} to="/dashboard/careers/manage">
              Go to Career Catalog Management
            </Link>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame title="My roadmap">
      <ErrorMessage error={query.error ?? action.error ?? progress.error} />
      {query.isLoading && <LoadingState label="Loading roadmap…" />}

      {!query.isLoading && !maps.length && (
        <div className={`${card} py-12 text-center space-y-3`}>
          <Compass className="mx-auto h-12 w-12 text-primary" />
          <h3 className="text-lg font-bold text-foreground">No active roadmap found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Choose a{' '}
            <Link className="text-primary font-semibold underline" to="/dashboard/careers">
              career path
            </Link>{' '}
            to start your roadmap.
          </p>
        </div>
      )}

      {map && (
        <>
          {/* ── Roadmap Switcher ── */}
          <div className="max-w-md">
            <Field label="Roadmap history">
              <select
                className={input}
                value={map.id}
                onChange={(e) => {
                  setSelected(e.target.value);
                }}
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.targetRole} — {m.status}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Summary Progress Gauge ── */}
          <section className={`${card} bg-card border-border space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary font-mono border border-primary/20">
                  {map.status} track
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2">
                  {map.targetRole}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold font-mono text-primary">
                  {map.progressPercent}% complete · {map.status}
                </p>
              </div>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={map.progressPercent}
              aria-label="Roadmap completion"
              className="h-3 overflow-hidden rounded-full bg-muted/50 border border-border"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 shadow-sm"
                style={{ width: `${String(map.progressPercent)}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Started {map.startedAt ? new Date(map.startedAt).toLocaleDateString() : 'previously'}
              {map.completedAt
                ? ` · Completed ${new Date(map.completedAt).toLocaleDateString()}`
                : ''}
            </p>
          </section>

          <p className="text-muted-foreground text-sm leading-relaxed">
            Confirm completion when you feel ready. Learning and assessments support your progress;
            you control your profile skills.
          </p>

          {/* ── Stages List ── */}
          <div className="space-y-4">
            {map.stages.map((stage) => {
              const isCurrent = stage.id === map.currentStageId;
              return (
                <section
                  key={stage.id}
                  className={`${card} transition-colors duration-150 ${
                    isCurrent
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm'
                      : stage.isCompleted
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      {stage.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2 border-primary text-xs flex items-center justify-center font-bold text-primary">
                          •
                        </span>
                      )}
                      <span>
                        {stage.title}
                        {isCurrent ? ' · Current stage' : ''}
                      </span>
                    </h2>
                    {stage.isCompleted && (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                        Stage Complete
                      </span>
                    )}
                  </div>

                  <p className="my-2 text-sm text-muted-foreground leading-relaxed">{stage.description}</p>

                  <div className="rounded-xl bg-muted/30 p-3 border border-border my-3">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 font-mono">
                      Target Competencies
                    </p>
                    <p className="text-xs text-foreground/90 font-medium">
                      {stage.skills
                        .map((s) => `${stage.skillNames[s.skillId] ?? 'Skill'}: ${s.proficiency}`)
                        .join(' · ')}
                    </p>
                  </div>

                  {stage.activities.length > 0 && (
                    <div className="my-3 space-y-2">
                      {stage.activities.map((a, i) => (
                        <div key={i} className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
                          <strong className="text-foreground">{a.title}</strong> — {a.description}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stage Resources */}
                  {stage.resources.length > 0 && (
                    <div className="space-y-2 my-4">
                      {stage.resources.map((r) => (
                        <div
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card"
                        >
                          <a
                            href={safeHref(r.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-semibold text-sm flex items-center gap-1.5"
                          >
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span>{r.title}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                          </a>
                          {map.status !== 'archived' && (
                            <button
                              className={secondaryButton}
                              disabled={progress.isPending || r.progressStatus === 'completed'}
                              onClick={() => {
                                progress.mutate({
                                  path: `resources/${r.id}/progress`,
                                  method: 'patch',
                                  body: { status: 'completed' },
                                });
                              }}
                            >
                              {r.progressStatus === 'completed'
                                ? 'Resource completed'
                                : 'Mark resource complete'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {map.status !== 'archived' && (
                    <button
                      className={stage.isCompleted ? secondaryButton : button}
                      disabled={action.isPending}
                      onClick={() => {
                        action.mutate({
                          path: `roadmaps/${map.id}/stages/${stage.id}`,
                          method: 'patch',
                          body: { isCompleted: !stage.isCompleted },
                        });
                      }}
                    >
                      {stage.isCompleted ? 'Reopen stage' : 'Complete stage'}
                    </button>
                  )}

                  {map.status === 'archived' && (
                    <p className="text-xs font-semibold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg inline-block border border-border font-mono">
                      Archived · {stage.isCompleted ? 'Completed' : 'Incomplete'}
                    </p>
                  )}
                </section>
              );
            })}
          </div>

          {progress.isSuccess && (
            <div role="status" className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>Resource progress saved.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            <Link className={button} to="/dashboard/profile">
              Review my skills
            </Link>
            {map.careerPathId && (
              <Link
                className="font-semibold text-primary hover:underline transition text-sm ml-4"
                to={`/dashboard/skill-gap?careerPathId=${map.careerPathId}`}
              >
                Reanalyze skills
              </Link>
            )}
          </div>
        </>
      )}
    </Frame>
  );
}

export function ResourcesPage() {
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const own = isStudent && user?.permissions?.includes('roadmaps.manage_own');

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    difficulty: '',
    skillId: '',
    careerPathId: '',
  });
  const [page, setPage] = useState(1);
  const debouncedFilters = useDebouncedValue(filters);
  const query = useCareerData<LearningResourceDto[]>(
    `resources?${new URLSearchParams(Object.entries(debouncedFilters).filter(([, v]) => v))}&page=${String(page)}`,
  );
  const skills = useCareerData<Array<{ id: string; name: string }>>('skills');
  const paths = useCareerOptions<CareerPathDto>('career-paths');
  const action = useCareerAction<unknown>();

  const update = (key: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  return (
    <Frame title="Learning resources">
      {/* ── Multi-Faceted Filters ── */}
      <div className={`${card} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search resources">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className={`${input} pl-10`}
                placeholder="Search resources by title..."
                value={filters.search}
                onChange={(e) => {
                  update('search', e.target.value);
                }}
              />
            </div>
          </Field>
          <Field label="Resource type">
            <select
              className={input}
              value={filters.type}
              onChange={(e) => {
                update('type', e.target.value);
              }}
            >
              <option value="">All types</option>
              {RESOURCE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {prettyLabel(v)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              className={input}
              value={filters.difficulty}
              onChange={(e) => {
                update('difficulty', e.target.value);
              }}
            >
              <option value="">All difficulties</option>
              {['beginner', 'intermediate', 'advanced'].map((v) => (
                <option key={v} value={v}>
                  {prettyLabel(v)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Skill">
            <select
              className={input}
              value={filters.skillId}
              onChange={(e) => {
                update('skillId', e.target.value);
              }}
            >
              <option value="">All skills</option>
              {skills.data?.data.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Career">
            <select
              className={input}
              value={filters.careerPathId}
              onChange={(e) => {
                update('careerPathId', e.target.value);
              }}
            >
              <option value="">All careers</option>
              {paths.data?.data.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <ErrorMessage error={query.error ?? action.error} />
      {query.isLoading && <LoadingState label="Loading resources…" />}

      {/* ── Resources Grid ── */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.data.map((r) => (
          <article key={r.id} className={`${card} flex flex-col justify-between hover:border-primary/40 transition-colors duration-150`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                  <BookOpen className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border font-mono">
                  {prettyLabel(r.type)} · {prettyLabel(r.difficulty)}
                </span>
              </div>
              <h2 className="my-2 text-lg font-bold tracking-tight text-foreground">{r.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground mb-3">{r.description}</p>
              <a
                className="my-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                href={safeHref(r.url)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="inline-flex items-center gap-1">Open resource <ArrowUpRight className="h-3.5 w-3.5" /></span>
              </a>
            </div>

            {own && (
              <div className="pt-3 border-t border-border mt-2">
                <Field label={`Progress for ${r.title}`}>
                  <select
                    className={input}
                    disabled={action.isPending}
                    value={r.progress?.status ?? 'not_started'}
                    onChange={(e) => {
                      action.mutate({
                        path: `resources/${r.id}/progress`,
                        method: 'patch',
                        body: { status: e.target.value as ResourceStatus },
                      });
                    }}
                  >
                    {['not_started', 'in_progress', 'completed'].map((status) => (
                      <option key={status} value={status}>
                        {prettyLabel(status)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </article>
        ))}
      </div>

      {query.data?.data.length === 0 && (
        <EmptyState
          title="No resources match these filters"
          description="Try another skill, career, or resource type."
        />
      )}
      <Paging page={page} total={query.data?.meta?.totalPages ?? 1} setPage={setPage} />
    </Frame>
  );
}

export function SkillGapPage() {
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('STUDENT');
  const isStaff = user?.roles?.some((r: string) => r === 'ADMIN' || r === 'PLACEMENT_FACULTY');
  const [params] = useSearchParams();
  const [career, setCareer] = useState(params.get('careerPathId') ?? '');
  const opportunityId = params.get('opportunityId');
  const [historyId, setHistoryId] = useState('');
  const paths = useCareerOptions<CareerPathDto>('career-paths');
  const history =
    useCareerData<Array<{ id: string; targetRole: string; createdAt: string }>>('skill-gap/me');
  const snapshot = useCareerData<SkillGapDto>(historyId ? `skill-gap/${historyId}` : null);
  const action = useCareerAction<SkillGapDto>();
  const result = action.isPending ? undefined : historyId ? snapshot.data?.data : action.data;

  if (!isStudent && isStaff) {
    return (
      <Frame title="Skill Gap Intelligence">
        <div className={`${card} py-12 text-center space-y-3`}>
          <Target className="mx-auto h-12 w-12 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Institutional Skill Analysis</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Individual skill gap analysis evaluates enrolled student self-assessments. To inspect department-wide skill proficiencies and batch readiness, view the Analytics portal.
          </p>
          <div className="pt-4">
            <Link className={button} to="/dashboard/analytics">
              View Institutional Analytics
            </Link>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame title="Understand your skill gaps">
      <div className={`${card} space-y-4`}>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Compare your profile skills with your goal. Assessments provide supporting evidence and
          never change your skills automatically.
        </p>

        {!opportunityId && (
          <div className="max-w-md">
            <Field label="Target career">
              <select
                className={input}
                value={career}
                onChange={(e) => {
                  setCareer(e.target.value);
                  action.reset();
                  setHistoryId('');
                }}
              >
                <option value="">Choose a career</option>
                {paths.data?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {opportunityId && (
          <p className="text-xs font-semibold text-primary bg-primary/10 p-3 rounded-xl border border-primary/20 inline-block font-mono">
            Analyzing requirements for the selected opportunity.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            className={button}
            disabled={action.isPending || (!career && !opportunityId)}
            onClick={() => {
              setHistoryId('');
              action.mutate({
                path: 'skill-gap',
                body: opportunityId ? { opportunityId } : { careerPathId: career },
              });
            }}
          >
            <Sparkles className="h-4 w-4" />
            <span>{action.isPending ? 'Analyzing…' : 'Analyze current skills'}</span>
          </button>

          <div className="min-w-64">
            <Field label="Previous analyses">
              <select
                className={input}
                value={historyId}
                onChange={(e) => {
                  setHistoryId(e.target.value);
                }}
              >
                <option value="">Current analysis</option>
                {history.data?.data.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.targetRole} · {new Date(h.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <ErrorMessage
        error={action.error ?? paths.error ?? history.error ?? (historyId ? snapshot.error : null)}
      />
      {historyId && snapshot.isLoading && <LoadingState label="Loading analysis…" />}

      {/* ── Intelligence Evaluation Report ── */}
      {result && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-card p-6 sm:p-8 text-foreground shadow-xs border border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 font-mono">
                  <Target className="h-3.5 w-3.5" />
                  <span>Readiness Intelligence</span>
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {result.targetRole}
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground font-mono">
                  Snapshot from {new Date(result.createdAt).toLocaleString()} ·{' '}
                  {result.skills.filter((s) => s.status === 'matched').length} matched /{' '}
                  {result.skills.length} required skills
                </p>
              </div>

              <div className="bg-muted/30 px-6 py-4 rounded-xl border border-border text-center">
                <span className="text-3xl font-bold font-mono text-primary">
                  {result.skills.length
                    ? Math.round(
                        (100 * result.skills.filter((s) => s.status === 'matched').length) /
                          result.skills.length,
                      )
                    : 100}
                  %
                </span>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Competency Match</p>
              </div>
            </div>
          </div>

          {result.skills.length === 0 && (
            <div className={`${card} py-10 text-center`}>
              <p className="text-muted-foreground text-sm">No required skills are linked to this goal yet.</p>
            </div>
          )}

          {/* Skill Breakdown Cards */}
          <div className="grid gap-4">
            {result.skills.map((s) => {
              const statusStyles = {
                missing: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
                below_target: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                needs_practice: 'bg-primary/10 text-primary border-primary/20',
                matched: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
              };
              return (
                <article className={`${card} space-y-3`} key={s.skillId}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      {s.name} · {prettyLabel(s.status)}
                    </h3>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold border font-mono ${statusStyles[s.status] || 'bg-muted/60 text-muted-foreground border-border'}`}
                    >
                      {prettyLabel(s.status)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border font-mono">
                    Profile: <strong className="text-foreground">{s.currentProficiency ?? 'not listed'}</strong> · Target:{' '}
                    <strong className="text-foreground">{s.requiredProficiency ?? 'skill present'}</strong>
                  </p>

                  {s.assessment && (
                    <div className="my-2 rounded-xl bg-primary/10 p-3 border border-primary/20 text-xs text-primary font-mono">
                      <p className="font-semibold flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span>Evaluated mock tests: {s.assessment.accuracy}% accuracy across {s.assessment.questionCount} questions{s.needsPractice ? ' · Practice recommended' : ''}</span>
                      </p>
                    </div>
                  )}

                  {/* Recommendations */}
                  <ul className="mt-3 space-y-2.5">
                    {s.actions.map((a, i) => (
                      <li key={i} className="rounded-xl border border-border p-3 bg-muted/20 text-xs space-y-1">
                        <div>
                          {safeHref(a.url) ? (
                            <a
                              className="font-bold text-primary hover:underline text-sm"
                              href={safeHref(a.url)}
                              rel="noreferrer"
                              target={a.url?.startsWith('http') ? '_blank' : undefined}
                            >
                              {a.title}
                            </a>
                          ) : (
                            <strong className="font-bold text-foreground text-sm">{a.title}</strong>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{a.reason}</p>
                      </li>
                    ))}
                  </ul>

                  {s.actions.length === 0 && s.priority < 4 && (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      No activity is linked yet. Ask your faculty for a resource or explore the learning
                      library.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {result.optionalSkills.length > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border font-mono">
              Optional skills: {result.optionalSkills.map((s) => s.name).join(', ')}
            </p>
          )}

          {result.unclassifiedTopics.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-mono">
              Assessment topics without an exact skill match: {result.unclassifiedTopics.join(', ')}
            </p>
          )}

          <div className="pt-4 border-t border-border space-y-2">
            <Link className={button} to="/dashboard/profile">
              Update my profile skills
            </Link>
            <p className="text-xs text-muted-foreground">
              Return here and analyze again after updating your skills or finishing a test.
            </p>
          </div>
        </div>
      )}
    </Frame>
  );
}
