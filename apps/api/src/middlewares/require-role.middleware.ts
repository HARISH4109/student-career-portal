import type { RoleName } from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';

/**
 * Coarse-grained role guard. Use for routes that are inherently
 * role-scoped (e.g. admin-only panels). For fine-grained feature access,
 * prefer `requirePermission` which maps to specific capabilities.
 *
 * Must be used AFTER `requireAuth`.
 *
 * Usage:
 *   router.get('/admin/users', requireAuth, requireRole('ADMIN'), controller.list);
 */
export function requireRole(
  ...requiredRoles: RoleName[]
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Authentication context missing — requireAuth must precede requireRole'));
      return;
    }

    const hasRole = requiredRoles.some((role) => requestUser(req).roles.includes(role));
    if (!hasRole) {
      next(
        new ForbiddenError(
          `Requires one of the following roles: ${requiredRoles.join(', ')}`,
        ),
      );
      return;
    }

    next();
  };
}
