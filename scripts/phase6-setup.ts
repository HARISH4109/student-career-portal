import fs from 'node:fs/promises';
import { config } from 'dotenv';
import { and, eq, inArray } from 'drizzle-orm';
import Redis from 'ioredis';
import { db } from '../packages/db/src/client';
import { seedCareerCatalog } from '../packages/db/src/seed-career';
import { permissions, rolePermissions, roles, userRoles, users } from '../packages/db/src/schema';

config({ path: '.env', quiet: true });
async function setup(): Promise<void> {
  const staff = await db.selectDistinct({ id: users.id }).from(users).innerJoin(userRoles, eq(userRoles.userId, users.id)).innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.isActive, true), eq(roles.name, 'PLACEMENT_FACULTY')));
  const staffId = process.env.CAREER_SEED_STAFF_USER_ID || (staff.length === 1 ? staff[0]?.id : undefined);
  if (!staffId) throw new Error('Set CAREER_SEED_STAFF_USER_ID: the existing faculty account is ambiguous');
  await seedCareerCatalog(staffId);
  await db.transaction(async (tx) => {
    const keys = ['career_paths.manage', 'resources.view', 'resources.manage', 'roadmaps.manage_own', 'skill_gap.analyze_own'];
    await tx.insert(permissions).values(keys.map((key) => ({ key }))).onConflictDoNothing({ target: permissions.key });
    const allPermissions = await tx.select().from(permissions).where(inArray(permissions.key, keys));
    const allRoles = await tx.select().from(roles);
    for (const role of allRoles) {
      const allowed = role.name === 'ADMIN' ? keys : role.name === 'PLACEMENT_FACULTY' ? ['career_paths.manage', 'resources.view', 'resources.manage'] : ['resources.view', 'roadmaps.manage_own', 'skill_gap.analyze_own'];
      const mappings = allPermissions.filter((permission) => allowed.includes(permission.key)).map((permission) => ({ roleId: role.id, permissionId: permission.id }));
      if (mappings.length) await tx.insert(rolePermissions).values(mappings).onConflictDoNothing();
    }
  });
  const file = await fs.readFile('.env', 'utf8');
  await fs.writeFile('.env', /^CAREER_SEED_STAFF_USER_ID=/m.test(file) ? file.replace(/^CAREER_SEED_STAFF_USER_ID=.*$/m, `CAREER_SEED_STAFF_USER_ID=${staffId}`) : `${file.trimEnd()}\n\nCAREER_SEED_STAFF_USER_ID=${staffId}\n`);
  console.log('Career catalog seeded and Phase 6 role permissions granted; attribution saved to local environment.');
  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    try { await redis.connect(); let cursor = '0'; let count = 0; do { const result = await redis.scan(cursor, 'MATCH', 'user:*:permissions', 'COUNT', 100); cursor = result[0]; if (result[1].length) count += await redis.del(...result[1]); } while (cursor !== '0'); console.log(`Invalidated ${String(count)} permission cache entries.`); }
    finally { redis.disconnect(); }
  }
}
setup().then(() => process.exit(0)).catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Phase 6 setup failed'); process.exit(1); });
