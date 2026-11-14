import type { RequestHandler } from 'express';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  constructor(private readonly service = new AnalyticsService()) {}

  getStudentAnalytics: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const data = await this.service.getStudentAnalytics(user.id);
      sendSuccess(res, data, 200);
    })().catch(next);
  };

  getFacultyAnalytics: RequestHandler = (_req, res, next) => {
    void (async () => {
      const data = await this.service.getFacultyAnalytics();
      sendSuccess(res, data, 200);
    })().catch(next);
  };

  getAdminAnalytics: RequestHandler = (_req, res, next) => {
    void (async () => {
      const data = await this.service.getAdminAnalytics();
      sendSuccess(res, data, 200);
    })().catch(next);
  };

  generateSnapshots: RequestHandler = (_req, res, next) => {
    void (async () => {
      const data = await this.service.generateDailySnapshots();
      sendSuccess(res, data, 200);
    })().catch(next);
  };
}

