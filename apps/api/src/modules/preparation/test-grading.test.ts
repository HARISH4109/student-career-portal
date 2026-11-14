import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';

import type { PreparationRepository } from './preparation.repository';
import { PreparationService } from './preparation.service';

describe('Preparation Test Grading Logic', () => {
  const studentUserId = randomUUID();
  const studentProfileId = randomUUID();
  const testId = randomUUID();
  const attemptId = randomUUID();

  const q1Id = randomUUID();
  const q2Id = randomUUID();
  const q3Id = randomUUID();
  const q4Id = randomUUID();

  // Test setup: 4 questions across 2 topics, total 50 marks, passing 25 marks
  const sampleTest = {
    id: testId,
    title: 'Full Stack Engineering Assessment',
    description: 'Algorithms and Data Structures evaluation',
    category: 'technical' as const,
    durationMinutes: 45,
    totalMarks: 50,
    passingMarks: 25,
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
        questionText: 'Time complexity of Binary Search?',
        options: ['O(N)', 'O(log N)', 'O(N^2)', 'O(1)'],
        marks: 10,
        orderIndex: 0,
        difficulty: 'easy',
        topic: 'Algorithms',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: q2Id,
        testId,
        sectionId: null,
        questionText: 'Time complexity of Merge Sort in worst case?',
        options: ['O(N log N)', 'O(N^2)', 'O(N)', 'O(log N)'],
        marks: 10,
        orderIndex: 1,
        difficulty: 'medium',
        topic: 'Algorithms',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: q3Id,
        testId,
        sectionId: null,
        questionText: 'Which data structure is best for BFS graph traversal?',
        options: ['Stack', 'Queue', 'Heap', 'Tree'],
        marks: 15,
        orderIndex: 2,
        difficulty: 'medium',
        topic: 'Data Structures',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: q4Id,
        testId,
        sectionId: null,
        questionText: 'Which data structure provides O(1) average lookup?',
        options: ['Linked List', 'Binary Search Tree', 'Hash Map', 'Array'],
        marks: 15,
        orderIndex: 3,
        difficulty: 'easy',
        topic: 'Data Structures',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const sampleAnswerKeys = [
    { questionId: q1Id, correctAnswerIndex: 1, explanation: 'Binary search divides the search interval in half.' },
    { questionId: q2Id, correctAnswerIndex: 0, explanation: 'Merge sort consistently runs in O(N log N).' },
    { questionId: q3Id, correctAnswerIndex: 1, explanation: 'Breadth-First Search uses a FIFO queue.' },
    { questionId: q4Id, correctAnswerIndex: 2, explanation: 'Hash tables offer O(1) average time complexity for lookup.' },
  ];

  function createMockRepo(
    startedAt = new Date(),
    existingAnswers: Array<{ questionId: string; selectedIndex: number | null; timeSpentSeconds?: number }> = [],
  ): Mocked<PreparationRepository> {
    return {
      findStudentProfileByUserId: vi.fn().mockResolvedValue({ id: studentProfileId, userId: studentUserId }),
      findTestById: vi.fn().mockResolvedValue(sampleTest),
      findQuestionsByTestId: vi.fn().mockResolvedValue(sampleTest.questions),
      findAnswerKeysForQuestions: vi.fn().mockResolvedValue(sampleAnswerKeys),
      findAttemptById: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        status: 'in_progress',
        startedAt,
        test: sampleTest,
        answers: existingAnswers,
      }),
      submitAttemptAtomic: vi.fn().mockResolvedValue({
        id: attemptId,
        testId,
        studentId: studentProfileId,
        score: '50.00',
        status: 'evaluated',
        isPassed: true,
      }),
    } as unknown as Mocked<PreparationRepository>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Full Marks Scoring (All Correct)', () => {
    it('awards full marks for every question and calculates total score correctly', async () => {
      const repo = createMockRepo();
      const service = new PreparationService(repo);

      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [
          { questionId: q1Id, selectedIndex: 1, timeSpentSeconds: 30 },
          { questionId: q2Id, selectedIndex: 0, timeSpentSeconds: 45 },
          { questionId: q3Id, selectedIndex: 1, timeSpentSeconds: 20 },
          { questionId: q4Id, selectedIndex: 2, timeSpentSeconds: 25 },
        ],
        timeSpentSeconds: 120,
      });

      expect(result.score).toBe(50);
      expect(result.totalMarks).toBe(50);
      expect(result.isPassed).toBe(true);
      expect(result.status).toBe('evaluated');

      // Check each question result
      expect(result.questions).toHaveLength(4);
      for (const q of result.questions) {
        expect(q.isCorrect).toBe(true);
        expect(q.awardedMarks).toBe(q.maxMarks);
      }

      // Check topic accuracies: 100% on both
      const algoAccuracy = result.topicAccuracies.find((t) => t.topic === 'Algorithms');
      expect(algoAccuracy).toEqual({
        topic: 'Algorithms',
        totalQuestions: 2,
        correctQuestions: 2,
        accuracyPercentage: 100,
      });

      const dsAccuracy = result.topicAccuracies.find((t) => t.topic === 'Data Structures');
      expect(dsAccuracy).toEqual({
        topic: 'Data Structures',
        totalQuestions: 2,
        correctQuestions: 2,
        accuracyPercentage: 100,
      });

      expect(result.weakCategories).toHaveLength(0);
    });
  });

  describe('2. Zero Marks Scoring (All Incorrect)', () => {
    it('awards zero marks when all answers are incorrect', async () => {
      const repo = createMockRepo();
      const service = new PreparationService(repo);

      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [
          { questionId: q1Id, selectedIndex: 0, timeSpentSeconds: 10 }, // wrong (correct is 1)
          { questionId: q2Id, selectedIndex: 1, timeSpentSeconds: 15 }, // wrong (correct is 0)
          { questionId: q3Id, selectedIndex: 0, timeSpentSeconds: 20 }, // wrong (correct is 1)
          { questionId: q4Id, selectedIndex: 0, timeSpentSeconds: 25 }, // wrong (correct is 2)
        ],
        timeSpentSeconds: 70,
      });

      expect(result.score).toBe(0);
      expect(result.totalMarks).toBe(50);
      expect(result.isPassed).toBe(false);

      for (const q of result.questions) {
        expect(q.isCorrect).toBe(false);
        expect(q.awardedMarks).toBe(0);
      }

      const algoAccuracy = result.topicAccuracies.find((t) => t.topic === 'Algorithms');
      expect(algoAccuracy?.accuracyPercentage).toBe(0);
      expect(algoAccuracy?.correctQuestions).toBe(0);

      // Both topics should be in weakCategories (< 50%)
      expect(result.weakCategories).toContain('Algorithms');
      expect(result.weakCategories).toContain('Data Structures');
    });
  });

  describe('3. Partial Scoring Across Questions', () => {
    it('correctly aggregates partial marks across correct and incorrect answers', async () => {
      const repo = createMockRepo();
      const service = new PreparationService(repo);

      // Q1: correct (+10), Q2: incorrect (+0), Q3: correct (+15), Q4: incorrect (+0)
      // Total score = 25
      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [
          { questionId: q1Id, selectedIndex: 1, timeSpentSeconds: 20 },
          { questionId: q2Id, selectedIndex: 2, timeSpentSeconds: 30 },
          { questionId: q3Id, selectedIndex: 1, timeSpentSeconds: 40 },
          { questionId: q4Id, selectedIndex: 1, timeSpentSeconds: 10 },
        ],
        timeSpentSeconds: 100,
      });

      expect(result.score).toBe(25);
      expect(result.totalMarks).toBe(50);
      expect(result.isPassed).toBe(true); // 25 >= passingMarks (25)

      const q1 = result.questions.find((q) => q.questionId === q1Id);
      expect(q1?.isCorrect).toBe(true);
      expect(q1?.awardedMarks).toBe(10);

      const q2 = result.questions.find((q) => q.questionId === q2Id);
      expect(q2?.isCorrect).toBe(false);
      expect(q2?.awardedMarks).toBe(0);

      const q3 = result.questions.find((q) => q.questionId === q3Id);
      expect(q3?.isCorrect).toBe(true);
      expect(q3?.awardedMarks).toBe(15);

      const q4 = result.questions.find((q) => q.questionId === q4Id);
      expect(q4?.isCorrect).toBe(false);
      expect(q4?.awardedMarks).toBe(0);
    });
  });

  describe('4. Topic Accuracy Percentage Calculations', () => {
    it('calculates topic accuracy percentages and flags topics below 50% as weak', async () => {
      const repo = createMockRepo();
      const service = new PreparationService(repo);

      // Algorithms: Q1 correct, Q2 incorrect -> 1/2 = 50%
      // Data Structures: Q3 incorrect, Q4 incorrect -> 0/2 = 0% -> weak
      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [
          { questionId: q1Id, selectedIndex: 1 },
          { questionId: q2Id, selectedIndex: 1 },
          { questionId: q3Id, selectedIndex: 0 },
          { questionId: q4Id, selectedIndex: 0 },
        ],
      });

      const algoAccuracy = result.topicAccuracies.find((t) => t.topic === 'Algorithms');
      expect(algoAccuracy?.accuracyPercentage).toBe(50);
      expect(algoAccuracy?.totalQuestions).toBe(2);
      expect(algoAccuracy?.correctQuestions).toBe(1);

      const dsAccuracy = result.topicAccuracies.find((t) => t.topic === 'Data Structures');
      expect(dsAccuracy?.accuracyPercentage).toBe(0);

      // Only Data Structures is < 50%, Algorithms is 50% so not weak
      expect(result.weakCategories).toEqual(['Data Structures']);
    });

    it('falls back to test.category when question topic is null or empty', async () => {
      const customTest = {
        ...sampleTest,
        questions: [
          {
            ...sampleTest.questions[0],
            topic: null, // no topic
          },
        ],
      };

      const repo = createMockRepo();
      repo.findQuestionsByTestId.mockResolvedValueOnce(customTest.questions as unknown as typeof sampleTest.questions);
      repo.findAnswerKeysForQuestions.mockResolvedValueOnce([sampleAnswerKeys[0]]);

      const service = new PreparationService(repo);

      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [{ questionId: q1Id, selectedIndex: 1 }],
      });

      expect(result.topicAccuracies).toHaveLength(1);
      // Fallback topic is test.category ('technical')
      expect(result.topicAccuracies[0]?.topic).toBe('technical');
      expect(result.topicAccuracies[0]?.accuracyPercentage).toBe(100);
    });
  });

  describe('5. Pass/Fail Determination', () => {
    it('marks test as passed when score is exactly equal to passingMarks', async () => {
      const repo = createMockRepo();
      const service = new PreparationService(repo);

      // Total passing is 25. Q3 (15) + Q1 (10) = 25
      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [
          { questionId: q1Id, selectedIndex: 1 }, // +10
          { questionId: q3Id, selectedIndex: 1 }, // +15
        ],
      });

      expect(result.score).toBe(25);
      expect(result.passingMarks).toBe(25);
      expect(result.isPassed).toBe(true);
    });

    it('marks test as failed when score is just below passingMarks', async () => {
      const repo = createMockRepo();
      const service = new PreparationService(repo);

      // Q1 (10) + Q2 (10) = 20 < 25
      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [
          { questionId: q1Id, selectedIndex: 1 }, // +10
          { questionId: q2Id, selectedIndex: 0 }, // +10
        ],
      });

      expect(result.score).toBe(20);
      expect(result.passingMarks).toBe(25);
      expect(result.isPassed).toBe(false);
    });
  });

  describe('6. Late Submission Handling', () => {
    it('marks attempt status as auto_submitted when submitted after duration + 2 min grace period', async () => {
      // Test duration is 45 mins. Start test 50 mins ago (45 + 2 = 47 min limit).
      const lateStartTime = new Date(Date.now() - 50 * 60 * 1000);
      const repo = createMockRepo(lateStartTime);
      const service = new PreparationService(repo);

      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [{ questionId: q1Id, selectedIndex: 1 }],
      });

      expect(result.status).toBe('auto_submitted');
      expect(repo.submitAttemptAtomic).toHaveBeenCalledWith(
        attemptId,
        expect.objectContaining({ status: 'auto_submitted' }),
      );
    });

    it('marks attempt status as evaluated when submitted within allowed time window', async () => {
      // Test duration is 45 mins. Start test 20 mins ago.
      const onTimeStartTime = new Date(Date.now() - 20 * 60 * 1000);
      const repo = createMockRepo(onTimeStartTime);
      const service = new PreparationService(repo);

      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [{ questionId: q1Id, selectedIndex: 1 }],
      });

      expect(result.status).toBe('evaluated');
      expect(repo.submitAttemptAtomic).toHaveBeenCalledWith(
        attemptId,
        expect.objectContaining({ status: 'evaluated' }),
      );
    });
  });

  describe('7. Autosaved Answers and Unanswered Question Handling', () => {
    it('merges prior autosaved answers with submitted answers', async () => {
      // Suppose Q1 was autosaved with selectedIndex: 1 (correct)
      const priorAutosaved = [
        { questionId: q1Id, selectedIndex: 1, timeSpentSeconds: 15 },
      ];
      const repo = createMockRepo(new Date(), priorAutosaved);
      const service = new PreparationService(repo);

      // Student explicitly submits Q3 only
      const result = await service.submitTest(studentUserId, attemptId, {
        answers: [{ questionId: q3Id, selectedIndex: 1, timeSpentSeconds: 30 }],
      });

      // Q1 was from autosave (+10), Q3 from submit (+15) -> Total = 25
      expect(result.score).toBe(25);
      const q1 = result.questions.find((q) => q.questionId === q1Id);
      expect(q1?.selectedIndex).toBe(1);
      expect(q1?.isCorrect).toBe(true);

      // Q2 and Q4 were completely unanswered -> selectedIndex: null, isCorrect: false
      const q2 = result.questions.find((q) => q.questionId === q2Id);
      expect(q2?.selectedIndex).toBeNull();
      expect(q2?.isCorrect).toBe(false);
      expect(q2?.awardedMarks).toBe(0);
    });
  });
});
