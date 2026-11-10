import { db, schema } from '@career-portal/db';
import type { InterviewType, TestCategory } from '@career-portal/shared-types';
import { and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm';

import { ConflictError } from '@/shared/errors/app-error';

const FINISHED_STATUSES = ['submitted', 'auto_submitted', 'evaluated'] as const;

/** Escape LIKE wildcards so user search text is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class PreparationRepository {
  async findStudentProfileByUserId(userId: string) {
    return db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, userId),
    });
  }

  // ── Tests ──────────────────────────────────────────────────────────────

  async findTests(filter: { category?: string | undefined; isActive?: boolean | undefined; search?: string | undefined }, limit = 50, offset = 0) {
    const conditions = [];

    if (filter.isActive !== undefined) {
      conditions.push(eq(schema.mockTests.isActive, filter.isActive));
    }
    if (filter.category) {
      conditions.push(eq(schema.mockTests.category, filter.category as TestCategory));
    }
    if (filter.search) {
      conditions.push(ilike(schema.mockTests.title, `%${escapeLike(filter.search)}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalCount] = await Promise.all([
      db.query.mockTests.findMany({
        where: whereClause,
        orderBy: [desc(schema.mockTests.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.mockTests)
        .where(whereClause)
        .then((r) => r[0]?.count ?? 0),
    ]);

    const ids = rows.map((t) => t.id);
    const [questionCounts, sectionCounts] =
      ids.length === 0
        ? [[], []]
        : await Promise.all([
            db
              .select({
                testId: schema.mockTestQuestions.testId,
                n: sql<number>`cast(count(*) as integer)`,
              })
              .from(schema.mockTestQuestions)
              .where(inArray(schema.mockTestQuestions.testId, ids))
              .groupBy(schema.mockTestQuestions.testId),
            db
              .select({
                testId: schema.mockTestSections.testId,
                n: sql<number>`cast(count(*) as integer)`,
              })
              .from(schema.mockTestSections)
              .where(inArray(schema.mockTestSections.testId, ids))
              .groupBy(schema.mockTestSections.testId),
          ]);
    const qMap = new Map(questionCounts.map((r) => [r.testId, r.n]));
    const sMap = new Map(sectionCounts.map((r) => [r.testId, r.n]));

    const tests = rows.map((t) => ({
      ...t,
      sectionsCount: sMap.get(t.id) ?? 0,
      questionsCount: qMap.get(t.id) ?? 0,
    }));

    return { tests, totalCount };
  }

  async findTestById(testId: string) {
    return db.query.mockTests.findFirst({
      where: eq(schema.mockTests.id, testId),
      with: {
        sections: {
          orderBy: [asc(schema.mockTestSections.orderIndex)],
        },
        questions: {
          orderBy: [asc(schema.mockTestQuestions.orderIndex)],
          columns: {
            id: true,
            testId: true,
            sectionId: true,
            questionText: true,
            options: true,
            marks: true,
            orderIndex: true,
            difficulty: true,
            topic: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findTestWithAnswerKeysById(testId: string) {
    return db.query.mockTests.findFirst({
      where: eq(schema.mockTests.id, testId),
      with: {
        sections: {
          orderBy: [asc(schema.mockTestSections.orderIndex)],
        },
        questions: {
          orderBy: [asc(schema.mockTestQuestions.orderIndex)],
          with: {
            answerKey: true,
          },
        },
      },
    });
  }

  async createTest(data: {
    title: string;
    description?: string | null | undefined;
    category: TestCategory;
    durationMinutes: number;
    totalMarks: number;
    passingMarks: number;
    createdBy: string;
    isActive?: boolean | undefined;
  }) {
    const [inserted] = await db
      .insert(schema.mockTests)
      .values({
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        durationMinutes: data.durationMinutes,
        totalMarks: data.totalMarks,
        passingMarks: data.passingMarks,
        createdBy: data.createdBy,
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!inserted) throw new Error('Failed to create mock test');
    return inserted;
  }

  async updateTest(
    id: string,
    data: {
      title?: string | undefined;
      description?: string | null | undefined;
      category?: TestCategory | undefined;
      durationMinutes?: number | undefined;
      totalMarks?: number | undefined;
      passingMarks?: number | undefined;
      isActive?: boolean | undefined;
    },
  ) {
    const [updated] = await db
      .update(schema.mockTests)
      .set(data)
      .where(eq(schema.mockTests.id, id))
      .returning();

    return updated ?? null;
  }

  async deleteTest(id: string) {
    const [deleted] = await db
      .delete(schema.mockTests)
      .where(eq(schema.mockTests.id, id))
      .returning();
    return deleted ?? null;
  }

  // ── Sections ───────────────────────────────────────────────────────────

  async createSection(
    testId: string,
    data: { title: string; description?: string | null | undefined; orderIndex?: number | undefined },
  ) {
    const [inserted] = await db
      .insert(schema.mockTestSections)
      .values({
        testId,
        title: data.title,
        description: data.description ?? null,
        orderIndex: data.orderIndex ?? 0,
      })
      .returning();

    if (!inserted) throw new Error('Failed to create section');
    return inserted;
  }

  async findSectionsByTestId(testId: string) {
    return db.query.mockTestSections.findMany({
      where: eq(schema.mockTestSections.testId, testId),
      orderBy: [asc(schema.mockTestSections.orderIndex)],
    });
  }

  async updateSection(
    id: string,
    data: { title?: string | undefined; description?: string | null | undefined; orderIndex?: number | undefined },
  ) {
    const [updated] = await db
      .update(schema.mockTestSections)
      .set(data)
      .where(eq(schema.mockTestSections.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteSection(id: string) {
    const [deleted] = await db
      .delete(schema.mockTestSections)
      .where(eq(schema.mockTestSections.id, id))
      .returning();
    return deleted ?? null;
  }

  // ── Questions & Answer Keys ────────────────────────────────────────────

  async createQuestion(
    testId: string,
    questionData: {
      sectionId?: string | null | undefined;
      questionText: string;
      options: string[];
      marks?: number | undefined;
      orderIndex?: number | undefined;
      difficulty?: string | undefined;
      topic?: string | null | undefined;
    },
    answerKeyData: {
      correctAnswerIndex: number;
      explanation?: string | null | undefined;
    },
  ) {
    return db.transaction(async (tx) => {
      const [question] = await tx
        .insert(schema.mockTestQuestions)
        .values({
          testId,
          sectionId: questionData.sectionId ?? null,
          questionText: questionData.questionText,
          options: questionData.options,
          marks: questionData.marks ?? 1,
          orderIndex: questionData.orderIndex ?? 0,
          difficulty: questionData.difficulty ?? 'medium',
          topic: questionData.topic ?? null,
        })
        .returning();

      if (!question) throw new Error('Failed to insert question');

      await tx.insert(schema.mockTestAnswerKeys).values({
        questionId: question.id,
        correctAnswerIndex: answerKeyData.correctAnswerIndex,
        explanation: answerKeyData.explanation ?? null,
      });

      return question;
    });
  }

  async updateQuestion(
    id: string,
    questionData: {
      sectionId?: string | null | undefined;
      questionText?: string | undefined;
      options?: string[] | undefined;
      marks?: number | undefined;
      orderIndex?: number | undefined;
      difficulty?: string | undefined;
      topic?: string | null | undefined;
    },
    answerKeyData?: {
      correctAnswerIndex?: number | undefined;
      explanation?: string | null | undefined;
    }  ,
  ) {
    return db.transaction(async (tx) => {
      const [updatedQuestion] = await tx
        .update(schema.mockTestQuestions)
        .set(questionData)
        .where(eq(schema.mockTestQuestions.id, id))
        .returning();

      if (answerKeyData) {
        const existingKey = await tx.query.mockTestAnswerKeys.findFirst({
          where: eq(schema.mockTestAnswerKeys.questionId, id),
        });

        if (existingKey) {
          await tx
            .update(schema.mockTestAnswerKeys)
            .set(answerKeyData)
            .where(eq(schema.mockTestAnswerKeys.questionId, id));
        } else if (answerKeyData.correctAnswerIndex !== undefined) {
          await tx.insert(schema.mockTestAnswerKeys).values({
            questionId: id,
            correctAnswerIndex: answerKeyData.correctAnswerIndex,
            explanation: answerKeyData.explanation ?? null,
          });
        }
      }

      return updatedQuestion ?? null;
    });
  }

  async deleteQuestion(id: string) {
    const [deleted] = await db
      .delete(schema.mockTestQuestions)
      .where(eq(schema.mockTestQuestions.id, id))
      .returning();
    return deleted ?? null;
  }

  async findQuestionsByTestId(testId: string) {
    return db.query.mockTestQuestions.findMany({
      where: eq(schema.mockTestQuestions.testId, testId),
      orderBy: [asc(schema.mockTestQuestions.orderIndex)],
      columns: {
        id: true,
        testId: true,
        sectionId: true,
        questionText: true,
        options: true,
        marks: true,
        orderIndex: true,
        difficulty: true,
        topic: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findQuestionOptionsInTest(testId: string, questionId: string) {
    return db.query.mockTestQuestions.findFirst({
      where: and(eq(schema.mockTestQuestions.id, questionId), eq(schema.mockTestQuestions.testId, testId)),
      columns: { id: true, options: true },
    });
  }

  async findAnswerKeysForQuestions(questionIds: string[]) {
    if (questionIds.length === 0) return [];
    return db.query.mockTestAnswerKeys.findMany({
      where: inArray(schema.mockTestAnswerKeys.questionId, questionIds),
    });
  }

  // ── Attempts & Integrity ───────────────────────────────────────────────

  async findActiveAttempt(testId: string, studentId: string) {
    return db.query.mockTestAttempts.findFirst({
      where: and(
        eq(schema.mockTestAttempts.testId, testId),
        eq(schema.mockTestAttempts.studentId, studentId),
        eq(schema.mockTestAttempts.status, 'in_progress'),
      ),
      with: {
        answers: true,
      },
    });
  }

  async createAttempt(data: {
    testId: string;
    studentId: string;
    attemptToken: string;
  }) {
    const [inserted] = await db
      .insert(schema.mockTestAttempts)
      .values({
        testId: data.testId,
        studentId: data.studentId,
        attemptToken: data.attemptToken,
        status: 'in_progress',
      })
      .returning();

    if (!inserted) throw new Error('Failed to create attempt');
    return inserted;
  }

  /**
   * Race-free "one active attempt" rule: serialises concurrent starts for the
   * same (test, student) pair with a transaction-scoped advisory lock, so two
   * simultaneous requests can never create two in_progress attempts.
   */
  async findOrCreateActiveAttempt(testId: string, studentId: string, attemptToken: string) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${testId} || ':' || ${studentId}))`);

      const existing = await tx.query.mockTestAttempts.findFirst({
        where: and(
          eq(schema.mockTestAttempts.testId, testId),
          eq(schema.mockTestAttempts.studentId, studentId),
          eq(schema.mockTestAttempts.status, 'in_progress'),
        ),
        with: { answers: true },
      });
      if (existing) return { attempt: existing, answers: existing.answers, created: false };

      const [inserted] = await tx
        .insert(schema.mockTestAttempts)
        .values({ testId, studentId, attemptToken, status: 'in_progress' })
        .returning();
      if (!inserted) throw new Error('Failed to create attempt');
      return { attempt: inserted, answers: [], created: true };
    });
  }

  async findAttemptHeader(attemptId: string) {
    return db.query.mockTestAttempts.findFirst({
      where: eq(schema.mockTestAttempts.id, attemptId),
      columns: { id: true, testId: true, studentId: true, status: true, startedAt: true },
      with: { test: { columns: { durationMinutes: true } } },
    });
  }

  async findAttemptById(attemptId: string) {
    return db.query.mockTestAttempts.findFirst({
      where: eq(schema.mockTestAttempts.id, attemptId),
      with: {
        test: {
          with: {
            sections: true,
          },
        },
        answers: true,
      },
    });
  }

  async findAttemptWithAnswersAndQuestions(attemptId: string) {
    return db.query.mockTestAttempts.findFirst({
      where: eq(schema.mockTestAttempts.id, attemptId),
      with: {
        test: true,
        answers: {
          with: {
            question: {
              with: {
                answerKey: true,
              },
            },
          },
        },
      },
    });
  }

  async saveAttemptAnswer(
    attemptId: string,
    questionId: string,
    selectedIndex: number | null,
    timeSpentSeconds = 0,
  ) {
    await db
      .insert(schema.attemptAnswers)
      .values({
        attemptId,
        questionId,
        selectedIndex,
        timeSpentSeconds,
      })
      .onConflictDoUpdate({
        target: [schema.attemptAnswers.attemptId, schema.attemptAnswers.questionId],
        set: {
          selectedIndex,
          timeSpentSeconds,
          answeredAt: new Date(),
        },
      });
  }

  /**
   * Atomic grading and attempt submission transaction.
   * Updates answer correctness & marks and finalizes attempt status.
   */
  async submitAttemptAtomic(
    attemptId: string,
    submissionData: {
      score: number;
      totalMarks: number;
      passingMarks: number;
      isPassed: boolean;
      timeSpentSeconds: number;
      status: 'submitted' | 'auto_submitted' | 'evaluated';
      gradedAnswers: Array<{
        questionId: string;
        selectedIndex: number | null;
        isCorrect: boolean;
        awardedMarks: number;
        timeSpentSeconds: number;
      }>;
    },
  ) {
    return db.transaction(async (tx) => {
      // 1. Verify attempt is still in_progress with row lock
      const [attempt] = await tx
        .select()
        .from(schema.mockTestAttempts)
        .where(eq(schema.mockTestAttempts.id, attemptId))
        .for('update');

      if (!attempt) throw new Error('Attempt not found');
      if (attempt.status !== 'in_progress') {
        throw new ConflictError('Test attempt has already been submitted or evaluated');
      }

      // 2. Persist graded answers in a single batched upsert (no N+1 round trips)
      if (submissionData.gradedAnswers.length > 0) {
        await tx
          .insert(schema.attemptAnswers)
          .values(
            submissionData.gradedAnswers.map((item) => ({
              attemptId,
              questionId: item.questionId,
              selectedIndex: item.selectedIndex,
              isCorrect: item.isCorrect,
              awardedMarks: String(item.awardedMarks),
              timeSpentSeconds: item.timeSpentSeconds,
            })),
          )
          .onConflictDoUpdate({
            target: [schema.attemptAnswers.attemptId, schema.attemptAnswers.questionId],
            set: {
              selectedIndex: sql`excluded.selected_index`,
              isCorrect: sql`excluded.is_correct`,
              awardedMarks: sql`excluded.awarded_marks`,
              timeSpentSeconds: sql`excluded.time_spent_seconds`,
              answeredAt: new Date(),
            },
          });
      }

      // 3. Finalize attempt header
      const [updated] = await tx
        .update(schema.mockTestAttempts)
        .set({
          score: String(submissionData.score),
          totalMarks: submissionData.totalMarks,
          passingMarks: submissionData.passingMarks,
          isPassed: submissionData.isPassed,
          status: submissionData.status,
          timeSpentSeconds: submissionData.timeSpentSeconds,
          submittedAt: new Date(),
          evaluatedAt: new Date(),
        })
        .where(eq(schema.mockTestAttempts.id, attemptId))
        .returning();

      return updated;
    });
  }

  async findStudentAttempts(studentId: string) {
    return db.query.mockTestAttempts.findMany({
      where: eq(schema.mockTestAttempts.studentId, studentId),
      orderBy: [desc(schema.mockTestAttempts.startedAt)],
      with: {
        test: true,
      },
    });
  }

  // ── Analytics ──────────────────────────────────────────────────────────

  /** Aggregated in SQL: never pulls every attempt/answer row into Node memory. */
  async getFacultyTestAnalytics(testId: string) {
    const finished = and(
      eq(schema.mockTestAttempts.testId, testId),
      inArray(schema.mockTestAttempts.status, [...FINISHED_STATUSES]),
    );

    const [summary] = await db
      .select({
        totalAttempts: sql<number>`cast(count(*) as integer)`,
        averageScore: sql<number>`coalesce(avg(${schema.mockTestAttempts.score}), 0)::float8`,
        passedCount: sql<number>`cast(count(*) filter (where ${schema.mockTestAttempts.isPassed}) as integer)`,
      })
      .from(schema.mockTestAttempts)
      .where(finished);

    const totalAttempts = summary?.totalAttempts ?? 0;
    if (!summary || totalAttempts === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRatePercentage: 0,
        questionAccuracy: [],
      };
    }

    const rows = await db
      .select({
        questionId: schema.attemptAnswers.questionId,
        questionText: schema.mockTestQuestions.questionText,
        topic: schema.mockTestQuestions.topic,
        totalAnswers: sql<number>`cast(count(*) as integer)`,
        correctCount: sql<number>`cast(count(*) filter (where ${schema.attemptAnswers.isCorrect}) as integer)`,
      })
      .from(schema.attemptAnswers)
      .innerJoin(schema.mockTestAttempts, eq(schema.attemptAnswers.attemptId, schema.mockTestAttempts.id))
      .innerJoin(schema.mockTestQuestions, eq(schema.attemptAnswers.questionId, schema.mockTestQuestions.id))
      .where(finished)
      .groupBy(
        schema.attemptAnswers.questionId,
        schema.mockTestQuestions.questionText,
        schema.mockTestQuestions.topic,
      );

    return {
      totalAttempts,
      averageScore: Math.round(summary.averageScore * 100) / 100,
      passRatePercentage: Math.round((summary.passedCount / totalAttempts) * 100),
      questionAccuracy: rows.map((r) => ({
        questionId: r.questionId,
        questionText: r.questionText,
        topic: r.topic,
        correctPercentage: r.totalAnswers > 0 ? Math.round((r.correctCount / r.totalAnswers) * 100) : 0,
        totalAnswers: r.totalAnswers,
      })),
    };
  }

  async getStudentAnalytics(studentId: string) {
    const attempts = await db.query.mockTestAttempts.findMany({
      where: and(
        eq(schema.mockTestAttempts.studentId, studentId),
        inArray(schema.mockTestAttempts.status, [...FINISHED_STATUSES]),
      ),
      orderBy: [asc(schema.mockTestAttempts.submittedAt)],
      with: {
        test: true,
      },
    });

    const totalAttempts = attempts.length;
    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        passedAttempts: 0,
        averageScorePercentage: 0,
        topicAccuracies: [],
        weakCategories: [],
        scoreTrend: [],
      };
    }

    const passedAttempts = attempts.filter((a) => a.isPassed).length;
    let totalScorePct = 0;

    const scoreTrend = attempts.map((a) => {
      const score = a.score ? Number(a.score) : 0;
      const totalMarks = a.totalMarks ?? a.test.totalMarks;
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      totalScorePct += percentage;
      return {
        date: a.submittedAt ? a.submittedAt.toISOString() : a.startedAt.toISOString(),
        testTitle: a.test.title,
        score,
        totalMarks,
        percentage,
      };
    });

    const topicExpr = sql<string>`coalesce(nullif(${schema.mockTestQuestions.topic}, ''), ${schema.mockTests.category}::text)`;
    const topicRows = await db
      .select({
        topic: topicExpr,
        total: sql<number>`cast(count(*) as integer)`,
        correct: sql<number>`cast(count(*) filter (where ${schema.attemptAnswers.isCorrect}) as integer)`,
      })
      .from(schema.attemptAnswers)
      .innerJoin(schema.mockTestAttempts, eq(schema.attemptAnswers.attemptId, schema.mockTestAttempts.id))
      .innerJoin(schema.mockTestQuestions, eq(schema.attemptAnswers.questionId, schema.mockTestQuestions.id))
      .innerJoin(schema.mockTests, eq(schema.mockTestAttempts.testId, schema.mockTests.id))
      .where(
        and(
          eq(schema.mockTestAttempts.studentId, studentId),
          inArray(schema.mockTestAttempts.status, [...FINISHED_STATUSES]),
        ),
      )
      .groupBy(topicExpr);

    const topicAccuracies = topicRows.map((r) => ({
      topic: r.topic,
      totalQuestions: r.total,
      correctQuestions: r.correct,
      accuracyPercentage: r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0,
    }));

    const weakCategories = topicAccuracies
      .filter((t) => t.accuracyPercentage < 50)
      .map((t) => t.topic);

    return {
      totalAttempts,
      passedAttempts,
      averageScorePercentage: Math.round(totalScorePct / totalAttempts),
      topicAccuracies,
      weakCategories,
      scoreTrend,
    };
  }

  // ── Mock Interviews ────────────────────────────────────────────────────

  async createMockInterview(data: {
    studentId: string;
    type: typeof schema.mockInterviews.$inferInsert.type;
    interviewerType: typeof schema.mockInterviews.$inferInsert.interviewerType;
    targetRole?: string | null;
    scheduledAt: Date;
    questions?: typeof schema.mockInterviews.$inferInsert.questions;
  }) {
    const [inserted] = await db
      .insert(schema.mockInterviews)
      .values({
        studentId: data.studentId,
        type: data.type,
        interviewerType: data.interviewerType,
        targetRole: data.targetRole ?? null,
        scheduledAt: data.scheduledAt,
        status: 'scheduled',
        questions: data.questions ?? null,
      })
      .returning();

    if (!inserted) throw new Error('Failed to create mock interview');
    return inserted;
  }

  async findMockInterviewById(id: string) {
    return db.query.mockInterviews.findFirst({
      where: eq(schema.mockInterviews.id, id),
    });
  }

  async findMockInterviewsByStudent(studentId: string) {
    return db.query.mockInterviews.findMany({
      where: eq(schema.mockInterviews.studentId, studentId),
      orderBy: [desc(schema.mockInterviews.createdAt)],
    });
  }

  async updateMockInterview(
    id: string,
    data: Partial<Pick<typeof schema.mockInterviews.$inferInsert, 'status' | 'answers' | 'feedback' | 'overallScore'>>,
  ) {
    const [updated] = await db
      .update(schema.mockInterviews)
      .set(data)
      .where(eq(schema.mockInterviews.id, id))
      .returning();
    return updated ?? null;
  }

  async findInterviewQuestionsBank(category?: InterviewType) {
    return db.query.interviewQuestionsBank.findMany({
      where: category ? eq(schema.interviewQuestionsBank.category, category) : undefined,
    });
  }

  async deleteMockInterview(id: string) {
    const [deleted] = await db
      .delete(schema.mockInterviews)
      .where(eq(schema.mockInterviews.id, id))
      .returning();
    return deleted ?? null;
  }

  // ── Mock Interview Templates (Faculty-Curated Tracks) ─────────────────────

  async findInterviewTemplates(isActiveOnly = false) {
    return db.query.mockInterviewTemplates.findMany({
      where: isActiveOnly ? eq(schema.mockInterviewTemplates.isActive, true) : undefined,
      orderBy: [desc(schema.mockInterviewTemplates.createdAt)],
      with: {
        creator: true,
      },
    });
  }

  async findInterviewTemplateById(id: string) {
    return db.query.mockInterviewTemplates.findFirst({
      where: eq(schema.mockInterviewTemplates.id, id),
      with: {
        creator: true,
      },
    });
  }

  async createInterviewTemplate(data: {
    roleTitle: string;
    description?: string | null;
    category?: string;
    questions: Array<{ id: string; questionText: string; category?: string; difficulty?: string }>;
    createdBy: string;
  }) {
    const [inserted] = await db
      .insert(schema.mockInterviewTemplates)
      .values({
        roleTitle: data.roleTitle,
        description: data.description ?? null,
        category: data.category ?? 'technical',
        questions: data.questions,
        createdBy: data.createdBy,
        isActive: true,
      })
      .returning();

    if (!inserted) throw new Error('Failed to create mock interview template');
    return inserted;
  }

  async updateInterviewTemplate(
    id: string,
    data: Partial<Pick<typeof schema.mockInterviewTemplates.$inferInsert, 'roleTitle' | 'description' | 'category' | 'questions' | 'isActive'>>,
  ) {
    const [updated] = await db
      .update(schema.mockInterviewTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.mockInterviewTemplates.id, id))
      .returning();

    return updated ?? null;
  }

  async deleteInterviewTemplate(id: string) {
    const [deleted] = await db
      .delete(schema.mockInterviewTemplates)
      .where(eq(schema.mockInterviewTemplates.id, id))
      .returning();

    return deleted ?? null;
  }
}
