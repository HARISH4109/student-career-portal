import type { MockInterviewTemplateDto } from '@career-portal/shared-types';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Loader2,
  Plus,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl bg-card shadow-xl border border-border overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-[#B9903B]" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold text-foreground">Manage Mock Interview Tracks</h2>
              <p className="text-xs text-muted-foreground">
                Curate role-specific interview tracks and questions for student placement preparation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!isCreating ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-foreground">Faculty-Curated Tracks</h3>
                  <p className="text-xs text-muted-foreground">
                    Tracks created here appear directly in the student mock interview practice module.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Interview Track</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-xs font-medium">Loading interview tracks...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-border/70 p-8 text-center space-y-2.5 bg-muted/10">
                  <Briefcase className="mx-auto h-6 w-6 text-muted-foreground" />
                  <h4 className="text-xs font-semibold text-foreground">No Custom Tracks Created Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Students currently practice with the 6 standard industry roles. Create a track to test students on specific campus drive questions.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border/80 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create First Track
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {templates.map((tpl: MockInterviewTemplateDto) => (
                    <div
                      key={tpl.id}
                      className="rounded-xl border border-border/70 bg-card p-4 shadow-xs hover:border-border transition-colors space-y-2.5 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-foreground">{tpl.roleTitle}</h4>
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Active Track
                            </span>
                          </div>
                          {tpl.description ? (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => { handleDelete(tpl.id); }}
                          disabled={deleteMutation.isPending}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Delete Track"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
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
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                <div>
                  <h3 className="text-xs font-semibold text-foreground">New Role-Specific Interview Track</h3>
                  <p className="text-xs text-muted-foreground">
                    Enter a Target Role. The system generates 4 tailored questions below, which you can customize.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {formError ? (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground">
                    Target Role Title *
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => { handleRoleTitleChange(e.target.value); }}
                    placeholder="e.g. Data Scientist, Flutter Developer, Cloud Architect"
                    className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">Quick suggestions:</span>
                    {['Data Engineer', 'Cybersecurity Specialist', 'iOS Developer', 'Cloud Engineer'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => { handleRoleTitleChange(sug); }}
                        className="text-[10px] bg-muted/40 hover:bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground">
                    Track Description / Company Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); }}
                    placeholder="e.g. Curated for Zoho, TCS, and Amazon technical rounds"
                    className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-foreground">
                      Interview Questions ({questions.length})
                    </h4>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium font-mono">
                      Auto-Populated
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Question
                  </button>
                </div>

                <div className="space-y-2.5">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground font-mono">Question {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={q.category}
                            onChange={(e) => { handleCategoryChange(idx, e.target.value); }}
                            className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground focus:outline-none"
                          >
                            <option value="technical">Technical</option>
                            <option value="behavioral">Behavioral</option>
                            <option value="problem_solving">Problem Solving</option>
                          </select>
                          <select
                            value={q.difficulty}
                            onChange={(e) => { handleDifficultyChange(idx, e.target.value); }}
                            className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground focus:outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                          {questions.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => { handleRemoveQuestion(idx); }}
                              className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer"
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
                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3.5 border-t border-border/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); }}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createMutation.isPending}
                  onClick={handleSaveTrack}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Track...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
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
