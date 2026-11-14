import type { NextFunction, Request, Response } from 'express';

import type { HealthService } from './health.service';

import { sendSuccess } from '@/shared/http/send-success';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await this.healthService.check();
      sendSuccess(res, status, status.status === 'ok' ? 200 : 503);
    } catch (error) {
      next(error);
    }
  };

  checkDetailed = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await this.healthService.checkDetailed();
      sendSuccess(res, status, 200);
    } catch (error) {
      next(error);
    }
  };
}
