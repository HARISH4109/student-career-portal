// Single source of truth for role/permission/status vocab shared across web + api.
// Kept manually in sync with packages/db/src/schema/*.ts enum definitions.
// (A codegen step to derive these automatically from the DB schema is a good
// Phase 0 follow-up once the schema stabilizes — flagged in docs/ARCHITECTURE.md.)

// ── Roles (3 total, recruiter removed) ──────────────────────────────────

export const ROLE_NAMES = ['STUDENT', 'PLACEMENT_FACULTY', 'ADMIN'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

// ── Application Lifecycle ───────────────────────────────────────────────

export const APPLICATION_STATUSES = [
  'applied',
  'under_review',
  'shortlisted',
  'assessment',
  'interview',
  'selected',
  'rejected',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// ── Opportunity Types & Statuses ────────────────────────────────────────

export const OPPORTUNITY_TYPES = ['job', 'internship'] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'closed',
  'expired',
  'rejected',
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

// ── Notification Types ──────────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  'application_update',
  'new_opportunity',
  'notice_published',
  'interview_reminder',
  'recommendation',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ── AI Extraction Pipeline ──────────────────────────────────────────────

export const SOURCE_TYPES = ['email', 'pdf', 'image', 'text', 'url', 'manual'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const DRAFT_STATUSES = [
  'extracted',
  'pending_review',
  'needs_correction',
  'approved',
  'rejected',
  'published',
] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const EXTRACTION_RUN_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;
export type ExtractionRunStatus = (typeof EXTRACTION_RUN_STATUSES)[number];

// ── Recommendation Types ────────────────────────────────────────────────

export const RECOMMENDATION_TYPES = [
  'opportunity',
  'internship',
  'learning_resource',
  'skill_to_learn',
  'mock_test',
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

// ── Phase 5 Preparation Enums ───────────────────────────────────────────

export const TEST_CATEGORIES = [
  'aptitude',
  'technical',
  'coding',
  'verbal',
  'domain_specific',
  'quantitative_aptitude',
  'logical_reasoning',
  'programming',
  'sql',
  'role_specific',
] as const;
export type TestCategory = (typeof TEST_CATEGORIES)[number];

export const ATTEMPT_STATUSES = [
  'not_started',
  'in_progress',
  'submitted',
  'auto_submitted',
  'evaluated',
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const INTERVIEW_TYPES = ['technical', 'hr', 'behavioral', 'group_discussion'] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEWER_TYPES = ['ai', 'human'] as const;
export type InterviewerType = (typeof INTERVIEWER_TYPES)[number];

export const INTERVIEW_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

