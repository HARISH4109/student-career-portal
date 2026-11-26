import type {
  ApproveDraftDto,
  UpdateOpportunityDraftDto,
} from '@career-portal/shared-types';
import { safeHref } from '@/shared/lib/safe-url';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  FileImage,
  FileText,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  useApproveDraft,
  useDeleteDraft,
  useOpportunityDraft,
  useRejectDraft,
  useRetryExtraction,
  useUpdateDraft,
} from '@/features/opportunities/api/opportunities-api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/shared/components/ui';

export function DraftReviewPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: draft, isLoading, isError, refetch } = useOpportunityDraft(id ?? '');
  const updateMutation = useUpdateDraft();
  const approveMutation = useApproveDraft();
  const rejectMutation = useRejectDraft();
  const retryMutation = useRetryExtraction();
  const deleteMutation = useDeleteDraft();

  // Form State
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState<'job' | 'internship'>('job');
  const [workMode, setWorkMode] = useState<'onsite' | 'remote' | 'hybrid'>('onsite');
  const [location, setLocation] = useState('');
  const [compensationType, setCompensationType] = useState<'paid' | 'unpaid' | 'not_disclosed'>('paid');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Eligibility state
  const [minCgpa, setMinCgpa] = useState<string>('');
  const [departmentCodes, setDepartmentCodes] = useState<string>('');
  const [allowedBatches, setAllowedBatches] = useState<string>('');

  // Source Viewer state
  const [imageZoom, setImageZoom] = useState(1);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Approval / Rejection Modal States
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Populate form state when draft is loaded
  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title ?? '');
    setCompanyName(draft.companyName ?? '');
    setType(draft.type ?? 'job');
    setWorkMode(draft.workMode ?? 'onsite');
    setLocation(draft.location ?? '');
    if (draft.salaryMin === 0 || draft.salaryMax === 0) {
      setCompensationType('unpaid');
      setSalaryMin('0');
      setSalaryMax('0');
    } else if (draft.salaryMin != null || draft.salaryMax != null) {
      setCompensationType('paid');
      setSalaryMin(draft.salaryMin != null ? String(draft.salaryMin) : '');
      setSalaryMax(draft.salaryMax != null ? String(draft.salaryMax) : '');
    } else {
      setCompensationType('not_disclosed');
      setSalaryMin('');
      setSalaryMax('');
    }
    setApplicationDeadline(
      draft.applicationDeadline ? draft.applicationDeadline.split('T')[0] ?? '' : '',
    );
    setApplyUrl(draft.applyUrl ?? '');
    setApplicationEmail(draft.applicationEmail ?? '');
    setDescription(draft.description ?? '');
    setSkills(draft.extractedSkills);

    const elig = draft.extractedEligibility;
    setMinCgpa(elig.minCgpa != null ? String(elig.minCgpa) : '');
    setDepartmentCodes(
      Array.isArray(elig.departmentCodes) ? elig.departmentCodes.join(', ') : '',
    );
    setAllowedBatches(
      Array.isArray(elig.allowedBatches) ? elig.allowedBatches.join(', ') : '',
    );
    if (draft.duplicateCheck?.isDuplicate && draft.duplicateCheck.matchedOpportunityId) {
      setPublishImmediately(false);
    }
  }, [draft]);

  const isDuplicatePublished = Boolean(
    draft?.duplicateCheck?.isDuplicate && draft.duplicateCheck.matchedOpportunityId,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium text-muted-foreground font-mono">Loading opportunity draft...</p>
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-3 text-lg font-bold text-red-900">Draft Not Found</h2>
          <p className="mt-1 text-sm text-red-700">
            This opportunity draft does not exist or you do not have permission to view it.
          </p>
          <button
            type="button"
            onClick={() => { void (navigate('/dashboard/opportunities/manage')); }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Review Queue
          </button>
        </div>
      </div>
    );
  }

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveDraft = async () => {
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    let finalSalaryMin: number | null = null;
    let finalSalaryMax: number | null = null;
    if (compensationType === 'unpaid') {
      finalSalaryMin = 0;
      finalSalaryMax = 0;
    } else if (compensationType === 'paid') {
      finalSalaryMin = salaryMin !== '' && !isNaN(Number(salaryMin)) ? Number(salaryMin) : null;
      finalSalaryMax = salaryMax !== '' && !isNaN(Number(salaryMax)) ? Number(salaryMax) : null;
    } else {
      finalSalaryMin = null;
      finalSalaryMax = null;
    }

    const eligPayload = {
      ...(draft.extractedEligibility),
      minCgpa: minCgpa ? Number(minCgpa) : null,
      departmentCodes: departmentCodes
        ? departmentCodes.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      allowedBatches: allowedBatches
        ? allowedBatches.split(',').map((b) => Number(b.trim())).filter((n) => !isNaN(n))
        : [],
    };

    const updatePayload: UpdateOpportunityDraftDto = {
      title,
      companyName,
      type,
      workMode,
      location: location || null,
      salaryMin: finalSalaryMin,
      salaryMax: finalSalaryMax,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : null,
      applyUrl: applyUrl || null,
      applicationEmail: applicationEmail || null,
      description,
      extractedSkills: skills,
      extractedEligibility: eligPayload,
    };

    try {
      await updateMutation.mutateAsync({ id: draft.id, data: updatePayload });
      setActionSuccessMessage('Draft changes saved successfully.');
      setTimeout(() => { setActionSuccessMessage(null); }, 3000);
      return true;
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Failed to save draft changes');
      return false;
    }
  };

  const handleApprove = async () => {
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    // Strictly restrict publishing if duplicate published opportunity exists
    if (publishImmediately && isDuplicatePublished) {
      setActionErrorMessage(
        `Publishing restricted: An active opportunity ("${(draft.duplicateCheck?.matchedTitle ?? '')}" at "${(draft.duplicateCheck?.matchedCompanyName ?? '')}") is already published. To prevent duplicate postings, direct publishing is restricted. Please uncheck "Publish immediately" to save this as a draft opportunity or delete this draft.`,
      );
      return;
    }

    // First auto-save any pending changes
    if (!(await handleSaveDraft())) return;

    const approvePayload: ApproveDraftDto = {
      publishImmediately,
    };

    try {
      await approveMutation.mutateAsync({ id: draft.id, data: approvePayload });
      setActionSuccessMessage(
        publishImmediately
          ? 'Opportunity successfully approved and published.'
          : 'Opportunity draft approved and saved as an internal draft.',
      );
      setTimeout(() => {
        void navigate('/dashboard/opportunities/manage');
      }, 1200);
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete draft "${draft.title || 'Untitled'}"? This will delete the extracted content and cannot be undone.`)) {
      return;
    }
    setActionErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(draft.id);
      void navigate('/dashboard/opportunities/manage');
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Failed to delete draft');
    }
  };

  const handleReject = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      await rejectMutation.mutateAsync({
        id: draft.id,
        data: { reason: rejectReason.trim() },
      });
      setIsRejectModalOpen(false);
      setActionSuccessMessage('Draft rejected.');
      setTimeout(() => {
        void navigate('/dashboard/opportunities/manage');
      }, 1000);
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  const handleRetry = async () => {
    try {
      await retryMutation.mutateAsync(draft.id);
      void refetch();
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  const handleCopyRaw = () => {
    if (draft.source?.rawContent) {
      void navigator.clipboard.writeText(draft.source.rawContent);
      setCopiedRaw(true);
      setTimeout(() => { setCopiedRaw(false); }, 2000);
    }
  };

  const run = draft.extractionRun;
  const isImage = draft.source?.sourceType === 'image';
  const isPdf = draft.source?.sourceType === 'pdf';
  const isUrl = draft.source?.sourceType === 'url';
  const isDuplicate = Boolean(draft.duplicateCheck?.isDuplicate);
  const isApproved = draft.status === 'approved' || draft.status === 'published';
  const isRejected = draft.status === 'rejected';

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { void (navigate('/dashboard/opportunities/manage')); }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Review AI Agent Extraction Draft</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-normal ${
                  draft.status === 'pending_review'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                    : draft.status === 'approved' || draft.status === 'published'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-destructive/15 text-destructive border border-destructive/30'
                }`}
              >
                {draft.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground font-mono">
              Extraction run: <span className="text-foreground">{run?.modelUsed ?? 'n8n AI agent'}</span>
              {run?.durationMs && <span> • Duration: {run.durationMs}ms</span>}
              <span> • Submitted: {new Date(draft.createdAt).toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Confidence Pill */}
        <div className="flex items-center gap-3">
          {run?.confidenceScore != null && (
            <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-1.5 border border-border">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground font-mono">
                  {Math.round(run.confidenceScore)}% Confidence
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {run.confidenceScore >= 80
                    ? 'High precision match'
                    : run.confidenceScore >= 50
                    ? 'Verify extracted details'
                    : 'Low score — verify all fields'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/15 border border-destructive/30 p-3.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* Published Duplicate Restriction Banner */}
      {isDuplicatePublished && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-destructive">
              Published Duplicate Detected — Direct Publishing Restricted
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-destructive/90">
              {draft.duplicateCheck?.similarityReason ||
                `An opportunity with title "${(draft.title ?? '')}" by "${(draft.companyName ?? '')}" is already published in the portal.`}
            </p>
            <p className="mt-1 text-xs font-medium text-destructive/80">
              To prevent duplicate job postings, this draft cannot be published directly. You can uncheck "Publish immediately" to save it as an internal draft opportunity or delete this draft.
            </p>
          </div>
        </div>
      )}

      {/* Two-Column Side-by-Side Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Original Source Viewer (5 cols) ───────────────── */}
        <div className="lg:col-span-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              {isImage && <FileImage className="h-4 w-4 text-purple-400" />}
              {isPdf && <FileText className="h-4 w-4 text-destructive" />}
              {isUrl && <Globe className="h-4 w-4 text-primary" />}
              {!isImage && !isPdf && !isUrl && <Mail className="h-4 w-4 text-amber-700 dark:text-amber-400" />}
              <h2 className="text-sm font-bold tracking-normal text-foreground">
                Original Source Content
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {draft.source?.rawContent && (
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition text-xs flex items-center gap-1"
                  title="Copy raw source"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedRaw ? 'Copied' : ''}
                </button>
              )}
            </div>
          </div>

          {/* Source Document Viewer */}
          <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
            {isImage ? (
              <div className="flex flex-col">
                <div className="flex items-center justify-end gap-1 border-b border-border bg-card p-1.5">
                  <button
                    type="button"
                    onClick={() => { setImageZoom((z) => Math.min(2.5, z + 0.25)); }}
                    className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageZoom((z) => Math.max(0.5, z - 0.25)); }}
                    className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageZoom(1); }}
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    title="Reset zoom"
                  >
                    Reset
                  </button>
                </div>
                <div className="max-h-[550px] overflow-auto p-4 flex items-center justify-center bg-background/50">
                  <img
                    src={draft.source?.rawContent}
                    alt="Original opportunity flyer"
                    style={{ transform: `scale(${String(imageZoom)})`, transformOrigin: 'top center' }}
                    className="max-w-full rounded shadow-sm transition-transform duration-150"
                  />
                </div>
              </div>
            ) : isUrl ? (
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <div className="overflow-hidden pr-2">
                    <div className="text-xs font-semibold text-primary">Source Link</div>
                    <a
                      href={safeHref(draft.source?.rawContent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs font-medium text-primary hover:underline"
                    >
                      {draft.source?.rawContent}
                    </a>
                  </div>
                  <a
                    href={safeHref(draft.source?.rawContent)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI extracted information directly by scraping and summarizing the web content from this link.
                </p>
              </div>
            ) : (
              <div className="p-4 max-h-[550px] overflow-auto font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap selection:bg-primary/20">
                {draft.source?.rawContent}
              </div>
            )}
          </div>

          {/* AI Metadata & JSON Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => { setShowRawJson(!showRawJson); }}
              className="text-xs text-primary hover:underline font-medium"
            >
              {showRawJson ? 'Hide raw extraction JSON' : 'View raw extraction JSON'}
            </button>
            {showRawJson && (
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-background border border-border p-3 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                {JSON.stringify(
                  {
                    status: draft.status,
                    extractionRun: draft.extractionRun,
                    extractedEligibility: draft.extractedEligibility,
                    extractedSkills: draft.extractedSkills,
                    duplicateCheck: draft.duplicateCheck,
                  },
                  null,
                  2,
                )}
              </pre>
            )}
          </div>
        </div>

        {/* ── Right Column: Editable Draft Fields (7 cols) ───────────────── */}
        <div className="lg:col-span-7 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* Duplicate Detection Alert Banner */}
          {isDuplicate && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Potential Duplicate Detected</h4>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400/90">
                    {draft.duplicateCheck?.similarityReason ??
                      'An opportunity with a very similar title and company already exists in the system.'}
                  </p>
                  {draft.duplicateCheck?.matchedOpportunityId && (
                    <button
                      type="button"
                      onClick={() =>
                        { void (navigate(`/dashboard/opportunities/${draft.duplicateCheck?.matchedOpportunityId ?? ''}`)); }
                      }
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 underline hover:text-amber-300"
                    >
                      <ExternalLink className="h-3 w-3" /> View Existing Opportunity
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold tracking-normal text-foreground">
              Editable Opportunity Information
            </h2>
            <span className="text-xs text-muted-foreground">Review and modify before approving</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
                Opportunity Title / Role <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); }}
                placeholder="e.g. Graduate Software Engineer"
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
                Company Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); }}
                  placeholder="e.g. Microsoft"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
                Opportunity Type <span className="text-destructive">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value as 'job' | 'internship'); }}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="job">Full-time Job</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => { setWorkMode(e.target.value as 'onsite' | 'remote' | 'hybrid'); }}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); }}
                  placeholder="e.g. Bangalore, India"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Compensation Mode Selector */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground tracking-normal">
                Compensation / {type === 'job' ? 'Salary' : 'Stipend'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompensationType('paid');
                    if (salaryMin === '0') setSalaryMin('');
                    if (salaryMax === '0') setSalaryMax('');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    compensationType === 'paid'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompensationType('unpaid');
                    setSalaryMin('0');
                    setSalaryMax('0');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    compensationType === 'unpaid'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompensationType('not_disclosed');
                    setSalaryMin('');
                    setSalaryMax('');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    compensationType === 'not_disclosed'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-xs ring-1 ring-amber-500/20'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  Not Provided
                </button>
              </div>
            </div>

            {/* Conditional Inputs based on Compensation Type */}
            {compensationType === 'paid' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {type === 'job' ? 'Min Salary (₹ / Annual)' : 'Min Stipend (₹ / Monthly)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      value={salaryMin}
                      onChange={(e) => { setSalaryMin(e.target.value); }}
                      placeholder="e.g. 600000"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {type === 'job' ? 'Max Salary (₹ / Annual)' : 'Max Stipend (₹ / Monthly)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      value={salaryMax}
                      onChange={(e) => { setSalaryMax(e.target.value); }}
                      placeholder="e.g. 1200000"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </>
            ) : compensationType === 'unpaid' ? (
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <span className="font-semibold">Marked as Unpaid Opportunity</span>
                    <p className="text-[11px] text-emerald-500/80">
                      This opportunity will clearly display an &quot;Unpaid&quot; badge to students.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCompensationType('paid'); }}
                  className="ml-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-300"
                >
                  Change to Paid
                </button>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">Salary Not Disclosed / Not Provided</span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/80">
                      Will display &quot;Not Provided&quot; to students. Compensation details can be discussed during interview.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCompensationType('paid'); }}
                  className="ml-2 text-xs font-semibold text-amber-700 dark:text-amber-400 underline hover:text-amber-300"
                >
                  Add Salary
                </button>
              </div>
            )}

            {/* Application Deadline */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
                Application Deadline
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => { setApplicationDeadline(e.target.value); }}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Apply URL */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
                Direct Apply URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  value={applyUrl}
                  onChange={(e) => { setApplyUrl(e.target.value); }}
                  placeholder="https://company.com/apply"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Application Email */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
                Application Email (if applicable)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={applicationEmail}
                  onChange={(e) => { setApplicationEmail(e.target.value); }}
                  placeholder="careers@company.com"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Extracted Skills Section */}
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-2">
              Extracted Skills & Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary border border-primary/25"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => { handleRemoveSkill(skill); }}
                    className="rounded p-0.5 hover:bg-primary/20 text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No skills listed yet</span>
              )}
            </div>

            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => { setNewSkillInput(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a required skill..."
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary flex-1"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex items-center gap-1 rounded-lg bg-muted border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-2">
              Extracted Eligibility Criteria
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Min CGPA</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={minCgpa}
                  onChange={(e) => { setMinCgpa(e.target.value); }}
                  placeholder="e.g. 7.5"
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Department Codes</label>
                <input
                  type="text"
                  value={departmentCodes}
                  onChange={(e) => { setDepartmentCodes(e.target.value); }}
                  placeholder="CSE, ECE, IT"
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Eligible Batches</label>
                <input
                  type="text"
                  value={allowedBatches}
                  onChange={(e) => { setAllowedBatches(e.target.value); }}
                  placeholder="2025, 2026"
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-semibold text-muted-foreground tracking-normal mb-1">
              Job Description & Responsibilities <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              rows={8}
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              className="w-full rounded-lg border border-border bg-background p-3 text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Paste or edit the full job description, qualifications, and requirements..."
            />
          </div>
        </div>
      </div>

      {/* ── Sticky Action Bar ────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { void (handleSaveDraft)(); }}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/40 disabled:opacity-50 transition"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            Save Changes
          </button>

          <button
            type="button"
            onClick={() => { void (handleDeleteDraft)(); }}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-destructive shadow-sm hover:border-destructive/30 hover:bg-destructive/10 disabled:opacity-50 transition"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete Draft
          </button>

          {run?.status === 'failed' && (
            <button
              type="button"
              onClick={() => { void (handleRetry)(); }}
              disabled={retryMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 shadow-sm hover:bg-amber-500/20 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
              Retry Extraction
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isApproved && !isRejected && (
            <>
              <button
                type="button"
                onClick={() => { setIsRejectModalOpen(true); }}
                disabled={rejectMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 transition"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject Draft
              </button>

              <div className="flex items-center gap-2 border-l border-border pl-3">
                {isDuplicatePublished && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-destructive/10 border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive"
                    title={draft.duplicateCheck?.similarityReason ?? 'A published opportunity with this title and company already exists in the portal.'}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Published Duplicate (Publish Restricted)
                  </span>
                )}

                <label
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    isDuplicatePublished ? 'text-muted-foreground/60 cursor-not-allowed' : 'text-muted-foreground cursor-pointer'
                  }`}
                  title={isDuplicatePublished ? 'Disabled: A published duplicate already exists in the portal.' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    disabled={isDuplicatePublished}
                    onChange={(e) => { setPublishImmediately(e.target.checked); }}
                    className="rounded border-border text-primary focus:ring-primary bg-background disabled:opacity-50"
                  />
                  <span className={isDuplicatePublished ? 'line-through text-muted-foreground/60' : ''}>
                    Publish immediately
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => { void (handleApprove)(); }}
                  disabled={approveMutation.isPending || (publishImmediately && isDuplicatePublished)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition active:scale-[0.98]"
                  title={
                    publishImmediately && isDuplicatePublished
                      ? 'Publishing is restricted because a duplicate opportunity is already published.'
                      : undefined
                  }
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {publishImmediately ? 'Approve & Publish Opportunity' : 'Approve as Draft Opportunity'}
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {isApproved && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Approved & Opportunity Created
            </div>
          )}

          {isRejected && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-800">
              <XCircle className="h-4 w-4" /> Rejected ({draft.reviewNotes ?? 'No notes'})
            </div>
          )}
        </div>
      </div>

      {/* ── Reject Modal (Mandatory Reason Requirement) ────────────────── */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle>Reject Opportunity Draft</DialogTitle>
            </div>
            <DialogDescription>
              Please provide a mandatory reason for rejecting this AI extraction draft. This will be
              logged in the system audit trail.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(event) => { void (handleReject)(event); }} className="space-y-4 my-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Rejection Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                required
                rows={4}
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); }}
                placeholder="e.g. Duplicate posting, unauthorized circular, or illegible flyer scan..."
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsRejectModalOpen(false); }}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                loading={rejectMutation.isPending}
                className="gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Confirm Rejection</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
