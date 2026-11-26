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
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

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
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center shadow-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-bold text-foreground">Unable to Start Test</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {startTestMutation.error.message || 'An error occurred while launching the assessment.'}
        </p>
        <Button
          type="button"
          onClick={() => { void navigate('/dashboard/preparation'); }}
          className="mt-6"
        >
          Return to Tests Catalog
        </Button>
      </div>
    );
  }

  if (startTestMutation.isPending || !testData) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-base font-semibold text-foreground">Initializing Assessment Session...</p>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isTimeLow = secondsRemaining !== null && secondsRemaining < 300; // < 5 mins

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-between space-y-6">
      {/* ── Top Bar with Countdown Timer & Progress ──────────────────────── */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-card/95 px-5 py-3.5 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
          <div>
            <span className="text-[11px] font-medium text-muted-foreground font-mono">
              Official Assessment Session
            </span>
            <h2 className="text-base font-bold text-card-foreground leading-snug">{testData.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            {autosaveStatus === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Saving answer...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Saved</span>
              </>
            )}
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-mono text-sm font-semibold transition-colors ${isTimeLow
              ? 'bg-destructive/10 text-destructive border border-destructive/30'
              : 'bg-muted/70 text-foreground border border-border/70'
              }`}
          >
            <Clock className={`h-3.5 w-3.5 ${isTimeLow ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span>{formattedTime}</span>
          </div>

          {/* Submit Button */}
          <Button
            type="button"
            disabled={submitTestMutation.isPending}
            onClick={() => { setShowSubmitModal(true); }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9"
          >
            Submit Test
          </Button>
        </div>
      </header>

      {submitTestMutation.isError ? (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between">
          <span>{submitTestMutation.error.message}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleForceSubmit} className="underline font-semibold text-destructive">
            Retry submission
          </Button>
        </div>
      ) : null}

      {/* ── Main Content: Question Panel + Question Navigation Sidebar ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Left: Question Box */}
        <Card className="lg:col-span-3 flex flex-col justify-between p-6 md:p-8">
          {currentQuestion ? (
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </Badge>
                  {currentQuestion.topic ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      Topic: <strong className="text-foreground">{currentQuestion.topic}</strong>
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground font-mono">
                    +{currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                  </span>
                  <Button
                    type="button"
                    variant={flaggedQuestions[currentQuestion.id] ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={toggleFlagQuestion}
                    className={`gap-1.5 ${flaggedQuestions[currentQuestion.id] ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300' : ''}`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{flaggedQuestions[currentQuestion.id] ? 'Flagged' : 'Flag'}</span>
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base md:text-lg font-medium text-card-foreground leading-relaxed">
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
                      className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors duration-150 ${isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                        : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/40'
                        }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono transition ${isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground border border-border'
                          }`}
                      >
                        {label}
                      </span>
                      <span className={`text-sm md:text-base leading-snug ${isSelected ? 'font-semibold text-foreground' : 'text-card-foreground'}`}>
                        {optionText}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No question available</p>
          )}

          {/* Navigation Bottom Controls */}
          <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={() => { setCurrentQuestionIndex((prev) => Math.max(0, prev - 1)); }}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            {currentQuestion && selectedAnswers[currentQuestion.id] !== undefined && selectedAnswers[currentQuestion.id] !== null ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAnswer}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Choice
              </Button>
            ) : null}

            {isLastQuestion ? (
              <Button
                type="button"
                onClick={() => { setShowSubmitModal(true); }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <span>Review & Submit</span>
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => { setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1)); }}
                className="gap-2"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Right: Question Palette / Overview */}
        <Card className="p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-card-foreground">Question Palette</h3>
              <span className="text-xs font-medium text-muted-foreground font-mono">
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                <span>Current</span>
              </div>
            </div>

            {/* Palette Buttons Grid */}
            <div className="grid grid-cols-5 gap-2 pt-2 max-h-[320px] overflow-y-auto">
              {questions.map((q, idx: number) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== null;
                const isFlagged = flaggedQuestions[q.id];

                let bgClass = 'bg-muted/70 text-muted-foreground hover:bg-muted';
                if (isAnswered) bgClass = 'bg-emerald-700 dark:bg-emerald-600 text-white font-semibold';
                if (isFlagged) bgClass = 'bg-amber-500 text-white font-semibold';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => { setCurrentQuestionIndex(idx); }}
                    className={`h-8 w-8 rounded-md text-xs font-mono transition-colors duration-150 cursor-pointer ${bgClass} ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                      }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground space-y-2 border border-border/60">
            <p className="font-semibold text-foreground">Integrity Rules:</p>
            <p>Answers are saved server-side immediately. If time runs out, your current answers are auto-submitted.</p>
          </div>
        </Card>
      </div>

      {/* ── Submit Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
              <Send className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Confirm Test Submission</DialogTitle>
            <DialogDescription className="text-center">
              Once submitted, your answers will be graded server-side and cannot be modified.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-center my-4 border border-border/60">
            <div className="border-r border-border pr-2">
              <p className="text-2xl font-bold text-emerald-600 font-mono">{answeredCount}</p>
              <p className="text-xs font-medium text-muted-foreground">Answered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground font-mono">
                {questions.length - answeredCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">Unanswered</p>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowSubmitModal(false); }}
            >
              Continue Test
            </Button>
            <Button
              type="button"
              disabled={submitTestMutation.isPending}
              onClick={handleForceSubmit}
              loading={submitTestMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Submit Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
