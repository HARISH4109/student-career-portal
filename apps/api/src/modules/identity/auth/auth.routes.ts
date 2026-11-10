import { Router } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import {
  passwordResetLimiter,
  signInLimiter,
  signUpLimiter,
} from '@/middlewares/auth-rate-limit.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requireIdentity } from '@/middlewares/require-identity.middleware';

const authService = new AuthService();
const authController = new AuthController(authService);

export const authRouter = Router();

// ── Public routes (no auth required) ──────────────────────────────────
authRouter.post('/signup', signUpLimiter, authController.signUp);
authRouter.post('/signin', signInLimiter, authController.signIn);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
authRouter.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// ── Authenticated routes ──────────────────────────────────────────────
authRouter.post('/signout', requireAuth, authController.signOut);
authRouter.get('/me', requireAuth, authController.getMe);
authRouter.post('/sync', requireIdentity, authController.sync);
authRouter.put('/profile', requireAuth, authController.updateProfile);
