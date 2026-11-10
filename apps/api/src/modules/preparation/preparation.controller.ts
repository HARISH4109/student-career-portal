import {
  autosaveAnswerSchema,
  createMockInterviewSchema,
  createMockInterviewTemplateSchema,
  createMockTestSchema,
  createTestQuestionSchema,
  createTestSectionSchema,
  submitInterviewAnswersSchema,
  submitMockTestSchema,
  updateMockInterviewTemplateSchema,
  updateMockTestSchema,
  updateTestQuestionSchema,
  updateTestSectionSchema,
  TEST_CATEGORIES,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';
import { z, type ZodError } from 'zod';

import { PreparationService } from './preparation.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

export class PreparationController {
  constructor(private readonly service: PreparationService = new PreparationService()) {}

  // ── Tests (Catalog & Authoring) ────────────────────────────────────────

  getTests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requestUser(req);
      const parsed = z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
        category: z.enum(TEST_CATEGORIES).optional(),
        search: z.string().max(200).optional(),
        status: z.enum(['active', 'closed', 'all']).optional(),
      }).safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Invalid test query', this.formatZodErrors(parsed.error));
      const { page, pageSize, category, search, status } = parsed.data;
      const result = await this.service.getAvailableTests({ category, search, status, page, pageSize }, user.roles);
      sendSuccess(res, result.tests, 200, {
        page,
        pageSize,
        totalItems: result.totalCount,
        totalPages: Math.ceil(result.totalCount / pageSize),
      });
    } catch (error) {
      next(error);
    }
  };

  getTestById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requestUser(req);
      const id = String(req.params.id);
      const test = await this.service.getTestOverview(id, user.roles);
      sendSuccess(res, test);
    } catch (error) {
      next(error);
    }
  };

  getTestAuthorDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const test = await this.service.getTestAuthorDetails(id);
      sendSuccess(res, test);
    } catch (error) {
      next(error);
    }
  };

  createTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createMockTestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid mock test data', this.formatZodErrors(parsed.error));
      }
      const created = await this.service.createTest(requestUser(req).id, parsed.data);
      sendSuccess(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  updateTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const parsed = updateMockTestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid mock test update data', this.formatZodErrors(parsed.error));
      }
      const updated = await this.service.updateTest(id, parsed.data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  deleteTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const result = await this.service.deleteTest(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── Sections ───────────────────────────────────────────────────────────

  addSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testId = String(req.params.id);
      const parsed = createTestSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid section data', this.formatZodErrors(parsed.error));
      }
      const section = await this.service.addSection(testId, parsed.data);
      sendSuccess(res, section, 201);
    } catch (error) {
      next(error);
    }
  };

  updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sectionId = String(req.params.sectionId);
      const parsed = updateTestSectionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid section update data', this.formatZodErrors(parsed.error));
      }
      const updated = await this.service.updateSection(sectionId, parsed.data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sectionId = String(req.params.sectionId);
      const result = await this.service.deleteSection(sectionId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── Questions ──────────────────────────────────────────────────────────

  addQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testId = String(req.params.id);
      const parsed = createTestQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid question data', this.formatZodErrors(parsed.error));
      }
      const question = await this.service.addQuestion(testId, parsed.data);
      sendSuccess(res, question, 201);
    } catch (error) {
      next(error);
    }
  };

  updateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const questionId = String(req.params.questionId);
      const parsed = updateTestQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid question update data', this.formatZodErrors(parsed.error));
      }
      const updated = await this.service.updateQuestion(questionId, parsed.data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  deleteQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const questionId = String(req.params.questionId);
      const result = await this.service.deleteQuestion(questionId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── Test Taking & Attempts ─────────────────────────────────────────────

  startTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testId = String(req.params.id);
      const result = await this.service.startTest(requestUser(req).id, testId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  autosaveAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = String(req.params.id);
      const parsed = autosaveAnswerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid autosave data', this.formatZodErrors(parsed.error));
      }
      const result = await this.service.autosaveAnswer(requestUser(req).id, attemptId, parsed.data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  submitTestByAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = String(req.params.id);
      const parsed = submitMockTestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid submission data', this.formatZodErrors(parsed.error));
      }
      const result = await this.service.submitTest(requestUser(req).id, attemptId, parsed.data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  submitTestByTestId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attempt = z.object({ attemptId: z.string().uuid() }).safeParse(req.body);
      if (!attempt.success) throw new ValidationError('A valid attemptId is required to submit test');
      const { attemptId } = attempt.data;
      const parsed = submitMockTestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid submission data', this.formatZodErrors(parsed.error));
      }
      const result = await this.service.submitTest(requestUser(req).id, attemptId, parsed.data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getAttemptResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = String(req.params.id);
      const user = requestUser(req);
      const result = await this.service.getAttemptResult(user.id, attemptId, user.roles);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getMyAttempts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attempts = await this.service.getStudentAttempts(requestUser(req).id);
      sendSuccess(res, attempts);
    } catch (error) {
      next(error);
    }
  };

  getMyAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analytics = await this.service.getStudentAnalytics(requestUser(req).id);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  };

  getFacultyTestAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testId = String(req.params.id);
      const analytics = await this.service.getFacultyTestAnalytics(testId);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  };

  // ── Mock Interviews ────────────────────────────────────────────────────

  scheduleMockInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createMockInterviewSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid interview request', this.formatZodErrors(parsed.error));
      }
      const interview = await this.service.scheduleMockInterview(requestUser(req).id, parsed.data);
      sendSuccess(res, interview, 201);
    } catch (error) {
      next(error);
    }
  };

  getMyInterviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const interviews = await this.service.getStudentInterviews(requestUser(req).id);
      sendSuccess(res, interviews);
    } catch (error) {
      next(error);
    }
  };

  getInterviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const user = requestUser(req);
      const interview = await this.service.getInterviewById(user.id, id, user.roles);
      sendSuccess(res, interview);
    } catch (error) {
      next(error);
    }
  };

  submitAIInterviewAnswers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const parsed = submitInterviewAnswersSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid interview answers', this.formatZodErrors(parsed.error));
      }
      const evaluated = await this.service.submitAIInterviewAnswers(requestUser(req).id, id, parsed.data);
      sendSuccess(res, evaluated);
    } catch (error) {
      next(error);
    }
  };

  deleteInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const user = requestUser(req);
      const result = await this.service.deleteMockInterview(user.id, id, user.roles);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── Mock Interview Templates (Faculty-Curated Tracks) ─────────────────────

  getInterviewTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = requestUser(req);
      const isStaff = user.roles.includes('PLACEMENT_FACULTY') || user.roles.includes('ADMIN');
      // Students only see active tracks; faculty/admin can view all
      const templates = await this.service.getInterviewTemplates(!isStaff);
      sendSuccess(res, templates);
    } catch (error) {
      next(error);
    }
  };

  createInterviewTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createMockInterviewTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid interview track data', this.formatZodErrors(parsed.error));
      }
      const template = await this.service.createInterviewTemplate(requestUser(req).id, parsed.data);
      sendSuccess(res, template, 201);
    } catch (error) {
      next(error);
    }
  };

  updateInterviewTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const parsed = updateMockInterviewTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid interview track update', this.formatZodErrors(parsed.error));
      }
      const updated = await this.service.updateInterviewTemplate(id, parsed.data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  deleteInterviewTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const result = await this.service.deleteInterviewTemplate(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  private formatZodErrors(error: ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return details;
  }
}
