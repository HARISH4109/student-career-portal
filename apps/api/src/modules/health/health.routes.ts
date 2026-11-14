import { Router } from 'express';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

import { redis } from '@/infrastructure/redis';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requireRole } from '@/middlewares/require-role.middleware';

export const healthService = new HealthService(redis);
export const healthController = new HealthController(healthService);

export const healthRouter = Router();

healthRouter.get('/', healthController.check);
healthRouter.get('/admin', requireAuth, requireRole('ADMIN'), healthController.checkDetailed);
