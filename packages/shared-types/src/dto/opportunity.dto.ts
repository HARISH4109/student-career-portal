import { z } from 'zod';

import { isSafeHttpUrl, optionalHttpUrlSchema } from './url-validation';

const queryBoolean = z.union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');
const deadlineSchema = z.string().datetime({ offset: true }).optional().nullable();
const applicationUrlSchema = z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS URL')
  .optional().nullable().or(z.literal(''));
export const applicationStatusSchema = z.enum(['applied', 'under_review', 'shortlisted', 'assessment', 'interview', 'selected', 'rejected', 'withdrawn']);


// ── Work Mode ───────────────────────────────────────────────────────────
export const WORK_MODES = ['remote', 'onsite', 'hybrid'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

// ── Company DTOs ────────────────────────────────────────────────────────

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  logoUrl: optionalHttpUrlSchema('Invalid logo URL'),
  website: optionalHttpUrlSchema('Invalid website URL'),
  industry: z.string().max(100).optional().nullable().or(z.literal('')),
  description: z.string().max(5000).optional().nullable().or(z.literal('')),
});
export type CreateCompanyDto = z.infer<typeof createCompanySchema>;

export const companyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  logoUrl: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type CompanyResponseDto = z.infer<typeof companyResponseSchema>;

// ── Eligibility Criterion ───────────────────────────────────────────────

export const eligibilityCriterionSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  batchId: z.string().uuid().optional().nullable(),
  minCgpa: z.number().min(0).max(10).optional().nullable(),
});
export type EligibilityCriterion = z.infer<typeof eligibilityCriterionSchema>;

export const eligibilityResponseSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  departmentName: z.string().nullable().optional(),
  programId: z.string().uuid().nullable().optional(),
  programName: z.string().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  graduationYear: z.number().nullable().optional(),
  minCgpa: z.number().nullable().optional(),
});
export type EligibilityResponseDto = z.infer<typeof eligibilityResponseSchema>;

// ── Opportunity Skill ───────────────────────────────────────────────────

export const opportunitySkillInputSchema = z.object({
  skillId: z.string().uuid(),
  isRequired: z.boolean().default(true),
});
export type OpportunitySkillInput = z.infer<typeof opportunitySkillInputSchema>;

export const opportunitySkillResponseSchema = z.object({
  skillId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  isRequired: z.boolean(),
});
export type OpportunitySkillResponseDto = z.infer<typeof opportunitySkillResponseSchema>;

// ── Create / Update Opportunity ─────────────────────────────────────────

export const createOpportunitySchema = z.object({
  companyId: z.string().uuid().optional(),
  /** Used for inline company creation — if companyId is absent, a new company is created */
  companyName: z.string().min(1).max(200).optional(),
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['job', 'internship']),
  description: z.string().min(1, 'Description is required'),
  workMode: z.enum(WORK_MODES).default('onsite'),
  location: z.string().max(150).optional().nullable().or(z.literal('')),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  applicationDeadline: deadlineSchema,
  applyUrl: applicationUrlSchema,
  applicationEmail: z.string().email().optional().nullable().or(z.literal('')),
  eligibility: z.array(eligibilityCriterionSchema).default([]),
  skills: z.array(opportunitySkillInputSchema).default([]),
}).refine(
  (data) => data.companyId || data.companyName,
  { message: 'Either companyId or companyName is required', path: ['companyId'] },
);
export type CreateOpportunityDto = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = z.object({
  companyId: z.string().uuid().optional(),
  companyName: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['job', 'internship']).optional(),
  description: z.string().min(1).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  location: z.string().max(150).optional().nullable().or(z.literal('')),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  applicationDeadline: deadlineSchema,
  applyUrl: applicationUrlSchema,
  applicationEmail: z.string().email().optional().nullable().or(z.literal('')),
  eligibility: z.array(eligibilityCriterionSchema).optional(),
  skills: z.array(opportunitySkillInputSchema).optional(),
});
export type UpdateOpportunityDto = z.infer<typeof updateOpportunitySchema>;

