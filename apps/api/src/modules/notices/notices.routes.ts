import { Router } from 'express';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';
import { uploadPosterMiddleware } from '@/infrastructure/uploads';
import { NoticesController } from './notices.controller';

export const noticesRouter = Router();
const controller = new NoticesController();

noticesRouter.use(requireAuth);

noticesRouter.post(
  '/upload-poster',
  requirePermission('notices.publish'),
  uploadPosterMiddleware,
  controller.uploadPoster,
);

noticesRouter.get('/', requirePermission('notices.view'), controller.getNotices);
noticesRouter.get('/manage', requirePermission('notices.publish'), controller.getStaffNotices);
noticesRouter.get('/:id', requirePermission('notices.view'), controller.getNoticeById);

noticesRouter.post('/', requirePermission('notices.publish'), controller.createNotice);
noticesRouter.put('/:id', requirePermission('notices.publish'), controller.updateNotice);
noticesRouter.patch('/:id/pin', requirePermission('notices.publish'), controller.pinNotice);
noticesRouter.patch('/:id/expire', requirePermission('notices.publish'), controller.expireNotice);
noticesRouter.patch('/:id/publish', requirePermission('notices.publish'), controller.publishNotice);

