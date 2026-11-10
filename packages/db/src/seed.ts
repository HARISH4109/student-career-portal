import { and, eq } from 'drizzle-orm';

import { db } from './client';
import { seedCareerCatalog } from './seed-career';
import {
  academicPrograms,
  batches,
  companies,
  departments,
  opportunities,
  opportunityEligibility,
  opportunitySkills,
  permissions,
  rolePermissions,
  roles,
  skills,
} from './schema';

const ROLE_DEFINITIONS = [
  { name: 'STUDENT', description: 'Enrolled student using the portal to find opportunities, build resumes, prepare for placements' },
  { name: 'PLACEMENT_FACULTY', description: 'Training & Placement Officer — manages opportunities, reviews AI drafts, publishes postings, manages eligibility' },
  { name: 'ADMIN', description: 'Full platform administrator — user management, system config, audit logs' },
] as const;

const PERMISSION_DEFINITIONS = [
  // Opportunities
  'opportunities.view',
  'opportunities.create',
  'opportunities.publish',
  'opportunities.edit',
  'opportunities.archive',
  // AI Extraction
  'extraction.submit_source',
  'extraction.review_draft',
  'extraction.approve_draft',
  // Applications
  'applications.apply',
  'applications.view_own',
  'applications.view_all',
  'applications.review',
  'applications.update_status',
  // Students
  'students.view_own_profile',
  'students.edit_own_profile',
  'students.view_all_profiles',
  'students.manage_eligibility',
  // Resumes
  'resumes.manage_own',
  'resumes.view_all',
  // Preparation
  'mock_tests.attempt',
  'mock_tests.view_results_own',
  'mock_tests.manage',
  'mock_interviews.schedule_own',
  'mock_interviews.view_own',
  'resources.view',
  'resources.manage',
  'career_paths.manage',
  // Career AI
  'roadmaps.manage_own',
  'skill_gap.analyze_own',
  'resume_analysis.analyze_own',
  // Engagement
  'notices.view',
  'notices.publish',
  'notifications.view_own',
  'notifications.manage_preferences',
  // Admin
  'admin.manage_users',
  'admin.manage_roles',
  'admin.view_audit_logs',
  'admin.manage_departments',
  'admin.manage_programs',
  'admin.manage_batches',
  'admin.system_config',
  // Analytics
  'analytics.view_own',
  'analytics.view_all',
] as const;

const ROLE_PERMISSION_MAP: Record<(typeof ROLE_DEFINITIONS)[number]['name'], readonly string[]> = {
  STUDENT: [
    'opportunities.view',
    'applications.apply',
    'applications.view_own',
    'students.view_own_profile',
    'students.edit_own_profile',
    'resumes.manage_own',
    'mock_tests.attempt',
    'mock_tests.view_results_own',
    'mock_interviews.schedule_own',
    'mock_interviews.view_own',
    'resources.view',
    'roadmaps.manage_own',
    'skill_gap.analyze_own',
    'resume_analysis.analyze_own',
    'notices.view',
    'notifications.view_own',
    'notifications.manage_preferences',
    'analytics.view_own',
  ],
  PLACEMENT_FACULTY: [
    'opportunities.view',
    'opportunities.create',
    'opportunities.publish',
    'opportunities.edit',
    'opportunities.archive',
    'extraction.submit_source',
    'extraction.review_draft',
    'extraction.approve_draft',
    'applications.view_all',
    'applications.review',
    'applications.update_status',
    'students.view_all_profiles',
    'students.manage_eligibility',
    'resumes.view_all',
    'mock_tests.manage',
    'resources.view',
    'resources.manage',
    'career_paths.manage',
    'notices.view',
    'notices.publish',
    'notifications.view_own',
    'notifications.manage_preferences',
    'analytics.view_all',
  ],
  ADMIN: PERMISSION_DEFINITIONS,
};

// ── Academic Master Data Definitions ─────────────────────────────────────

