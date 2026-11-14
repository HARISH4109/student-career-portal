import { randomUUID } from 'node:crypto';

import type {
  AdminTestQuestionDto,
  AttemptResultDto,
  AutosaveAnswerDto,
  CreateMockInterviewDto,
  CreateMockInterviewTemplateDto,
  CreateMockTestDto,
  CreateTestQuestionDto,
  CreateTestSectionDto,
  FacultyTestAggregateAnalyticsDto,
  MockInterviewDto,
  MockInterviewTemplateDto,
  MockTestDetailDto,
  QuestionResultDto,
  StartTestResponseDto,
  StudentAttemptSummaryDto,
  StudentPreparationAnalyticsDto,
  StudentTestQuestionDto,
  SubmitInterviewAnswersDto,
  SubmitMockTestDto,
  TopicAccuracyDto,
  UpdateMockInterviewTemplateDto,
  UpdateMockTestDto,
  UpdateTestQuestionDto,
  UpdateTestSectionDto,
} from '@career-portal/shared-types';

import { evaluateInterviewAnswers } from './interview-evaluator';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { auditService } from '@/modules/audit/audit.service';
import { PreparationRepository } from './preparation.repository';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/shared/errors/app-error';

export class PreparationService {
  constructor(
    private readonly repo: PreparationRepository = new PreparationRepository(),
    private readonly notificationsService: NotificationsService = new NotificationsService(),
  ) {}

