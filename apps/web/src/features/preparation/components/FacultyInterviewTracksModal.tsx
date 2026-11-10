import type { MockInterviewTemplateDto } from '@career-portal/shared-types';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  useCreateMockInterviewTemplate,
  useDeleteMockInterviewTemplate,
  useMockInterviewTemplates,
} from '../api/preparation-api';

interface FacultyInterviewTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuestionFormItem {
  id: string;
  questionText: string;
  category: string;
  difficulty: string;
}

function generateDefaultQuestions(role: string): QuestionFormItem[] {
  const roleName = role.trim() || 'Software Engineer';
  return [
    {
      id: `gen-1-${Date.now()}`,
      questionText: `Tell me about your experience and why you are interested in the ${roleName} role.`,
      category: 'behavioral',
      difficulty: 'easy',
    },
    {
      id: `gen-2-${Date.now()}`,
      questionText: `What are the core technical concepts and tools you rely on most when working as a ${roleName}?`,
      category: 'technical',
      difficulty: 'medium',
    },
    {
      id: `gen-3-${Date.now()}`,
      questionText: 'Describe a challenging bug or architecture problem you encountered and how you systematically diagnosed and resolved it.',
      category: 'technical',
      difficulty: 'hard',
    },
    {
      id: `gen-4-${Date.now()}`,
      questionText: 'How do you prioritize competing deadlines or handle ambiguous project requirements in a team setting?',
      category: 'behavioral',
      difficulty: 'medium',
    },
  ];
}

export function FacultyInterviewTracksModal({
  isOpen,
  onClose,
}: FacultyInterviewTracksModalProps): React.JSX.Element | null {
  const { data: templates = [], isLoading } = useMockInterviewTemplates();
  const createMutation = useCreateMockInterviewTemplate();
  const deleteMutation = useDeleteMockInterviewTemplate();

  const [isCreating, setIsCreating] = useState(false);
  const [roleTitle, setRoleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionFormItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setRoleTitle('');
    setDescription('');
    setQuestions(generateDefaultQuestions('Software Engineer'));
    setFormError(null);
  };

  const handleRoleTitleChange = (newRole: string) => {
    setRoleTitle(newRole);
    // Automatically update question 1 & 2 templates if they haven't been deeply customized
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[0] && updated[0].questionText.includes('interested in the')) {
        updated[0].questionText = `Tell me about your experience and why you are interested in the ${newRole.trim() || 'Software Engineer'} role.`;
      }
      if (updated[1] && updated[1].questionText.includes('working as a')) {
        updated[1].questionText = `What are the core technical concepts and tools you rely on most when working as a ${newRole.trim() || 'Software Engineer'}?`;
      }
      return updated;
    });
  };

  const handleQuestionTextChange = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx].questionText = text;
      return copy;
    });
  };

  const handleCategoryChange = (idx: number, cat: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx].category = cat;
      return copy;
    });
  };

  const handleDifficultyChange = (idx: number, diff: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx].difficulty = diff;
      return copy;
    });
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        questionText: '',
        category: 'technical',
        difficulty: 'medium',
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTrack = () => {
    setFormError(null);
    if (!roleTitle.trim()) {
      setFormError('Please enter a target role title.');
      return;
    }
    const validQuestions = questions.filter((q) => q.questionText.trim().length > 0);
    if (validQuestions.length === 0) {
      setFormError('Please provide at least one interview question.');
      return;
    }

    createMutation.mutate(
      {
        roleTitle: roleTitle.trim(),
        description: description.trim() || undefined,
        category: 'technical',
        questions: validQuestions.map((q) => ({
          questionText: q.questionText.trim(),
          category: q.category,
          difficulty: q.difficulty,
        })),
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setRoleTitle('');
          setDescription('');
          setQuestions([]);
        },
        onError: (err: any) => {
          setFormError(err.response?.data?.message || 'Failed to create interview track.');
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this interview track? Students will no longer see it.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Mock Interview Tracks</h2>
              <p className="text-xs text-slate-500">
                Curate role-specific interview tracks and tailored questions for campus placement preparation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!isCreating ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Faculty-Curated Interview Tracks</h3>
                  <p className="text-xs text-slate-500">
                    Tracks created here appear directly in the student mock interview practice module.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Interview Track</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <p className="text-xs font-medium">Loading interview tracks...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-3">
                  <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-slate-800">No Custom Tracks Created Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Students currently practice with the 6 standard industry roles. Create a track to test students on specific campus drive questions.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Plus className="h-4 w-4" /> Create First Track
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((tpl: MockInterviewTemplateDto) => (
                    <div
                      key={tpl.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition space-y-3 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{tpl.roleTitle}</h4>
                            <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold border border-indigo-200">
                              Active Track
                            </span>
                          </div>
                          {tpl.description ? (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{tpl.description}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => { handleDelete(tpl.id); }}
                          disabled={deleteMutation.isPending}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition"
                          title="Delete Track"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{tpl.questions.length} Question{tpl.questions.length === 1 ? '' : 's'}</span>
                        <span>By {tpl.creatorName || 'Faculty'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Creation Form with Auto-Generated Questions */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Role-Specific Interview Track</h3>
                  <p className="text-xs text-slate-500">
                    Type a Target Role. The system auto-generates 4 tailored questions below, which you can customize or keep as-is.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              {formError ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Target Role Title *
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => { handleRoleTitleChange(e.target.value); }}
                    placeholder="e.g. Data Scientist & ML Engineer, Flutter Developer, Cloud Architect"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">Quick suggestions:</span>
                    {['Data Engineer', 'Cybersecurity Specialist', 'iOS Developer', 'AI Prompt Engineer'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => { handleRoleTitleChange(sug); }}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded-md font-medium transition"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Track Description / Company Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); }}
                    placeholder="e.g. Curated for Zoho, TCS, and Amazon technical rounds"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      Interview Questions ({questions.length})
                    </h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      Auto-Populated
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Question
                  </button>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/70 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-700">Question {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={q.category}
                            onChange={(e) => { handleCategoryChange(idx, e.target.value); }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
                          >
                            <option value="technical">Technical</option>
                            <option value="behavioral">Behavioral</option>
                            <option value="problem_solving">Problem Solving</option>
                          </select>
                          <select
                            value={q.difficulty}
                            onChange={(e) => { handleDifficultyChange(idx, e.target.value); }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                          {questions.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => { handleRemoveQuestion(idx); }}
                              className="text-slate-400 hover:text-red-500 p-1"
                              title="Delete Question"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => { handleQuestionTextChange(idx, e.target.value); }}
                        placeholder="Type question prompt..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createMutation.isPending}
                  onClick={handleSaveTrack}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Track...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Save Interview Track</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
