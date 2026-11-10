import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';

/**
 * Higher-order middleware factory that checks if the authenticated user
 * has the required permission(s). Must be used AFTER `requireAuth`.
 *
 * Usage:
 *   router.post('/jobs', requireAuth, requirePermission('opportunities.create'), controller.create);
 */
export function requirePermission(
  ...requiredPermissions: string[]
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Authentication context missing — requireAuth must precede requirePermission'));
      return;
    }

    const hasAll = requiredPermissions.every((perm) => requestUser(req).permissions.includes(perm));
    if (!hasAll) {
      next(
        new ForbiddenError(
          `Missing required permission(s): ${requiredPermissions.join(', ')}`,
        ),
      );
      return;
    }

    next();
  };
}

/**
 * OR-logic variant: passes if the user has ANY of the listed permissions.
 *
 * Usage:
 *   router.get('/reports', requireAuth, requireAnyPermission('analytics.view_own', 'analytics.view_all'), ...);
 */
export function requireAnyPermission(
  ...permissions: string[]
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Authentication context missing'));
      return;
    }

    const hasAny = permissions.some((perm) => requestUser(req).permissions.includes(perm));
    if (!hasAny) {
      next(
        new ForbiddenError(
          `Requires at least one of: ${permissions.join(', ')}`,
        ),
      );
      return;
    }

    next();
  };
}
