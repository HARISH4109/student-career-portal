import { Router } from 'express';

import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const service = new UserManagementService();
const controller = new UserManagementController(service);

export const userManagementRouter = Router();

// All routes require authentication + admin permissions
userManagementRouter.use(requireAuth);

userManagementRouter.get('/', requirePermission('admin.manage_users'), controller.listUsers);
userManagementRouter.get('/:id', requirePermission('admin.manage_users'), controller.getUserById);
userManagementRouter.post('/:id/roles', requirePermission('admin.manage_roles'), controller.assignRole);
userManagementRouter.delete('/:id/roles/:role', requirePermission('admin.manage_roles'), controller.revokeRole);
userManagementRouter.patch('/:id/activate', requirePermission('admin.manage_users'), controller.activateUser);
userManagementRouter.patch('/:id/deactivate', requirePermission('admin.manage_users'), controller.deactivateUser);
userManagementRouter.patch('/:id/status', requirePermission('admin.manage_users'), controller.updateStatus);