export const updateOpportunityStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'closed', 'expired', 'rejected']),
});
export type UpdateOpportunityStatusDto = z.infer<typeof updateOpportunityStatusSchema>;

// ── Opportunity Response ────────────────────────────────────────────────

export const opportunityResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  company: companyResponseSchema.optional(),
  title: z.string(),
  type: z.enum(['job', 'internship']),
  description: z.string(),
  workMode: z.enum(WORK_MODES),
  location: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  applicationDeadline: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  applicationEmail: z.string().nullable().optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'closed', 'expired', 'rejected']),
  postedBy: z.string().uuid(),
  sourceDraftId: z.string().uuid().nullable().optional(),
  skills: z.array(opportunitySkillResponseSchema).default([]),
  eligibility: z.array(eligibilityResponseSchema).default([]),
  applicationCount: z.number().default(0),
  /** Student-context fields — populated when listing for a student */
  isEligible: z.boolean().optional(),
  isSaved: z.boolean().optional(),
  hasApplied: z.boolean().optional(),
  isClosingSoon: z.boolean().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type OpportunityResponseDto = z.infer<typeof opportunityResponseSchema>;

// ── Opportunity List/Search Query ───────────────────────────────────────

export const opportunityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['job', 'internship']).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  companyId: z.string().uuid().optional(),
  location: z.string().optional(),
  skillId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'closed', 'expired', 'rejected']).optional(),
  closingSoon: queryBoolean.optional(),
  eligibleOnly: queryBoolean.optional(),
  sortBy: z.enum(['newest', 'deadline', 'salary']).default('newest'),
});
export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;

// ── Application DTOs ────────────────────────────────────────────────────

export const createApplicationSchema = z.object({
  opportunityId: z.string().uuid('Valid opportunity ID required'),
  resumeId: z.string().uuid('Valid resume ID required').optional().nullable(),
  coverNote: z.string().max(5000).optional().nullable().or(z.literal('')),
});
export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    'applied',
    'under_review',
    'shortlisted',
    'assessment',
    'interview',
    'selected',
    'rejected',
    'withdrawn',
  ]),
  remarks: z.string().max(2000).optional().nullable().or(z.literal('')),
});
export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>;

export const applicationStatusHistorySchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  changedBy: z.string().uuid(),
  changedByName: z.string().optional(),
  remarks: z.string().nullable().optional(),
  changedAt: z.string().or(z.date()),
});
export type ApplicationStatusHistoryDto = z.infer<typeof applicationStatusHistorySchema>;

export const applicationResponseSchema = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  opportunity: opportunityResponseSchema.optional(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  studentRollNumber: z.string().optional(),
  resumeId: z.string().uuid().optional().nullable(),
  resumeTitle: z.string().optional(),
  status: z.string(),
  coverNote: z.string().nullable().optional(),
  aiMatchScore: z.number().nullable().optional(),
  statusHistory: z.array(applicationStatusHistorySchema).default([]),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type ApplicationResponseDto = z.infer<typeof applicationResponseSchema>;

export const applicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: applicationStatusSchema.optional(),
  opportunityId: z.string().uuid().optional(),
});
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

// ── Saved Opportunity DTOs ──────────────────────────────────────────────

export const saveOpportunitySchema = z.object({
  opportunityId: z.string().uuid('Valid opportunity ID required'),
});
export type SaveOpportunityDto = z.infer<typeof saveOpportunitySchema>;

export const savedOpportunityResponseSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  opportunity: opportunityResponseSchema.optional(),
  createdAt: z.string().or(z.date()),
});
export type SavedOpportunityResponseDto = z.infer<typeof savedOpportunityResponseSchema>;

// ── AI Extraction DTOs (n8n Agent Output) ───────────────────────────────

