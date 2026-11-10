import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { resourceTypeEnum, timestamps } from './_shared';
import { users } from './identity.schema';
import { roadmapStageResources, studentProfiles } from './student.schema';

export const testCategoryEnum = pgEnum('test_category', [
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
]);

export const attemptStatusEnum = pgEnum('attempt_status', [
  'in_progress',
  'submitted',
  'auto_submitted',
  'evaluated',
]);

export const interviewTypeEnum = pgEnum('interview_type', ['technical', 'hr', 'behavioral', 'group_discussion']);

export const interviewerTypeEnum = pgEnum('interviewer_type', ['ai', 'human']);

export const interviewStatusEnum = pgEnum('interview_status', [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export const resourceProgressStatusEnum = pgEnum('resource_progress_status', [
  'not_started',
  'in_progress',
  'completed',
]);

export const mockTests = pgTable('mock_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  category: testCategoryEnum('category').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  totalMarks: integer('total_marks').notNull(),
  passingMarks: integer('passing_marks').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const mockTestSections = pgTable('mock_test_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id')
    .notNull()
    .references(() => mockTests.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 150 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull().default(0),
  ...timestamps,
});

export const mockTestQuestions = pgTable(
  'mock_test_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id')
      .notNull()
      .references(() => mockTests.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').references(() => mockTestSections.id, { onDelete: 'set null' }),
    questionText: text('question_text').notNull(),
    options: jsonb('options').notNull(), // string[] for MCQs
    marks: integer('marks').notNull().default(1),
    orderIndex: integer('order_index').notNull(),
    difficulty: varchar('difficulty', { length: 20 }).notNull().default('medium'),
    topic: varchar('topic', { length: 100 }),
    ...timestamps,
  },
  (table) => [index('mock_test_questions_test_order_idx').on(table.testId, table.orderIndex)],
);

/**
 * Protected storage for mock test answer keys.
 * Correct answers and detailed explanations live here and are NEVER sent
 * to the student client during active attempts. Server-side grading reads
 * from this table directly.
 */
export const mockTestAnswerKeys = pgTable('mock_test_answer_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .references(() => mockTestQuestions.id, { onDelete: 'cascade' })
    .unique(),
  correctAnswerIndex: integer('correct_answer_index').notNull(),
  explanation: text('explanation'),
  ...timestamps,
});

/**
 * Mock test attempt headers with server-side timer validation and attempt tokens.
 */
export const mockTestAttempts = pgTable(
  'mock_test_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id')
      .notNull()
      .references(() => mockTests.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    attemptToken: varchar('attempt_token', { length: 64 }),
    score: numeric('score', { precision: 6, scale: 2 }),
    totalMarks: integer('total_marks'),
    passingMarks: integer('passing_marks'),
    isPassed: boolean('is_passed'),
    status: attemptStatusEnum('status').notNull().default('in_progress'),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
  },
  (table) => [
    // DB-enforced one-active-attempt rule (backs the advisory lock in the service)
    uniqueIndex('mock_test_attempts_one_active_idx')
      .on(table.testId, table.studentId)
      .where(sql`${table.status} = 'in_progress'`),
    index('mock_test_attempts_student_status_idx').on(table.studentId, table.status),
    index('mock_test_attempts_test_status_idx').on(table.testId, table.status),
  ],
);

/**
 * Normalized per-question answer records for autosave, atomic grading, and analytics.
 */
export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => mockTestAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => mockTestQuestions.id, { onDelete: 'cascade' }),
    selectedIndex: integer('selected_index'),
    isCorrect: boolean('is_correct'),
    awardedMarks: numeric('awarded_marks', { precision: 6, scale: 2 }),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
    answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('attempt_answers_attempt_question_idx').on(table.attemptId, table.questionId),
  ],
);

export const mockInterviews = pgTable(
  'mock_interviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    type: interviewTypeEnum('type').notNull(),
    interviewerType: interviewerTypeEnum('interviewer_type').notNull().default('ai'),
    targetRole: varchar('target_role', { length: 150 }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: interviewStatusEnum('status').notNull().default('scheduled'),
    questions: jsonb('questions').$type<Array<{ id: string; questionText: string; category?: string; difficulty?: string }>>(),
    answers: jsonb('answers').$type<Array<{ questionId: string; questionText: string; answerText: string }>>(),
    recordingUrl: text('recording_url'),
    transcript: text('transcript'),
    // structured AI/human feedback: { strengths[], improvements[], communicationScore, technicalScore }
    feedback: jsonb('feedback').$type<{
      strengths: string[];
      improvements: string[];
      communicationScore: number;
      technicalScore: number;
      problemSolvingScore: number;
      summary: string;
    }>(),
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }),
    ...timestamps,
  },
  (table) => [index('mock_interviews_student_created_idx').on(table.studentId, table.createdAt)],
);

