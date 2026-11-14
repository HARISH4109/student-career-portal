import type { NextFunction, Request, Response } from 'express';

import { auditLogsQuerySchema } from './audit.dto';
import type { AuditService } from './audit.service';

import { sendSuccess } from '@/shared/http/send-success';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  listLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = auditLogsQuerySchema.parse(req.query);
      const result = await this.auditService.queryLogs(query);
      sendSuccess(res, result.logs, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  getFilterOptions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options = await this.auditService.getFilterOptions();
      sendSuccess(res, options);
    } catch (error) {
      next(error);
    }
  };
}

