import { z } from 'zod';

import { httpUrlSchema } from './url-validation';

import { ROLE_NAMES } from '../enums';

// ── Registration / Login ────────────────────────────────────────────────
// Actual credential handling is delegated to Supabase Auth; these DTOs cover
// the *profile completion* step our own API owns after Supabase issues a session.

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  fullName: z.string().min(2, 'Full name is required').max(200),
  role: z.enum(ROLE_NAMES).optional().default('STUDENT'),
});
export type SignUpDto = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type SignInDto = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const completeStudentProfileSchema = z.object({
  rollNumber: z.string().min(3).max(50),
  department: z.string().min(2).max(100),
  batchYear: z
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 10),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
    .optional(),
});
export type CompleteStudentProfileDto = z.infer<typeof completeStudentProfileSchema>;

export const updateUserProfileSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
    .optional(),
  avatarUrl: httpUrlSchema('Invalid avatar URL').optional(),
});
export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;

// ── RBAC administration (super_admin only) ──────────────────────────────

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLE_NAMES),
});
export type AssignRoleDto = z.infer<typeof assignRoleSchema>;

export const revokeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLE_NAMES),
});
export type RevokeRoleDto = z.infer<typeof revokeRoleSchema>;

// ── Authenticated user context ──────────────────────────────────────────
// Shape attached to `req.user` by the Express auth middleware after verifying
// the Supabase JWT. Frontend uses the same shape for the auth store.

export const authenticatedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  roles: z.array(z.enum(ROLE_NAMES)),
  permissions: z.array(z.string()), // dot-namespaced keys, e.g. 'jobs.create'
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

// ── Auth response shapes ────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}
