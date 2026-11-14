import rateLimit from 'express-rate-limit';

/**
 * Dedicated rate limiter for resource-intensive AI endpoints
 * (e.g., resume analysis, AI extraction, mock interviews).
 * Window: 15 minutes, Limit: 20 requests per IP.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED' as const,
      message: 'Too many AI requests. Please wait before submitting additional analysis requests.',
    },
  },
});

