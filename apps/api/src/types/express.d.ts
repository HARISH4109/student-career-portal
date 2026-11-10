import type { AuthenticatedUser } from '@career-portal/shared-types';

declare global {
  namespace Express {
    interface Request {
      /** Populated by requireAuth middleware after JWT verification */
      user?: AuthenticatedUser;
    }
  }
}
