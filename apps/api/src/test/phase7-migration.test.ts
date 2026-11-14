import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('successfully applies migration 0012 to upgrade notices and notification types', async () => {
  const client = new PGlite();
  try {
    const folder = fs.existsSync(path.resolve('packages/db/drizzle'))
      ? path.resolve('packages/db/drizzle')
      : path.resolve('../../packages/db/drizzle');
    const journal = JSON.parse(
      await readFile(path.join(folder, 'meta/_journal.json'), 'utf8'),
    ) as { entries: { tag: string; idx: number }[] };

    const apply = async (tag: string) => {
      const sqlContent = await readFile(path.join(folder, `${tag}.sql`), 'utf8');
      for (const statement of sqlContent.split('--> statement-breakpoint')) {
        if (statement.trim()) {
          await client.exec(statement);
        }
      }
    };

    // Apply migrations 0 to 11
    for (const entry of journal.entries.filter((e) => e.idx < 12)) {
      await apply(entry.tag);
    }

    // Insert pre-migration sample data
    await client.exec(`
      INSERT INTO users (id, email, full_name) VALUES ('70000000-0000-4000-8000-000000000001', 'p7staff@test.local', 'Staff Seven');
      INSERT INTO notices (id, title, content, posted_by) VALUES ('70000000-0000-4000-8000-000000000002', 'Old Notice', 'Content', '70000000-0000-4000-8000-000000000001');
    `);

    // Apply migration 12
    const migration12 = journal.entries.find((e) => e.idx === 12);
    expect(migration12).toBeDefined();
    if (migration12) {
      await apply(migration12.tag);
    }

    // Verify existing notice has new default values
    const existingNoticeRes = await client.query<{ status: string; attachments: unknown }>(
      `SELECT status, attachments FROM notices WHERE id = '70000000-0000-4000-8000-000000000002';`,
    );
    expect(existingNoticeRes.rows).toHaveLength(1);
    expect(existingNoticeRes.rows[0]?.status).toBe('published');
    expect(existingNoticeRes.rows[0]?.attachments).toEqual([]);

    // Verify new notice status enum supports 'scheduled'
    await client.exec(`
      INSERT INTO notices (id, title, content, posted_by, status, attachments)
      VALUES (
        '70000000-0000-4000-8000-000000000003',
        'Scheduled Notice',
        'Scheduled content',
        '70000000-0000-4000-8000-000000000001',
        'scheduled',
        '[{"name":"Guide.pdf","url":"https://example.test/guide.pdf"}]'::jsonb
      );
    `);

    const scheduledNoticeRes = await client.query<{ status: string; attachments: unknown }>(
      `SELECT status, attachments FROM notices WHERE id = '70000000-0000-4000-8000-000000000003';`,
    );
    expect(scheduledNoticeRes.rows[0]?.status).toBe('scheduled');

    // Verify new notification_type enum values work
    await client.exec(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (
        '70000000-0000-4000-8000-000000000004',
        '70000000-0000-4000-8000-000000000001',
        'opportunity_deadline',
        'Deadline Approaching',
        '24h left'
      );
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (
        '70000000-0000-4000-8000-000000000005',
        '70000000-0000-4000-8000-000000000001',
        'roadmap_reminder',
        'Roadmap Inactive',
        'Please review roadmap'
      );
    `);

    const notifs = await client.query(
      `SELECT type FROM notifications WHERE user_id = '70000000-0000-4000-8000-000000000001' ORDER BY created_at ASC;`,
    );
    expect(notifs.rows).toHaveLength(2);
    expect(notifs.rows[0]?.type).toBe('opportunity_deadline');
    expect(notifs.rows[1]?.type).toBe('roadmap_reminder');
  } finally {
    await client.close();
  }
}, 60000);
