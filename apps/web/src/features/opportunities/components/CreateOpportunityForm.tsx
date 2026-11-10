import type {
  CreateOpportunityDto,
  EligibilityCriterion,
  OpportunityResponseDto,
  OpportunitySkillInput,
} from '@career-portal/shared-types';
import {
  AlertTriangle,
  Briefcase,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  useCompanies,
  useCreateOpportunity,
  useOpportunities,
  useUpdateOpportunity,
  useUpdateOpportunityStatus,
} from '@/features/opportunities/api/opportunities-api';
import {
  useBatches,
  useDepartments,
  usePrograms,
  useSkillsCatalog,
} from '@/features/student/api/student-api';

interface CreateOpportunityFormProps {
  onClose: () => void;
  onSuccess: () => void;
  opportunity?: OpportunityResponseDto | null;
}

export function CreateOpportunityForm({
  onClose,
  onSuccess,
  opportunity,
}: CreateOpportunityFormProps): React.JSX.Element {
  const isEditing = Boolean(opportunity);
  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity();
  const { data: allOppsData } = useOpportunities({ pageSize: 100 });
  const existingOpportunities = allOppsData?.data ?? [];

  // Reference data hooks
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();
  const { data: batches = [] } = useBatches();
  const { data: skillsCatalog = [] } = useSkillsCatalog();

  // Basic Form State (pre-filled if in edit mode)
  const [title, setTitle] = useState(opportunity?.title ?? '');
  const [type, setType] = useState<'job' | 'internship'>(opportunity?.type ?? 'job');
  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('existing');
  const [companyId, setCompanyId] = useState(opportunity?.companyId ?? '');
  const [companyName, setCompanyName] = useState(opportunity?.company?.name ?? '');
  const [description, setDescription] = useState(opportunity?.description ?? '');
  const [workMode, setWorkMode] = useState<'onsite' | 'remote' | 'hybrid'>(opportunity?.workMode ?? 'onsite');
  const [location, setLocation] = useState(opportunity?.location ?? '');
  const [compensationType, setCompensationType] = useState<'paid' | 'unpaid' | 'not_disclosed'>(() => {
    if (opportunity?.salaryMin === 0 || opportunity?.salaryMax === 0) return 'unpaid';
    if (opportunity?.salaryMin != null || opportunity?.salaryMax != null) return 'paid';
    return 'not_disclosed';
  });
  const [salaryMin, setSalaryMin] = useState(
    opportunity?.salaryMin != null && opportunity.salaryMin > 0 ? String(opportunity.salaryMin) : '',
  );
  const [salaryMax, setSalaryMax] = useState(
    opportunity?.salaryMax != null && opportunity.salaryMax > 0 ? String(opportunity.salaryMax) : '',
  );
  const [applicationDeadline, setApplicationDeadline] = useState(
    opportunity?.applicationDeadline ? opportunity.applicationDeadline.slice(0, 16) : '',
  );
  const [applyUrl, setApplyUrl] = useState(opportunity?.applyUrl ?? '');
  const [applicationEmail, setApplicationEmail] = useState(opportunity?.applicationEmail ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (opportunity) {
      setTitle(opportunity.title);
      setType(opportunity.type);
      setCompanyMode('existing');
      setCompanyId(opportunity.companyId);
      setCompanyName(opportunity.company?.name ?? '');
      setDescription(opportunity.description);
      setWorkMode(opportunity.workMode);
      setLocation(opportunity.location ?? '');
      if (opportunity.salaryMin === 0 || opportunity.salaryMax === 0) {
        setCompensationType('unpaid');
      } else if (opportunity.salaryMin != null || opportunity.salaryMax != null) {
        setCompensationType('paid');
      } else {
        setCompensationType('not_disclosed');
      }
      setSalaryMin(opportunity.salaryMin != null && opportunity.salaryMin > 0 ? String(opportunity.salaryMin) : '');
      setSalaryMax(opportunity.salaryMax != null && opportunity.salaryMax > 0 ? String(opportunity.salaryMax) : '');
      setApplicationDeadline(opportunity.applicationDeadline ? opportunity.applicationDeadline.slice(0, 16) : '');
      setApplyUrl(opportunity.applyUrl ?? '');
      setApplicationEmail(opportunity.applicationEmail ?? '');
      if (opportunity.skills.length > 0) {
        setSelectedSkills(opportunity.skills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })));
      }
      if (opportunity.eligibility.length > 0) {
        setEligibilityList(
          opportunity.eligibility.map((e) => ({
            departmentId: e.departmentId || undefined,
            programId: e.programId || undefined,
            batchId: e.batchId || undefined,
            minCgpa: e.minCgpa != null ? e.minCgpa : undefined,
          })),
        );
      }
    }
  }, [opportunity]);

  // Skills state (pre-filled if in edit mode)
  const [selectedSkills, setSelectedSkills] = useState<OpportunitySkillInput[]>(() => {
    if (opportunity?.skills && opportunity.skills.length > 0) {
      return opportunity.skills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired }));
    }
    return [];
  });
  const [skillSearch, setSkillSearch] = useState('');

  // Eligibility state (pre-filled if in edit mode)
  const [eligibilityList, setEligibilityList] = useState<EligibilityCriterion[]>(() => {
    if (opportunity?.eligibility && opportunity.eligibility.length > 0) {
      return opportunity.eligibility.map((e) => ({
        departmentId: e.departmentId || undefined,
        programId: e.programId || undefined,
        batchId: e.batchId || undefined,
        minCgpa: e.minCgpa != null ? e.minCgpa : undefined,
      }));
    }
    return [];
  });
  const [currentDeptId, setCurrentDeptId] = useState('');
  const [currentProgramId, setCurrentProgramId] = useState('');
  const [currentBatchId, setCurrentBatchId] = useState('');
  const [currentMinCgpa, setCurrentMinCgpa] = useState('');

  // Duplicate Opportunity Detection: checks if an opportunity with same company & title already exists
  const potentialDuplicate = useMemo(() => {
    const trimmedTitle = title.trim().toLowerCase();
    if (trimmedTitle.length < 3) return null;

    const activeCompanyName = (
      companyMode === 'existing'
        ? companies.find((c) => c.id === companyId)?.name || ''
        : companyName
    ).trim().toLowerCase();

    return existingOpportunities.find((existing) => {
      // Ignore current opportunity when editing
      if (opportunity && existing.id === opportunity.id) return false;
      // Only flag duplicates against opportunities that are already published
      if (existing.status !== 'published') return false;

      const existingTitle = existing.title.toLowerCase();
      const existingComp = (existing.company?.name || '').toLowerCase();

      const companyMatches =
        activeCompanyName &&
        existingComp &&
        (existingComp.includes(activeCompanyName) || activeCompanyName.includes(existingComp));

      const titleMatches =
        existingTitle === trimmedTitle ||
        existingTitle.includes(trimmedTitle) ||
        trimmedTitle.includes(existingTitle);

      return Boolean(companyMatches && titleMatches);
    });
  }, [title, companyId, companyName, companyMode, companies, existingOpportunities, opportunity]);

  // Programs for selected department in eligibility selector
  const { data: programsForDept = [] } = usePrograms(currentDeptId || undefined);

  // Add Skill
  const handleAddSkill = (skillId: string) => {
    if (selectedSkills.some((s) => s.skillId === skillId)) return;
    setSelectedSkills([...selectedSkills, { skillId, isRequired: true }]);
    setSkillSearch('');
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skillId !== skillId));
  };

  const handleToggleSkillRequired = (skillId: string) => {
    setSelectedSkills(
      selectedSkills.map((s) =>
        s.skillId === skillId ? { ...s, isRequired: !s.isRequired } : s,
      ),
    );
  };

  // Add Eligibility Criterion
  const handleAddEligibility = () => {
    if (!currentDeptId && !currentProgramId && !currentBatchId && !currentMinCgpa) {
      return;
    }

    setEligibilityList([
      ...eligibilityList,
      {
        departmentId: currentDeptId || undefined,
        programId: currentProgramId || undefined,
        batchId: currentBatchId || undefined,
        minCgpa: currentMinCgpa ? parseFloat(currentMinCgpa) : undefined,
      },
    ]);

    // Reset current selectors
    setCurrentDeptId('');
    setCurrentProgramId('');
    setCurrentBatchId('');
    setCurrentMinCgpa('');
  };

  const handleRemoveEligibility = (index: number) => {
    setEligibilityList(eligibilityList.filter((_, idx) => idx !== index));
  };

  const statusMutation = useUpdateOpportunityStatus();
  const [showPublishPrompt, setShowPublishPrompt] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const isExpiredOpportunity = opportunity?.status === 'expired';
  const isClosedOpportunity = opportunity?.status === 'closed';
  const hasValidFutureDeadline = applicationDeadline ? new Date(applicationDeadline).getTime() > Date.now() : false;
  const wasExpiredAndNowFuture = isExpiredOpportunity && hasValidFutureDeadline;

  // Build Payload Helper
  const buildPayload = (): CreateOpportunityDto => {
    let finalSalaryMin: number | undefined;
    let finalSalaryMax: number | undefined;

    if (compensationType === 'unpaid') {
      finalSalaryMin = 0;
      finalSalaryMax = 0;
    } else if (compensationType === 'paid') {
      finalSalaryMin = salaryMin !== '' && !isNaN(parseFloat(salaryMin)) ? parseFloat(salaryMin) : undefined;
      finalSalaryMax = salaryMax !== '' && !isNaN(parseFloat(salaryMax)) ? parseFloat(salaryMax) : undefined;
    } else {
      // not_disclosed
      finalSalaryMin = undefined;
      finalSalaryMax = undefined;
    }

    const resolvedCompanyId = companyMode === 'existing' ? (companyId || opportunity?.companyId) : undefined;
    const resolvedCompanyName = companyMode === 'new' ? (companyName || opportunity?.company?.name) : undefined;

    const trimmedUrl = applyUrl.trim();
    const formattedUrl = trimmedUrl
      ? (/^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`)
      : undefined;

    return {
      title,
      type,
      ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
      ...(resolvedCompanyName ? { companyName: resolvedCompanyName } : {}),
      description,
      workMode,
      location: location || undefined,
      salaryMin: finalSalaryMin,
      salaryMax: finalSalaryMax,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : undefined,
      applyUrl: formattedUrl,
      applicationEmail: applicationEmail.trim() || undefined,
      skills: selectedSkills,
      eligibility: eligibilityList,
    };
  };

  const handleSaveOnly = async () => {
    setFormError(null);
    const payload = buildPayload();
    try {
      if (isEditing && opportunity) {
        await updateMutation.mutateAsync({
          id: opportunity.id,
          dto: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowPublishPrompt(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err instanceof Error ? err.message : '') ||
        'An error occurred while saving the opportunity.';
      setFormError(message);
      setShowPublishPrompt(false);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!opportunity) return;
    setFormError(null);
    setIsActivating(true);
    const payload = buildPayload();
    try {
      await updateMutation.mutateAsync({
        id: opportunity.id,
        dto: payload,
      });
      await statusMutation.mutateAsync({
        id: opportunity.id,
        dto: { status: 'published' },
      });
      setShowPublishPrompt(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err instanceof Error ? err.message : '') ||
        'Failed to save and publish opportunity.';
      setFormError(message);
    } finally {
      setIsActivating(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFormError(null);

    // If this was an expired opportunity and user extended deadline to the future, ask to publish with save
    if (wasExpiredAndNowFuture) {
      setShowPublishPrompt(true);
      return;
    }

    await handleSaveOnly();
  };

  const filteredCatalog = skillSearch
    ? skillsCatalog.filter(
        (s) =>
          s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
          !selectedSkills.some((sel) => sel.skillId === s.id),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isEditing ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
              {isEditing ? <Pencil className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? `Edit Opportunity: ${opportunity?.title ?? ''}` : 'Post New Opportunity'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update job details, criteria, deadlines or compensation'
                  : 'Create a job or internship placement posting'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(event) => { void (handleSubmit)(event); }} className="space-y-6 p-6">
          {(createMutation.error || updateMutation.error) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {(createMutation.error || updateMutation.error)?.message ||
                'Failed to save opportunity. Please verify all inputs.'}
            </div>
          )}

          {/* Potential Duplicate Opportunity Warning Banner */}
          {potentialDuplicate && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-950">Potential Duplicate Opportunity Detected</p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  An opportunity titled <span className="font-semibold">"{potentialDuplicate.title}"</span> for{' '}
                  <span className="font-semibold">{potentialDuplicate.company?.name || 'this company'}</span> already exists in the portal
                  (Status: <span className="font-mono text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">{potentialDuplicate.status}</span>).
                  Please verify before publishing to prevent duplicate job postings.
                </p>
              </div>
            </div>
          )}

          {/* Basic Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              1. Basic Information
            </h3>

            {/* Title & Type */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Opportunity Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); }}
                  placeholder="e.g. Associate Software Engineer, Data Science Intern"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Opportunity Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value as 'job' | 'internship'); }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="job">💼 Job</option>
                  <option value="internship">🎓 Internship</option>
                </select>
              </div>
            </div>

            {/* Company Selection / Input */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Company / Organization <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setCompanyMode('existing'); }}
                    className={`font-medium ${
                      companyMode === 'existing'
                        ? 'text-blue-600 underline'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Select existing
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => { setCompanyMode('new'); }}
                    className={`font-medium ${
                      companyMode === 'new'
                        ? 'text-blue-600 underline'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    + Add new
                  </button>
                </div>
              </div>

              {companyMode === 'existing' ? (
                <select
                  required
                  value={companyId}
                  onChange={(e) => { setCompanyId(e.target.value); }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">-- Choose Company --</option>
                  {opportunity?.company && !companies.some((c) => c.id === opportunity.companyId) && (
                    <option value={opportunity.companyId}>
                      {opportunity.company.name}
                    </option>
                  )}
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.industry ? `(${c.industry})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); }}
                  placeholder="Enter new company name (e.g. Google, Microsoft, Startup Inc.)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Job / Internship Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); }}
                placeholder="Provide role responsibilities, team overview, perks, selection process..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Work Mode & Compensation */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              2. Work Mode, Location & Compensation
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => { setWorkMode(e.target.value as 'onsite' | 'remote' | 'hybrid'); }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="onsite">🏢 On-site</option>
                  <option value="remote">🏠 Remote</option>
                  <option value="hybrid">🔄 Hybrid</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); }}
                  placeholder="e.g. Bangalore, Mumbai, Remote - India"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Compensation Mode Selector */}
              <div className="sm:col-span-2">
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
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600'
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
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {type === 'job' ? 'Min Salary (₹ / Annual)' : 'Min Stipend (₹ / Monthly)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={salaryMin}
                      onChange={(e) => { setSalaryMin(e.target.value); }}
                      placeholder="e.g. 600000"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {type === 'job' ? 'Max Salary (₹ / Annual)' : 'Max Stipend (₹ / Monthly)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={salaryMax}
                      onChange={(e) => { setSalaryMax(e.target.value); }}
                      placeholder="e.g. 1200000"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              ) : compensationType === 'unpaid' ? (
                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <div>
                      <span className="font-semibold">Marked as Unpaid Opportunity</span>
                      <p className="text-[11px] text-emerald-700/80">
                        This opportunity will clearly display an "Unpaid" badge to students.
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
                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base">ℹ️</span>
                    <div>
                      <span className="font-semibold">Salary Not Disclosed / Not Provided</span>
                      <p className="text-[11px] text-amber-700/80">
                        Will display "Not Provided" to students. Compensation details can be discussed during interview.
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

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Application Deadline
                </label>
                <input
                  type="datetime-local"
                  value={applicationDeadline}
                  onChange={(e) => { setApplicationDeadline(e.target.value); }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  External Apply Link / Portal URL
                </label>
                <input
                  type="text"
                  value={applyUrl}
                  onChange={(e) => { setApplyUrl(e.target.value); }}
                  placeholder="https://company.com/careers/job-123"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Optional URL for external portal application
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Application / HR Contact Email
                </label>
                <input
                  type="email"
                  value={applicationEmail}
                  onChange={(e) => { setApplicationEmail(e.target.value); }}
                  placeholder="careers@company.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Optional email for students to submit resumes directly
                </p>
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              3. Required / Desired Skills
            </h3>

            {/* Selected Skills Chips */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((sk) => {
                  const sObj = skillsCatalog.find((x) => x.id === sk.skillId);
                  return (
                    <span
                      key={sk.skillId}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                        sk.isRequired
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span>{sObj?.name || 'Skill'}</span>
                      <button
                        type="button"
                        onClick={() => { handleToggleSkillRequired(sk.skillId); }}
                        className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600"
                        title="Toggle Required / Nice-to-have"
                      >
                        ({sk.isRequired ? 'Required' : 'Optional'})
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleRemoveSkill(sk.skillId); }}
                        className="ml-1 text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Skill Search Input */}
            <div className="relative">
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => { setSkillSearch(e.target.value); }}
                placeholder="Search and add skills (e.g. React, Python, SQL)..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {filteredCatalog.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {filteredCatalog.slice(0, 8).map((sk) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => { handleAddSkill(sk.id); }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800">{sk.name}</span>
                      <span className="text-[10px] text-slate-400">{sk.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Eligibility Criteria Section */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                4. Eligibility Criteria (Server-Enforced)
              </h3>
              <span className="text-xs text-slate-400">
                {eligibilityList.length === 0 ? 'Open to all departments & batches' : `${String(eligibilityList.length)} criteria defined`}
              </span>
            </div>

            {/* Existing Eligibility Rows */}
            {eligibilityList.length > 0 && (
              <div className="space-y-2">
                {eligibilityList.map((crit, idx) => {
                  const dept = departments.find((d) => d.id === crit.departmentId);
                  const batch = batches.find((b) => b.id === crit.batchId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold">{dept?.name || 'All Departments'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{batch ? `Batch ${String(batch.graduationYear)}` : 'All Batches'}</span>
                        {crit.minCgpa !== undefined && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-blue-700">Min CGPA: {crit.minCgpa}</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { handleRemoveEligibility(idx); }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Eligibility Control Box */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Add an eligible combination:</p>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Department</label>
                  <select
                    value={currentDeptId}
                    onChange={(e) => {
                      setCurrentDeptId(e.target.value);
                      setCurrentProgramId('');
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Program</label>
                  <select
                    value={currentProgramId}
                    onChange={(e) => { setCurrentProgramId(e.target.value); }}
                    disabled={!currentDeptId}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"
                  >
                    <option value="">All Programs</option>
                    {programsForDept.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Batch</label>
                  <select
                    value={currentBatchId}
                    onChange={(e) => { setCurrentBatchId(e.target.value); }}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">All Batches</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        Batch {b.graduationYear}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Min CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={currentMinCgpa}
                    onChange={(e) => { setCurrentMinCgpa(e.target.value); }}
                    placeholder="e.g. 7.5"
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddEligibility}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Combination
                </button>
              </div>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            {isEditing && (isClosedOpportunity || isExpiredOpportunity) && (
              <button
                type="button"
                disabled={createMutation.isPending || updateMutation.isPending || statusMutation.isPending || isActivating}
                onClick={() => {
                  if (applicationDeadline && new Date(applicationDeadline).getTime() <= Date.now()) {
                    setFormError('To Go Live, please set the application deadline to a future date.');
                    return;
                  }
                  void handleSaveAndPublish();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                title="Save changes and immediately activate/publish this opportunity"
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                Go Live (Save & Publish)
              </button>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending || isActivating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isEditing ? 'Save Changes' : 'Post Opportunity'}
            </button>
          </div>
        </form>
      </div>

      {/* Expired Opportunity Deadline Update Confirmation Modal */}
      {showPublishPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPublishPrompt(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Publish & Go Live with New Deadline?
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              You updated the deadline for this expired opportunity to{' '}
              <strong className="text-slate-900 font-semibold">
                {applicationDeadline ? new Date(applicationDeadline).toLocaleString() : 'a valid date'}
              </strong>
              . Would you like to publish it now so students can view and apply immediately?
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isActivating || updateMutation.isPending || statusMutation.isPending}
                onClick={() => void handleSaveAndPublish()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
              >
                {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                Save Changes & Go Live (Publish)
              </button>
              <button
                type="button"
                disabled={isActivating || updateMutation.isPending}
                onClick={() => void handleSaveOnly()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                <Check className="h-4 w-4" />
                Save Changes Only (Remain Expired)
              </button>
              <button
                type="button"
                onClick={() => setShowPublishPrompt(false)}
                className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 py-1 transition-colors"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
