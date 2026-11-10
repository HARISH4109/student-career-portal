import { z } from 'zod';

// ── Proficiency Levels ──────────────────────────────────────────────────
export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

// ── Project Entry ───────────────────────────────────────────────────────
export const projectEntrySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Project title is required').max(150),
  description: z.string().min(1, 'Project description is required').max(2000),
  technologies: z.array(z.string().min(1)).default([]),
  link: z.string().url('Invalid project URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
});
export type ProjectEntry = z.infer<typeof projectEntrySchema>;

// ── Certification Entry ─────────────────────────────────────────────────
export const certificationEntrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Certification name is required').max(200),
  issuer: z.string().min(1, 'Issuer is required').max(150),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(100).optional().or(z.literal('')),
  credentialUrl: z.string().url('Invalid credential URL').optional().or(z.literal('')),
});
export type CertificationEntry = z.infer<typeof certificationEntrySchema>;

// ── Achievement Entry ───────────────────────────────────────────────────
export const achievementEntrySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Achievement title is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  date: z.string().optional(),
  issuer: z.string().max(150).optional().or(z.literal('')),
});
export type AchievementEntry = z.infer<typeof achievementEntrySchema>;

// ── Skill DTOs ──────────────────────────────────────────────────────────
export const skillSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
});
export type SkillDto = z.infer<typeof skillSchema>;

export const addStudentSkillSchema = z.object({
  skillId: z.string().uuid(),
  proficiency: z.enum(PROFICIENCY_LEVELS).default('beginner'),
});
export type AddStudentSkillDto = z.infer<typeof addStudentSkillSchema>;

export const studentSkillResponseSchema = z.object({
  skillId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  proficiency: z.enum(PROFICIENCY_LEVELS),
});
export type StudentSkillResponseDto = z.infer<typeof studentSkillResponseSchema>;

// ── Academic Master Data DTOs ───────────────────────────────────────────
export const departmentDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
});
export type DepartmentDto = z.infer<typeof departmentDtoSchema>;

export const academicProgramDtoSchema = z.object({
  id: z.string().uuid(),
  departmentId: z.string().uuid(),
  name: z.string(),
  degreeLevel: z.string(),
  durationYears: z.number().int(),
  isActive: z.boolean(),
});
export type AcademicProgramDto = z.infer<typeof academicProgramDtoSchema>;

export const batchDtoSchema = z.object({
  id: z.string().uuid(),
  graduationYear: z.number().int(),
  isActive: z.boolean(),
});
export type BatchDto = z.infer<typeof batchDtoSchema>;

// ── Student Profile CRUD DTOs ───────────────────────────────────────────
export const createStudentProfileSchema = z.object({
  rollNumber: z.string().min(2, 'Roll number is required').max(50),
  departmentId: z.string().uuid('Valid department ID is required'),
  programId: z.string().uuid('Valid program ID is required'),
  batchId: z.string().uuid('Valid batch ID is required'),
  cgpa: z.number().min(0).max(10).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid Portfolio URL').optional().nullable().or(z.literal('')),
  careerInterests: z.array(z.string().min(1)).default([]),
  projects: z.array(projectEntrySchema).default([]),
  certifications: z.array(certificationEntrySchema).default([]),
  achievements: z.array(achievementEntrySchema).default([]),
});
export type CreateStudentProfileDto = z.infer<typeof createStudentProfileSchema>;

export const updateStudentProfileSchema = createStudentProfileSchema.partial().extend({
  isPlacementEligible: z.boolean().optional(),
});
export type UpdateStudentProfileDto = z.infer<typeof updateStudentProfileSchema>;

export const studentProfileResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  rollNumber: z.string(),
  departmentId: z.string().uuid(),
  department: departmentDtoSchema.optional(),
  programId: z.string().uuid(),
  program: academicProgramDtoSchema.optional(),
  batchId: z.string().uuid(),
  batch: batchDtoSchema.optional(),
  cgpa: z.number().nullable().optional(),
  bio: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  careerInterests: z.array(z.string()),
  projects: z.array(projectEntrySchema),
  certifications: z.array(certificationEntrySchema),
  achievements: z.array(achievementEntrySchema),
  skills: z.array(studentSkillResponseSchema),
  isPlacementEligible: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type StudentProfileResponseDto = z.infer<typeof studentProfileResponseSchema>;

// ── Profile Completion Response ─────────────────────────────────────────
export const profileCompletionCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
  isCompleted: z.boolean(),
  score: z.number(),
  detail: z.string(),
});
export type ProfileCompletionCategory = z.infer<typeof profileCompletionCategorySchema>;

export const profileCompletionResponseSchema = z.object({
  percentage: z.number().min(0).max(100),
  isComplete: z.boolean(),
  completedSections: z.array(z.string()),
  missingSections: z.array(z.string()),
  categories: z.array(profileCompletionCategorySchema),
});
export type ProfileCompletionResponseDto = z.infer<typeof profileCompletionResponseSchema>;
