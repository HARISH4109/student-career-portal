import { Router } from 'express';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';
import { NotificationsController } from './notifications.controller';

export const notificationsRouter = Router();
const controller = new NotificationsController();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', requirePermission('notifications.view_own'), controller.getNotifications);
notificationsRouter.get('/unread-count', requirePermission('notifications.view_own'), controller.getUnreadCount);
notificationsRouter.patch('/:id/read', requirePermission('notifications.view_own'), controller.markAsRead);
notificationsRouter.post('/mark-all-read', requirePermission('notifications.view_own'), controller.markAllAsRead);

notificationsRouter.get('/preferences', requirePermission('notifications.manage_preferences'), controller.getPreferences);
notificationsRouter.put('/preferences', requirePermission('notifications.manage_preferences'), controller.updatePreferences);

