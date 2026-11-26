import {
  createOpportunitySchema,
  extractOpportunityRequestSchema,
  opportunityListQuerySchema,
  updateOpportunitySchema,
  updateOpportunityStatusSchema,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { OpportunityExtractionService } from './opportunity-extraction.service';
import { OpportunityService } from './opportunity.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';
import { sanitizeAiInput } from '@/shared/security/ai-input-guard';
import { validateUrlForFetchResolved } from '@/shared/security/ssrf-guard';

export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService = new OpportunityService(),
    private readonly extractionService: OpportunityExtractionService = new OpportunityExtractionService(),
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid opportunity data', this.formatZodErrors(parsed.error));
      }
      const opportunity = await this.opportunityService.create(parsed.data, requestUser(req));
      sendSuccess(res, opportunity, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid opportunity data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const opportunity = await this.opportunityService.update(id, parsed.data, requestUser(req));
      sendSuccess(res, opportunity);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateOpportunityStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid status data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const opportunity = await this.opportunityService.updateStatus(id, parsed.data, requestUser(req));
      sendSuccess(res, opportunity);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const opportunity = await this.opportunityService.getById(id, requestUser(req));
      sendSuccess(res, opportunity);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.opportunityService.delete(id, requestUser(req));
      sendSuccess(res, { id, deleted: true });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = opportunityListQuerySchema.parse(req.query);
      const result = await this.opportunityService.list(query, requestUser(req));
      sendSuccess(res, result.opportunities, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  extractFromSource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = extractOpportunityRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid extraction request', this.formatZodErrors(parsed.error));
      }
      let content = parsed.data.content;
      if (parsed.data.sourceType === 'url') {
        const urlCheck = await validateUrlForFetchResolved(content);
        if (!urlCheck.valid) {
          throw new ValidationError(`URL validation failed: ${urlCheck.reason}`);
        }
      }
      if (parsed.data.sourceType !== 'image') {
        content = sanitizeAiInput(content);
      }
      const extracted = await this.extractionService.extract(
        parsed.data.sourceType,
        content,
        parsed.data.fileName,
        parsed.data.mimeType,
      );
      sendSuccess(res, extracted);
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
