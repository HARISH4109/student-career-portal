import type { ResumeAnalysisResponseDto } from '@career-portal/shared-types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  Check,
  Copy,
  Lightbulb,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';


interface ResumeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis?: ResumeAnalysisResponseDto | undefined;
  resumeTitle?: string | undefined;
}

export function ResumeAnalysisModal({
  isOpen,
  onClose,
  analysis,
  resumeTitle,
}: ResumeAnalysisModalProps): React.JSX.Element | null {
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (!isOpen || !analysis) return null;

  const {
    overallScore,
    atsScore,
    skillScore,
    keywordScore,
    missingSkills,
    improvementSuggestions,
    aiInsights,
    aiSummaryRewrite,
    modelVersion,
    analyzedAt,
  } = analysis;

  const isLlmPowered = modelVersion.startsWith('hybrid-llm');

  const handleCopySummary = async () => {
    if (aiSummaryRewrite) {
      await navigator.clipboard.writeText(aiSummaryRewrite);
      setCopiedSummary(true);
      setTimeout(() => { setCopiedSummary(false); }, 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl border border-border z-10 space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">AI Resume Intelligence</h3>
                <p className="text-xs text-muted-foreground">
                  {resumeTitle ? `Analysis for "${resumeTitle}"` : 'ATS & Keyword Optimization'} ·{' '}
                  {new Date(analyzedAt).toLocaleDateString()}
                  {isLlmPowered && (
                    <span className="ml-2 inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary border border-primary/20">
                      <Zap className="h-2.5 w-2.5" /> LLM-Powered
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-muted-foreground transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scores Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <span className="text-[11px] font-medium text-muted-foreground tracking-normal">Overall Score</span>
              <p className="text-2xl font-bold text-foreground mt-1">{overallScore}/100</p>
              <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${String(overallScore)}%` }} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <span className="text-[11px] font-medium text-muted-foreground tracking-normal">ATS Readiness</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{atsScore}%</p>
              <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${String(atsScore)}%` }} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <span className="text-[11px] font-medium text-muted-foreground tracking-normal">Technical Skills</span>
              <p className="text-2xl font-bold text-foreground mt-1">{skillScore}%</p>
              <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${String(skillScore)}%` }} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center">
              <span className="text-[11px] font-medium text-muted-foreground tracking-normal">Keywords & Verbs</span>
              <p className="text-2xl font-bold text-foreground mt-1">{keywordScore}%</p>
              <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${String(keywordScore)}%` }} />
              </div>
            </div>
          </div>

          {/* AI Deep Insights (LLM-Powered) */}
          {aiInsights.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">AI Deep Insights</h4>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border border-border">
                  AI Accelerated
                </span>
              </div>
              <div className="space-y-2">
                {aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg bg-card border border-border px-3 py-2.5 shadow-xs"
                  >
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary Rewrite */}
          {aiSummaryRewrite && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-semibold text-foreground">Suggested Professional Summary</h4>
                </div>
                <button
                  type="button"
                  onClick={() => { void (handleCopySummary)(); }}
                  className="inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy to clipboard
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-foreground leading-relaxed bg-card rounded-lg p-3 border border-border">
                {aiSummaryRewrite}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Recommendation: Paste this into your &quot;Professional Summary&quot; field in the Basics tab to improve ATS scoring.
              </p>
            </div>
          )}

          {/* Missing Skills Section */}
          {missingSkills.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Recommended Skills to Include
              </div>
              <p className="text-xs text-amber-800">
                These high-demand skills are frequently required for technical roles but missing from this resume:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 text-xs font-medium text-amber-900 border border-amber-200 shadow-xs"
                  >
                    + {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Improvement Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Actionable Suggestions</h4>
            </div>

            <div className="space-y-2.5">
              {improvementSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{item.area}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                        item.priority === 'high'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : item.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-muted/40 text-muted-foreground border-border'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer with model info */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {modelVersion && (
              <span className="text-[10px] text-muted-foreground font-mono">
                Engine: {modelVersion}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

