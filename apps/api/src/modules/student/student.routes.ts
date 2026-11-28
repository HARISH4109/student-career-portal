import { Router } from 'express';

import { StudentController } from './student.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new StudentController();

export const studentRouter = Router();

// All student routes require authentication
studentRouter.use(requireAuth);

// Student self-service routes
studentRouter.get('/me', requirePermission('students.view_own_profile'), controller.getMe);
studentRouter.put('/me', requirePermission('students.edit_own_profile'), controller.updateMe);
studentRouter.patch('/me', requirePermission('students.edit_own_profile'), controller.updateMe);
studentRouter.get('/me/completion', requirePermission('students.view_own_profile'), controller.getCompletion);
studentRouter.post('/me/skills', requirePermission('students.edit_own_profile'), controller.addSkill);
studentRouter.delete('/me/skills/:skillId', requirePermission('students.edit_own_profile'), controller.removeSkill);

// Faculty & Admin roster / individual viewing routes
studentRouter.get('/', requirePermission('students.view_all_profiles'), controller.listStudents);
studentRouter.get('/:id', controller.getStudentById);
