import {
  createResumeSchema,
  paginationQuerySchema,
  resumeEnhanceTextRequestSchema,
  resumeMatchRequestSchema,
  updateResumeSchema,
  uploadResumeSchema,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { ResumeService } from './resume.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

export class ResumeController {
  constructor(private readonly resumeService: ResumeService = new ResumeService()) {}

  getResumes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const resumes = await this.resumeService.getResumes(requestUser(req).id);
      const totalItems = resumes.length;
      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      const paged = resumes.slice((page - 1) * pageSize, page * pageSize);
      sendSuccess(res, paged, 200, { page, pageSize, totalItems, totalPages });
    } catch (error) {
      next(error);
    }
  };

  getResumeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const resume = await this.resumeService.getResumeById(id, requestUser(req));
      sendSuccess(res, resume);
    } catch (error) {
      next(error);
    }
  };

  createResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createResumeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid resume data', this.formatZodErrors(parsed.error));
      }
      const created = await this.resumeService.createResume(requestUser(req).id, parsed.data);
      sendSuccess(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  uploadResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = uploadResumeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid upload data', this.formatZodErrors(parsed.error));
      }
      const uploaded = await this.resumeService.uploadResume(requestUser(req).id, parsed.data);
      sendSuccess(res, uploaded, 201);
    } catch (error) {
      next(error);
    }
  };

  updateResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const parsed = updateResumeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid resume data', this.formatZodErrors(parsed.error));
      }
      const updated = await this.resumeService.updateResume(requestUser(req).id, id, parsed.data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  duplicateResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const duplicated = await this.resumeService.duplicateResume(requestUser(req).id, id);
      sendSuccess(res, duplicated, 201);
    } catch (error) {
      next(error);
    }
  };

  setPrimaryResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const primary = await this.resumeService.setPrimaryResume(requestUser(req).id, id);
      sendSuccess(res, primary);
    } catch (error) {
      next(error);
    }
  };

  deleteResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.resumeService.deleteResume(requestUser(req).id, id);
      sendSuccess(res, { message: 'Resume deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  analyzeResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const analysis = await this.resumeService.analyzeResume(requestUser(req).id, id);
      sendSuccess(res, analysis, 201);
    } catch (error) {
      next(error);
    }
  };

  getAnalyses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const list = await this.resumeService.getAnalyses(requestUser(req).id, id);
      sendSuccess(res, list);
    } catch (error) {
      next(error);
    }
  };

  matchOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const parsed = resumeMatchRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid matching request data', this.formatZodErrors(parsed.error));
      }
      const matchResult = await this.resumeService.matchOpportunity(
        requestUser(req).id,
        id,
        parsed.data.opportunitySkills,
        parsed.data.eligibilityContext,
      );
      sendSuccess(res, matchResult);
    } catch (error) {
      next(error);
    }
  };

  enhanceText = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = resumeEnhanceTextRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid text enhancement request', this.formatZodErrors(parsed.error));
      }
      const result = await this.resumeService.enhanceText(
        parsed.data.text,
        parsed.data.sectionType,
        parsed.data.context,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  private formatZodErrors(error: import('zod').ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return details;
  }
}
