import type { NextFunction, Request, Response } from 'express';

import { AcademicService } from './academic.service';

import { sendSuccess } from '@/shared/http/send-success';

export class AcademicController {
  constructor(private readonly academicService: AcademicService = new AcademicService()) {}

  getDepartments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.academicService.listDepartments();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  getPrograms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
      const data = await this.academicService.listPrograms(departmentId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  getBatches = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.academicService.listBatches();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };
}
