import type { MockInterviewDto } from '@career-portal/shared-types';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  HelpCircle,
  History,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
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
        <span className="rounded-xl bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
          Score: {score}/100
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="rounded-xl bg-indigo-50 px-3.5 py-1.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-200">
          Score: {score}/100
        </span>
      );
    }
    return (
      <span className="rounded-xl bg-amber-50 px-3.5 py-1.5 font-mono text-xs font-bold text-amber-700 border border-amber-200">
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
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Past Evaluations</span>
            </button>
            <span className="text-xs font-semibold text-slate-400">
              Session from {new Date(interview.scheduledAt).toLocaleDateString()}
            </span>
          </div>
        ) : null}

        {/* ── Summary Hero Banner ── */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-indigo-900/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Evaluation Completed</span>
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {interview.targetRole} Assessment Report
              </h2>
              <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {feedback?.summary}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10">
              <div className="text-center">
                <span className="text-4xl font-extrabold text-white">
                  {interview.overallScore ?? 0}
                </span>
                <span className="text-xs text-slate-400">/100</span>
                <p className="text-xs font-semibold text-indigo-300 mt-0.5">Overall Score</p>
              </div>
            </div>
          </div>

          {/* Score breakdown metrics */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Technical Depth</p>
                <p className="text-lg font-bold text-indigo-300">
                  {feedback?.technicalScore ?? 0}%
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                  style={{ width: `${feedback?.technicalScore ?? 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Communication & STAR</p>
                <p className="text-lg font-bold text-emerald-300">
                  {feedback?.communicationScore ?? 0}%
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${feedback?.communicationScore ?? 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Problem Solving & Relevance</p>
                <p className="text-lg font-bold text-amber-300">
                  {feedback?.problemSolvingScore ?? 0}%
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${feedback?.problemSolvingScore ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Strengths & Improvements ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span>Key Strengths</span>
            </h3>
            {feedback?.strengths && feedback.strengths.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700">
                {feedback.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Provide structured, in-depth responses with concrete examples to unlock highlighted strengths.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span>Areas for Improvement</span>
            </h3>
            {feedback?.improvements && feedback.improvements.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700">
                {feedback.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-600 font-medium">
                Outstanding performance! All evaluated dimensions met high benchmark criteria.
              </p>
            )}
          </div>
        </div>

        {/* ── Detailed Question-by-Question Review ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>Question-by-Question Response Review</span>
            </h3>
            <span className="text-xs text-slate-500">{questionsList.length} Questions Evaluated</span>
          </div>

          <div className="space-y-4">
            {questionsList.map((q, idx) => {
              const studentAnswer = answersMap.get(q.id) || 'Not answered.';
              const isUnanswered =
                !studentAnswer ||
                studentAnswer === 'Not answered.' ||
                studentAnswer.trim().toLowerCase() === 'not answered';
              const pa = perAnswerMap.get(q.id);

              return (
                <div
                  key={q.id || idx}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      Question {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {isUnanswered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                          Unanswered (0 pts)
                        </span>
                      ) : pa ? (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 font-medium">
                            {pa.wordCount} words
                          </span>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700 font-medium">
                            Relevance: {pa.relevance}%
                          </span>
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">
                            Depth: {pa.depth}%
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                    {q.questionText}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-semibold text-slate-500">Your Submitted Answer:</p>
                    <div
                      className={`rounded-xl p-4 text-xs leading-relaxed border ${
                        isUnanswered
                          ? 'bg-rose-50/40 border-rose-100 text-rose-700 italic'
                          : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    >
                      {studentAnswer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Back to Evaluations List
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveInterview(null);
                setActiveTab('history');
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              View in Past History
            </button>
          )}

          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(interview.targetRole || TARGET_ROLES[0] || 'Full Stack Software Engineer');
                  setViewingPastInterview(null);
                  setActiveInterview(null);
                  setActiveTab('simulate');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Practice this Role Again</span>
              </button>
            ) : isFreshSubmission ? (
              <button
                type="button"
                onClick={() => {
                  setActiveInterview(null);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <span>Start New Mock Interview</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ── Top Navigation ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/preparation"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tests Catalog</span>
        </Link>

        {/* Tab switch */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('simulate');
              setViewingPastInterview(null);
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'simulate' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Practice Session</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span>Past Evaluations ({pastInterviews.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'simulate' ? (
        <>
          {!activeInterview ? (
            /* ── Setup & Launch Simulation ── */
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
              <div className="max-w-2xl space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Interactive Placement Preparation</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                  Role-Specific Mock Interview
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Select your target job profile to generate realistic behavioral and technical interview questions. Submit structured responses to receive instantaneous scoring on communication, technical clarity, and problem solving.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                {facultyTracks.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <label className="block text-xs font-bold text-slate-900">Faculty-Curated Placement Tracks</label>
                      <span className="rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-semibold border border-purple-200">
                        Campus Drive Curated
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {facultyTracks.map((track) => {
                        const isSelected = selectedTemplateId === track.id;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => {
                              setSelectedRole(track.roleTitle);
                              setSelectedTemplateId(track.id);
                            }}
                            className={`flex flex-col rounded-xl border p-4 text-left transition relative ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-600/30'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 w-full">
                              <div>
                                <span className="text-sm font-semibold text-slate-900">{track.roleTitle}</span>
                                {track.description ? (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{track.description}</p>
                                ) : null}
                              </div>
                              {isSelected ? (
                                <CheckCircle className="h-5 w-5 text-purple-600 shrink-0" />
                              ) : null}
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span>{track.questions.length} Custom Questions</span>
                              <span>By {track.creatorName || 'Faculty'}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700">Standard Industry Roles</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TARGET_ROLES.map((role) => {
                      const isSelected = selectedTemplateId === null && selectedRole === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role);
                            setSelectedTemplateId(null);
                          }}
                          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm font-semibold text-slate-800">{role}</span>
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    disabled={scheduleMutation.isPending}
                    onClick={handleStartSimulation}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition"
                  >
                    {scheduleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating Interview Questions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Begin Mock Interview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : isCompleted ? (
            /* ── Simulation Completed Evaluation Result ── */
            renderEvaluationReport(activeInterview, undefined, true)
          ) : (
            /* ── Active Interview Q&A Session ── */
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-semibold text-indigo-600">
                    Target Role: {activeInterview.targetRole}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </h2>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 capitalize">
                  {currentQ?.category || 'Technical'}
                </span>
              </div>

              {currentQ ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm md:text-base font-semibold text-slate-900">
                    {currentQ.questionText}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Your Response (Recommend STAR format)</span>
                      <span>{(answers[currentQ.id] || '').length} characters</span>
                    </div>
                    <textarea
                      rows={6}
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => { handleAnswerChange(currentQ.id, e.target.value); }}
                      placeholder="Outline your technical approach, specific tools, challenges encountered, and quantifiable outcomes..."
                      className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="rounded-xl bg-indigo-50/60 p-3 text-xs text-indigo-900 border border-indigo-100 flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      Tip: Articulate the Situation, Task, Actions you took, and final Results. Include concrete metrics where applicable.
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => { setCurrentQuestionIndex((prev) => Math.max(0, prev - 1)); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={submitAnswersMutation.isPending}
                    onClick={handleSubmitInterview}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitAnswersMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Evaluating Responses...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit for Evaluation</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1)); }}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
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
            <div className="py-12 text-center text-sm text-slate-500">Loading evaluation history...</div>
          ) : pastInterviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="text-base font-semibold text-slate-800">No interview records found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Practice interview simulations to evaluate your technical and behavioral responses.
              </p>
              <button
                type="button"
                onClick={() => { setActiveTab('simulate'); }}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <span>Start Your First Interview</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Past Interview Evaluations</h2>
                  <p className="text-xs text-slate-500">
                    Review your comprehensive feedback reports or remove past records.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {pastInterviews.length} {pastInterviews.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>

              {pastInterviews.map((iv) => (
                <div
                  key={iv.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 hover:border-indigo-200 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{iv.targetRole}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
                          {iv.type} Practice
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(iv.scheduledAt).toLocaleDateString()}</span>
                        </span>
                        <span>•</span>
                        <span>Status: <strong className="capitalize text-slate-700">{iv.status}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getScoreBadge(iv.overallScore)}
                    </div>
                  </div>

                  {iv.feedback?.summary ? (
                    <p className="text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                      {iv.feedback.summary}
                    </p>
                  ) : null}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    {iv.status === 'completed' && iv.feedback ? (
                      <button
                        type="button"
                        onClick={() => { setViewingPastInterview(iv); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Evaluation Report</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Interview in progress / not evaluated</span>
                    )}

                    {deleteConfirmId === iv.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-600 font-medium">Delete record?</span>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => { handleDelete(iv.id); }}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 transition"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteConfirmId(null); }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setDeleteConfirmId(iv.id); }}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                        title="Delete past evaluation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
