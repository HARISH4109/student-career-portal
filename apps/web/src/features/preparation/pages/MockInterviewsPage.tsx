import type { MockInterviewDto } from '@career-portal/shared-types';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HelpCircle,
  History,
  Play,
  RefreshCw,
  Send,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import {
  useDeleteMockInterview,
  useMockInterviewTemplates,
  useMyMockInterviews,
  useScheduleMockInterview,
  useSubmitAIInterviewAnswers,
} from '../api/preparation-api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonCard,
  Textarea,
} from '@/shared/components/ui';

const TARGET_ROLES = [
  'Full Stack Software Engineer',
  'Frontend Developer (React/TS)',
  'Backend Developer (Node.js/PostgreSQL)',
  'Data Scientist & ML Engineer',
  'DevOps & Cloud Engineer',
  'Data Analyst / SQL Specialist',
];

export function MockInterviewsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'simulate' | 'history'>('simulate');
  const [selectedRole, setSelectedRole] = useState<string>(TARGET_ROLES[0] ?? 'Full Stack Software Engineer');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Simulation Session state
  const [activeInterview, setActiveInterview] = useState<MockInterviewDto | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // History inspection & delete state
  const [viewingPastInterview, setViewingPastInterview] = useState<MockInterviewDto | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: pastInterviews = [], isLoading: historyLoading } = useMyMockInterviews();
  const { data: facultyTracks = [] } = useMockInterviewTemplates();
  const scheduleMutation = useScheduleMockInterview();
  const submitAnswersMutation = useSubmitAIInterviewAnswers();
  const deleteMutation = useDeleteMockInterview();

  const handleStartSimulation = () => {
    scheduleMutation.mutate(
      {
        type: 'technical',
        interviewerType: 'ai',
        targetRole: selectedRole,
        templateId: selectedTemplateId || undefined,
      },
      {
        onSuccess: (interview) => {
          setActiveInterview(interview);
          setCurrentQuestionIndex(0);
          setAnswers({});
        },
      },
    );
  };

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const handleSubmitInterview = () => {
    if (!activeInterview || !activeInterview.questions) return;

    const formattedAnswers = activeInterview.questions.map((q) => {
      const typed = (answers[q.id] || '').trim();
      return {
        questionId: q.id,
        questionText: q.questionText || '',
        answerText: typed.length > 0 ? typed : 'Not answered.',
      };
    });

    submitAnswersMutation.mutate(
      {
        id: activeInterview.id,
        data: { answers: formattedAnswers },
      },
      {
        onSuccess: (evaluated) => {
          setActiveInterview(evaluated);
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeleteConfirmId(null);
        if (viewingPastInterview?.id === id) {
          setViewingPastInterview(null);
        }
      },
    });
  };

  const questions = activeInterview?.questions || [];
  const currentQ = questions[currentQuestionIndex];
  const isCompleted = activeInterview?.status === 'completed';

  // Helper for score badge styling
  const getScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    if (score >= 75) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 font-mono tabular-nums">
          Score: {score}/100
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20 font-mono tabular-nums">
          Score: {score}/100
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 font-mono tabular-nums">
        Score: {score}/100
      </span>
    );
  };

  // Reusable Full Evaluation Report View
  const renderEvaluationReport = (
    interview: MockInterviewDto,
    onBack?: () => void,
    isFreshSubmission?: boolean,
  ) => {
    const feedback = interview.feedback;
    const questionsList = interview.questions || [];
    const answersList = (interview.answers as Array<{ questionId: string; answerText: string }> | null) || [];
    const answersMap = new Map<string, string>();
    for (const a of answersList) answersMap.set(a.questionId, a.answerText);

    const perAnswerMap = new Map<string, { wordCount: number; relevance: number; depth: number; structure: number }>();
    if (feedback?.perAnswer) {
      for (const pa of feedback.perAnswer) perAnswerMap.set(pa.questionId, pa);
    }

    return (
      <div className="space-y-6">
        {onBack ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Past Evaluations</span>
            </button>
            <span className="text-xs text-muted-foreground font-mono">
              Session: {new Date(interview.scheduledAt).toLocaleDateString()}
            </span>
          </div>
        ) : null}

        {/* ── Summary Transcript Header ── */}
        <div className="rounded-xl bg-card p-6 md:p-8 text-foreground shadow-xs border border-border/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Evaluation Complete</span>
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                {interview.targetRole} Assessment Report
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {feedback?.summary}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/60">
              <div className="text-center">
                <span className="text-3xl font-bold text-foreground font-mono tabular-nums">
                  {interview.overallScore ?? 0}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Overall Score</p>
              </div>
            </div>
          </div>

          {/* Score breakdown metrics */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 border-t border-border/60">
            <div className="rounded-lg bg-muted/20 p-3.5 border border-border/50 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Technical Depth</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {feedback?.technicalScore ?? 0}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${feedback?.technicalScore ?? 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/20 p-3.5 border border-border/50 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Communication & STAR</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {feedback?.communicationScore ?? 0}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-[width] duration-300"
                  style={{ width: `${feedback?.communicationScore ?? 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/20 p-3.5 border border-border/50 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Problem Solving & Relevance</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {feedback?.problemSolvingScore ?? 0}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-[width] duration-300"
                  style={{ width: `${feedback?.problemSolvingScore ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Strengths & Improvements ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 space-y-3 border-border/80">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Key Strengths</span>
            </h3>
            {feedback?.strengths && feedback.strengths.length > 0 ? (
              <ul className="space-y-2 text-xs text-muted-foreground">
                {feedback.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Provide structured, in-depth responses with concrete examples to reveal highlighted strengths.
              </p>
            )}
          </Card>

          <Card className="p-5 space-y-3 border-border/80">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span>Areas for Improvement</span>
            </h3>
            {feedback?.improvements && feedback.improvements.length > 0 ? (
              <ul className="space-y-2 text-xs text-muted-foreground">
                {feedback.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{imp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                All evaluated dimensions met high benchmark criteria.
              </p>
            )}
          </Card>
        </div>

        {/* ── Detailed Question-by-Question Review ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Evaluated Responses</h3>
          <div className="space-y-3">
            {questionsList.map((q, idx) => {
              const studentAnswer = answersMap.get(q.id) || 'Not answered.';
              const isUnanswered =
                !studentAnswer ||
                studentAnswer === 'Not answered.' ||
                studentAnswer.trim().toLowerCase() === 'not answered';
              const pa = perAnswerMap.get(q.id);

              return (
                <Card
                  key={q.id || idx}
                  className="p-5 space-y-3 border-border/80"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      Question {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {isUnanswered ? (
                        <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          Unanswered (0 pts)
                        </span>
                      ) : pa ? (
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground font-medium">
                            {pa.wordCount} words
                          </span>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary font-medium">
                            Relevance: {pa.relevance}%
                          </span>
                          <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-900/40">
                            Depth: {pa.depth}%
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {q.questionText}
                  </p>

                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Submitted Response:</span>
                    <div
                      className={`rounded-lg p-3 text-xs leading-relaxed border ${
                        isUnanswered
                          ? 'bg-destructive/5 border-destructive/20 text-destructive italic'
                          : 'bg-muted/30 border-border/60 text-foreground'
                      }`}
                    >
                      {studentAnswer}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/80">
          {onBack ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
            >
              Back to Evaluations List
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveInterview(null);
                setActiveTab('history');
              }}
            >
              View in Past History
            </Button>
          )}

          <div className="flex items-center gap-3">
            {onBack ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedRole(interview.targetRole || TARGET_ROLES[0] || 'Full Stack Software Engineer');
                  setViewingPastInterview(null);
                  setActiveInterview(null);
                  setActiveTab('simulate');
                }}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Practice this Role Again</span>
              </Button>
            ) : isFreshSubmission ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setActiveInterview(null);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                }}
              >
                <span>Start New Mock Interview</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-[1536px] mx-auto pb-12">
      {/* ── Academic Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Mock Interview Simulations
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Role-specific interview simulations with evaluated telemetry for communication and technical depth
          </p>
        </div>

        <Link to="/dashboard/preparation">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Assessments</span>
          </Button>
        </Link>
      </div>

      {/* ── Segmented Tab Switcher ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div className="inline-flex items-center rounded-lg bg-muted/40 p-1 border border-border/60 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('simulate');
              setViewingPastInterview(null);
            }}
            className={`flex items-center gap-2 rounded-md px-3 py-1 transition-colors cursor-pointer ${
              activeTab === 'simulate' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Practice Session</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
            }}
            className={`flex items-center gap-2 rounded-md px-3 py-1 transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Past Evaluations ({pastInterviews.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'simulate' ? (
        <>
          {!activeInterview ? (
            /* ── Simulation Configuration & Launcher ── */
            <Card className="p-6 md:p-8 space-y-6 border-border/80">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Role-Specific Interview Configuration
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-card-foreground tracking-tight">
                  Select Target Job Track
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Choose a faculty-curated placement track or select a standard industry role to generate relevant technical and behavioral questions.
                </p>
              </div>

              <div className="space-y-5 pt-1">
                {facultyTracks.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <label className="block text-xs font-semibold text-card-foreground">
                        Faculty-Curated Placement Tracks
                      </label>
                      <Badge variant="outline" className="text-[10px]">
                        Campus Drive Curated
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {facultyTracks.map((track) => {
                        const isSelected = selectedTemplateId === track.id;
                        return (
                          <div
                            key={track.id}
                            onClick={() => {
                              setSelectedRole(track.roleTitle);
                              setSelectedTemplateId(track.id);
                            }}
                            className={`flex flex-col justify-between min-h-[92px] rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-card ring-1 ring-primary/40 shadow-xs'
                                : 'border-border/70 bg-card hover:border-border hover:bg-muted/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 w-full">
                              <div>
                                <span className="text-sm font-semibold text-card-foreground line-clamp-1">{track.roleTitle}</span>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {track.description || 'Placement specific assessment questions'}
                                </p>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              ) : null}
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                              <span>{track.questions.length} Custom Questions</span>
                              <span>By {track.creatorName || 'Faculty'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-card-foreground">
                    Standard Industry Roles
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {TARGET_ROLES.map((role) => {
                      const isSelected = selectedTemplateId === null && selectedRole === role;
                      return (
                        <div
                          key={role}
                          onClick={() => {
                            setSelectedRole(role);
                            setSelectedTemplateId(null);
                          }}
                          className={`flex items-center justify-between min-h-[52px] rounded-xl border px-4 py-2.5 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-card ring-1 ring-primary/40 shadow-xs'
                              : 'border-border/70 bg-card hover:border-border hover:bg-muted/20'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-medium text-card-foreground">{role}</span>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    disabled={scheduleMutation.isPending}
                    loading={scheduleMutation.isPending}
                    onClick={handleStartSimulation}
                    className="gap-2 text-xs"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Begin Simulation</span>
                  </Button>
                </div>
              </div>
            </Card>
          ) : isCompleted ? (
            /* ── Simulation Completed Evaluation Result ── */
            renderEvaluationReport(activeInterview, undefined, true)
          ) : (
            /* ── Active Interview Q&A Session ── */
            <Card className="p-6 md:p-8 space-y-6 border-border/80">
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Target Role: {activeInterview.targetRole}
                  </span>
                  <h2 className="text-base font-semibold text-card-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </h2>
                </div>
                <Badge variant="secondary" className="capitalize text-xs font-medium">
                  {currentQ?.category || 'Technical'}
                </Badge>
              </div>

              {currentQ ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/30 p-4 border border-border/60 text-sm font-medium text-card-foreground leading-relaxed">
                    {currentQ.questionText}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Your Response (Recommend STAR format)</span>
                      <span className="font-mono tabular-nums">{(answers[currentQ.id] || '').length} characters</span>
                    </div>
                    <Textarea
                      rows={6}
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => { handleAnswerChange(currentQ.id, e.target.value); }}
                      placeholder="Outline your approach, tools used, challenges encountered, and quantifiable outcomes..."
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground border border-border/50 flex items-start gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>
                      Guideline: Detail the Situation, Task, Actions you took, and final Results. Include concrete metrics where applicable.
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => { setCurrentQuestionIndex((prev) => Math.max(0, prev - 1)); }}
                >
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitAnswersMutation.isPending}
                    loading={submitAnswersMutation.isPending}
                    onClick={handleSubmitInterview}
                    className="gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit for Evaluation</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1)); }}
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        /* ── History Tab ── */
        <div className="space-y-4">
          {viewingPastInterview ? (
            renderEvaluationReport(viewingPastInterview, () => {
              setViewingPastInterview(null);
            })
          ) : historyLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : pastInterviews.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No interview records found"
              description="Complete interview simulations to evaluate your responses across technical depth and communication."
              action={{
                label: 'Start Your First Interview',
                onClick: () => {
                  setActiveTab('simulate');
                },
              }}
            />
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Past Interview Evaluations</h2>
                  <p className="text-xs text-muted-foreground">
                    Review your comprehensive feedback transcripts or remove past records.
                  </p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {pastInterviews.length} {pastInterviews.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>

              {pastInterviews.map((iv) => (
                <Card
                  key={iv.id}
                  className="p-5 space-y-3 border-border/80"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-card-foreground">{iv.targetRole}</h3>
                        <span className="capitalize text-[11px] font-medium text-muted-foreground">
                          {iv.type} Practice
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(iv.scheduledAt).toLocaleDateString()}</span>
                        </span>
                        <span>•</span>
                        <span>Status: <strong className="capitalize text-foreground font-normal">{iv.status}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getScoreBadge(iv.overallScore)}
                    </div>
                  </div>

                  {iv.feedback?.summary ? (
                    <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/50 leading-relaxed">
                      {iv.feedback.summary}
                    </p>
                  ) : null}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-xs">
                    {iv.status === 'completed' && iv.feedback ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setViewingPastInterview(iv); }}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>View Transcript</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Interview in progress / not evaluated</span>
                    )}

                    {deleteConfirmId === iv.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive font-medium">Delete record?</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          loading={deleteMutation.isPending}
                          onClick={() => { handleDelete(iv.id); }}
                        >
                          Confirm
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setDeleteConfirmId(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setDeleteConfirmId(iv.id); }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Delete evaluation record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
