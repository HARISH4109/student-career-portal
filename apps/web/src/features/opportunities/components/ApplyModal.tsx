import type { OpportunityResponseDto } from '@career-portal/shared-types';
import { FileText, Loader2, Send, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useApplyToOpportunity } from '@/features/opportunities/api/opportunities-api';
import { useResumes } from '@/features/resume/api/resume-api';

interface ApplyModalProps {
  opportunity: OpportunityResponseDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyModal({ opportunity, onClose, onSuccess }: ApplyModalProps): React.JSX.Element {
  const applyMutation = useApplyToOpportunity();
  const { data: resumes = [], isLoading: resumesLoading } = useResumes();
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverNote, setCoverNote] = useState('');

  // Auto-select primary or first resume when resumes load
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find((r) => r.isPrimary);
      if (primary) {
        setSelectedResumeId(primary.id);
      } else if (resumes[0]) {
        setSelectedResumeId(resumes[0].id);
      }
    }
  }, [resumes, selectedResumeId]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedResumeId) return;

    try {
      await applyMutation.mutateAsync({
        opportunityId: opportunity.id,
        resumeId: selectedResumeId,
        coverNote: coverNote || undefined,
      });
      onSuccess();
    } catch {
      // Error is handled by React Query
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Apply to Opportunity</h2>
            <p className="text-sm text-muted-foreground">{opportunity.title} at {opportunity.company?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => { void (handleSubmit)(event); }} className="p-6 space-y-5">
          {/* Resume selection */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground tracking-normal">
              Select Resume <span className="text-destructive">*</span>
            </label>
            {resumesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading resumes...
              </div>
            ) : resumes.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">No resumes found</p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400/80">Please create a resume first before applying.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <label
                    key={resume.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedResumeId === resume.id
                        ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resume"
                      value={resume.id}
                      checked={selectedResumeId === resume.id}
                      onChange={() => { setSelectedResumeId(resume.id); }}
                      className="h-4 w-4 text-primary focus:ring-primary bg-background"
                    />
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{resume.title}</span>
                    {resume.isPrimary && (
                      <span className="ml-auto rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 text-[10px] font-semibold text-primary font-mono">
                        Primary
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Cover note */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground tracking-normal">
              Cover Note <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <textarea
              value={coverNote}
              onChange={(e) => { setCoverNote(e.target.value); }}
              placeholder="Write a brief note to the placement team about why you're a good fit..."
              rows={4}
              maxLength={5000}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground font-mono">{coverNote.length}/5000</p>
          </div>

          {/* Error display */}
          {applyMutation.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {applyMutation.error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedResumeId || applyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary active:scale-[0.98]"
            >
              {applyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
