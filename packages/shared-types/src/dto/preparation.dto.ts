import { z } from 'zod';

import {
  INTERVIEW_TYPES,
  INTERVIEWER_TYPES,
  QUESTION_DIFFICULTIES,
  TEST_CATEGORIES,
} from '../enums';
import type {
  AttemptStatus,
  InterviewStatus,
  InterviewType,
  InterviewerType,
} from '../enums';

// ── Test Authoring Schemas (Faculty / Admin) ─────────────────────────────

export const createMockTestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional().nullable(),
  category: z.enum(TEST_CATEGORIES),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(360),
  totalMarks: z.number().int().min(1, 'Total marks must be at least 1'),
  passingMarks: z.number().int().min(0, 'Passing marks cannot be negative'),
  isActive: z.boolean().optional().default(true),
});
export type CreateMockTestDto = z.infer<typeof createMockTestSchema>;

export const updateMockTestSchema = createMockTestSchema.partial();
export type UpdateMockTestDto = z.infer<typeof updateMockTestSchema>;

export const createTestSectionSchema = z.object({
  title: z.string().min(2, 'Section title must be at least 2 characters').max(150),
  description: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0).optional().default(0),
});
export type CreateTestSectionDto = z.infer<typeof createTestSectionSchema>;

export const updateTestSectionSchema = createTestSectionSchema.partial();
export type UpdateTestSectionDto = z.infer<typeof updateTestSectionSchema>;

export const createTestQuestionSchema = z.object({
  sectionId: z.string().uuid().optional().nullable(),
  questionText: z.string().min(3, 'Question text must be at least 3 characters'),
  options: z.array(z.string()).min(2, 'At least 2 options required').max(10),
  correctAnswerIndex: z.number().int().min(0, 'Correct answer index must be non-negative'),
  explanation: z.string().optional().nullable(),
  marks: z.number().int().min(1, 'Marks must be at least 1').optional().default(1),
  orderIndex: z.number().int().min(0).optional().default(0),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional().default('medium'),
  topic: z.string().max(100).optional().nullable(),
});
export type CreateTestQuestionDto = z.infer<typeof createTestQuestionSchema>;

export const updateTestQuestionSchema = createTestQuestionSchema.partial();
export type UpdateTestQuestionDto = z.infer<typeof updateTestQuestionSchema>;

// ── Question Representations ─────────────────────────────────────────────

/**
 * Question representation sent to student during test taking.
 * SECURITY: Correct answer index and explanation are STRICTLY excluded!
 */
export interface StudentTestQuestionDto {
  id: string;
  sectionId: string | null;
  questionText: string;
  options: string[];
  marks: number;
  orderIndex: number;
  difficulty: string;
  topic: string | null;
}

/**
 * Question representation with answer key for faculty/admin authoring.
 */
export interface AdminTestQuestionDto extends StudentTestQuestionDto {
  correctAnswerIndex: number;
  explanation: string | null;
}

export interface TestSectionDto {
  id: string;
  testId: string;
  title: string;
  description: string | null;
  orderIndex: number;
}

export interface MockTestDetailDto {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  sections?: TestSectionDto[];
  questionCount?: number;
}

// ── Test Taking & Attempt Schemas ────────────────────────────────────────

export interface StartTestResponseDto {
  attemptId: string;
  attemptToken: string;
  testId: string;
  title: string;
  durationMinutes: number;
  startedAt: string;
  questions: StudentTestQuestionDto[];
  sections: TestSectionDto[];
  existingAnswers?: Record<string, number>;
}

export const autosaveAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).nullable().optional(),
  timeSpentSeconds: z.number().int().min(0).optional().default(0),
});
export type AutosaveAnswerDto = z.infer<typeof autosaveAnswerSchema>;

export const submitMockTestSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedIndex: z.number().int().min(0).nullable().optional(),
      timeSpentSeconds: z.number().int().min(0).optional().default(0),
    }),
  ),
  timeSpentSeconds: z.number().int().min(0).optional().default(0),
});
export type SubmitMockTestDto = z.infer<typeof submitMockTestSchema>;

// ── Evaluation & Results Representations ─────────────────────────────────

export interface QuestionResultDto {
  questionId: string;
  questionText: string;
  options: string[];
  selectedIndex: number | null;
  correctAnswerIndex: number;
  isCorrect: boolean;
  awardedMarks: number;
  maxMarks: number;
  explanation: string | null;
  topic: string | null;
  difficulty: string;
}

