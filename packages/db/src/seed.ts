import { and, eq } from 'drizzle-orm';

import { db } from './client';
import { seedCareerCatalog } from './seed-career';
import {
  academicPrograms,
  academicStreams,
  batches,
  companies,
  departments,
  notices,
  opportunities,
  opportunityEligibility,
  opportunitySkills,
  permissions,
  rolePermissions,
  roles,
  skills,
  userRoles,
  users,
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
    { code: 'CSE', name: 'Master of Computer Applications (MCA)', degreeLevel: 'MCA', durationYears: 2 },
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

  // ── Seed Academic Streams for CSE Programs ──
  console.warn('Seeding academic streams...');
  const allPrograms = await db.select().from(academicPrograms);
  const cseDeptId = deptMap.get('CSE');
  const btechCse = allPrograms.find((p) => p.name.includes('B.Tech') && p.departmentId === cseDeptId);
  const mtechCse = allPrograms.find((p) => p.name.includes('M.Tech') && p.departmentId === cseDeptId);
  const mcaProg = allPrograms.find((p) => p.name.includes('MCA') && p.departmentId === cseDeptId);

  const streamDefs = [
    ...(btechCse
      ? [
          { programId: btechCse.id, name: 'Computer Science and Engineering (Core)', code: 'CSE-CORE' },
          { programId: btechCse.id, name: 'Artificial Intelligence & Data Science', code: 'AI-DS' },
          { programId: btechCse.id, name: 'Data Analytics', code: 'DA' },
          { programId: btechCse.id, name: 'Cyber Security', code: 'CSE-CS' },
        ]
      : []),
    ...(mtechCse
      ? [
          { programId: mtechCse.id, name: 'Data Science & Engineering', code: 'DSE' },
          { programId: mtechCse.id, name: 'Advanced Computing', code: 'AC' },
        ]
      : []),
    ...(mcaProg
      ? [
          { programId: mcaProg.id, name: 'Application Development', code: 'AD' },
          { programId: mcaProg.id, name: 'Cloud Computing & DevOps', code: 'CCD' },
        ]
      : []),
  ];

  for (const stream of streamDefs) {
    await db.insert(academicStreams).values(stream).onConflictDoNothing();
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

  // ── Seed 8 Realistic CSE Notices ──
  console.warn('Seeding realistic CSE notices...');
  let posterStaff = await db.query.users.findFirst({
    where: eq(users.isActive, true),
  });

  if (!posterStaff) {
    const [facultyRole] = await db.select().from(roles).where(eq(roles.name, 'PLACEMENT_FACULTY'));
    const [newStaff] = await db
      .insert(users)
      .values({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'tpo.cse@institution.edu',
        fullName: 'Prof. K. Ramanathan (TPO CSE)',
        isActive: true,
      })
      .returning();

    posterStaff = newStaff;
    if (newStaff && facultyRole) {
      await db
        .insert(userRoles)
        .values({
          userId: newStaff.id,
          roleId: facultyRole.id,
        })
        .onConflictDoNothing();
    }
  }

  const cseDeptRow = allDepartments.find((d) => d.code === 'CSE');
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const cseNoticesData = [
    {
      title: 'Smart India Hackathon (SIH) 2026 - Internal College Hackathon & CSE Shortlisting',
      content:
        'The Department of Computer Science & Engineering is organizing the Internal College Hackathon to nominate top teams for Smart India Hackathon (SIH) 2026. Teams of 6 students (with mandatory female representation of at least one member) can select problem statements from Smart Automation, Clean Energy, Healthcare, and Cyber Security. Internal jury evaluations will take place on March 22-23, 2026 at Turing Computing Lab. Top 35 teams will receive institutional funding and mentor support.',
      category: 'event' as const,
      priority: 'urgent',
      isPinned: true,
      posterUrl:
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://sih.gov.in/',
      attachments: [
        {
          name: 'SIH_2026_Problem_Statements.pdf',
          url: 'https://sih.gov.in/guidelines.pdf',
          size: 245000,
        },
      ],
      daysAgo: 1,
      daysAhead: 45,
    },
    {
      title: 'HackCSE 2026: 36-Hour National Flagship Hackathon',
      content:
        'Join us for HackCSE 2026, our annual 36-hour non-stop hackathon bringing together over 500 developers from across the nation! Tracks include Generative AI Agents, Web3 & Decentralized Tech, Developer Tooling, and IoT/Hardware. Cash prize pool of INR 3,00,000, cloud credits from AWS and Google Cloud, plus direct interview opportunities with sponsoring engineering firms. Free food, swag, and sleep pods provided.',
      category: 'event' as const,
      priority: 'high',
      isPinned: true,
      posterUrl:
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://hackcse2026.devpost.com',
      attachments: [
        {
          name: 'HackCSE_Rulebook_and_Schedule.pdf',
          url: 'https://hackcse.institution.edu/rulebook.pdf',
          size: 184000,
        },
      ],
      daysAgo: 2,
      daysAhead: 60,
    },
    {
      title: 'National Conference on AI, Cloud Computing & Distributed Systems (NCACDS 2026)',
      content:
        'NCACDS 2026 invites undergraduate and postgraduate students to submit original research papers in machine learning, distributed systems, and cloud infrastructure. Accepted papers will be featured in conference proceedings and submitted for IEEE/Springer indexing. Tracks include LLM architectures, consensus protocols, privacy-preserving machine learning, and serverless computing. Full paper submission deadline: April 15, 2026.',
      category: 'academic' as const,
      priority: 'medium',
      isPinned: false,
      posterUrl:
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://cse-symposium.institution.edu/2026/register',
      attachments: [
        {
          name: 'NCACDS_Paper_Template.pdf',
          url: 'https://cse-symposium.institution.edu/template.pdf',
          size: 312000,
        },
      ],
      daysAgo: 3,
      daysAhead: 65,
    },
    {
      title: 'Annual Department Tech Fest & Project Symposium: CYBERFEST 2026',
      content:
        'Department of CSE presents CYBERFEST 2026! Two days of competitive technical events including: (1) Reverse Engineering & Binary Exploitation Challenge, (2) Speed Algorithmic Coding Showdown, (3) UI/UX Designathon, and (4) Open Innovation Project Exhibition. Open to all engineering students. Total prizes worth INR 1,50,000.',
      category: 'event' as const,
      priority: 'medium',
      isPinned: false,
      posterUrl:
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://cyberfest.institution.edu',
      attachments: [
        {
          name: 'CYBERFEST_Schedule.pdf',
          url: 'https://cyberfest.institution.edu/schedule.pdf',
          size: 156000,
        },
      ],
      daysAgo: 4,
      daysAhead: 30,
    },
    {
      title: 'Industry Keynote: Architecting Scalable Distributed Systems at Global Scale',
      content:
        'Distinguished Guest Lecture by Dr. Aris Thorne, Principal Staff Engineer at Google Systems Infrastructure. Topics covered: high-throughput Paxos/Raft consensus, active-active multi-region database replication, fault tolerance at billions of QPS, and architectural insights from Google Spanner and Borg. Date: Friday, March 20, 2026 at 3:00 PM IST in Dr. APJ Abdul Kalam Auditorium. Live stream link available for registered participants.',
      category: 'academic' as const,
      priority: 'high',
      isPinned: false,
      posterUrl:
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://meet.google.com/cse-industry-keynote-2026',
      attachments: [
        {
          name: 'Keynote_Overview_and_Speaker_Bio.pdf',
          url: 'https://institution.edu/speakers/aris-thorne.pdf',
          size: 98000,
        },
      ],
      daysAgo: 5,
      daysAhead: 15,
    },
    {
      title: 'Hands-on Technical Workshop: Mastering Generative AI, RAG & LLMOps',
      content:
        'Intensive 2-day technical bootcamp hosted by the CSE ACM Student Chapter. Build production-grade Retrieval-Augmented Generation (RAG) applications using LangChain, LlamaIndex, pgvector, and open-weights models (Llama 3 & Mistral 7B). Includes setting up CI/CD pipelines, evaluation metrics, and LLM observability with LangSmith. Free GPU compute access provided for all participants. Prerequisites: Python proficiency.',
      category: 'academic' as const,
      priority: 'high',
      isPinned: false,
      posterUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://workshops.institution.edu/cse-genai-2026',
      attachments: [
        {
          name: 'Workshop_Prerequisites_and_Syllabus.pdf',
          url: 'https://workshops.institution.edu/syllabus.pdf',
          size: 142000,
        },
      ],
      daysAgo: 6,
      daysAhead: 20,
    },
    {
      title: 'ACM-ICPC Collegiate Programming Bootcamp & Intra-College Contest',
      content:
        'Gear up for the International Collegiate Programming Contest (ICPC)! The CSE Competitive Programming Club is holding an 8-week structured bootcamp covering advanced graph algorithms, segment trees with lazy propagation, dynamic programming on trees, and max-flow networks. The top 5 performing teams in the intra-college contest will receive full department sponsorship for the ICPC Amritapuri/Kanpur Regional Contest.',
      category: 'academic' as const,
      priority: 'high',
      isPinned: false,
      posterUrl:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://codeforces.com/group/institution-cse-contest',
      attachments: [
        {
          name: 'Bootcamp_Curriculum.pdf',
          url: 'https://codeforces.com/institution-curriculum.pdf',
          size: 120000,
        },
      ],
      daysAgo: 7,
      daysAhead: 40,
    },
    {
      title: 'Undergraduate Research Fellowship (URF 2026): Summer Research Labs Call',
      content:
        'Applications are invited from 2nd and 3rd year CSE and AI-DS students for the 8-week paid Undergraduate Research Fellowship during Summer 2026. Fellows work directly with faculty and PhD candidates in departmental labs: (1) NLP & Multimodal AI Lab, (2) Cyber Security & Cryptography Center, (3) High-Performance Cloud Computing Lab, and (4) Autonomous Systems Lab. Monthly stipend: INR 25,000. Selected research will be guided towards Tier-1 conference publications.',
      category: 'academic' as const,
      priority: 'medium',
      isPinned: false,
      posterUrl:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
      actionUrl: 'https://research.institution.edu/cse/urf-2026-apply',
      attachments: [
        {
          name: 'URF_Lab_Descriptions_and_Faculty_Mentors.pdf',
          url: 'https://research.institution.edu/urf-2026-labs.pdf',
          size: 210000,
        },
      ],
      daysAgo: 8,
      daysAhead: 50,
    },
  ];

  if (posterStaff) {
    for (const noticeData of cseNoticesData) {
      const existing = await db.query.notices.findFirst({
        where: eq(notices.title, noticeData.title),
      });

      if (!existing) {
        await db.insert(notices).values({
          title: noticeData.title,
          content: noticeData.content,
          category: noticeData.category,
          status: 'published',
          publishedAt: new Date(now - noticeData.daysAgo * dayMs),
          postedBy: posterStaff.id,
          targetAudience: { priority: noticeData.priority },
          targetDepartmentId: cseDeptRow?.id ?? null,
          posterUrl: noticeData.posterUrl,
          actionUrl: noticeData.actionUrl,
          attachments: noticeData.attachments,
          isPinned: noticeData.isPinned,
          expiresAt: new Date(now + noticeData.daysAhead * dayMs),
        });
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

