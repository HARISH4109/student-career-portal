import fs from 'node:fs/promises';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env', quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
const target = new URL(process.env.DATABASE_URL);
console.log(JSON.stringify({ databaseHost: target.hostname, databaseName: target.pathname.slice(1), staffSeedConfigured: Boolean(process.env.CAREER_SEED_STAFF_USER_ID), redisConfigured: Boolean(process.env.REDIS_URL) }));
const client = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 15 });
try {
  const tables = await client`select schemaname, tablename from pg_tables where schemaname in ('public','drizzle','auth') order by schemaname,tablename`;
  console.log(JSON.stringify({ tables }));
  if (tables.some((t) => t.schemaname === 'drizzle' && t.tablename === '__drizzle_migrations')) console.log(JSON.stringify({ migrations: await client`select id,hash,created_at from drizzle.__drizzle_migrations order by id` }));
  console.log(JSON.stringify({ staff: await client`select distinct u.id, r.name as role, u.created_at from users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where u.is_active and r.name in ('ADMIN','PLACEMENT_FACULTY') order by r.name,u.created_at` }));
  console.log(JSON.stringify({ phase6Columns: await client`select table_name,column_name from information_schema.columns where table_schema='public' and (table_name in ('career_paths','resource_skills','resource_career_paths') or (table_name='career_roadmaps' and column_name='career_path_id'))` }));
  console.log(JSON.stringify({ authSupport: await client`select to_regprocedure('auth.uid()') is not null as uid_function, exists(select 1 from pg_roles where rolname='authenticated') as authenticated_role`, policies: await client`select tablename,policyname,cmd from pg_policies where schemaname='public' and tablename in ('career_roadmaps','resource_progress','skill_gap_analyses','roadmap_stages')` }));
  console.log(JSON.stringify({ existingTemplateColumns: await client`select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='mock_interview_templates' order by ordinal_position`, existingTemplateConstraints: await client`select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.mock_interview_templates'::regclass`, databaseAccess: await client`select current_user, rolsuper,rolbypassrls from pg_roles where rolname=current_user`, publicGrants: await client`select table_name,privilege_type from information_schema.role_table_grants where grantee='PUBLIC' and table_schema='public'` }));
  await fs.writeFile('scripts/.phase6-preflight.json', JSON.stringify({ databaseHost: target.hostname, tables }, null, 2));
} catch (error) { console.error('Preflight failed:', error.code ?? error.name, error.message?.replaceAll(process.env.DATABASE_URL, '[DATABASE_URL]')); process.exitCode = 1; }
finally { await client.end(); }