  private async getStudentProfile(userId: string) {
    const profile = await this.repo.findStudentProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Student profile');
    }
    return profile;
  }

  // ── Test Authoring (Faculty / Admin) ───────────────────────────────────

  async createTest(userId: string, dto: CreateMockTestDto): Promise<MockTestDetailDto> {
    const test = await this.repo.createTest({
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category,
      durationMinutes: dto.durationMinutes,
      totalMarks: dto.totalMarks,
      passingMarks: dto.passingMarks,
      createdBy: userId,
      isActive: dto.isActive,
    });

    void auditService.log({
      userId,
      action: 'test.created',
      entityType: 'mock_test',
      entityId: test.id,
      metadata: { title: test.title, category: test.category },
    });

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      category: test.category,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      isActive: test.isActive,
      createdBy: test.createdBy,
      createdAt: test.createdAt.toISOString(),
    };
  }

  async updateTest(testId: string, dto: UpdateMockTestDto): Promise<MockTestDetailDto> {
    const existing = await this.repo.findTestById(testId);
    if (!existing) throw new NotFoundError('Mock test');

    const updated = await this.repo.updateTest(testId, {
      title: dto.title,
      description: dto.description === undefined ? undefined : dto.description ?? null,
      category: dto.category,
      durationMinutes: dto.durationMinutes,
      totalMarks: dto.totalMarks,
      passingMarks: dto.passingMarks,
      isActive: dto.isActive,
    });
    if (!updated) throw new NotFoundError('Mock test');

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      durationMinutes: updated.durationMinutes,
      totalMarks: updated.totalMarks,
      passingMarks: updated.passingMarks,
      isActive: updated.isActive,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteTest(testId: string): Promise<{ success: boolean }> {
    const deleted = await this.repo.deleteTest(testId);
    if (!deleted) throw new NotFoundError('Mock test');
    return { success: true };
  }

  async getTestAuthorDetails(testId: string): Promise<MockTestDetailDto & { questions: AdminTestQuestionDto[] }> {
    const test = await this.repo.findTestWithAnswerKeysById(testId);
    if (!test) throw new NotFoundError('Mock test');

    const questions: AdminTestQuestionDto[] = test.questions.map((q) => ({
      id: q.id,
      sectionId: q.sectionId,
      questionText: q.questionText,
      options: (q.options as string[]),
      marks: q.marks,
      orderIndex: q.orderIndex,
      difficulty: q.difficulty,
      topic: q.topic,
      correctAnswerIndex: q.answerKey?.correctAnswerIndex ?? 0,
      explanation: q.answerKey?.explanation ?? null,
    }));

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      category: test.category,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      isActive: test.isActive,
      createdBy: test.createdBy,
      createdAt: test.createdAt.toISOString(),
      sections: test.sections.map((s) => ({
        id: s.id,
        testId: s.testId,
        title: s.title,
        description: s.description,
        orderIndex: s.orderIndex,
      })),
      questionCount: questions.length,
      questions,
    };
  }

  // ── Section Authoring ──────────────────────────────────────────────────

  async addSection(testId: string, dto: CreateTestSectionDto) {
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundError('Mock test');

    return this.repo.createSection(testId, {
      title: dto.title,
      description: dto.description ?? null,
      orderIndex: dto.orderIndex,
    });
  }

  async updateSection(sectionId: string, dto: UpdateTestSectionDto) {
    const updated = await this.repo.updateSection(sectionId, {
      title: dto.title,
      description: dto.description === undefined ? undefined : dto.description ?? null,
      orderIndex: dto.orderIndex,
    });
    if (!updated) throw new NotFoundError('Test section');
    return updated;
  }

  async deleteSection(sectionId: string) {
    const deleted = await this.repo.deleteSection(sectionId);
    if (!deleted) throw new NotFoundError('Test section');
    return { success: true };
  }

  // ── Question Authoring ─────────────────────────────────────────────────

  async addQuestion(testId: string, dto: CreateTestQuestionDto): Promise<AdminTestQuestionDto> {
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundError('Mock test');

    if (dto.correctAnswerIndex < 0 || dto.correctAnswerIndex >= dto.options.length) {
      throw new ValidationError('Correct answer index must be within options range');
    }

    const question = await this.repo.createQuestion(
      testId,
      {
        sectionId: dto.sectionId ?? null,
        questionText: dto.questionText,
        options: dto.options,
        marks: dto.marks,
        orderIndex: dto.orderIndex,
        difficulty: dto.difficulty,
        topic: dto.topic ?? null,
      },
      {
        correctAnswerIndex: dto.correctAnswerIndex,
        explanation: dto.explanation ?? null,
      },
    );

    return {
      id: question.id,
      sectionId: question.sectionId,
      questionText: question.questionText,
      options: (question.options as string[]),
      marks: question.marks,
      orderIndex: question.orderIndex,
      difficulty: question.difficulty,
      topic: question.topic,
      correctAnswerIndex: dto.correctAnswerIndex,
      explanation: dto.explanation ?? null,
    };
  }

  async updateQuestion(questionId: string, dto: UpdateTestQuestionDto): Promise<AdminTestQuestionDto> {
    if (
      dto.options &&
      dto.correctAnswerIndex !== undefined &&
      (dto.correctAnswerIndex < 0 || dto.correctAnswerIndex >= dto.options.length)
    ) {
      throw new ValidationError('Correct answer index must be within options range');
    }

    const updated = await this.repo.updateQuestion(
      questionId,
      {
        sectionId: dto.sectionId === undefined ? undefined : dto.sectionId ?? null,
        questionText: dto.questionText,
        options: dto.options,
        marks: dto.marks,
        orderIndex: dto.orderIndex,
        difficulty: dto.difficulty,
        topic: dto.topic === undefined ? undefined : dto.topic ?? null,
      },
      dto.correctAnswerIndex !== undefined || dto.explanation !== undefined
        ? {
            correctAnswerIndex: dto.correctAnswerIndex,
            explanation: dto.explanation === undefined ? undefined : dto.explanation ?? null,
          }
        : undefined,
    );

    if (!updated) throw new NotFoundError('Question');

    const keys = await this.repo.findAnswerKeysForQuestions([questionId]);
    const key = keys[0];

    return {
      id: updated.id,
      sectionId: updated.sectionId,
      questionText: updated.questionText,
      options: (updated.options as string[]),
      marks: updated.marks,
      orderIndex: updated.orderIndex,
      difficulty: updated.difficulty,
      topic: updated.topic,
      correctAnswerIndex: key?.correctAnswerIndex ?? 0,
      explanation: key?.explanation ?? null,
    };
  }

  async deleteQuestion(questionId: string) {
    const deleted = await this.repo.deleteQuestion(questionId);
    if (!deleted) throw new NotFoundError('Question');
    return { success: true };
  }

  // ── Student Test Taking & Security ──────────────────────────────────────

  async getAvailableTests(
    filter: {
      category?: string | undefined;
      search?: string | undefined;
      status?: 'active' | 'closed' | 'all' | undefined;
      page?: number;
      pageSize?: number;
    },
    _userRoles: string[] = [],
  ) {
    // Both students and faculty can browse active and closed tests in the catalog
    let isActiveFilter: boolean | undefined;
    if (filter.status === 'active') {
      isActiveFilter = true;
    } else if (filter.status === 'closed') {
      isActiveFilter = false;
    } else {
      isActiveFilter = undefined; // 'all' or default returns all tests
    }

    const pageSize = filter.pageSize ?? 50;
    const { tests, totalCount } = await this.repo.findTests({
      category: filter.category,
      isActive: isActiveFilter,
      search: filter.search,
    }, pageSize, ((filter.page ?? 1) - 1) * pageSize);

    return {
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        durationMinutes: t.durationMinutes,
        totalMarks: t.totalMarks,
        passingMarks: t.passingMarks,
        isActive: t.isActive,
        sectionsCount: t.sectionsCount,
        questionsCount: t.questionsCount,
        createdAt: t.createdAt.toISOString(),
      })),
      totalCount,
    };
  }

  async getTestOverview(testId: string, _userRoles: string[] = []) {
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundError('Mock test');

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      category: test.category,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      isActive: test.isActive,
      sections: test.sections.map((s) => ({
        id: s.id,
        testId: s.testId,
        title: s.title,
        description: s.description,
        orderIndex: s.orderIndex,
      })),
      questionCount: test.questions.length,
    };
  }

  /**
   * Start or resume an active test attempt.
   * SECURITY GUARANTEE: Never sends answer keys or explanations to student client!
   */
  async startTest(userId: string, testId: string): Promise<StartTestResponseDto> {
    const student = await this.getStudentProfile(userId);
    const test = await this.repo.findTestById(testId);

    if (!test) throw new NotFoundError('Mock test');
    if (!test.isActive) throw new ForbiddenError('This mock test is currently inactive');

    // One-active-attempt rule, enforced atomically in the repository (advisory lock)
    const { attempt, answers: savedAnswers } = await this.repo.findOrCreateActiveAttempt(
      testId,
      student.id,
      randomUUID(),
    );
    const attemptId = attempt.id;
    const attemptToken = attempt.attemptToken;
    const startedAt = attempt.startedAt.toISOString();
    const existingAnswers: Record<string, number> = {};

    for (const ans of savedAnswers) {
      if (ans.selectedIndex !== null) {
        existingAnswers[ans.questionId] = ans.selectedIndex;
      }
    }

    if (!attemptToken) {
      throw new Error('Failed to initialize attempt');
    }

    // Fetch questions without answer keys
    const questions: StudentTestQuestionDto[] = test.questions.map((q) => ({
      id: q.id,
      sectionId: q.sectionId,
      questionText: q.questionText,
      options: (q.options as string[]),
      marks: q.marks,
      orderIndex: q.orderIndex,
      difficulty: q.difficulty,
      topic: q.topic,
    }));

    return {
      attemptId,
      attemptToken,
      testId: test.id,
      title: test.title,
      durationMinutes: test.durationMinutes,
      startedAt,
      questions,
      sections: test.sections.map((s) => ({
        id: s.id,
        testId: s.testId,
        title: s.title,
        description: s.description,
        orderIndex: s.orderIndex,
      })),
      existingAnswers,
    };
  }

  /**
   * Autosaves question answer while test is in progress.
   */
  async autosaveAnswer(userId: string, attemptId: string, dto: AutosaveAnswerDto): Promise<{ success: boolean }> {
    const student = await this.getStudentProfile(userId);
    const attempt = await this.repo.findAttemptHeader(attemptId);

    if (!attempt) throw new NotFoundError('Test attempt');
    if (attempt.studentId !== student.id) {
      throw new ForbiddenError('You do not own this test attempt');
    }
    if (attempt.status !== 'in_progress') {
      throw new ConflictError('Cannot autosave; test attempt has already been submitted');
    }

    // Server-side timer check with 2 minute grace period
    const elapsedMinutes = (Date.now() - new Date(attempt.startedAt).getTime()) / 60000;
    if (elapsedMinutes > attempt.test.durationMinutes + 2) {
      throw new ForbiddenError('Test duration has expired; cannot autosave further answers');
    }

    const question = await this.repo.findQuestionOptionsInTest(attempt.testId, dto.questionId);
    if (!question) throw new ValidationError('Question does not belong to this test');
    if (
      dto.selectedIndex !== undefined &&
      dto.selectedIndex !== null &&
      (dto.selectedIndex < 0 || dto.selectedIndex >= ((question.options as string[])).length)
    ) {
      throw new ValidationError('Selected option is out of range');
    }

    await this.repo.saveAttemptAnswer(
      attemptId,
      dto.questionId,
      dto.selectedIndex ?? null,
      dto.timeSpentSeconds,
    );

    return { success: true };
  }

  /**
   * Server-side atomic submission & grading.
   * - Enforces duplicate submission prevention
   * - Validates server-side duration timer
   * - Retrieves protected answer keys from `mock_test_answer_keys`
   * - Atomically grades and calculates final score
   */
  async submitTest(userId: string, attemptId: string, dto: SubmitMockTestDto): Promise<AttemptResultDto> {
    const student = await this.getStudentProfile(userId);
    const attempt = await this.repo.findAttemptById(attemptId);

    if (!attempt) throw new NotFoundError('Test attempt');
    if (attempt.studentId !== student.id) {
      throw new ForbiddenError('You do not own this test attempt');
    }
    if (attempt.status !== 'in_progress') {
      throw new ConflictError('Test attempt has already been submitted or evaluated');
    }

    // Timer check: if past duration + 2 min grace period, mark as auto_submitted
    const elapsedMinutes = (Date.now() - new Date(attempt.startedAt).getTime()) / 60000;
    const isLate = elapsedMinutes > attempt.test.durationMinutes + 2;
    const finalStatus: 'submitted' | 'auto_submitted' | 'evaluated' = isLate ? 'auto_submitted' : 'evaluated';

    // Fetch questions and protected answer keys
    const questions = await this.repo.findQuestionsByTestId(attempt.testId);
    const questionIds = questions.map((q) => q.id);
    const answerKeys = await this.repo.findAnswerKeysForQuestions(questionIds);
    const keyMap = new Map<string, { correctAnswerIndex: number; explanation: string | null }>();
    for (const key of answerKeys) {
      keyMap.set(key.questionId, {
        correctAnswerIndex: key.correctAnswerIndex,
        explanation: key.explanation,
      });
    }

    // Reject answers for unknown questions / out-of-range options instead of failing on FK errors
    const questionById = new Map(questions.map((q) => [q.id, q]));
    for (const ans of dto.answers) {
      const q = questionById.get(ans.questionId);
      if (!q) throw new ValidationError('Answer references a question outside this test');
      if (
        ans.selectedIndex !== undefined &&
        ans.selectedIndex !== null &&
        (ans.selectedIndex < 0 || ans.selectedIndex >= ((q.options as string[])).length)
      ) {
        throw new ValidationError('Selected option is out of range');
      }
    }

    // Merge autosaved answers with submitted payload answers
    const submittedMap = new Map<string, { selectedIndex: number | null; timeSpentSeconds: number }>();
    for (const ans of attempt.answers) {
      submittedMap.set(ans.questionId, {
        selectedIndex: ans.selectedIndex,
        timeSpentSeconds: ans.timeSpentSeconds ?? 0,
      });
    }
    for (const ans of dto.answers) {
      submittedMap.set(ans.questionId, {
        selectedIndex: ans.selectedIndex ?? null,
        timeSpentSeconds: ans.timeSpentSeconds,
      });
    }

    // Grade each question atomically
    let totalScore = 0;
    const gradedAnswers: Array<{
      questionId: string;
      selectedIndex: number | null;
      isCorrect: boolean;
      awardedMarks: number;
      timeSpentSeconds: number;
    }> = [];

    const questionResults: QuestionResultDto[] = [];
    const topicStatsMap = new Map<string, { total: number; correct: number }>();

    for (const q of questions) {
      const key = keyMap.get(q.id);
      const studentAns = submittedMap.get(q.id);
      const selectedIndex = studentAns?.selectedIndex ?? null;
      const timeSpent = studentAns?.timeSpentSeconds ?? 0;

      const isCorrect = key !== undefined && selectedIndex !== null && selectedIndex === key.correctAnswerIndex;
      const awardedMarks = isCorrect ? q.marks : 0;
      totalScore += awardedMarks;

      gradedAnswers.push({
        questionId: q.id,
        selectedIndex,
        isCorrect,
        awardedMarks,
        timeSpentSeconds: timeSpent,
      });

      questionResults.push({
        questionId: q.id,
        questionText: q.questionText,
        options: (q.options as string[]),
        selectedIndex,
        correctAnswerIndex: key?.correctAnswerIndex ?? 0,
        isCorrect,
        awardedMarks,
        maxMarks: q.marks,
        explanation: key?.explanation ?? null,
        topic: q.topic,
        difficulty: q.difficulty,
      });

      const topicName = q.topic || attempt.test.category;
      const topicStat = topicStatsMap.get(topicName) || { total: 0, correct: 0 };
      topicStat.total += 1;
      if (isCorrect) topicStat.correct += 1;
      topicStatsMap.set(topicName, topicStat);
    }

    const totalMarks = attempt.test.totalMarks;
    const passingMarks = attempt.test.passingMarks;
    const isPassed = totalScore >= passingMarks;

    // Atomically persist in database
    await this.repo.submitAttemptAtomic(attemptId, {
      score: totalScore,
      totalMarks,
      passingMarks,
      isPassed,
      timeSpentSeconds: dto.timeSpentSeconds || Math.round(elapsedMinutes * 60),
      status: finalStatus,
      gradedAnswers,
    });

    void this.notificationsService.notifyTestResultReady({
      studentUserId: userId,
      testTitle: attempt.test.title,
      score: totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : totalScore,
      attemptId,
    });

    void auditService.log({
      userId,
      action: 'test.attempt_submitted',
      entityType: 'mock_test_attempt',
      entityId: attemptId,
      metadata: { score: totalScore, totalMarks, isPassed },
    });

    const topicAccuracies: TopicAccuracyDto[] = Array.from(topicStatsMap.entries()).map(([topic, stat]) => ({
      topic,
      totalQuestions: stat.total,
      correctQuestions: stat.correct,
      accuracyPercentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }));

    const weakCategories = topicAccuracies
      .filter((t) => t.accuracyPercentage < 50)
      .map((t) => t.topic);

    return {
      attemptId,
      testId: attempt.testId,
      testTitle: attempt.test.title,
      studentId: student.id,
      score: totalScore,
      totalMarks,
      passingMarks,
      isPassed,
      status: finalStatus,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: dto.timeSpentSeconds || Math.round(elapsedMinutes * 60),
      questions: questionResults,
      topicAccuracies,
      weakCategories,
    };
  }

  /**
   * Result visibility endpoint.
   * Student can only view their own completed/evaluated test results.
   */
  async getAttemptResult(
    userId: string,
    attemptId: string,
    userRoles: string[],
  ): Promise<AttemptResultDto> {
    const attempt = await this.repo.findAttemptWithAnswersAndQuestions(attemptId);
    if (!attempt) throw new NotFoundError('Test attempt');

    const isStaff = userRoles.includes('PLACEMENT_FACULTY') || userRoles.includes('ADMIN');

    if (!isStaff) {
      const student = await this.getStudentProfile(userId);
      if (attempt.studentId !== student.id) {
        throw new ForbiddenError('You do not have permission to view this test attempt result');
      }
      if (attempt.status === 'in_progress') {
        throw new ForbiddenError('Test result is not available until the attempt is submitted');
      }
    }

    const questionResults: QuestionResultDto[] = attempt.answers.map((a) => ({
      questionId: a.questionId,
      questionText: a.question.questionText,
      options: (a.question.options as string[]),
      selectedIndex: a.selectedIndex,
      correctAnswerIndex: a.question.answerKey?.correctAnswerIndex ?? 0,
      isCorrect: a.isCorrect ?? false,
      awardedMarks: a.awardedMarks ? Number(a.awardedMarks) : 0,
      maxMarks: a.question.marks,
      explanation: a.question.answerKey?.explanation ?? null,
      topic: a.question.topic,
      difficulty: a.question.difficulty,
    }));

    const topicStatsMap = new Map<string, { total: number; correct: number }>();
    for (const qr of questionResults) {
      const topic = qr.topic || attempt.test.category;
      const stat = topicStatsMap.get(topic) || { total: 0, correct: 0 };
      stat.total += 1;
      if (qr.isCorrect) stat.correct += 1;
      topicStatsMap.set(topic, stat);
    }

    const topicAccuracies: TopicAccuracyDto[] = Array.from(topicStatsMap.entries()).map(([topic, stat]) => ({
      topic,
      totalQuestions: stat.total,
      correctQuestions: stat.correct,
      accuracyPercentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }));

    const weakCategories = topicAccuracies
      .filter((t) => t.accuracyPercentage < 50)
      .map((t) => t.topic);

    return {
      attemptId: attempt.id,
      testId: attempt.testId,
      testTitle: attempt.test.title,
      studentId: attempt.studentId,
      score: attempt.score ? Number(attempt.score) : 0,
      totalMarks: attempt.totalMarks ?? attempt.test.totalMarks,
      passingMarks: attempt.passingMarks ?? attempt.test.passingMarks,
      isPassed: attempt.isPassed ?? false,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
      timeSpentSeconds: attempt.timeSpentSeconds ?? 0,
      questions: questionResults,
      topicAccuracies,
      weakCategories,
    };
  }

  async getStudentAttempts(userId: string): Promise<StudentAttemptSummaryDto[]> {
    const student = await this.getStudentProfile(userId);
    const attempts = await this.repo.findStudentAttempts(student.id);

    return attempts.map((a) => ({
      attemptId: a.id,
      testId: a.testId,
      testTitle: a.test.title,
      category: a.test.category,
      score: a.score ? Number(a.score) : 0,
      totalMarks: a.totalMarks ?? a.test.totalMarks,
      passingMarks: a.passingMarks ?? a.test.passingMarks,
      isPassed: a.isPassed ?? false,
      status: a.status,
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : a.startedAt.toISOString(),
      timeSpentSeconds: a.timeSpentSeconds ?? 0,
    }));
  }

  async getStudentAnalytics(userId: string): Promise<StudentPreparationAnalyticsDto> {
    const student = await this.getStudentProfile(userId);
    return this.repo.getStudentAnalytics(student.id);
  }

  async getFacultyTestAnalytics(testId: string): Promise<FacultyTestAggregateAnalyticsDto> {
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundError('Mock test');

    const analytics = await this.repo.getFacultyTestAnalytics(testId);
    return {
      testId: test.id,
      testTitle: test.title,
      ...analytics,
    };
  }

  // ── Mock Interviews ────────────────────────────────────────────────────

  async scheduleMockInterview(userId: string, dto: CreateMockInterviewDto): Promise<MockInterviewDto> {
    const student = await this.getStudentProfile(userId);

    // If AI interview, generate standard or template-based interview questions
    let questions: Array<{ id: string; questionText: string; category: string; difficulty: string }> = [];
    if (dto.interviewerType === 'ai') {
      if (dto.templateId) {
        const template = await this.repo.findInterviewTemplateById(dto.templateId);
        if (template && template.questions && template.questions.length > 0) {
          questions = template.questions.map((q) => ({
            id: q.id || randomUUID(),
            questionText: q.questionText,
            category: q.category || 'technical',
            difficulty: q.difficulty || 'medium',
          }));
        }
      }

      // If no template questions loaded, auto-generate standard role-specific questions
      if (questions.length === 0) {
        questions = [
          {
            id: randomUUID(),
            questionText: `Tell me about your experience and why you are interested in the ${dto.targetRole} role.`,
            category: 'behavioral',
            difficulty: 'easy',
          },
          {
            id: randomUUID(),
            questionText: `What are the core technical concepts and tools you rely on most when working as a ${dto.targetRole}?`,
            category: 'technical',
            difficulty: 'medium',
          },
          {
            id: randomUUID(),
            questionText: 'Describe a challenging bug or architecture problem you encountered and how you systematically diagnosed and resolved it.',
            category: 'technical',
            difficulty: 'hard',
          },
          {
            id: randomUUID(),
            questionText: 'How do you prioritize competing deadlines or handle ambiguous project requirements in a team setting?',
            category: 'behavioral',
            difficulty: 'medium',
          },
        ];
      }
    }

    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();

    const interview = await this.repo.createMockInterview({
      studentId: student.id,
      type: dto.type,
      interviewerType: dto.interviewerType,
      targetRole: dto.targetRole,
      scheduledAt: scheduledDate,
      questions,
    });

    return {
      id: interview.id,
      studentId: interview.studentId,
      type: interview.type,
      interviewerType: interview.interviewerType,
      targetRole: interview.targetRole,
      scheduledAt: interview.scheduledAt.toISOString(),
      status: interview.status,
      questions: interview.questions ?? null,
      answers: interview.answers ?? null,
      feedback: interview.feedback ?? null,
      overallScore: interview.overallScore ? Number(interview.overallScore) : null,
      createdAt: interview.createdAt.toISOString(),
    };
  }

  async submitAIInterviewAnswers(
    userId: string,
    interviewId: string,
    dto: SubmitInterviewAnswersDto,
  ): Promise<MockInterviewDto> {
    const student = await this.getStudentProfile(userId);
    const interview = await this.repo.findMockInterviewById(interviewId);

    if (!interview) throw new NotFoundError('Mock interview');
    if (interview.studentId !== student.id) {
      throw new ForbiddenError('You do not own this mock interview');
    }
    if (interview.status === 'completed') {
      throw new ConflictError('This mock interview has already been completed and evaluated');
    }

    if (interview.interviewerType !== 'ai') {
      throw new ValidationError('Only AI mock interviews accept automated answer evaluation');
    }

    const knownIds = new Set(
      ((interview.questions as Array<{ id: string }> | null) ?? []).map((q) => q.id),
    );
    const answers = dto.answers;
    if (answers.length === 0 || answers.some((a) => !knownIds.has(a.questionId))) {
      throw new ValidationError('Answers must correspond to the generated interview questions');
    }

    // Explainable rubric: relevance, depth, structure (STAR), quantification
    const evaluation = evaluateInterviewAnswers(answers, interview.targetRole);
    const overallScore = evaluation.overallScore;
    const feedback = {
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      communicationScore: evaluation.communicationScore,
      technicalScore: evaluation.technicalScore,
      problemSolvingScore: evaluation.problemSolvingScore,
      relevanceScore: evaluation.relevanceScore,
      perAnswer: evaluation.perAnswer,
      summary: evaluation.summary,
    };

    const updated = await this.repo.updateMockInterview(interviewId, {
      status: 'completed',
      answers,
      feedback,
      overallScore: String(overallScore),
    });

    if (!updated) throw new Error('Failed to update mock interview');

    void auditService.log({
      userId,
      action: 'interview.ai_evaluated',
      entityType: 'mock_interview',
      entityId: interviewId,
      metadata: { targetRole: updated.targetRole, overallScore },
    });

    return {
      id: updated.id,
      studentId: updated.studentId,
      type: updated.type,
      interviewerType: updated.interviewerType,
      targetRole: updated.targetRole,
      scheduledAt: updated.scheduledAt.toISOString(),
      status: updated.status,
      questions: updated.questions ?? null,
      answers: updated.answers ?? null,
      feedback: updated.feedback ?? null,
      overallScore: updated.overallScore ? Number(updated.overallScore) : null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getStudentInterviews(userId: string): Promise<MockInterviewDto[]> {
    const student = await this.getStudentProfile(userId);
    const interviews = await this.repo.findMockInterviewsByStudent(student.id);

    return interviews.map((interview) => ({
      id: interview.id,
      studentId: interview.studentId,
      type: interview.type,
      interviewerType: interview.interviewerType,
      targetRole: interview.targetRole,
      scheduledAt: interview.scheduledAt.toISOString(),
      status: interview.status,
      questions: interview.questions ?? null,
      answers: interview.answers ?? null,
      feedback: interview.feedback ?? null,
      overallScore: interview.overallScore ? Number(interview.overallScore) : null,
      createdAt: interview.createdAt.toISOString(),
    }));
  }

  async getInterviewById(userId: string, interviewId: string, userRoles: string[]): Promise<MockInterviewDto> {
    const interview = await this.repo.findMockInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Mock interview');

    const isStaff = userRoles.includes('PLACEMENT_FACULTY') || userRoles.includes('ADMIN');
    if (!isStaff) {
      const student = await this.getStudentProfile(userId);
      if (interview.studentId !== student.id) {
        throw new ForbiddenError('You do not own this mock interview');
      }
    }

    return {
      id: interview.id,
      studentId: interview.studentId,
      type: interview.type,
      interviewerType: interview.interviewerType,
      targetRole: interview.targetRole,
      scheduledAt: interview.scheduledAt.toISOString(),
      status: interview.status,
      questions: interview.questions ?? null,
      answers: interview.answers ?? null,
      feedback: interview.feedback ?? null,
      overallScore: interview.overallScore ? Number(interview.overallScore) : null,
      createdAt: interview.createdAt.toISOString(),
    };
  }

  async deleteMockInterview(userId: string, interviewId: string, userRoles: string[]): Promise<{ success: boolean }> {
    const interview = await this.repo.findMockInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Mock interview');

    const isStaff = userRoles.includes('PLACEMENT_FACULTY') || userRoles.includes('ADMIN');
    if (!isStaff) {
      const student = await this.getStudentProfile(userId);
      if (interview.studentId !== student.id) {
        throw new ForbiddenError('You do not own this mock interview');
      }
    }

    const deleted = await this.repo.deleteMockInterview(interviewId);
    if (!deleted) throw new NotFoundError('Mock interview');
    return { success: true };
  }

  // ── Mock Interview Templates (Faculty-Curated Tracks) ─────────────────────

  async getInterviewTemplates(isActiveOnly = false): Promise<MockInterviewTemplateDto[]> {
    const templates = await this.repo.findInterviewTemplates(isActiveOnly);
    return templates.map((t) => ({
      id: t.id,
      roleTitle: t.roleTitle,
      description: t.description ?? null,
      category: t.category,
      questions: t.questions ?? [],
      isActive: t.isActive,
      createdBy: t.createdBy,
      creatorName: t.creator?.fullName ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async createInterviewTemplate(userId: string, dto: CreateMockInterviewTemplateDto): Promise<MockInterviewTemplateDto> {
    const questions = dto.questions.map((q) => ({
      id: q.id || randomUUID(),
      questionText: q.questionText,
      category: q.category || 'technical',
      difficulty: q.difficulty || 'medium',
    }));

    const created = await this.repo.createInterviewTemplate({
      roleTitle: dto.roleTitle.trim(),
      description: dto.description?.trim() || null,
      category: dto.category || 'technical',
      questions,
      createdBy: userId,
    });

    return {
      id: created.id,
      roleTitle: created.roleTitle,
      description: created.description ?? null,
      category: created.category,
      questions: created.questions ?? [],
      isActive: created.isActive,
      createdBy: created.createdBy,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateInterviewTemplate(id: string, dto: UpdateMockInterviewTemplateDto): Promise<MockInterviewTemplateDto> {
    const existing = await this.repo.findInterviewTemplateById(id);
    if (!existing) throw new NotFoundError('Interview track');

    const updatePayload: Parameters<typeof this.repo.updateInterviewTemplate>[1] = {};
    if (dto.roleTitle !== undefined) updatePayload.roleTitle = dto.roleTitle.trim();
    if (dto.description !== undefined) updatePayload.description = dto.description.trim() || null;
    if (dto.category !== undefined) updatePayload.category = dto.category;
    if (dto.isActive !== undefined) updatePayload.isActive = dto.isActive;
    if (dto.questions !== undefined) {
      updatePayload.questions = dto.questions.map((q) => ({
        id: q.id || randomUUID(),
        questionText: q.questionText,
        category: q.category || 'technical',
        difficulty: q.difficulty || 'medium',
      }));
    }

    const updated = await this.repo.updateInterviewTemplate(id, updatePayload);
    if (!updated) throw new NotFoundError('Interview track');

    return {
      id: updated.id,
      roleTitle: updated.roleTitle,
      description: updated.description ?? null,
      category: updated.category,
      questions: updated.questions ?? [],
      isActive: updated.isActive,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteInterviewTemplate(id: string): Promise<{ success: boolean }> {
    const existing = await this.repo.findInterviewTemplateById(id);
    if (!existing) throw new NotFoundError('Interview track');

    const deleted = await this.repo.deleteInterviewTemplate(id);
    if (!deleted) throw new NotFoundError('Interview track');
    return { success: true };
  }
}