export const extractedEligibilitySchema = z.object({
  minCgpa: z.number().min(0).max(10).nullable().default(null),
  departmentCodes: z.array(z.string()).default([]),
  allowedBatches: z.array(z.number().int()).default([]),
  /** Descriptive fallback when structured fields are empty */
  description: z.string().nullable().default(null),
});
export type ExtractedEligibility = z.infer<typeof extractedEligibilitySchema>;

export const extractedOpportunitySchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  type: z.enum(['job', 'internship']),
  description: z.string().min(1),
  workMode: z.enum(WORK_MODES).default('onsite'),
  location: z.string().nullable().default(null),
  salaryMin: z
    .union([z.number(), z.string()])
    .nullable()
    .default(null)
    .transform((val) => {
      if (val === null) return null;
      if (typeof val === 'number') return isNaN(val) ? null : val;
      const s = val.trim().toLowerCase();
      if (s.includes('unpaid') || s === '0' || s === 'nil' || s === 'free') return 0;
      if (s.includes('not provided') || s.includes('not specified') || s === 'null' || s === 'n/a') return null;
      const num = parseFloat(s.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? null : num;
    }),
  salaryMax: z
    .union([z.number(), z.string()])
    .nullable()
    .default(null)
    .transform((val) => {
      if (val === null) return null;
      if (typeof val === 'number') return isNaN(val) ? null : val;
      const s = val.trim().toLowerCase();
      if (s.includes('unpaid') || s === '0' || s === 'nil' || s === 'free') return 0;
      if (s.includes('not provided') || s.includes('not specified') || s === 'null' || s === 'n/a') return null;
      const num = parseFloat(s.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? null : num;
    }),
  applicationDeadline: z.string().nullable().default(null),
  applyUrl: z.string().refine((val) => isSafeHttpUrl(val), 'Use an HTTP or HTTPS URL').nullable().optional().default(null),
  applicationEmail: z.string().nullable().optional().default(null),
  skills: z.array(z.string()).default([]),
  eligibility: extractedEligibilitySchema.default({
    minCgpa: null,
    departmentCodes: [],
    allowedBatches: [],
    description: null,
  }),
  confidenceScore: z.number().min(0).max(100).nullable().default(null),
});
export type ExtractedOpportunityDto = z.infer<typeof extractedOpportunitySchema>;

/** Payload sent from frontend to backend extraction endpoint */
export const extractOpportunityRequestSchema = z.object({
  sourceType: z.enum(['url', 'text', 'image']),
  content: z.string().min(1, 'Content is required').max(20_000_000, 'Content exceeds maximum size'),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});
export type ExtractOpportunityRequestDto = z.infer<typeof extractOpportunityRequestSchema>;

// ── Phase 4: AI Ingestion & Faculty Review Pipeline DTOs ────────────────

/** Payload to ingest a new source for AI extraction */
export const ingestOpportunitySourceSchema = z.object({
  sourceType: z.enum(['email', 'pdf', 'image', 'text', 'url']),
  content: z.string().min(1, 'Content is required').max(20_000_000, 'Content exceeds maximum size'),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});
export type IngestOpportunitySourceDto = z.infer<typeof ingestOpportunitySourceSchema>;

/** Duplicate detection result returned alongside draft data */
export const duplicateCheckResultSchema = z.object({
  isDuplicate: z.boolean(),
  matchedOpportunityId: z.string().uuid().nullable().optional(),
  matchedTitle: z.string().nullable().optional(),
  matchedCompanyName: z.string().nullable().optional(),
  similarityReason: z.string().nullable().optional(),
});
export type DuplicateCheckResult = z.infer<typeof duplicateCheckResultSchema>;

/** Source record from `opportunity_sources` */
export const opportunitySourceResponseSchema = z.object({
  id: z.string().uuid(),
  sourceType: z.enum(['email', 'pdf', 'image', 'text', 'url', 'manual']),
  rawContent: z.string(),
  submittedBy: z.string().uuid(),
  status: z.string(),
  createdAt: z.string().or(z.date()),
});
export type OpportunitySourceResponseDto = z.infer<typeof opportunitySourceResponseSchema>;

