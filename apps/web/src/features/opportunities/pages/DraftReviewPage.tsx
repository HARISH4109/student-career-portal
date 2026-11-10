import type {
  ApproveDraftDto,
  UpdateOpportunityDraftDto,
} from '@career-portal/shared-types';
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
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm font-medium text-slate-500">Loading opportunity draft...</p>
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
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
          ? 'Opportunity successfully approved and published!'
          : 'Opportunity draft approved and saved as an internal draft!',
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { void (navigate('/dashboard/opportunities/manage')); }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Review AI Agent Extraction Draft</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  draft.status === 'pending_review'
                    ? 'bg-amber-100 text-amber-800'
                    : draft.status === 'approved' || draft.status === 'published'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {draft.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Extraction run: <span className="font-mono text-slate-700">{run?.modelUsed ?? 'n8n AI agent'}</span>
              {run?.durationMs && <span> • Duration: {run.durationMs}ms</span>}
              <span> • Submitted: {new Date(draft.createdAt).toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Confidence Pill */}
        <div className="flex items-center gap-3">
          {run?.confidenceScore != null && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-1.5 border border-slate-200">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-900">
                  {Math.round(run.confidenceScore)}% Confidence
                </div>
                <div className="text-[10px] text-slate-500">
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
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* Published Duplicate Restriction Banner */}
      {isDuplicatePublished && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">
              Published Duplicate Detected — Direct Publishing Restricted
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-rose-700">
              {draft.duplicateCheck?.similarityReason ||
                `An opportunity with title "${(draft.title ?? '')}" by "${(draft.companyName ?? '')}" is already published in the portal.`}
            </p>
            <p className="mt-1 text-xs font-medium text-rose-600">
              To prevent duplicate job postings, this draft cannot be published directly. You can uncheck "Publish immediately" to save it as an internal draft opportunity or delete this draft.
            </p>
          </div>
        </div>
      )}

      {/* Two-Column Side-by-Side Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Original Source Viewer (5 cols) ───────────────── */}
        <div className="lg:col-span-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              {isImage && <FileImage className="h-4 w-4 text-purple-600" />}
              {isPdf && <FileText className="h-4 w-4 text-rose-600" />}
              {isUrl && <Globe className="h-4 w-4 text-blue-600" />}
              {!isImage && !isPdf && !isUrl && <Mail className="h-4 w-4 text-amber-600" />}
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Original Source Content
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {draft.source?.rawContent && (
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition text-xs flex items-center gap-1"
                  title="Copy raw source"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedRaw ? 'Copied' : ''}
                </button>
              )}
            </div>
          </div>

          {/* Source Document Viewer */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
            {isImage ? (
              <div className="flex flex-col">
                <div className="flex items-center justify-end gap-1 border-b border-slate-200 bg-white p-1.5">
                  <button
                    type="button"
                    onClick={() => { setImageZoom((z) => Math.min(2.5, z + 0.25)); }}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageZoom((z) => Math.max(0.5, z - 0.25)); }}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageZoom(1); }}
                    className="rounded p-1 text-xs text-slate-500 hover:bg-slate-100"
                    title="Reset zoom"
                  >
                    Reset
                  </button>
                </div>
                <div className="max-h-[550px] overflow-auto p-4 flex items-center justify-center bg-slate-900/5">
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
                <div className="flex items-start justify-between rounded-lg bg-blue-50/60 border border-blue-100 p-3">
                  <div className="overflow-hidden pr-2">
                    <div className="text-xs font-semibold text-blue-900">Source Link</div>
                    <a
                      href={draft.source?.rawContent}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs font-medium text-blue-600 hover:underline"
                    >
                      {draft.source?.rawContent}
                    </a>
                  </div>
                  <a
                    href={draft.source?.rawContent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="text-xs text-slate-500">
                  AI extracted information directly by scraping and summarizing the web content from this link.
                </p>
              </div>
            ) : (
              <div className="p-4 max-h-[550px] overflow-auto font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-indigo-100">
                {draft.source?.rawContent}
              </div>
            )}
          </div>

          {/* AI Metadata & JSON Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => { setShowRawJson(!showRawJson); }}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {showRawJson ? 'Hide raw extraction JSON' : 'View raw extraction JSON'}
            </button>
            {showRawJson && (
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] font-mono text-emerald-400">
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
        <div className="lg:col-span-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Duplicate Detection Alert Banner */}
          {isDuplicate && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Potential Duplicate Detected</h4>
                  <p className="mt-1 text-xs text-amber-800">
                    {draft.duplicateCheck?.similarityReason ??
                      'An opportunity with a very similar title and company already exists in the system.'}
                  </p>
                  {draft.duplicateCheck?.matchedOpportunityId && (
                    <button
                      type="button"
                      onClick={() =>
                        { void (navigate(`/dashboard/opportunities/${draft.duplicateCheck?.matchedOpportunityId ?? ''}`)); }
                      }
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline hover:text-amber-700"
                    >
                      <ExternalLink className="h-3 w-3" /> View Existing Opportunity
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Editable Opportunity Information
            </h2>
            <span className="text-xs text-slate-400">Review and modify before approving</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opportunity Title / Role <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); }}
                placeholder="e.g. Graduate Software Engineer"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); }}
                  placeholder="e.g. Microsoft"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opportunity Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value as 'job' | 'internship'); }}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="job">Full-time Job</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => { setWorkMode(e.target.value as 'onsite' | 'remote' | 'hybrid'); }}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); }}
                  placeholder="e.g. Bangalore, India"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Compensation Mode Selector */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                    compensationType === 'paid'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>💰</span> Paid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompensationType('unpaid');
                    setSalaryMin('0');
                    setSalaryMax('0');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                    compensationType === 'unpaid'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>🎁</span> Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompensationType('not_disclosed');
                    setSalaryMin('');
                    setSalaryMax('');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                    compensationType === 'not_disclosed'
                      ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>⚪</span> Not Provided
                </button>
              </div>
            </div>

            {/* Conditional Inputs based on Compensation Type */}
            {compensationType === 'paid' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {type === 'job' ? 'Min Salary (₹ / Annual)' : 'Min Stipend (₹ / Monthly)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      value={salaryMin}
                      onChange={(e) => { setSalaryMin(e.target.value); }}
                      placeholder="e.g. 600000"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {type === 'job' ? 'Max Salary (₹ / Annual)' : 'Max Stipend (₹ / Monthly)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      value={salaryMax}
                      onChange={(e) => { setSalaryMax(e.target.value); }}
                      placeholder="e.g. 1200000"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </>
            ) : compensationType === 'unpaid' ? (
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎁</span>
                  <div>
                    <span className="font-semibold">Marked as Unpaid Opportunity</span>
                    <p className="text-[11px] text-emerald-700/80">
                      This opportunity will clearly display an &quot;Unpaid&quot; badge to students.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCompensationType('paid'); }}
                  className="ml-2 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
                >
                  Change to Paid
                </button>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">ℹ️</span>
                  <div>
                    <span className="font-semibold">Salary Not Disclosed / Not Provided</span>
                    <p className="text-[11px] text-amber-700/80">
                      Will display &quot;Not Provided&quot; to students. Compensation details can be discussed during interview.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCompensationType('paid'); }}
                  className="ml-2 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
                >
                  Add Salary
                </button>
              </div>
            )}

            {/* Application Deadline */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application Deadline
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => { setApplicationDeadline(e.target.value); }}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Apply URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Direct Apply URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="url"
                  value={applyUrl}
                  onChange={(e) => { setApplyUrl(e.target.value); }}
                  placeholder="https://company.com/apply"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Application Email */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application Email (if applicable)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={applicationEmail}
                  onChange={(e) => { setApplicationEmail(e.target.value); }}
                  placeholder="careers@company.com"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Extracted Skills Section */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Extracted Skills & Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => { handleRemoveSkill(skill); }}
                    className="rounded p-0.5 hover:bg-indigo-100 text-indigo-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-slate-400 italic">No skills listed yet</span>
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
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Extracted Eligibility Criteria
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Min CGPA</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={minCgpa}
                  onChange={(e) => { setMinCgpa(e.target.value); }}
                  placeholder="e.g. 7.5"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Department Codes</label>
                <input
                  type="text"
                  value={departmentCodes}
                  onChange={(e) => { setDepartmentCodes(e.target.value); }}
                  placeholder="CSE, ECE, IT"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Eligible Batches</label>
                <input
                  type="text"
                  value={allowedBatches}
                  onChange={(e) => { setAllowedBatches(e.target.value); }}
                  placeholder="2025, 2026"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Description & Responsibilities <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={8}
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Paste or edit the full job description, qualifications, and requirements..."
            />
          </div>
        </div>
      </div>

      {/* ── Sticky Action Bar ────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { void (handleSaveDraft)(); }}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-500" />
            )}
            Save Changes
          </button>

          <button
            type="button"
            onClick={() => { void (handleDeleteDraft)(); }}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-rose-600 shadow-sm hover:border-red-200 hover:bg-red-50 disabled:opacity-50 transition"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50 transition"
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject Draft
              </button>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                {isDuplicatePublished && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700"
                    title={draft.duplicateCheck?.similarityReason ?? 'A published opportunity with this title and company already exists in the portal.'}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    Published Duplicate (Publish Restricted)
                  </span>
                )}

                <label
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    isDuplicatePublished ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 cursor-pointer'
                  }`}
                  title={isDuplicatePublished ? 'Disabled: A published duplicate already exists in the portal.' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    disabled={isDuplicatePublished}
                    onChange={(e) => { setPublishImmediately(e.target.checked); }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <span className={isDuplicatePublished ? 'line-through text-slate-400' : ''}>
                    Publish immediately
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => { void (handleApprove)(); }}
                  disabled={approveMutation.isPending || (publishImmediately && isDuplicatePublished)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
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
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">Reject Opportunity Draft</h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsRejectModalOpen(false); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(event) => { void (handleReject)(event); }} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                Please provide a mandatory reason for rejecting this AI extraction draft. This will be
                logged in the system audit trail.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); }}
                  placeholder="e.g. Duplicate posting, unauthorized circular, or illegible flyer scan..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRejectModalOpen(false); }}
                  disabled={rejectMutation.isPending}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
