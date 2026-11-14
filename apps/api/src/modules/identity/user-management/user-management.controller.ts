import {
  assignRoleSchema,
  paginationQuerySchema,
  type RoleName,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import type { UserManagementService } from './user-management.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

/**
 * Controller for admin user-management endpoints. Validates input,
 * delegates to UserManagementService, formats responses.
 */
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = paginationQuerySchema.parse(req.query);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const role = typeof req.query.role === 'string' ? req.query.role : undefined;
      const isActive = typeof req.query.isActive === 'string'
        ? req.query.isActive === 'true'
        : undefined;

      const result = await this.userManagementService.listUsers(pagination, {
        ...(search !== undefined ? { search } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      });
      sendSuccess(res, result.users, 200, result.meta);
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const user = await this.userManagementService.getUserById(id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  };

  assignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = assignRoleSchema.safeParse({
        userId: String(req.params.id),
        role: (req.body as { role?: unknown } | undefined)?.role,
      });
      if (!parsed.success) {
        throw new ValidationError('Invalid role assignment data');
      }
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      await this.userManagementService.assignRole(parsed.data, actor?.id, ctx);
      sendSuccess(res, { message: 'Role assigned successfully' }, 201);
    } catch (error) {
      next(error);
    }
  };

  revokeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const roleName = String(req.params.role) as RoleName;
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      await this.userManagementService.revokeRole(userId, roleName, actor?.id, ctx);
      sendSuccess(res, { message: 'Role revoked successfully' });
    } catch (error) {
      next(error);
    }
  };

  activateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      await this.userManagementService.activateUser(id, actor?.id, ctx);
      sendSuccess(res, { message: 'User activated successfully' });
    } catch (error) {
      next(error);
    }
  };

  deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actor = req.user ? requestUser(req) : undefined;
      const ctx = {
        requestId: (req as Request & { id?: string }).id,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      };
      await this.userManagementService.deactivateUser(id, actor?.id, ctx);
      sendSuccess(res, { message: 'User deactivated successfully' });
    } catch (error) {
      next(error);
    }
  };
}
