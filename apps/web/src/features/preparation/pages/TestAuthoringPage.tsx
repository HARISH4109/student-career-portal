import type { TestCategory } from '@career-portal/shared-types';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileQuestion,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  useAddTestQuestion,
  useAddTestSection,
  useCreateMockTest,
  useDeleteMockTest,
  useDeleteTestQuestion,
  useMockTestAuthorDetail,
  useUpdateMockTest,
} from '../api/preparation-api';

const CATEGORIES: Array<{ key: TestCategory; label: string }> = [
  { key: 'quantitative_aptitude', label: 'Quantitative Aptitude' },
  { key: 'logical_reasoning', label: 'Logical Reasoning' },
  { key: 'verbal', label: 'Verbal Ability' },
  { key: 'technical', label: 'Technical MCQ' },
  { key: 'programming', label: 'Programming' },
  { key: 'sql', label: 'SQL & Database' },
  { key: 'role_specific', label: 'Role Specific' },
];

export function TestAuthoringPage(): React.JSX.Element {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(testId);

  const { data: authorData, isLoading } = useMockTestAuthorDetail(testId || '');
  const createMutation = useCreateMockTest();
  const updateMutation = useUpdateMockTest();
  const deleteTestMutation = useDeleteMockTest();
  const addSectionMutation = useAddTestSection();
  const addQuestionMutation = useAddTestQuestion();
  const deleteQuestionMutation = useDeleteTestQuestion();

  // Test form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TestCategory>('technical');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalMarks, setTotalMarks] = useState(20);
  const [passingMarks, setPassingMarks] = useState(10);
  const [isActive, setIsActive] = useState(true);

  // New section state
  const [sectionTitle, setSectionTitle] = useState('');

  // New question form state
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    if (authorData) {
      setTitle(authorData.title);
      setDescription(authorData.description || '');
      setCategory(authorData.category as TestCategory);
      setDurationMinutes(authorData.durationMinutes);
      setTotalMarks(authorData.totalMarks);
      setPassingMarks(authorData.passingMarks);
      setIsActive(authorData.isActive);
    }
  }, [authorData]);

  const handleSaveTest = () => {
    if (!title.trim()) return;

    if (isEditing && testId) {
      updateMutation.mutate({
        id: testId,
        data: {
          title,
          description,
          category,
          durationMinutes,
          totalMarks,
          passingMarks,
          isActive,
        },
      });
    } else {
      createMutation.mutate(
        {
          title,
          description,
          category,
          durationMinutes,
          totalMarks,
          passingMarks,
          isActive,
        },
        {
          onSuccess: (created) => {
            void navigate(`/dashboard/preparation/tests/${created.id}/edit`);
          },
        },
      );
    }
  };

  const handleDeleteEntireTest = () => {
    if (!testId) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title || 'this test'}" entirely?\n\nThis will permanently remove the test, all sections, questions, answer keys, and student attempts. This cannot be undone.`,
    );
    if (!confirmed) return;

    deleteTestMutation.mutate(testId, {
      onSuccess: () => {
        void navigate('/dashboard/preparation');
      },
    });
  };

  const handleAddSection = () => {
    if (!testId || !sectionTitle.trim()) return;
    addSectionMutation.mutate(
      {
        testId,
        data: {
          title: sectionTitle,
          orderIndex: authorData?.sections?.length || 0,
        },
      },
      {
        onSuccess: () => { setSectionTitle(''); },
      },
    );
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleAddQuestion = () => {
    if (!testId || !questionText.trim()) return;
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return;

    addQuestionMutation.mutate(
      {
        testId,
        data: {
          sectionId: selectedSectionId || undefined,
          questionText,
          options: cleanOptions,
          correctAnswerIndex,
          explanation: explanation.trim() || undefined,
          marks,
          orderIndex: authorData?.questions.length || 0,
          difficulty,
          topic: topic.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setQuestionText('');
          setOptions(['', '', '', '']);
          setCorrectAnswerIndex(0);
          setExplanation('');
          setTopic('');
        },
      },
    );
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1536px] mx-auto space-y-8 pb-12">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/preparation"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tests</span>
        </Link>
        <span className="text-xs font-semibold text-primary tracking-normal">
          Faculty / Administrator Authoring
        </span>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {isEditing ? 'Manage Assessment' : 'Create New Assessment'}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Author assessment parameters, syllabus sections, question items, and protected server-side answer keys.
          </p>
        </div>

        {/* ── Test Details Form ──────────────────────────────────────────── */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-muted-foreground">Test Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              placeholder="e.g. Core Computer Science Technical MCQ"
              className="mt-1 w-full rounded-xl border border-border p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              placeholder="Provide context or syllabus outline for students..."
              className="mt-1 w-full rounded-xl border border-border p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value as TestCategory); }}
                className="mt-1 w-full rounded-xl border border-border p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground">Duration (Minutes)</label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => { setDurationMinutes(parseInt(e.target.value, 10) || 1); }}
                className="mt-1 w-full rounded-xl border border-border p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground">Passing Marks</label>
              <input
                type="number"
                min={0}
                value={passingMarks}
                onChange={(e) => { setPassingMarks(parseInt(e.target.value, 10) || 0); }}
                className="mt-1 w-full rounded-xl border border-border p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Test Status Selection (Active vs Closed) */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-muted-foreground mb-2">Test Availability Status</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setIsActive(true); }}
                className={`flex flex-col text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20'
                    : 'border-border bg-card hover:bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Active</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Visible in the student test catalog and open for candidates to take.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setIsActive(false); }}
                className={`flex flex-col text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                  !isActive
                    ? 'border-amber-600 dark:border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-1 ring-amber-500/20'
                    : 'border-border bg-card hover:bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Closed</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Hidden from students. Preserved for faculty review, editing, and authoring.
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/80">
            <button
              type="button"
              onClick={handleSaveTest}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Assessment & Add Questions'}</span>
            </button>

            {isEditing && testId ? (
              <button
                type="button"
                onClick={handleDeleteEntireTest}
                disabled={deleteTestMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Assessment</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Sections Manager (When test created) ─────────────────────────── */}
      {isEditing && testId ? (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span>Test Sections</span>
            </h2>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => { setSectionTitle(e.target.value); }}
              placeholder="e.g. Section A: Quantitative Reasoning"
              className="flex-1 rounded-xl border border-border p-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={handleAddSection}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Add Section
            </button>
          </div>

          {authorData?.sections && authorData.sections.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {authorData.sections.map((s) => (
                <span
                  key={s.id}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary border border-indigo-200"
                >
                  {s.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Question Authoring Form ──────────────────────────────────────── */}
      {isEditing && testId ? (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              <span>Add Question Item</span>
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              Answer keys stored securely in mock_test_answer_keys
            </span>
          </div>

          <div className="space-y-4">
            {authorData?.sections && authorData.sections.length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-muted-foreground">Section (Optional)</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => { setSelectedSectionId(e.target.value); }}
                  className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
                >
                  <option value="">No section</option>
                  {authorData.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-bold text-muted-foreground">Question Text</label>
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => { setQuestionText(e.target.value); }}
                placeholder="Type the question prompt..."
                className="mt-1 w-full rounded-xl border border-border p-2.5 text-sm"
              />
            </div>

            {/* Options Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted-foreground">
                Options (Select the correct radio button)
              </label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswerIndex === idx}
                    onChange={() => { setCorrectAnswerIndex(idx); }}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => { handleOptionChange(idx, e.target.value); }}
                    placeholder={`Option ${String(idx + 1)}`}
                    className="flex-1 rounded-xl border border-border p-2 text-sm"
                  />
                  {correctAnswerIndex === idx ? (
                    <span className="text-xs font-bold text-emerald-600">Correct Key</span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-muted-foreground">Marks</label>
                <input
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => { setMarks(parseInt(e.target.value, 10) || 1); }}
                  className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => { setDifficulty(e.target.value === 'easy' || e.target.value === 'hard' ? e.target.value : 'medium'); }}
                  className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground">Topic / Category</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); }}
                  placeholder="e.g. Data Structures"
                  className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground">
                Explanation (Shown after test submission)
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => { setExplanation(e.target.value); }}
                placeholder="Explain why the marked option is correct..."
                className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              disabled={addQuestionMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question to Test</span>
            </button>
          </div>

          {/* Existing questions list */}
          {authorData?.questions && authorData.questions.length > 0 ? (
            <div className="pt-6 border-t border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground">
                Existing Questions ({authorData.questions.length})
              </h3>
              <div className="space-y-3">
                {authorData.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border p-4 bg-muted/20 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">
                        {idx + 1}. {q.questionText}
                      </p>
                      <p className="text-muted-foreground">
                        Correct Answer: <strong>{q.options[q.correctAnswerIndex]}</strong> ({q.marks} Marks)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => { deleteQuestionMutation.mutate({ testId, questionId: q.id }); }}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
