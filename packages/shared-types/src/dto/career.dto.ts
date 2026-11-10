import { z } from 'zod';

export const RESOURCE_TYPES = [
  'video',
  'article',
  'research_paper',
  'course',
  'documentation',
  'ebook',
  'practice',
  'practice_set',
  'project',
] as const;
export const CAREER_PROFICIENCIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export const RESOURCE_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export const resourceStatusSchema = z.object({ status: z.enum(RESOURCE_STATUSES) }).strict();
export const stageCompletionSchema = z.object({ isCompleted: z.boolean() }).strict();
export const careerRequirementSchema = z
  .object({
    skillId: z.string().uuid(),
    proficiency: z.enum(CAREER_PROFICIENCIES).default('intermediate'),
  })
  .strict();
export const careerStageSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).default(''),
    isActive: z.boolean().default(true),
    skills: z.array(careerRequirementSchema).max(100).default([]),
    resourceIds: z.array(z.string().uuid()).max(100).default([]),
    activities: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(200),
            description: z.string().max(5000),
            type: z.enum(['project', 'practice']),
          })
          .strict(),
      )
      .max(30)
      .default([]),
  })
  .strict();
export const careerPathInputSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().max(5000).default(''),
    isActive: z.boolean().default(false),
    stages: z.array(careerStageSchema).max(30).default([]),
  })
  .strict();
export const resourceInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).default(''),
    type: z.enum(RESOURCE_TYPES),
    url: z
      .string()
      .url()
      .max(3000)
      .refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS URL'),
    category: z.string().trim().min(1).max(100),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    isActive: z.boolean().default(true),
    skillIds: z.array(z.string().uuid()).max(100).default([]),
    careerPathIds: z.array(z.string().uuid()).max(100).default([]),
  })
  .strict();
export const careerCatalogQuerySchema = z
  .object({
    search: z.string().max(200).default(''),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['active', 'all']).default('active'),
    type: z.enum(RESOURCE_TYPES).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    skillId: z.string().uuid().optional(),
    careerPathId: z.string().uuid().optional(),
  })
  .strict();
export const startRoadmapSchema = z.object({ careerPathId: z.string().uuid() }).strict();
export const skillGapInputSchema = z
  .object({
    careerPathId: z.string().uuid().optional(),
    opportunityId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (value) => Number(Boolean(value.careerPathId)) + Number(Boolean(value.opportunityId)) === 1,
    'Choose one career path or opportunity',
  );

export type CareerPathInput = z.infer<typeof careerPathInputSchema>;
export type CareerStageInput = z.infer<typeof careerStageSchema>;
export type ResourceInput = z.infer<typeof resourceInputSchema>;
export type CareerCatalogQuery = z.infer<typeof careerCatalogQuerySchema>;
export type SkillGapInput = z.infer<typeof skillGapInputSchema>;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];
export type CareerProficiency = (typeof CAREER_PROFICIENCIES)[number];
export interface CareerPathDto extends CareerPathInput {
  id: string;
}
export interface LearningResourceDto extends ResourceInput {
  id: string;
  progress: { status: ResourceStatus; progressPercent: number; completedAt: string | null } | null;
}
export interface RoadmapStageDto extends CareerStageInput {
  id: string;
  isCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  skillNames: Record<string, string>;
  resources: Array<{ id: string; title: string; url: string; type: string; progressStatus?: ResourceStatus }>;
}
export interface RoadmapDto {
  id: string;
  careerPathId: string | null;
  targetRole: string;
  status: 'active' | 'completed' | 'archived';
  progressPercent: number;
  currentStageId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stages: RoadmapStageDto[];
}
export interface AssessmentEvidence {
  accuracy: number;
  questionCount: number;
  source: 'evaluated_mock_tests';
}
export interface GapSkillDto {
  skillId: string;
  name: string;
  requiredProficiency: CareerProficiency | null;
  currentProficiency: CareerProficiency | null;
  status: 'matched' | 'missing' | 'below_target';
  stageOrder: number;
  priority: number;
  assessment: AssessmentEvidence | null;
  needsPractice: boolean;
  actions: Array<{
    type: 'resource' | 'project' | 'practice' | 'mock_test';
    title: string;
    url: string | null;
    reason: string;
  }>;
}
export interface SkillGapDto {
  id: string;
  targetRole: string;
  careerPathId: string | null;
  opportunityId: string | null;
  createdAt: string;
  ruleVersion: string;
  skills: GapSkillDto[];
  optionalSkills: Array<{ skillId: string; name: string }>;
  currentSkills: Array<{ skillId: string; proficiency: CareerProficiency }>;
  unclassifiedTopics: string[];
}
