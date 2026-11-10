import {
  forgotPasswordSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateUserProfileSchema,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import type { AuthService } from './auth.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

/**
 * Auth controller — thin layer that validates DTOs, delegates to AuthService,
 * and formats responses. No business logic here, following the health module pattern.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = signUpSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid signup data', this.formatZodErrors(parsed.error));
      }
      const result = await this.authService.signUp(parsed.data);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = signInSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid login data', this.formatZodErrors(parsed.error));
      }
      const result = await this.authService.signIn(parsed.data.email, parsed.data.password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  signOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.signOut(requestUser(req).id, req.headers.authorization?.slice(7) ?? '');
      sendSuccess(res, { message: 'Signed out successfully' });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = refreshTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid refresh token', this.formatZodErrors(parsed.error));
      }
      const tokens = await this.authService.refreshToken(parsed.data.refreshToken);
      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getMe(requestUser(req).id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateUserProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid profile data', this.formatZodErrors(parsed.error));
      }
      const user = await this.authService.updateProfile(requestUser(req).id, parsed.data);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid email', this.formatZodErrors(parsed.error));
      }
      await this.authService.forgotPassword(parsed.data.email);
      // Always return success to prevent email enumeration
      sendSuccess(res, { message: 'If an account exists, a reset email has been sent' });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid password data', this.formatZodErrors(parsed.error));
      }

      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token) {
        throw new ValidationError('Reset token is required');
      }

      await this.authService.resetPassword(token, parsed.data.password);
      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────

  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.syncUser(
        requestUser(req).id,
        requestUser(req).email,
        requestUser(req).fullName,
      );
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  };

  private formatZodErrors(error: import('zod').ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return details;
  }
}
