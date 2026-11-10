import {
  addStudentSkillSchema,
  paginationQuerySchema,
  updateStudentProfileSchema,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { StudentService } from './student.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

export class StudentController {
  constructor(private readonly studentService: StudentService = new StudentService()) {}

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.studentService.getOwnProfile(requestUser(req).id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateStudentProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid student profile data', this.formatZodErrors(parsed.error));
      }
      const profile = await this.studentService.createOrUpdateOwnProfile(requestUser(req).id, parsed.data);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  };

  getCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const completion = await this.studentService.getProfileCompletion(requestUser(req).id);
      sendSuccess(res, completion);
    } catch (error) {
      next(error);
    }
  };

  addSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = addStudentSkillSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid skill data', this.formatZodErrors(parsed.error));
      }
      const profile = await this.studentService.addSkill(
        requestUser(req).id,
        parsed.data.skillId,
        parsed.data.proficiency,
      );
      sendSuccess(res, profile, 201);
    } catch (error) {
      next(error);
    }
  };

  removeSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const skillId = String(req.params.skillId);
      const profile = await this.studentService.removeSkill(requestUser(req).id, skillId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  };

  listStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = paginationQuerySchema.parse(req.query);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
      const batchId = typeof req.query.batchId === 'string' ? req.query.batchId : undefined;
      const isPlacementEligible =
        typeof req.query.isPlacementEligible === 'string'
          ? req.query.isPlacementEligible === 'true'
          : undefined;

      const result = await this.studentService.listStudents(pagination, {
        ...(search !== undefined ? { search } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(batchId !== undefined ? { batchId } : {}),
        ...(isPlacementEligible !== undefined ? { isPlacementEligible } : {}),
      });

      sendSuccess(res, result.profiles, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const profile = await this.studentService.getStudentById(id, requestUser(req));
      sendSuccess(res, profile);
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
