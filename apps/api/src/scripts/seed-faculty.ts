import { db, schema } from '@career-portal/db';
import { eq } from 'drizzle-orm';

import { logger } from '@/infrastructure/logger';
import { supabaseAdmin } from '@/infrastructure/supabase';

interface SeedUserConfig {
  email: string;
  password: string;
  fullName: string;
  roleName: 'PLACEMENT_FACULTY' | 'ADMIN';
}

const USERS_TO_SEED: SeedUserConfig[] = [
  {
    email: 'faculty@university.edu',
    password: 'Password@123',
    fullName: 'Placement Officer (Faculty)',
    roleName: 'PLACEMENT_FACULTY',
  },
  {
    email: 'admin@university.edu',
    password: 'Password@123',
    fullName: 'System Administrator',
    roleName: 'ADMIN',
  },
];

async function seedHardcodedUsers(): Promise<void> {
  console.log('Seeding hardcoded faculty & admin users...');

  // 1. Ensure roles exist in DB
  const facultyRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'PLACEMENT_FACULTY'),
  });
  const adminRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'ADMIN'),
  });

  if (!facultyRole || !adminRole) {
    throw new Error('Roles table is missing PLACEMENT_FACULTY or ADMIN. Run npm run db:seed first.');
  }

  const roleMap = {
    PLACEMENT_FACULTY: facultyRole.id,
    ADMIN: adminRole.id,
  };

  for (const userConfig of USERS_TO_SEED) {
    console.log(`\nProvisioning: ${userConfig.email} (${userConfig.roleName})...`);

    let supabaseUserId: string;

    // Check if user exists in Supabase
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingSupabaseUser = userList.users.find((u) => u.email === userConfig.email);

    if (existingSupabaseUser) {
      console.log(`User ${userConfig.email} already exists in Supabase. Updating password...`);
      supabaseUserId = existingSupabaseUser.id;
      await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        password: userConfig.password,
        email_confirm: true,
        user_metadata: { full_name: userConfig.fullName },
      });
    } else {
      console.log(`Creating ${userConfig.email} in Supabase Auth...`);
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: userConfig.email,
        password: userConfig.password,
        email_confirm: true,
        user_metadata: { full_name: userConfig.fullName },
      });

      if (error) {
        logger.error({ err: error }, `Failed to create Supabase user for ${userConfig.email}`);
        throw error;
      }
      supabaseUserId = created.user.id;
    }

    // Insert or update in app-side users table
    await db
      .insert(schema.users)
      .values({
        id: supabaseUserId,
        email: userConfig.email,
        fullName: userConfig.fullName,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: { fullName: userConfig.fullName, email: userConfig.email },
      });

    // Assign role
    const roleId = roleMap[userConfig.roleName];
    await db
      .insert(schema.userRoles)
      .values({
        userId: supabaseUserId,
        roleId,
      })
      .onConflictDoNothing();

    console.log(`✓ ${userConfig.email} successfully configured as ${userConfig.roleName}!`);
  }

  console.log('\n=============================================');
  console.log('HARDCODED CREDENTIALS READY FOR LOGIN:');
  console.log('---------------------------------------------');
  console.log('Faculty Account:');
  console.log('  Email:    faculty@university.edu');
  console.log('  Password: Password@123');
  console.log('---------------------------------------------');
  console.log('Admin Account:');
  console.log('  Email:    admin@university.edu');
  console.log('  Password: Password@123');
  console.log('=============================================\n');
}

seedHardcodedUsers()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Failed to seed hardcoded users:', err);
    process.exit(1);
  });
