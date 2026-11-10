import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi, type Mocked } from 'vitest';

import type { PreparationRepository } from './preparation.repository';
import { PreparationService } from './preparation.service';

import {
  ConflictError,
  ForbiddenError,
} from '@/shared/errors/app-error';

describe('PreparationService', () => {
  const studentUserId = randomUUID();
  const otherStudentUserId = randomUUID();
  const studentProfileId = randomUUID();
  const otherStudentProfileId = randomUUID();
  const testId = randomUUID();
  const q1Id = randomUUID();
  const q2Id = randomUUID();
  const attemptId = randomUUID();

  const mockTest = {
    id: testId,
    title: 'Data Structures & Algorithms Mock Test',
    description: 'Comprehensive test on arrays, trees, and graphs',
    category: 'technical' as const,
    durationMinutes: 30,
    totalMarks: 20,
    passingMarks: 10,
    createdBy: randomUUID(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [],
    questions: [
      {
        id: q1Id,
        testId,
        sectionId: null,
        questionText: 'What is the time complexity of quicksort in the worst case?',
        options: ['O(N)', 'O(N log N)', 'O(N^2)', 'O(1)'],
        marks: 10,
        orderIndex: 0,
        difficulty: 'medium',
        topic: 'Algorithms',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: q2Id,
        testId,
        sectionId: null,
        questionText: 'Which data structure follows LIFO?',
        options: ['Queue', 'Stack', 'Array', 'Tree'],
        marks: 10,
        orderIndex: 1,
        difficulty: 'easy',
        topic: 'Data Structures',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockAnswerKeys = [
    { questionId: q1Id, correctAnswerIndex: 2, explanation: 'Quicksort degrades to O(N^2) with bad pivot choices.' },
    { questionId: q2Id, correctAnswerIndex: 1, explanation: 'Stack is Last-In-First-Out.' },
  ];

  function createMockRepo(overrides: Partial<PreparationRepository> = {}): Mocked<PreparationRepository> {
    return {
      findStudentProfileByUserId: vi.fn().mockImplementation((uid: string) => {
        if (uid === studentUserId) return Promise.resolve({ id: studentProfileId, userId: uid });
        if (uid === otherStudentUserId) return Promise.resolve({ id: otherStudentProfileId, userId: uid });
        return Promise.resolve(null);
      }),
      findTestById: vi.fn().mockResolvedValue(mockTest),
      findQuestionsByTestId: vi.fn().mockResolvedValue(mockTest.questions),
      findAnswerKeysForQuestions: vi.fn().mockResolvedValue(mockAnswerKeys),
      findOrCreateActiveAttempt: vi.fn().mockResolvedValue({
        attempt: {
          id: attemptId,
          testId,
          studentId: studentProfileId,
          attemptToken: 'token-123',
          status: 'in_progress',
          startedAt: new Date(),
        },
        answers: [],
        created: true,
      }),
      findQuestionOptionsInTest: vi
        .fn()
        .mockImplementation((_t: string, qid: string) =>
          Promise.resolve(mockTest.questions.find((q) => q.id === qid) ?? null),
        ),
      findAttemptHeader: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        status: 'in_progress',
        startedAt: new Date(),
        test: { durationMinutes: 30 },
      }),
      findAttemptById: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        status: 'in_progress',
        startedAt: new Date(),
        test: mockTest,
        answers: [],
      }),
      saveAttemptAnswer: vi.fn().mockResolvedValue(undefined),
      submitAttemptAtomic: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        score: '20.00',
        status: 'evaluated',
        isPassed: true,
      }),
      findAttemptWithAnswersAndQuestions: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        score: '20.00',
        status: 'evaluated',
        isPassed: true,
        startedAt: new Date(),
        submittedAt: new Date(),
        test: mockTest,
        answers: [
          {
            questionId: q1Id,
            selectedIndex: 2,
            isCorrect: true,
            awardedMarks: '10.00',
            question: {
              questionText: mockTest.questions[0].questionText,
              options: mockTest.questions[0].options,
              marks: 10,
              topic: 'Algorithms',
              difficulty: 'medium',
              answerKey: mockAnswerKeys[0],
            },
          },
        ],
      }),
      findStudentAttempts: vi.fn().mockResolvedValue([]),
      getStudentAnalytics: vi.fn().mockResolvedValue({}),
      getFacultyTestAnalytics: vi.fn().mockResolvedValue({}),
      deleteMockInterview: vi.fn().mockResolvedValue({ id: 'deleted' }),
      ...overrides,
    } as unknown as Mocked<PreparationRepository>;
  }

  // ── 1. Answer Key Security ─────────────────────────────────────────────

  it('never sends answer keys or explanations to student when starting a test', async () => {
    const repo = createMockRepo();
    const service = new PreparationService(repo);

    const result = await service.startTest(studentUserId, testId);

    expect(result.attemptId).toBe(attemptId);
    expect(result.questions).toHaveLength(2);

    for (const q of result.questions) {
      expect(q).not.toHaveProperty('correctAnswerIndex');
      expect(q).not.toHaveProperty('explanation');
      expect(q).toHaveProperty('options');
      expect(q).toHaveProperty('questionText');
    }
  });

  // ── 2. One-Active-Attempt Rule ──────────────────────────────────────────

  it('resumes existing in_progress attempt instead of creating a duplicate', async () => {
    const existingAttempt = {
      id: 'existing-attempt-id',
      testId,
      studentId: studentProfileId,
      attemptToken: 'existing-token',
      status: 'in_progress',
      startedAt: new Date(),
    };

    const repo = createMockRepo({
      findOrCreateActiveAttempt: vi.fn().mockResolvedValue({
        attempt: existingAttempt,
        answers: [{ questionId: q1Id, selectedIndex: 2 }],
        created: false,
      }),
    });
    const service = new PreparationService(repo);

    const result = await service.startTest(studentUserId, testId);

    expect(result.attemptId).toBe('existing-attempt-id');
    expect(result.existingAnswers).toEqual({ [q1Id]: 2 });
    expect(repo.findOrCreateActiveAttempt.mock.calls).toHaveLength(1);
  });

  // ── 3. Attempt Ownership & Autosave ────────────────────────────────────

  it('rejects autosave if attempt belongs to another student', async () => {
    const repo = createMockRepo();
    const service = new PreparationService(repo);

    await expect(
      service.autosaveAnswer(otherStudentUserId, attemptId, {
        questionId: q1Id,
        selectedIndex: 1,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects autosave if attempt has already been submitted', async () => {
    const repo = createMockRepo({
      findAttemptHeader: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        status: 'evaluated',
        startedAt: new Date(),
        test: { durationMinutes: 30 },
      }),
    });
    const service = new PreparationService(repo);

    await expect(
      service.autosaveAnswer(studentUserId, attemptId, {
        questionId: q1Id,
        selectedIndex: 1,
      }),
    ).rejects.toThrow(ConflictError);
  });

  // ── 4. Duplicate Submission Protection ─────────────────────────────────

  it('rejects duplicate submit if attempt is already evaluated or submitted', async () => {
    const repo = createMockRepo({
      findAttemptById: vi.fn().mockResolvedValue({
        id: attemptId,
        studentId: studentProfileId,
        status: 'evaluated',
        startedAt: new Date(),
        test: mockTest,
        answers: [],
      }),
    });
    const service = new PreparationService(repo);

    await expect(
      service.submitTest(studentUserId, attemptId, {
        answers: [],
      }),
    ).rejects.toThrow(ConflictError);
  });

  // ── 5. Server-Side Grading Correctness ─────────────────────────────────

  it('correctly grades answers and calculates score based on server answer keys', async () => {
    const repo = createMockRepo();
    const service = new PreparationService(repo);

    const result = await service.submitTest(studentUserId, attemptId, {
      answers: [
        { questionId: q1Id, selectedIndex: 2 }, // Correct (10 marks)
        { questionId: q2Id, selectedIndex: 0 }, // Incorrect (0 marks)
      ],
    });

    expect(result.score).toBe(10);
    expect(result.totalMarks).toBe(20);
    expect(result.isPassed).toBe(true); // passingMarks is 10
    expect(result.status).toBe('evaluated');

    expect(repo.submitAttemptAtomic.mock.calls[0]).toEqual([
      attemptId,
      expect.objectContaining({
        score: 10,
        isPassed: true,
        gradedAnswers: expect.arrayContaining([
          expect.objectContaining({ questionId: q1Id, isCorrect: true, awardedMarks: 10 }),
          expect.objectContaining({ questionId: q2Id, isCorrect: false, awardedMarks: 0 }),
        ]) as unknown,
      }),
    ]);
  });

  // ── 6. Time Limit & Auto-Submit ────────────────────────────────────────

  it('marks attempt as auto_submitted if submitted beyond duration + grace period', async () => {
    const pastStartedAt = new Date(Date.now() - 40 * 60 * 1000); // 40 minutes ago for 30 min test
    const repo = createMockRepo({
      findAttemptById: vi.fn().mockResolvedValue({
        id: attemptId,
        studentId: studentProfileId,
        status: 'in_progress',
        startedAt: pastStartedAt,
        test: mockTest,
        answers: [],
      }),
    });
    const service = new PreparationService(repo);

    const result = await service.submitTest(studentUserId, attemptId, {
      answers: [{ questionId: q1Id, selectedIndex: 2 }],
    });

    expect(result.status).toBe('auto_submitted');
  });

  // ── 7. Result Visibility ───────────────────────────────────────────────

  it('hides results from student while test attempt is in_progress', async () => {
    const repo = createMockRepo({
      findAttemptWithAnswersAndQuestions: vi.fn().mockResolvedValue({
        id: attemptId,
        studentId: studentProfileId,
        status: 'in_progress',
        answers: [],
        test: mockTest,
      }),
    });
    const service = new PreparationService(repo);

    await expect(
      service.getAttemptResult(studentUserId, attemptId, ['STUDENT']),
    ).rejects.toThrow(ForbiddenError);
  });

  it('prevents another student from viewing the result', async () => {
    const repo = createMockRepo();
    const service = new PreparationService(repo);

    await expect(
      service.getAttemptResult(otherStudentUserId, attemptId, ['STUDENT']),
    ).rejects.toThrow(ForbiddenError);
  });

  it('allows faculty to view any student attempt result', async () => {
    const repo = createMockRepo();
    const service = new PreparationService(repo);

    const result = await service.getAttemptResult('faculty-user-id', attemptId, ['PLACEMENT_FACULTY']);
    expect(result.attemptId).toBe(attemptId);
    expect(result.score).toBe(20);
  });

  // ── 8. Mock Interviews ─────────────────────────────────────────────────

  it('schedules an AI mock interview with role-specific generated questions', async () => {
    const interviewId = randomUUID();
    const repo = createMockRepo({
      createMockInterview: vi.fn().mockImplementation((data: Parameters<PreparationRepository['createMockInterview']>[0]) => Promise.resolve({
        id: interviewId,
        studentId: data.studentId,
        type: data.type,
        interviewerType: data.interviewerType,
        targetRole: data.targetRole,
        scheduledAt: data.scheduledAt,
        status: 'scheduled',
        questions: data.questions,
        answers: null,
        feedback: null,
        overallScore: null,
        createdAt: new Date(),
      })),
    });
    const service = new PreparationService(repo);

    const interview = await service.scheduleMockInterview(studentUserId, {
      type: 'technical',
      interviewerType: 'ai',
      targetRole: 'Full Stack Engineer',
    });

    expect(interview.id).toBe(interviewId);
    expect(interview.targetRole).toBe('Full Stack Engineer');
    expect(interview.questions).toHaveLength(4);
    expect(interview.questions?.[0].questionText).toContain('Full Stack Engineer');
  });

  it('evaluates AI mock interview answers with category scores and feedback', async () => {
    const interviewId = randomUUID();
    const repo = createMockRepo({
      findMockInterviewById: vi.fn().mockResolvedValue({
        id: interviewId,
        studentId: studentProfileId,
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Backend Engineer',
        status: 'scheduled',
        questions: [{ id: 'q1', questionText: 'Explain microservices communication.' }],
      }),
      updateMockInterview: vi.fn().mockImplementation((id: string, data: Parameters<PreparationRepository['updateMockInterview']>[1]) => Promise.resolve({
        id,
        studentId: studentProfileId,
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Backend Engineer',
        scheduledAt: new Date(),
        status: data.status,
        questions: [],
        answers: data.answers,
        feedback: data.feedback,
        overallScore: data.overallScore,
        createdAt: new Date(),
      })),
    });
    const service = new PreparationService(repo);

    const evaluated = await service.submitAIInterviewAnswers(studentUserId, interviewId, {
      answers: [
        {
          questionId: 'q1',
          questionText: 'Explain microservices communication.',
          answerText:
            'In my backend project the team needed services to communicate reliably. I designed REST APIs for synchronous calls and used Kafka queues for asynchronous events, which reduced latency by 30% and improved resilience. I learned to monitor and trace requests across services.',
        },
      ],
    });

    expect(evaluated.status).toBe('completed');
    expect(evaluated.overallScore).toBeGreaterThan(50);
    expect(evaluated.feedback).not.toBeNull();
    expect(evaluated.feedback?.strengths.length).toBeGreaterThan(0);
    expect(evaluated.feedback?.improvements.length).toBeGreaterThan(0);
  });

  it('evaluates completely unanswered interview questions with zero score without inflation', async () => {
    const interviewId = randomUUID();
    const repo = createMockRepo({
      findMockInterviewById: vi.fn().mockResolvedValue({
        id: interviewId,
        studentId: studentProfileId,
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Backend Engineer',
        status: 'scheduled',
        questions: [{ id: 'q1', questionText: 'Explain microservices communication.' }],
      }),
      updateMockInterview: vi.fn().mockImplementation((id: string, data: Parameters<PreparationRepository['updateMockInterview']>[1]) => Promise.resolve({
        id,
        studentId: studentProfileId,
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Backend Engineer',
        scheduledAt: new Date(),
        status: data.status,
        questions: [],
        answers: data.answers,
        feedback: data.feedback,
        overallScore: data.overallScore,
        createdAt: new Date(),
      })),
    });
    const service = new PreparationService(repo);

    const evaluated = await service.submitAIInterviewAnswers(studentUserId, interviewId, {
      answers: [
        {
          questionId: 'q1',
          questionText: 'Explain microservices communication.',
          answerText: 'Not answered.',
        },
      ],
    });

    expect(evaluated.status).toBe('completed');
    expect(evaluated.overallScore).toBe(0);
    expect(evaluated.feedback?.technicalScore).toBe(0);
    expect(evaluated.feedback?.communicationScore).toBe(0);
    expect(evaluated.feedback?.problemSolvingScore).toBe(0);
  });

  it('deletes mock interview history for the owning student', async () => {
    const interviewId = randomUUID();
    const repo = createMockRepo({
      findMockInterviewById: vi.fn().mockResolvedValue({
        id: interviewId,
        studentId: studentProfileId,
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Backend Engineer',
        status: 'completed',
      }),
      deleteMockInterview: vi.fn().mockResolvedValue({ id: interviewId }),
    });
    const service = new PreparationService(repo);

    const result = await service.deleteMockInterview(studentUserId, interviewId, ['STUDENT']);
    expect(result.success).toBe(true);
    expect(repo.deleteMockInterview).toHaveBeenCalledWith(interviewId);
  });

  it('prevents students from deleting another student mock interview', async () => {
    const interviewId = randomUUID();
    const otherStudentProfileId = randomUUID();
    const repo = createMockRepo({
      findMockInterviewById: vi.fn().mockResolvedValue({
        id: interviewId,
        studentId: otherStudentProfileId, // belongs to someone else
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Backend Engineer',
        status: 'completed',
      }),
    });
    const service = new PreparationService(repo);

    await expect(
      service.deleteMockInterview(studentUserId, interviewId, ['STUDENT']),
    ).rejects.toThrow('You do not own this mock interview');
  });

  // ── 9. Mock Interview Tracks & Templates ────────────────────────────────

  it('allows faculty to create and fetch mock interview tracks with custom questions', async () => {
    const templateId = randomUUID();
    const facultyUserId = randomUUID();
    const repo = createMockRepo({
      createInterviewTemplate: vi.fn().mockImplementation((data: Parameters<PreparationRepository['createInterviewTemplate']>[0]) => Promise.resolve({
        id: templateId,
        roleTitle: data.roleTitle,
        description: data.description,
        category: data.category,
        questions: data.questions,
        isActive: true,
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findInterviewTemplates: vi.fn().mockResolvedValue([
        {
          id: templateId,
          roleTitle: 'Cloud Security Analyst',
          description: 'Specialized interview track for security operations',
          category: 'technical',
          questions: [
            { id: 'q1', questionText: 'Explain zero-trust architecture principles.', category: 'technical', difficulty: 'hard' },
          ],
          isActive: true,
          createdBy: facultyUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { fullName: 'Prof. Miller' },
        },
      ]),
    });
    const service = new PreparationService(repo);

    const created = await service.createInterviewTemplate(facultyUserId, {
      roleTitle: 'Cloud Security Analyst',
      description: 'Specialized interview track for security operations',
      category: 'technical',
      questions: [
        { questionText: 'Explain zero-trust architecture principles.', category: 'technical', difficulty: 'hard' },
      ],
    });

    expect(created.id).toBe(templateId);
    expect(created.roleTitle).toBe('Cloud Security Analyst');
    expect(created.questions).toHaveLength(1);

    const tracks = await service.getInterviewTemplates(true);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.creatorName).toBe('Prof. Miller');
  });

  it('schedules an interview using faculty-curated template questions when templateId is provided', async () => {
    const interviewId = randomUUID();
    const templateId = randomUUID();
    const repo = createMockRepo({
      findInterviewTemplateById: vi.fn().mockResolvedValue({
        id: templateId,
        roleTitle: 'DevOps Specialist',
        description: 'Track for CI/CD and Kubernetes',
        category: 'technical',
        questions: [
          { id: 'custom-q1', questionText: 'How do you structure GitOps pipelines using ArgoCD?', category: 'technical', difficulty: 'hard' },
          { id: 'custom-q2', questionText: 'Explain container networking in a Kubernetes cluster.', category: 'technical', difficulty: 'medium' },
        ],
        isActive: true,
      }),
      createMockInterview: vi.fn().mockImplementation((data: Parameters<PreparationRepository['createMockInterview']>[0]) => Promise.resolve({
        id: interviewId,
        studentId: data.studentId,
        type: data.type,
        interviewerType: data.interviewerType,
        targetRole: data.targetRole,
        scheduledAt: data.scheduledAt,
        status: 'scheduled',
        questions: data.questions,
        answers: null,
        feedback: null,
        overallScore: null,
        createdAt: new Date(),
      })),
    });
    const service = new PreparationService(repo);

    const interview = await service.scheduleMockInterview(studentUserId, {
      type: 'technical',
      interviewerType: 'ai',
      targetRole: 'DevOps Specialist',
      templateId,
    });

    expect(interview.id).toBe(interviewId);
    expect(interview.questions).toHaveLength(2);
    expect(interview.questions?.[0].questionText).toBe('How do you structure GitOps pipelines using ArgoCD?');
  });
});
