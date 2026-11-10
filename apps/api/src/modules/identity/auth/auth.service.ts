import { db, schema } from '@career-portal/db';
import type {
  AuthenticatedUser,
  AuthResponse,
  AuthTokens,
  RoleName,
  SignUpDto,
  UpdateUserProfileDto,
} from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';

import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';
import { CacheKeys, redis } from '@/infrastructure/redis';
import { createAuthClient, supabaseAdmin } from '@/infrastructure/supabase';
import {
  ConflictError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from '@/shared/errors/app-error';

/**
 * Auth service — orchestrates Supabase Auth + our app-side users/RBAC tables.
 *
 * Supabase owns: credentials, sessions, JWT signing, email verification, password reset.
 * We own: app-side `users` row, role/permission assignments, profile data.
 */
export class AuthService {
  // ── Sign Up ─────────────────────────────────────────────────────────────
  async signUp(dto: SignUpDto): Promise<AuthResponse> {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true, // Auto-confirm for now; toggle for production
      user_metadata: { full_name: dto.fullName },
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('duplicate')) {
        throw new ConflictError('A user with this email already exists');
      }
      logger.error({ err: authError }, 'Supabase signup failed');
      throw new InternalError('Failed to create user account');
    }

    const supabaseUser = authData.user;

    // 2. Create app-side users row (the trigger may also do this, but
    //    we do it explicitly for immediate consistency + error handling)
    try {
      await db
        .insert(schema.users)
        .values({
          id: supabaseUser.id,
          email: dto.email,
          fullName: dto.fullName,
        })
        .onConflictDoNothing({ target: schema.users.id });
    } catch (err) {
      logger.error({ err, userId: supabaseUser.id }, 'Failed to create app-side user row');
      // Don't throw — Supabase user exists, trigger will create the row
    }

    // 3. Assign role — public registrations are strictly STUDENT role to prevent privilege escalation
    const role: RoleName = 'STUDENT';
    await this.assignDefaultRole(supabaseUser.id, role);

    // 4. Sign in to get session tokens
    const { data: sessionData, error: sessionError } =
      await createAuthClient().auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (sessionError) {
      logger.error({ err: sessionError }, 'Failed to create session after signup');
      throw new InternalError('Account created but session could not be established');
    }

    // 5. Build response
    const userContext = await this.buildUserContext(supabaseUser.id);
    const tokens = this.extractTokens(sessionData.session);

    return { user: userContext, tokens };
  }

  // ── Sign In ─────────────────────────────────────────────────────────────
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await createAuthClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const userContext = await this.buildUserContext(data.user.id);
    const tokens = this.extractTokens(data.session);

    return { user: userContext, tokens };
  }

  // ── Sign Out ────────────────────────────────────────────────────────────
  async signOut(userId: string, accessToken: string): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'local');
    if (error) throw new InternalError('Could not sign out. Please try again.');
    // Clear cached permissions so stale data isn't served on next login
    await redis.del(CacheKeys.userPermissions(userId)).catch(() => {});
  }

  // ── Refresh Token ───────────────────────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const { data, error } = await createAuthClient().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    return this.extractTokens(data.session);
  }

  // ── Get Current User ────────────────────────────────────────────────────
  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        userRoles: {
          with: {
            role: {
              with: {
                rolePermissions: {
                  with: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User');
    if (!user.isActive) throw new UnauthorizedError('User account is deactivated');

    const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.key);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions: Array.from(permissionSet),
    };
  }

  // ── Forgot Password ────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    // Always return success to prevent email enumeration
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('/reset-password', env.WEB_BASE_URL).toString(),
    });
  }

  // ── Reset Password ─────────────────────────────────────────────────────
  async resetPassword(accessToken: string, newPassword: string): Promise<void> {
    // The user arrives with a valid access token from the reset email link.
    // Supabase handles the token exchange; we just set the new password.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      (await this.getUserIdFromToken(accessToken)),
      { password: newPassword },
    );

    if (error) {
      logger.error({ err: error }, 'Password reset failed');
      throw new InternalError('Failed to reset password');
    }
  }

  // ── Update Profile ─────────────────────────────────────────────────────
  async updateProfile(userId: string, dto: UpdateUserProfileDto): Promise<AuthenticatedUser> {
    const updateData: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(schema.users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    }

    return this.getMe(userId);
  }

  // ── Sync User ─────────────────────────────────────────────────────────
  /**
   * Ensures the app-side `users` row exists for the authenticated Supabase
   * user and returns the full context (roles + permissions).
   *
   * Called by the frontend after any Supabase auth state change (social login,
   * first login from another device, etc.) to guarantee our DB has the user
   * record and to hydrate the client-side auth store.
   *
   * Idempotent — safe to call multiple times.
   */
  async syncUser(userId: string, email: string, fullName: string): Promise<AuthenticatedUser> {
    const existingUser = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (existingUser && !existingUser.isActive) throw new UnauthorizedError('User account is deactivated');
    // Ensure app-side user row exists
    await db
      .insert(schema.users)
      .values({
        id: userId,
        email,
        fullName: fullName || '',
      })
      .onConflictDoNothing({ target: schema.users.id });

    // Ensure at least the default STUDENT role is assigned
    const existingRoles = await db.query.userRoles.findMany({
      where: eq(schema.userRoles.userId, userId),
    });

    if (existingRoles.length === 0) {
      await this.assignDefaultRole(userId, 'STUDENT');
    }

    return this.getMe(userId);
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private async assignDefaultRole(userId: string, roleName: RoleName): Promise<void> {
    const role = await db.query.roles.findFirst({
      where: eq(schema.roles.name, roleName),
    });

    if (!role) {
      logger.error({ roleName }, 'Role not found in database — was seed run?');
      throw new InternalError('System configuration error: role not found');
    }

    await db
      .insert(schema.userRoles)
      .values({ userId, roleId: role.id })
      .onConflictDoNothing();
  }

  private async buildUserContext(userId: string): Promise<AuthenticatedUser> {
    return this.getMe(userId);
  }

  private extractTokens(session: { access_token: string; refresh_token: string; expires_at?: number }): AuthTokens {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    };
  }

  private async getUserIdFromToken(token: string): Promise<string> {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    return data.user.id;
  }
}
