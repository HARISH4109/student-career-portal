import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('upgrades Phase 5 data while preserving duplicate progress and roadmap history', async () => {
  const client = new PGlite();
  try {
    const folder = path.resolve('../../packages/db/drizzle');
    const journal = JSON.parse(await readFile(path.join(folder, 'meta/_journal.json'), 'utf8')) as { entries: { tag: string; idx: number }[] };
    const apply = async (tag: string) => { for (const statement of (await readFile(path.join(folder, `${tag}.sql`), 'utf8')).split('--> statement-breakpoint')) if (statement.trim()) await client.exec(statement); };
    for (const entry of journal.entries.filter((entry) => entry.idx < 10)) await apply(entry.tag);
    await client.exec(`
      INSERT INTO users (id,email,full_name) VALUES ('10000000-0000-4000-8000-000000000001','migration@test.local','Migration');
      INSERT INTO departments (id,name,code) VALUES ('10000000-0000-4000-8000-000000000002','Migration','MIG');
      INSERT INTO academic_programs (id,department_id,name,degree_level,duration_years) VALUES ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','B.Tech','UG',4);
      INSERT INTO batches (id,graduation_year) VALUES ('10000000-0000-4000-8000-000000000004',2027);
      INSERT INTO student_profiles (id,user_id,roll_number,department_id,program_id,batch_id) VALUES ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','MIG-1','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004');
      INSERT INTO career_roadmaps (student_id,target_role) VALUES ('10000000-0000-4000-8000-000000000005','Old goal'),('10000000-0000-4000-8000-000000000005','New goal');
      INSERT INTO learning_resources (id,title,type,url,category,added_by) VALUES ('10000000-0000-4000-8000-000000000006','Guide','article','https://example.test','practice','10000000-0000-4000-8000-000000000001');
      INSERT INTO resource_progress (student_id,resource_id,status) VALUES ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006','completed'),('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006','in_progress');
    `);
    for (const entry of journal.entries.filter((entry) => entry.idx >= 10)) await apply(entry.tag);
    expect((await client.query('SELECT * FROM career_roadmaps')).rows).toHaveLength(2);
    expect((await client.query("SELECT * FROM career_roadmaps WHERE status='active'")).rows).toHaveLength(1);
    expect((await client.query('SELECT * FROM resource_progress')).rows).toHaveLength(1);
    expect((await client.query('SELECT * FROM phase6_legacy_resource_progress')).rows).toHaveLength(1);
  } finally { await client.close(); }
}, 60000);
