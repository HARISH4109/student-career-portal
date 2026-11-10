import { paginationQuerySchema, saveOpportunitySchema } from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { SavedOpportunityService } from './saved-opportunity.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

export class SavedOpportunityController {
  constructor(
    private readonly savedService: SavedOpportunityService = new SavedOpportunityService(),
  ) {}

  save = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = saveOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid data', this.formatZodErrors(parsed.error));
      }
      const saved = await this.savedService.save(parsed.data.opportunityId, requestUser(req));
      sendSuccess(res, saved, 201);
    } catch (error) {
      next(error);
    }
  };

  unsave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const opportunityId = String(req.params.opportunityId);
      await this.savedService.unsave(opportunityId, requestUser(req));
      sendSuccess(res, { message: 'Opportunity unsaved' });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = paginationQuerySchema.parse(req.query);
      const result = await this.savedService.list(requestUser(req), pagination);
      sendSuccess(res, result.saved, 200, result.meta);
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
