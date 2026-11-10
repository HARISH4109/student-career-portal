import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, primaryKey, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { timestamps } from './_shared';

// ── Academic Master Data ─────────────────────────────────────────────────
// Relational academic structure replaces free-text department/batch fields.
// This enables structured eligibility queries, targeted notifications, and
// analytics scoped by department/program/batch — none of which are possible
// with string-only storage.

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull().unique(),
  code: varchar('code', { length: 20 }).notNull().unique(), // e.g. 'CSE', 'ECE', 'ME'
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const academicPrograms = pgTable('academic_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(), // e.g. 'B.Tech Computer Science'
  degreeLevel: varchar('degree_level', { length: 50 }).notNull(), // e.g. 'B.Tech', 'M.Tech', 'MSc', 'MBA', 'PhD'
  durationYears: integer('duration_years').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const batches = pgTable('batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  graduationYear: integer('graduation_year').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

// ── Identity & RBAC ─────────────────────────────────────────────────────

/**
 * `users` mirrors Supabase's `auth.users` (id = Supabase auth UID).
 * We keep an app-side profile row so we can join business data without ever querying
 * the `auth` schema directly from application code. Row is created via a DB trigger
 * or an onSignUp webhook — never created ad-hoc from arbitrary request bodies.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // matches auth.users.id (Supabase)
  email: varchar('email', { length: 320 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

/**
 * Roles: STUDENT, PLACEMENT_FACULTY, ADMIN.
 * No recruiter role — companies exist only as data entities managed by faculty/admin.
 */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  ...timestamps,
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  // dot-namespaced permission keys, e.g. 'opportunities.create', 'applications.review'
  key: varchar('key', { length: 100 }).notNull().unique(),
  description: text('description'),
  ...timestamps,
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

// ── Relations ────────────────────────────────────────────────────────────

export const departmentsRelations = relations(departments, ({ many }) => ({
  academicPrograms: many(academicPrograms),
}));

export const academicProgramsRelations = relations(academicPrograms, ({ one }) => ({
  department: one(departments, {
    fields: [academicPrograms.departmentId],
    references: [departments.id],
  }),
}));

export const batchesRelations = relations(batches, () => ({
  // studentProfiles relation is defined in student.schema.ts to avoid circular imports
}));

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));
