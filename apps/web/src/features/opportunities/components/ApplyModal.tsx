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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Apply to Opportunity</h2>
            <p className="text-sm text-slate-500">{opportunity.title} at {opportunity.company?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => { void (handleSubmit)(event); }} className="p-6 space-y-5">
          {/* Resume selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Select Resume <span className="text-red-500">*</span>
            </label>
            {resumesLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resumes...
              </div>
            ) : resumes.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <p className="font-medium">No resumes found</p>
                <p className="mt-1 text-xs">Please create a resume first before applying.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <label
                    key={resume.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      selectedResumeId === resume.id
                        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resume"
                      value={resume.id}
                      checked={selectedResumeId === resume.id}
                      onChange={() => { setSelectedResumeId(resume.id); }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-400"
                    />
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{resume.title}</span>
                    {resume.isPrimary && (
                      <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
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
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Cover Note <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={coverNote}
              onChange={(e) => { setCoverNote(e.target.value); }}
              placeholder="Write a brief note to the placement team about why you're a good fit..."
              rows={4}
              maxLength={5000}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{coverNote.length}/5000</p>
          </div>

          {/* Error display */}
          {applyMutation.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {applyMutation.error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedResumeId || applyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
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