/** Extraction run record from `ai_extraction_runs` */
export const extractionRunResponseSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  modelUsed: z.string().nullable().optional(),
  confidenceScore: z.number().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
});
export type ExtractionRunResponseDto = z.infer<typeof extractionRunResponseSchema>;

/** Full draft response from `opportunity_drafts` with joined source + extraction run */
export const opportunityDraftResponseSchema = z.object({
  id: z.string().uuid(),
  extractionRunId: z.string().uuid(),
  status: z.enum(['extracted', 'pending_review', 'needs_correction', 'approved', 'rejected', 'published']),
  title: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  type: z.enum(['job', 'internship']).nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  workMode: z.enum(WORK_MODES).nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  extractedSkills: z.array(z.string()).default([]),
  extractedEligibility: extractedEligibilitySchema.passthrough().default({
    minCgpa: null,
    departmentCodes: [],
    allowedBatches: [],
    description: null,
  }),
  applicationDeadline: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  applicationEmail: z.string().nullable().optional(),
  resultingOpportunityId: z.string().uuid().nullable().optional(),
  reviewedBy: z.string().uuid().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  /** Joined source data */
  source: opportunitySourceResponseSchema.optional(),
  /** Joined extraction run data */
  extractionRun: extractionRunResponseSchema.optional(),
  /** Duplicate check result */
  duplicateCheck: duplicateCheckResultSchema.optional(),
});
export type OpportunityDraftResponseDto = z.infer<typeof opportunityDraftResponseSchema>;

/** Query params for listing drafts */
export const opportunityDraftListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['extracted', 'pending_review', 'needs_correction', 'approved', 'rejected', 'published']).optional(),
  sortBy: z.enum(['newest', 'oldest']).default('newest'),
});
export type OpportunityDraftListQuery = z.infer<typeof opportunityDraftListQuerySchema>;

/** Payload for faculty editing a draft before approval */
export const updateOpportunityDraftSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  companyName: z.string().min(1).max(200).optional(),
  type: z.enum(['job', 'internship']).optional(),
  description: z.string().min(1).optional(),
  location: z.string().max(150).optional().nullable(),
  workMode: z.enum(WORK_MODES).optional(),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  extractedSkills: z.array(z.string()).optional(),
  extractedEligibility: extractedEligibilitySchema.optional(),
  applicationDeadline: z.string().datetime({ offset: true }).optional().nullable(),
  applyUrl: z.string().url().refine((url) => ['http:', 'https:'].includes(new URL(url).protocol), 'Use an HTTP or HTTPS URL').optional().nullable(),
  applicationEmail: z.string().email().optional().nullable(),
});
export type UpdateOpportunityDraftDto = z.infer<typeof updateOpportunityDraftSchema>;

/** Payload for approving a draft (converts to published opportunity) */
export const approveDraftSchema = z.object({
  /** Optional: override with an existing company ID instead of auto-creating */
  companyId: z.string().uuid().optional(),
  /** Optional: skill IDs to attach to the published opportunity */
  skills: z.array(opportunitySkillInputSchema).optional(),
  /** Optional: eligibility criteria to attach */
  eligibility: z.array(eligibilityCriterionSchema).optional(),
  /** Whether to publish immediately or keep as draft */
  publishImmediately: z.boolean().default(true),
  /** Optional: allow publishing even if duplicate opportunity is detected */
  allowDuplicate: z.boolean().optional(),
});
export type ApproveDraftDto = z.infer<typeof approveDraftSchema>;

/** Payload for rejecting a draft — reason is mandatory */
export const rejectDraftSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(2000),
});
export type RejectDraftDto = z.infer<typeof rejectDraftSchema>;
