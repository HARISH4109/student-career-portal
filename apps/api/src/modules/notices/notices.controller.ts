import {
  CreateNoticeSchema,
  NoticeQuerySchema,
  UpdateNoticeSchema,
} from '@career-portal/shared-types';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';
import { NoticesService } from './notices.service';

const idParam = (req: Request, param = 'id'): string =>
  z.string().uuid().parse(req.params[param]);

export class NoticesController {
  constructor(private readonly service = new NoticesService()) {}

  uploadPoster: RequestHandler = (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('No file provided for upload');
      }
      const url = `/uploads/posters/${req.file.filename}`;
      sendSuccess(res, { url }, 201);
    } catch (err) {
      next(err);
    }
  };

  getNotices: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const query = NoticeQuerySchema.parse(req.query);
      const role = user.roles[0] ?? 'STUDENT';
      const { data, total } = await this.service.getStudentNotices(
        user.id,
        role,
        query,
      );
      const totalPages = Math.ceil(total / query.pageSize) || 1;
      sendSuccess(res, data, 200, {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages,
      });
    })().catch(next);
  };

  getStaffNotices: RequestHandler = (req, res, next) => {
    void (async () => {
      const query = NoticeQuerySchema.parse(req.query);
      const { data, total } = await this.service.getStaffNotices(query);
      const totalPages = Math.ceil(total / query.pageSize) || 1;
      sendSuccess(res, data, 200, {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages,
      });
    })().catch(next);
  };

  getNoticeById: RequestHandler = (req, res, next) => {
    void (async () => {
      const id = idParam(req);
      const notice = await this.service.getNoticeById(id);
      sendSuccess(res, notice, 200);
    })().catch(next);
  };

  createNotice: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const body = CreateNoticeSchema.parse(req.body);
      const notice = await this.service.createNotice(user.id, body);
      sendSuccess(res, notice, 201);
    })().catch(next);
  };

  updateNotice: RequestHandler = (req, res, next) => {
    void (async () => {
      const id = idParam(req);
      const body = UpdateNoticeSchema.parse(req.body);
      const notice = await this.service.updateNotice(id, body);
      sendSuccess(res, notice, 200);
    })().catch(next);
  };

  pinNotice: RequestHandler = (req, res, next) => {
    void (async () => {
      const id = idParam(req);
      const isPinned = z.boolean().parse(req.body.isPinned);
      const notice = await this.service.pinNotice(id, isPinned);
      sendSuccess(res, notice, 200);
    })().catch(next);
  };

  expireNotice: RequestHandler = (req, res, next) => {
    void (async () => {
      const id = idParam(req);
      const notice = await this.service.expireNotice(id);
      sendSuccess(res, notice, 200);
    })().catch(next);
  };

  publishNotice: RequestHandler = (req, res, next) => {
    void (async () => {
      const id = idParam(req);
      const notice = await this.service.publishNotice(id);
      sendSuccess(res, notice, 200);
    })().catch(next);
  };
}
