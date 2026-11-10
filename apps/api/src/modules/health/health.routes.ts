import { Router } from 'express';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

import { redis } from '@/infrastructure/redis';

const healthService = new HealthService(redis);
const healthController = new HealthController(healthService);

export const healthRouter = Router();

healthRouter.get('/', healthController.check);