export interface TopicAccuracyDto {
  topic: string;
  totalQuestions: number;
  correctQuestions: number;
  accuracyPercentage: number;
}

export interface AttemptResultDto {
  attemptId: string;
  testId: string;
  testTitle: string;
  studentId: string;
  score: number;
  totalMarks: number;
  passingMarks: number;
  isPassed: boolean;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSeconds: number;
  questions: QuestionResultDto[];
  topicAccuracies: TopicAccuracyDto[];
  weakCategories: string[];
}

// ── Analytics DTOs ───────────────────────────────────────────────────────

export interface StudentAttemptSummaryDto {
  attemptId: string;
  testId: string;
  testTitle: string;
  category: string;
  score: number;
  totalMarks: number;
  passingMarks: number;
  isPassed: boolean;
  status: string;
  submittedAt: string;
  timeSpentSeconds: number;
}

export interface StudentPreparationAnalyticsDto {
  totalAttempts: number;
  passedAttempts: number;
  averageScorePercentage: number;
  topicAccuracies: TopicAccuracyDto[];
  weakCategories: string[];
  scoreTrend: Array<{
    date: string;
    testTitle: string;
    score: number;
    totalMarks: number;
    percentage: number;
  }>;
}

export interface FacultyTestAggregateAnalyticsDto {
  testId: string;
  testTitle: string;
  totalAttempts: number;
  averageScore: number;
  passRatePercentage: number;
  questionAccuracy: Array<{
    questionId: string;
    questionText: string;
    topic: string | null;
    correctPercentage: number;
    totalAnswers: number;
  }>;
}

// ── Mock Interview Schemas ───────────────────────────────────────────────

export const createMockInterviewSchema = z.object({
  type: z.enum(INTERVIEW_TYPES),
  interviewerType: z.enum(INTERVIEWER_TYPES).default('ai'),
  targetRole: z.string().min(2, 'Target role required').max(150),
  templateId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateMockInterviewDto = z.infer<typeof createMockInterviewSchema>;

export const mockInterviewQuestionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().min(3, 'Question text required'),
  category: z.string().default('technical'),
  difficulty: z.string().default('medium'),
});
export type MockInterviewQuestionDto = z.infer<typeof mockInterviewQuestionSchema>;

export const createMockInterviewTemplateSchema = z.object({
  roleTitle: z.string().min(2, 'Role title required').max(150),
  description: z.string().max(500).optional(),
  category: z.string().default('technical'),
  questions: z.array(mockInterviewQuestionSchema).min(1, 'At least one question required'),
});
export type CreateMockInterviewTemplateDto = z.infer<typeof createMockInterviewTemplateSchema>;

export const updateMockInterviewTemplateSchema = z.object({
  roleTitle: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  questions: z.array(mockInterviewQuestionSchema).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateMockInterviewTemplateDto = z.infer<typeof updateMockInterviewTemplateSchema>;

export interface MockInterviewTemplateDto {
  id: string;
  roleTitle: string;
  description: string | null;
  category: string;
  questions: InterviewQuestionItem[];
  isActive: boolean;
  createdBy: string;
  creatorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const submitInterviewAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      questionText: z.string(),
      answerText: z.string().min(1, 'Answer cannot be empty'),
    }),
  ),
});
export type SubmitInterviewAnswersDto = z.infer<typeof submitInterviewAnswersSchema>;

export interface InterviewQuestionItem {
  id: string;
  questionText: string;
  category?: string;
  difficulty?: string;
}

export interface InterviewAnswerItem {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface InterviewFeedbackDto {
  strengths: string[];
  improvements: string[];
  communicationScore: number;
  technicalScore: number;
  problemSolvingScore: number;
  summary: string;
  perAnswer?: Array<{
    questionId: string;
    wordCount: number;
    relevance: number;
    depth: number;
    structure: number;
  }>;
}

export interface MockInterviewDto {
  id: string;
  studentId: string;
  type: InterviewType;
  interviewerType: InterviewerType;
  targetRole: string | null;
  scheduledAt: string;
  status: InterviewStatus;
  questions: InterviewQuestionItem[] | null;
  answers: InterviewAnswerItem[] | null;
  feedback: InterviewFeedbackDto | null;
  overallScore: number | null;
  createdAt: string;
}
