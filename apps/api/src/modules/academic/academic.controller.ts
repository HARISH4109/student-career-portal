import {
  createAcademicProgramSchema,
  createAcademicStreamSchema,
  createBatchSchema,
  createDepartmentSchema,
  updateAcademicProgramSchema,
  updateAcademicStreamSchema,
  updateBatchSchema,
  updateDepartmentSchema,
} from '@career-portal/shared-types';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';

import { AcademicService } from './academic.service';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

const idParam = (req: Request, param = 'id'): string =>
  z.string().uuid().parse(req.params[param]);

export class AcademicController {
  constructor(private readonly academicService: AcademicService = new AcademicService()) { }

  getDepartments: RequestHandler = async (_req, res, next) => {
    try {
      const data = await this.academicService.listDepartments();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  getPrograms: RequestHandler = async (req, res, next) => {
    try {
      const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
      const data = await this.academicService.listPrograms(departmentId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  getProgramById: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const data = await this.academicService.getProgramById(id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  createProgram: RequestHandler = async (req, res, next) => {
    try {
      const body = createAcademicProgramSchema.parse(req.body);
      const data = await this.academicService.createProgram(body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  updateProgram: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const body = updateAcademicProgramSchema.parse(req.body);
      const data = await this.academicService.updateProgram(id, body);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteProgram: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const data = await this.academicService.deleteProgram(id);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  getStreams: RequestHandler = async (req, res, next) => {
    try {
      const programId = typeof req.query.programId === 'string' ? req.query.programId : undefined;
      const data = await this.academicService.listStreams(programId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  getStreamById: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const data = await this.academicService.getStreamById(id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  createStream: RequestHandler = async (req, res, next) => {
    try {
      const body = createAcademicStreamSchema.parse(req.body);
      const data = await this.academicService.createStream(body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  updateStream: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const body = updateAcademicStreamSchema.parse(req.body);
      const data = await this.academicService.updateStream(id, body);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteStream: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const data = await this.academicService.deleteStream(id);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  getBatches: RequestHandler = async (_req, res, next) => {
    try {
      const data = await this.academicService.listBatches();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  createDepartment: RequestHandler = async (req, res, next) => {
    try {
      const body = createDepartmentSchema.parse(req.body);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      const data = await this.academicService.createDepartment(body, actor?.id, ctx);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  updateDepartment: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const body = updateDepartmentSchema.parse(req.body);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      const data = await this.academicService.updateDepartment(id, body, actor?.id, ctx);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteDepartment: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      const data = await this.academicService.deleteDepartment(id, actor?.id, ctx);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  createBatch: RequestHandler = async (req, res, next) => {
    try {
      const body = createBatchSchema.parse(req.body);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      const data = await this.academicService.createBatch(body, actor?.id, ctx);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  updateBatch: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const body = updateBatchSchema.parse(req.body);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      const data = await this.academicService.updateBatch(id, body, actor?.id, ctx);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteBatch: RequestHandler = async (req, res, next) => {
    try {
      const id = idParam(req);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      const data = await this.academicService.deleteBatch(id, actor?.id, ctx);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };
}
