import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
} from 'lucide-react';
import type { StartTestResponseDto } from '@career-portal/shared-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useAutosaveAnswer, useStartTest, useSubmitTest } from '../api/preparation-api';

export function TestTakingPage(): React.JSX.Element {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const startTestMutation = useStartTest();
  const autosaveMutation = useAutosaveAnswer();
  const submitTestMutation = useSubmitTest();

  const [testData, setTestData] = useState<StartTestResponseDto | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const submissionInFlight = useRef(false);
  const autoSubmittedAttempt = useRef<string | null>(null);

  // Initialize test attempt
  useEffect(() => {
    if (!testId) return;
    startTestMutation.mutate(testId, {
      onSuccess: (data) => {
        setTestData(data);
        if (data.existingAnswers) {
          setSelectedAnswers(data.existingAnswers);
        }
        // Calculate remaining seconds based on startedAt and durationMinutes
        const startedTime = new Date(data.startedAt).getTime();
        const durationMs = data.durationMinutes * 60 * 1000;
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((startedTime + durationMs - now) / 1000));
        setSecondsRemaining(remaining);
      },
    });
  }, [testId]);

  // Recalculate from the server start time so background tabs cannot extend a test.
  useEffect(() => {
    if (!testData) return;
    const deadline = new Date(testData.startedAt).getTime() + testData.durationMinutes * 60_000;
    const timer = setInterval(() => {
      setSecondsRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => { clearInterval(timer); };
  }, [testData]);

  const questions = useMemo(() => testData?.questions ?? [], [testData]);
  const currentQuestion = questions[currentQuestionIndex];

  const formattedTime = useMemo(() => {
    if (secondsRemaining === null) return '--:--';
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [secondsRemaining]);

  const answeredCount = useMemo(() => {
    return Object.values(selectedAnswers).filter((val) => val !== null).length;
  }, [selectedAnswers]);

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion || !testData?.attemptId) return;

    const qId = currentQuestion.id;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIndex }));

    // Trigger autosave
    setAutosaveStatus('saving');
    autosaveMutation.mutate(
      {
        attemptId: testData.attemptId,
        data: { questionId: qId, selectedIndex: optionIndex, timeSpentSeconds: 0 },
      },
      {
        onSuccess: () => { setAutosaveStatus('saved'); },
        onError: () => { setAutosaveStatus('idle'); },
      },
    );
  };

  const handleClearAnswer = () => {
    if (!currentQuestion || !testData?.attemptId) return;
    const qId = currentQuestion.id;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: null }));

    setAutosaveStatus('saving');
    autosaveMutation.mutate(
      {
        attemptId: testData.attemptId,
        data: { questionId: qId, selectedIndex: null, timeSpentSeconds: 0 },
      },
      {
        onSuccess: () => { setAutosaveStatus('saved'); },
        onError: () => { setAutosaveStatus('idle'); },
      },
    );
  };

  const toggleFlagQuestion = () => {
    if (!currentQuestion) return;
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const submitTest = submitTestMutation.mutate;
  const handleForceSubmit = useCallback(() => {
    if (!testData || submissionInFlight.current) return;
    submissionInFlight.current = true;
    const answersPayload = Object.entries(selectedAnswers).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex,
      timeSpentSeconds: 0,
    }));

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(testData.startedAt).getTime()) / 1000));

    submitTest(
      {
        attemptId: testData.attemptId,
        data: { answers: answersPayload, timeSpentSeconds: elapsedSeconds },
      },
      {
        onSuccess: (result) => {
          void navigate(`/dashboard/preparation/attempts/${result.attemptId}/result`);
        },
        onSettled: () => { submissionInFlight.current = false; },
      },
    );
  }, [testData, selectedAnswers, submitTest, navigate]);

  useEffect(() => {
    if (secondsRemaining !== 0 || !testData || autoSubmittedAttempt.current === testData.attemptId) return;
    autoSubmittedAttempt.current = testData.attemptId;
    handleForceSubmit();
  }, [secondsRemaining, testData, handleForceSubmit]);

  if (startTestMutation.isError) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">Unable to Start Test</h3>
        <p className="mt-2 text-sm text-slate-600">
          {startTestMutation.error.message || 'An error occurred while launching the assessment.'}
        </p>
        <button
          type="button"
          onClick={() => { void navigate('/dashboard/preparation'); }}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Return to Tests Catalog
        </button>
      </div>
    );
  }

  if (startTestMutation.isPending || !testData) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-base font-semibold text-slate-700">Initializing Assessment Session...</p>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isTimeLow = secondsRemaining !== null && secondsRemaining < 300; // < 5 mins

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-between space-y-6">
      {/* ── Top Bar with Countdown Timer & Progress ──────────────────────── */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur-md">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Active Assessment
          </span>
          <h2 className="text-lg font-bold text-slate-900">{testData.title}</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Autosave status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            {autosaveStatus === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span>Autosaving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Autosaved</span>
              </>
            )}
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-base font-extrabold tracking-wider shadow-inner transition-colors ${
              isTimeLow
                ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
                : 'bg-slate-900 text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formattedTime}</span>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={submitTestMutation.isPending}
            onClick={() => { setShowSubmitModal(true); }}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Submit Test
          </button>
        </div>
      </header>

      {submitTestMutation.isError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitTestMutation.error.message}
          <button type="button" onClick={handleForceSubmit} className="ml-3 font-semibold underline">
            Retry submission
          </button>
        </div>
      ) : null}

      {/* ── Main Content: Question Panel + Question Navigation Sidebar ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Left: Question Box */}
        <main className="lg:col-span-3 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          {currentQuestion ? (
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  {currentQuestion.topic ? (
                    <span className="text-xs font-medium text-slate-500">
                      Topic: <strong className="text-slate-800">{currentQuestion.topic}</strong>
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">
                    +{currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={toggleFlagQuestion}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      flaggedQuestions[currentQuestion.id]
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{flaggedQuestions[currentQuestion.id] ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base md:text-lg font-medium text-slate-900 leading-relaxed">
                {currentQuestion.questionText}
              </div>

              {/* Options Radio List */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((optionText: string, idx: number) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === idx;
                  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const label = optionLetters[idx] || String(idx + 1);

                  return (
                    <label
                      key={idx}
                      onClick={() => { handleSelectOption(idx); }}
                      className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {label}
                      </span>
                      <span className={`text-sm md:text-base leading-snug ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {optionText}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400">No question available</p>
          )}

          {/* Navigation Bottom Controls */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => { setCurrentQuestionIndex((prev) => Math.max(0, prev - 1)); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            {currentQuestion && selectedAnswers[currentQuestion.id] !== undefined && selectedAnswers[currentQuestion.id] !== null ? (
              <button
                type="button"
                onClick={handleClearAnswer}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear Choice
              </button>
            ) : null}

            {isLastQuestion ? (
              <button
                type="button"
                onClick={() => { setShowSubmitModal(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <span>Review & Submit</span>
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1)); }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>

        {/* Right: Question Palette / Overview */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
              <span className="text-xs font-medium text-slate-500">
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-200" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-indigo-600 bg-white" />
                <span>Current</span>
              </div>
            </div>

            {/* Palette Buttons Grid */}
            <div className="grid grid-cols-5 gap-2 pt-2 max-h-[320px] overflow-y-auto">
              {questions.map((q, idx: number) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null;
                const isFlagged = flaggedQuestions[q.id];

                let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
                if (isAnswered) bgClass = 'bg-emerald-500 text-white font-bold';
                if (isFlagged) bgClass = 'bg-amber-400 text-slate-900 font-bold';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => { setCurrentQuestionIndex(idx); }}
                    className={`h-9 w-9 rounded-lg text-xs transition ${bgClass} ${
                      isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 space-y-2 border border-slate-100">
            <p className="font-semibold text-slate-700">Integrity Rules:</p>
            <p>Answers are saved server-side immediately. If time runs out, your current answers are auto-submitted.</p>
          </div>
        </aside>
      </div>

      {/* ── Submit Confirmation Modal ─────────────────────────────────────── */}
      {showSubmitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Test Submission</h3>
              <p className="text-xs text-slate-500">
                Once submitted, your answers will be graded server-side and cannot be modified.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-center">
              <div className="border-r border-slate-200 pr-2">
                <p className="text-2xl font-extrabold text-emerald-600">{answeredCount}</p>
                <p className="text-xs font-medium text-slate-500">Answered</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-400">
                  {questions.length - answeredCount}
                </p>
                <p className="text-xs font-medium text-slate-500">Unanswered</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setShowSubmitModal(false); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={submitTestMutation.isPending}
                onClick={handleForceSubmit}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {submitTestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Grading...</span>
                  </>
                ) : (
                  <span>Submit Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
