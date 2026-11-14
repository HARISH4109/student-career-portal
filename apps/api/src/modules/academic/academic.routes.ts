import { Router } from 'express';

import { AcademicController } from './academic.controller';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requireRole } from '@/middlewares/require-role.middleware';

const controller = new AcademicController();

export const academicRouter = Router();

// ── Public / Authenticated Read Queries ─────────────────────────────────
academicRouter.get('/departments', controller.getDepartments);
academicRouter.get('/programs', controller.getPrograms);
academicRouter.get('/programs/:id', controller.getProgramById);
academicRouter.get('/streams', controller.getStreams);
academicRouter.get('/streams/:id', controller.getStreamById);
academicRouter.get('/batches', controller.getBatches);

// ── Admin-Only Program Management ───────────────────────────────────────
academicRouter.post(
  '/programs',
  requireAuth,
  requireRole('ADMIN'),
  controller.createProgram,
);
academicRouter.put(
  '/programs/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.updateProgram,
);
academicRouter.delete(
  '/programs/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.deleteProgram,
);

// ── Admin-Only Stream Management ────────────────────────────────────────
academicRouter.post(
  '/streams',
  requireAuth,
  requireRole('ADMIN'),
  controller.createStream,
);
academicRouter.put(
  '/streams/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.updateStream,
);
academicRouter.delete(
  '/streams/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.deleteStream,
);

// ── Admin-Only Department Management ─────────────────────────────────────
academicRouter.post(
  '/departments',
  requireAuth,
  requireRole('ADMIN'),
  controller.createDepartment,
);
academicRouter.put(
  '/departments/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.updateDepartment,
);
academicRouter.delete(
  '/departments/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.deleteDepartment,
);

// ── Admin-Only Batch Management ──────────────────────────────────────────
academicRouter.post(
  '/batches',
  requireAuth,
  requireRole('ADMIN'),
  controller.createBatch,
);
academicRouter.put(
  '/batches/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.updateBatch,
);
academicRouter.delete(
  '/batches/:id',
  requireAuth,
  requireRole('ADMIN'),
  controller.deleteBatch,
);
