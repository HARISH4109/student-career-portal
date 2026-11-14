import {
  NotificationQuerySchema,
  UpdateNotificationPreferencesSchema,
} from '@career-portal/shared-types';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';
import { NotificationsService } from './notifications.service';

const idParam = (req: Request, param = 'id'): string =>
  z.string().uuid().parse(req.params[param]);

export class NotificationsController {
  constructor(private readonly service = new NotificationsService()) {}

  getNotifications: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const query = NotificationQuerySchema.parse(req.query);
      const { data, total } = await this.service.getUserNotifications(
        user.id,
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

  getUnreadCount: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const count = await this.service.getUnreadCount(user.id);
      sendSuccess(res, { unreadCount: count }, 200);
    })().catch(next);
  };

  markAsRead: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const id = idParam(req);
      const updated = await this.service.markAsRead(id, user.id);
      sendSuccess(res, updated, 200);
    })().catch(next);
  };

  markAllAsRead: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const markedCount = await this.service.markAllAsRead(user.id);
      sendSuccess(res, { markedCount }, 200);
    })().catch(next);
  };

  getPreferences: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const preferences = await this.service.getUserPreferences(user.id);
      sendSuccess(res, preferences, 200);
    })().catch(next);
  };

  updatePreferences: RequestHandler = (req, res, next) => {
    void (async () => {
      const user = requestUser(req);
      const body = UpdateNotificationPreferencesSchema.parse(req.body);
      const updated = await this.service.updateUserPreferences(user.id, body);
      sendSuccess(res, updated, 200);
    })().catch(next);
  };
}

