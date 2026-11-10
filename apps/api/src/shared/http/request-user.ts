import type { AuthenticatedUser } from '@career-portal/shared-types';
import type { Request } from 'express';

import { UnauthorizedError } from '@/shared/errors/app-error';

export function requestUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
