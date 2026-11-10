import { z } from 'zod';

// ── Resume Section Entries ──────────────────────────────────────────────
export const educationEntrySchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution name is required'),
  degree: z.string().min(1, 'Degree is required'),
  fieldOfStudy: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  isCurrent: z.boolean().default(false),
  grade: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});
export type EducationEntry = z.infer<typeof educationEntrySchema>;

export const experienceEntrySchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position title is required'),
  location: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  isCurrent: z.boolean().default(false),
  description: z.string().optional().or(z.literal('')),
  highlights: z.array(z.string()).default([]),
});
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;

export const resumeProjectEntrySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Project title is required'),
  role: z.string().optional().or(z.literal('')),
  technologies: z.array(z.string()).default([]),
  link: z.string().optional().or(z.literal('')),
  githubUrl: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  highlights: z.array(z.string()).default([]),
});
export type ResumeProjectEntry = z.infer<typeof resumeProjectEntrySchema>;

export const resumeCertificationEntrySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  issueDate: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  credentialUrl: z.string().optional().or(z.literal('')),
});
export type ResumeCertificationEntry = z.infer<typeof resumeCertificationEntrySchema>;

export const resumeAchievementEntrySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Achievement title is required'),
  description: z.string().optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
});
export type ResumeAchievementEntry = z.infer<typeof resumeAchievementEntrySchema>;

export const resumeCustomSectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Section title is required'),
  content: z.string().default(''),
  items: z.array(z.string()).default([]),
});
export type ResumeCustomSection = z.infer<typeof resumeCustomSectionSchema>;

// ── Structured Resume Content ───────────────────────────────────────────
export const resumeContentSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().optional().or(z.literal('')),
  githubUrl: z.string().optional().or(z.literal('')),
  portfolioUrl: z.string().optional().or(z.literal('')),
  summary: z.string().max(2000).default(''),
  education: z.array(educationEntrySchema).default([]),
  experience: z.array(experienceEntrySchema).default([]),
  skills: z.array(z.string().min(1)).default([]),
  projects: z.array(resumeProjectEntrySchema).default([]),
  certifications: z.array(resumeCertificationEntrySchema).default([]),
  achievements: z.array(resumeAchievementEntrySchema).default([]),
  customSections: z.array(resumeCustomSectionSchema).default([]),
  isUploaded: z.boolean().optional(),
  uploadedFileName: z.string().optional(),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;

// ── Resume CRUD DTOs ────────────────────────────────────────────────────
export const createResumeSchema = z.object({
  title: z.string().min(1, 'Resume title is required').max(150),
  templateId: z.string().max(50).default('modern'),
  content: resumeContentSchema,
  isPrimary: z.boolean().default(false),
});
export type CreateResumeDto = z.infer<typeof createResumeSchema>;

export const uploadResumeSchema = z.object({
  fileName: z.string().min(1),
  fileContent: z.string().min(1),
  fileType: z.enum(['pdf', 'json', 'text']),
  title: z.string().optional(),
});
export type UploadResumeDto = z.infer<typeof uploadResumeSchema>;

export const updateResumeSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  templateId: z.string().max(50).optional(),
  content: resumeContentSchema.optional(),
  isPrimary: z.boolean().optional(),
});
export type UpdateResumeDto = z.infer<typeof updateResumeSchema>;

export const resumeResponseSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  templateId: z.string(),
  content: resumeContentSchema,
  fileUrl: z.string().nullable().optional(),
  version: z.number().int(),
  isPrimary: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type ResumeResponseDto = z.infer<typeof resumeResponseSchema>;

// ── Resume AI Analysis DTOs ─────────────────────────────────────────────
export const improvementSuggestionSchema = z.object({
  area: z.string(),
  suggestion: z.string(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});
export type ImprovementSuggestion = z.infer<typeof improvementSuggestionSchema>;

export const resumeAnalysisResponseSchema = z.object({
  id: z.string().uuid(),
  resumeId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  skillScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  formatScore: z.number().min(0).max(100),
  missingSkills: z.array(z.string()),
  improvementSuggestions: z.array(improvementSuggestionSchema),
  aiInsights: z.array(z.string()).default([]),
  aiSummaryRewrite: z.string().nullable().optional(),
  modelVersion: z.string(),
  analyzedAt: z.string().or(z.date()),
});
export type ResumeAnalysisResponseDto = z.infer<typeof resumeAnalysisResponseSchema>;

// ── Resume-to-Opportunity Matching DTOs ─────────────────────────────────
export const resumeMatchRequestSchema = z.object({
  resumeContent: resumeContentSchema,
  opportunitySkills: z.array(z.string().min(1)),
  eligibilityContext: z
    .object({
      requiredCgpa: z.number().optional(),
      studentCgpa: z.number().optional(),
      eligibleDepartments: z.array(z.string()).optional(),
      studentDepartment: z.string().optional(),
    })
    .optional(),
});
export type ResumeMatchRequestDto = z.infer<typeof resumeMatchRequestSchema>;

export const resumeMatchResponseSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  explanatoryReasons: z.array(z.string()),
  isEligible: z.boolean().default(true),
});
export type ResumeMatchResponseDto = z.infer<typeof resumeMatchResponseSchema>;

// ── Resume AI Text Enhancement DTOs ─────────────────────────────────────
export const resumeEnhanceTextRequestSchema = z.object({
  text: z.string().min(1, 'Text is required to enhance'),
  sectionType: z.enum(['experience', 'project', 'summary']).default('experience'),
  context: z.record(z.any()).optional().default({}),
});
export type ResumeEnhanceTextRequestDto = z.infer<typeof resumeEnhanceTextRequestSchema>;

export const resumeEnhanceTextResponseSchema = z.object({
  enhancedText: z.string(),
  bulletPoints: z.array(z.string()).default([]),
  keyChanges: z.array(z.string()).default([]),
  modelVersion: z.string(),
});
export type ResumeEnhanceTextResponseDto = z.infer<typeof resumeEnhanceTextResponseSchema>;