const DEPARTMENT_DEFINITIONS = [
  { name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science & Engineering' },
  { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology' },
  { name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Department of Electronics & Communication Engineering' },
  { name: 'Artificial Intelligence & Data Science', code: 'AI-DS', description: 'Department of Artificial Intelligence & Data Science' },
  { name: 'Electrical & Electronics Engineering', code: 'EEE', description: 'Department of Electrical & Electronics Engineering' },
  { name: 'Mechanical Engineering', code: 'ME', description: 'Department of Mechanical Engineering' },
  { name: 'Civil Engineering', code: 'CE', description: 'Department of Civil Engineering' },
];

const BATCH_DEFINITIONS = [
  { graduationYear: 2024 },
  { graduationYear: 2025 },
  { graduationYear: 2026 },
  { graduationYear: 2027 },
  { graduationYear: 2028 },
];

const SKILL_DEFINITIONS = [
  // Programming Languages
  { name: 'JavaScript', category: 'programming_language' },
  { name: 'TypeScript', category: 'programming_language' },
  { name: 'Python', category: 'programming_language' },
  { name: 'Java', category: 'programming_language' },
  { name: 'C++', category: 'programming_language' },
  { name: 'C#', category: 'programming_language' },
  { name: 'Go', category: 'programming_language' },
  { name: 'Rust', category: 'programming_language' },
  { name: 'SQL', category: 'programming_language' },
  { name: 'HTML/CSS', category: 'programming_language' },

  // Frontend Frameworks & Libraries
  { name: 'React', category: 'framework' },
  { name: 'Next.js', category: 'framework' },
  { name: 'Vue.js', category: 'framework' },
  { name: 'Angular', category: 'framework' },
  { name: 'Tailwind CSS', category: 'framework' },
  { name: 'Redux Toolkit', category: 'framework' },

  // Backend & Databases
  { name: 'Node.js', category: 'backend' },
  { name: 'Express.js', category: 'framework' },
  { name: 'FastAPI', category: 'framework' },
  { name: 'Django', category: 'framework' },
  { name: 'Spring Boot', category: 'framework' },
  { name: 'PostgreSQL', category: 'database' },
  { name: 'MySQL', category: 'database' },
  { name: 'MongoDB', category: 'database' },
  { name: 'Redis', category: 'database' },

  // Cloud & DevOps
  { name: 'Docker', category: 'devops' },
  { name: 'Kubernetes', category: 'devops' },
  { name: 'AWS', category: 'cloud' },
  { name: 'Google Cloud Platform', category: 'cloud' },
  { name: 'Microsoft Azure', category: 'cloud' },
  { name: 'CI/CD Pipelines', category: 'devops' },
  { name: 'Linux', category: 'devops' },
  { name: 'Git & GitHub', category: 'tools' },

  // AI & Data Science
  { name: 'Machine Learning', category: 'ai_data' },
  { name: 'Deep Learning', category: 'ai_data' },
  { name: 'PyTorch', category: 'ai_data' },
  { name: 'TensorFlow', category: 'ai_data' },
  { name: 'Pandas & NumPy', category: 'ai_data' },

  // Core Concepts
  { name: 'Data Structures & Algorithms', category: 'core_concept' },
  { name: 'System Design', category: 'core_concept' },
  { name: 'REST APIs', category: 'core_concept' },
  { name: 'GraphQL', category: 'core_concept' },
  { name: 'Microservices', category: 'core_concept' },
];

async function seed(): Promise<void> {
  console.warn('Seeding roles...');
  await db
    .insert(roles)
    .values(ROLE_DEFINITIONS.map((role) => ({ name: role.name, description: role.description })))
    .onConflictDoNothing({ target: roles.name })
    .returning();

  const allRoles = await db.select().from(roles);

  console.warn('Seeding permissions...');
  await db
    .insert(permissions)
    .values(PERMISSION_DEFINITIONS.map((key) => ({ key })))
    .onConflictDoNothing({ target: permissions.key })
    .returning();

  const allPermissions = await db.select().from(permissions);

  console.warn('Wiring role -> permission mappings...');
  const permissionsByKey = new Map(allPermissions.map((p) => [p.key, p]));

  for (const role of allRoles) {
    const roleKey = role.name as keyof typeof ROLE_PERMISSION_MAP;
    const permissionKeys = roleKey in ROLE_PERMISSION_MAP ? ROLE_PERMISSION_MAP[roleKey] : [];
    const rows = permissionKeys
      .map((key) => permissionsByKey.get(key))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((permission) => ({ roleId: role.id, permissionId: permission.id }));

    if (rows.length > 0) {
      await db.insert(rolePermissions).values(rows).onConflictDoNothing();
    }
  }

  // ── Seed Departments ──
  console.warn('Seeding academic departments...');
  for (const dept of DEPARTMENT_DEFINITIONS) {
    await db.insert(departments).values(dept).onConflictDoNothing({ target: departments.code });
  }

  const allDepartments = await db.select().from(departments);
  const deptMap = new Map(allDepartments.map((d) => [d.code, d.id]));

  // ── Seed Academic Programs ──
  console.warn('Seeding academic programs...');
  const programDefs = [
    { code: 'CSE', name: 'B.Tech Computer Science & Engineering', degreeLevel: 'B.Tech', durationYears: 4 },
    { code: 'CSE', name: 'M.Tech Computer Science & Engineering', degreeLevel: 'M.Tech', durationYears: 2 },
    { code: 'IT', name: 'B.Tech Information Technology', degreeLevel: 'B.Tech', durationYears: 4 },
    { code: 'ECE', name: 'B.Tech Electronics & Communication', degreeLevel: 'B.Tech', durationYears: 4 },
    { code: 'AI-DS', name: 'B.Tech Artificial Intelligence & Data Science', degreeLevel: 'B.Tech', durationYears: 4 },
    { code: 'EEE', name: 'B.Tech Electrical & Electronics Engineering', degreeLevel: 'B.Tech', durationYears: 4 },
    { code: 'ME', name: 'B.Tech Mechanical Engineering', degreeLevel: 'B.Tech', durationYears: 4 },
    { code: 'CE', name: 'B.Tech Civil Engineering', degreeLevel: 'B.Tech', durationYears: 4 },
  ];

  for (const prog of programDefs) {
    const departmentId = deptMap.get(prog.code);
    if (departmentId) {
      await db.insert(academicPrograms).values({
        departmentId,
        name: prog.name,
        degreeLevel: prog.degreeLevel,
        durationYears: prog.durationYears,
      }).onConflictDoNothing();
    }
  }

  // ── Seed Batches ──
  console.warn('Seeding graduation batches...');
  for (const batch of BATCH_DEFINITIONS) {
    await db.insert(batches).values(batch).onConflictDoNothing({ target: batches.graduationYear });
  }

  // ── Seed Skills ──
  console.warn('Seeding skills catalog...');
  for (const skill of SKILL_DEFINITIONS) {
    await db.insert(skills).values(skill).onConflictDoNothing({ target: skills.name });
  }

  // ── Seed Sample Companies ──
  console.warn('Seeding sample companies...');
  const sampleCompanies = [
    {
      name: 'Google India',
      website: 'https://careers.google.com',
      industry: 'Technology & Internet',
      description: 'Global technology leader specializing in search, cloud, AI, and developer platforms.',
    },
    {
      name: 'Microsoft IDC',
      website: 'https://careers.microsoft.com',
      industry: 'Software & Cloud',
      description: 'Empowering every person and organization on the planet to achieve more with Azure, Office, and AI.',
    },
    {
      name: 'Amazon Development Centre',
      website: 'https://amazon.jobs',
      industry: 'E-commerce & Cloud Computing',
      description: 'Earth’s most customer-centric company, building AWS, Retail, Prime Video, and Alexa.',
    },
    {
      name: 'Razorpay',
      website: 'https://razorpay.com/jobs',
      industry: 'FinTech',
      description: 'Leading full-stack financial solutions company powering digital payments in India.',
    },
    {
      name: 'Tata Consultancy Services',
      website: 'https://tcs.com/careers',
      industry: 'IT Services & Consulting',
      description: 'Global leader in IT services, consulting, and business solutions.',
    },
  ];

  for (const comp of sampleCompanies) {
    const existing = await db.query.companies.findFirst({
      where: eq(companies.name, comp.name),
    });
    if (!existing) {
      await db.insert(companies).values(comp);
    }
  }

  const allComps = await db.select().from(companies);
  const companyMap = new Map(allComps.map((c) => [c.name, c.id]));
  const allSkills = await db.select().from(skills);
  const skillMap = new Map(allSkills.map((s) => [s.name, s.id]));
  const allBatches = await db.select().from(batches);
  const batch2025 = allBatches.find((b) => b.graduationYear === 2025);
  const batch2026 = allBatches.find((b) => b.graduationYear === 2026);
  const cseDept = allDepartments.find((d) => d.code === 'CSE');
  const itDept = allDepartments.find((d) => d.code === 'IT');
  const aidsDept = allDepartments.find((d) => d.code === 'AI-DS');

  // Check if any faculty/admin user exists to attach as postedBy
  const adminOrFacultyUser = await db.query.users.findFirst();

  if (adminOrFacultyUser && companyMap.size > 0) {
    console.warn('Seeding sample opportunities...');

    const sampleOpportunities = [
      {
        companyName: 'Google India',
        title: 'Software Engineer - University Graduate',
        type: 'job' as const,
        description: 'Join Google as a Software Engineer. You will work on core infrastructure, distributed systems, web applications, and machine learning models.',
        workMode: 'hybrid' as const,
        location: 'Bangalore / Hyderabad',
        salaryMin: '2200000',
        salaryMax: '3500000',
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'published' as const,
        skills: ['Data Structures & Algorithms', 'C++', 'Java', 'Python'],
        minCgpa: '8.00',
      },
      {
        companyName: 'Microsoft IDC',
        title: 'Software Development Engineer Intern',
        type: 'internship' as const,
        description: '6-month full-time internship working on Microsoft 365, Azure Cloud Infrastructure, and AI Copilot services.',
        workMode: 'hybrid' as const,
        location: 'Hyderabad / Noida',
        salaryMin: '100000',
        salaryMax: '125000',
        applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Closing soon (5 days)
        status: 'published' as const,
        skills: ['TypeScript', 'React', 'C#', 'REST APIs'],
        minCgpa: '7.50',
      },
      {
        companyName: 'Razorpay',
        title: 'Associate Backend Engineer',
        type: 'job' as const,
        description: 'Design and build high-throughput payment processing APIs, microservices, and fraud detection engines.',
        workMode: 'onsite' as const,
        location: 'Bangalore, India',
        salaryMin: '1600000',
        salaryMax: '2400000',
        applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: 'published' as const,
        skills: ['Node.js', 'Go', 'PostgreSQL', 'Redis'],
        minCgpa: '7.00',
      },
      {
        companyName: 'Amazon Development Centre',
        title: 'Applied Scientist Intern',
        type: 'internship' as const,
        description: 'Research and apply deep learning, computer vision, and NLP architectures to solve real-world customer problems at scale.',
        workMode: 'onsite' as const,
        location: 'Bangalore',
        salaryMin: '110000',
        salaryMax: '150000',
        applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'published' as const,
        skills: ['Python', 'Machine Learning', 'PyTorch', 'Data Structures & Algorithms'],
        minCgpa: '8.50',
      },
    ];

    for (const oppData of sampleOpportunities) {
      const cId = companyMap.get(oppData.companyName);
      if (!cId) continue;

      const existingOpp = await db.query.opportunities.findFirst({
        where: and(
          eq(opportunities.companyId, cId),
          eq(opportunities.title, oppData.title),
        ),
      });
      if (existingOpp) continue;

      const inserted = await db
        .insert(opportunities)
        .values({
          companyId: cId,
          title: oppData.title,
          type: oppData.type,
          description: oppData.description,
          workMode: oppData.workMode,
          location: oppData.location,
          salaryMin: oppData.salaryMin,
          salaryMax: oppData.salaryMax,
          applicationDeadline: oppData.applicationDeadline,
          status: oppData.status,
          postedBy: adminOrFacultyUser.id,
        })
        .returning();

      if (inserted[0]) {
        const oppId = inserted[0].id;

        // Add skills
        for (const sName of oppData.skills) {
          const sId = skillMap.get(sName);
          if (sId) {
            await db
              .insert(opportunitySkills)
              .values({
                opportunityId: oppId,
                skillId: sId,
                isRequired: true,
              })
              .onConflictDoNothing();
          }
        }

        // Add eligibility (CSE, IT, AI-DS, Batches 2025/2026, min CGPA)
        if (cseDept) {
          await db.insert(opportunityEligibility).values({
            opportunityId: oppId,
            departmentId: cseDept.id,
            batchId: batch2025?.id,
            minCgpa: oppData.minCgpa,
          });
        }
        if (itDept) {
          await db.insert(opportunityEligibility).values({
            opportunityId: oppId,
            departmentId: itDept.id,
            batchId: batch2026?.id,
            minCgpa: oppData.minCgpa,
          });
        }
        if (aidsDept) {
          await db.insert(opportunityEligibility).values({
            opportunityId: oppId,
            departmentId: aidsDept.id,
            batchId: batch2025?.id,
            minCgpa: oppData.minCgpa,
          });
        }
      }
    }
  }

  if (process.env.CAREER_SEED_STAFF_USER_ID) await seedCareerCatalog(process.env.CAREER_SEED_STAFF_USER_ID);
  else console.warn('Career catalog skipped: set CAREER_SEED_STAFF_USER_ID to an existing faculty/admin user ID.');
  console.warn('Seed complete with academic departments, programs, batches, skills, companies, and opportunities.');
}

seed()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => process.exit(0));