export const mockInterviewTemplates = pgTable(
  'mock_interview_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleTitle: varchar('role_title', { length: 150 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull().default('technical'),
    questions: jsonb('questions').$type<Array<{
      id: string;
      questionText: string;
      category?: string;
      difficulty?: string;
    }>>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [index('mock_interview_templates_active_idx').on(table.isActive, table.createdAt)],
);

export const interviewQuestionsBank = pgTable('interview_questions_bank', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: interviewTypeEnum('category').notNull(),
  questionText: text('question_text').notNull(),
  difficulty: varchar('difficulty', { length: 20 }).notNull().default('medium'), // easy|medium|hard
  tags: jsonb('tags').notNull().default('[]'),
  ...timestamps,
});

export const learningResources = pgTable('learning_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  type: resourceTypeEnum('type').notNull(),
  url: text('url').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  tags: jsonb('tags').notNull().default('[]'),
  difficulty: varchar('difficulty', { length: 20 }).notNull().default('beginner'),
  isActive: boolean('is_active').notNull().default(true),
  seedKey: varchar('seed_key', { length: 200 }).unique(),
  addedBy: uuid('added_by')
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const resourceProgress = pgTable('resource_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => learningResources.id, { onDelete: 'cascade' }),
  status: resourceProgressStatusEnum('status').notNull().default('not_started'),
  progressPercent: integer('progress_percent').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex('resource_progress_student_resource_idx').on(table.studentId, table.resourceId)]);

// ── Relations ────────────────────────────────────────────────────────────

export const mockTestsRelations = relations(mockTests, ({ many, one }) => ({
  questions: many(mockTestQuestions),
  sections: many(mockTestSections),
  attempts: many(mockTestAttempts),
  author: one(users, { fields: [mockTests.createdBy], references: [users.id] }),
}));

export const mockTestSectionsRelations = relations(mockTestSections, ({ one, many }) => ({
  test: one(mockTests, { fields: [mockTestSections.testId], references: [mockTests.id] }),
  questions: many(mockTestQuestions),
}));

export const mockTestQuestionsRelations = relations(mockTestQuestions, ({ one, many }) => ({
  test: one(mockTests, { fields: [mockTestQuestions.testId], references: [mockTests.id] }),
  section: one(mockTestSections, { fields: [mockTestQuestions.sectionId], references: [mockTestSections.id] }),
  answerKey: one(mockTestAnswerKeys),
  attemptAnswers: many(attemptAnswers),
}));

export const mockTestAnswerKeysRelations = relations(mockTestAnswerKeys, ({ one }) => ({
  question: one(mockTestQuestions, { fields: [mockTestAnswerKeys.questionId], references: [mockTestQuestions.id] }),
}));

export const mockTestAttemptsRelations = relations(mockTestAttempts, ({ one, many }) => ({
  test: one(mockTests, { fields: [mockTestAttempts.testId], references: [mockTests.id] }),
  student: one(studentProfiles, {
    fields: [mockTestAttempts.studentId],
    references: [studentProfiles.id],
  }),
  answers: many(attemptAnswers),
}));

export const attemptAnswersRelations = relations(attemptAnswers, ({ one }) => ({
  attempt: one(mockTestAttempts, {
    fields: [attemptAnswers.attemptId],
    references: [mockTestAttempts.id],
  }),
  question: one(mockTestQuestions, {
    fields: [attemptAnswers.questionId],
    references: [mockTestQuestions.id],
  }),
}));

export const mockInterviewsRelations = relations(mockInterviews, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [mockInterviews.studentId],
    references: [studentProfiles.id],
  }),
}));

export const mockInterviewTemplatesRelations = relations(mockInterviewTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [mockInterviewTemplates.createdBy],
    references: [users.id],
  }),
}));

export const learningResourcesRelations = relations(learningResources, ({ many }) => ({
  progress: many(resourceProgress),
  roadmapStageResources: many(roadmapStageResources),
}));

export const resourceProgressRelations = relations(resourceProgress, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [resourceProgress.studentId],
    references: [studentProfiles.id],
  }),
  resource: one(learningResources, {
    fields: [resourceProgress.resourceId],
    references: [learningResources.id],
  }),
}));
