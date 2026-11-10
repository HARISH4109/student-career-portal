import type { NextFunction, Request, Response } from 'express';

import type { HealthService } from './health.service';

import { sendSuccess } from '@/shared/http/send-success';


/**
 * Controllers are intentionally "dumb": parse/validate input (via DTOs, not
 * shown here since health has none), delegate to the service, format the
 * response. No business rules, no direct DB/Redis access here — ever.
 */
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
}
