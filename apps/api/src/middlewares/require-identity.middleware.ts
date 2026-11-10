import type { AuthenticatedUser } from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { supabaseAdmin } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/shared/errors/app-error';

export async function verifyIdentity(req: Request): Promise<AuthenticatedUser> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') || !header.slice(7).trim()) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (error || !user) throw new UnauthorizedError('Invalid or expired access token');
  const metadata: unknown = user.user_metadata;
  const name = typeof metadata === 'object' && metadata !== null && 'full_name' in metadata ? metadata.full_name : ''; 
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof name === 'string' ? name : '',
    roles: [],
    permissions: [],
  };
}

// Only the sync endpoint uses identity without an existing application account.
export async function requireIdentity(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    req.user = await verifyIdentity(req);
    next();
  } catch (error) {
    next(error);
  }
}
