import { createCompanySchema, paginationQuerySchema } from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { CompanyService } from './company.service';

import { ValidationError } from '@/shared/errors/app-error';
import { sendSuccess } from '@/shared/http/send-success';

export class CompanyController {
  constructor(private readonly companyService: CompanyService = new CompanyService()) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createCompanySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid company data', this.formatZodErrors(parsed.error));
      }
      const company = await this.companyService.create(parsed.data);
      sendSuccess(res, company, 201);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const company = await this.companyService.getById(id);
      sendSuccess(res, company);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = paginationQuerySchema.parse(req.query);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const result = await this.companyService.list(pagination, search);
      sendSuccess(res, result.companies, 200, result.meta);
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
