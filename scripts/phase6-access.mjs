import fs from 'node:fs/promises';
import { config } from 'dotenv';
import postgres from 'postgres';
config({ path: '.env', quiet: true });
const client = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [auth] = await client`select to_regprocedure('auth.uid()') is not null as uid_function, exists(select 1 from pg_roles where rolname='authenticated') as authenticated_role`;
  const sql = await fs.readFile('packages/db/rls/002_phase6.sql', 'utf8');
  await client.begin(async (tx) => {
    for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      const policy = /CREATE POLICY (\w+) ON (\w+)/.exec(statement);
      if (policy) {
        if (!auth.uid_function || !auth.authenticated_role) continue;
        const [existing] = await tx`select 1 from pg_policies where schemaname='public' and tablename=${policy[2]} and policyname=${policy[1]}`;
        if (existing) continue;
      }
      await tx.unsafe(statement);
    }
  });
  const summary = {
    target: new URL(process.env.DATABASE_URL).hostname,
    accessMode: auth.uid_function && auth.authenticated_role ? 'Supabase owner policies applied' : 'Local PostgreSQL: RLS enabled; Express service owns database access; Supabase policies not applicable',
    careerCounts: await client`select count(*)::int as total, count(*) filter (where is_active)::int as active from career_paths`,
    resourceCounts: await client`select count(*)::int as seeded from learning_resources where seed_key like 'phase6-%'`,
    migrationCount: await client`select count(*)::int as count from drizzle.__drizzle_migrations`,
    tables: await client`select relname,relrowsecurity from pg_class where relname in ('career_paths','resource_skills','resource_career_paths','career_roadmaps','roadmap_stages','roadmap_stage_skills','roadmap_stage_resources','resource_progress','skill_gap_analyses','phase6_legacy_resource_progress')`,
    rolePermissions: await client`select r.name, array_agg(p.key order by p.key) as permissions from roles r join role_permissions rp on rp.role_id=r.id join permissions p on p.id=rp.permission_id where p.key in ('career_paths.manage','resources.view','resources.manage','roadmaps.manage_own','skill_gap.analyze_own') group by r.name order by r.name`,
    apiPort: process.env.API_PORT ?? '4000', webOrigin: process.env.WEB_BASE_URL ?? 'http://localhost:5173',
  };
  console.log(JSON.stringify(summary, null, 2));
} catch (error) { console.error('Phase 6 access setup failed:', error.code ?? error.name); process.exitCode = 1; }
finally { await client.end(); }
