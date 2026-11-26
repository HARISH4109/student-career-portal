import rateLimit from 'express-rate-limit';

/**
 * Stricter rate limiters for authentication endpoints.
 *
 * The global rate limiter in app.ts provides a baseline, but auth endpoints
 * are prime targets for brute-force and credential-stuffing attacks. These
 * per-route limiters apply much tighter windows.
 *
 * Decision recorded in docs/ARCHITECTURE.md § Phase 1.
 */

/** Sign-in: 10 attempts per 15-minute window per IP */
export const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED' as const,
      message: 'Too many sign-in attempts. Please try again in 15 minutes.',
    },
  },
});

/** Sign-up: 5 attempts per 15-minute window per IP */
export const signUpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED' as const,
      message: 'Too many registration attempts. Please try again later.',
    },
  },
});

/** Password reset: 3 attempts per 15-minute window per IP */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED' as const,
      message: 'Too many password reset requests. Please try again later.',
    },
  },
});

/** Token refresh: 30 attempts per 15-minute window per IP */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED' as const,
      message: 'Too many token refresh requests. Please try again later.',
    },
  },
});
