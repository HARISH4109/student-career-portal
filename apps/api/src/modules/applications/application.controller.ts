import {
  applicationListQuerySchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { ApplicationService } from './application.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService = new ApplicationService(),
  ) {}

  apply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid application data', this.formatZodErrors(parsed.error));
      }
      const application = await this.applicationService.apply(parsed.data, requestUser(req));
      sendSuccess(res, application, 201);
    } catch (error) {
      next(error);
    }
  };

  getMyApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = applicationListQuerySchema.parse(req.query);
      const result = await this.applicationService.listMyApplications(requestUser(req), query);
      sendSuccess(res, result.applications, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const application = await this.applicationService.getById(id, requestUser(req));
      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  withdraw = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const application = await this.applicationService.withdraw(id, requestUser(req));
      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateApplicationStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid status data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const application = await this.applicationService.updateStatus(
        id,
        parsed.data,
        requestUser(req),
      );
      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  updateStudentSelfStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateApplicationStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid status data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const application = await this.applicationService.updateStudentSelfStatus(
        id,
        parsed.data,
        requestUser(req),
      );
      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  listByOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = applicationListQuerySchema.parse(req.query);
      const statusFilter = pagination.status;
      const opportunityId = String(req.params.opportunityId);
      const result = await this.applicationService.listByOpportunity(
        opportunityId,
        pagination,
        statusFilter,
      );
      sendSuccess(res, result.applications, 200, result.meta);
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
