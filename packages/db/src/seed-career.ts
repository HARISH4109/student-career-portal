import { and, eq, inArray } from 'drizzle-orm';

import { db } from './client';
import {
  careerPaths,
  learningResources,
  resourceCareerPaths,
  resourceSkills,
  roles,
  skills,
  userRoles,
  users,
} from './schema';

const definitions = [
  {
    title: 'Frontend Developer',
    foundation: ['HTML/CSS', 'JavaScript'],
    core: ['TypeScript', 'React'],
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
    project: 'Build an accessible portfolio',
    brief:
      'Create a responsive portfolio with keyboard navigation, validated forms, and a deployed demo.',
  },
  {
    title: 'Backend Developer',
    foundation: ['JavaScript', 'SQL'],
    core: ['Node.js', 'PostgreSQL', 'REST APIs'],
    url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
    project: 'Build a secure REST service',
    brief:
      'Implement authenticated endpoints, relational storage, validation, and integration tests.',
  },
  {
    title: 'Full-Stack Developer',
    foundation: ['HTML/CSS', 'JavaScript'],
    core: ['React', 'Node.js', 'PostgreSQL'],
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
    project: 'Ship a full-stack task manager',
    brief:
      'Connect a responsive interface to an authenticated API and deploy the complete application.',
  },
  {
    title: 'Data Analyst',
    foundation: ['Python', 'SQL'],
    core: ['Pandas', 'Data Visualization'],
    url: 'https://pandas.pydata.org/docs/getting_started/index.html',
    project: 'Analyze a public dataset',
    brief: 'Clean a dataset, write SQL queries, and explain three findings with clear charts.',
  },
  {
    title: 'Data Scientist',
    foundation: ['Python', 'Statistics'],
    core: ['Pandas', 'Machine Learning'],
    url: 'https://scikit-learn.org/stable/getting_started.html',
    project: 'Deliver a reproducible prediction study',
    brief: 'Compare baselines, prevent data leakage, evaluate a model, and document limitations.',
  },
  {
    title: 'ML Engineer',
    foundation: ['Python', 'Machine Learning'],
    core: ['PyTorch', 'Docker'],
    url: 'https://docs.pytorch.org/tutorials/',
    project: 'Serve and monitor an ML model',
    brief: 'Train a model, package an inference endpoint, and test latency and input validation.',
  },
  {
    title: 'Cloud Engineer',
    foundation: ['Linux', 'Networking'],
    core: ['AWS', 'Docker'],
    url: 'https://aws.amazon.com/getting-started/',
    project: 'Design a resilient cloud deployment',
    brief:
      'Document a network and deploy a small service with least-privilege access, logs, and a budget.',
  },
  {
    title: 'Cybersecurity Analyst',
    foundation: ['Linux', 'Networking'],
    core: ['Cybersecurity', 'OWASP'],
    url: 'https://owasp.org/www-project-webgoat/',
    project: 'Write a lab security assessment',
    brief:
      'Use an authorized local lab to identify risks and document evidence, impact, and mitigations.',
  },
  {
    title: 'DevOps Engineer',
    foundation: ['Linux', 'Git'],
    core: ['Docker', 'CI/CD'],
    url: 'https://docs.docker.com/get-started/',
    project: 'Automate a delivery pipeline',
    brief:
      'Build a pipeline with tests, container publishing, health checks, and a documented rollback.',
  },
  {
    title: 'UI/UX Designer',
    foundation: ['User Research', 'Accessibility'],
    core: ['Figma', 'Interaction Design'],
    url: 'https://www.w3.org/WAI/fundamentals/',
    project: 'Create a tested design case study',
    brief:
      'Research a student workflow, prototype key screens, test usability, and explain design decisions.',
  },
];

/** Explicit attribution is mandatory; this function never creates users or roles. */
export async function seedCareerCatalog(staffUserId: string): Promise<void> {
  const staff = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(users.id, staffUserId),
        eq(users.isActive, true),
        inArray(roles.name, ['PLACEMENT_FACULTY', 'ADMIN']),
      ),
    );
  if (!staff.length)
    throw new Error('CAREER_SEED_STAFF_USER_ID must identify an active faculty/admin account');
  await db.transaction(async (tx) => {
    const names = [
      ...new Set(
        definitions.flatMap((role) => [...role.foundation, ...role.core, 'Communication']),
      ),
    ];
    for (const name of names)
      await tx
        .insert(skills)
        .values({ name, category: 'career_preparation' })
        .onConflictDoNothing({ target: skills.name });
    const skillIds = new Map(
      (await tx.select().from(skills)).map((skill) => [skill.name, skill.id]),
    );
    const required = (name: string, proficiency: 'beginner' | 'intermediate' = 'intermediate') => {
      const skillId = skillIds.get(name);
      if (!skillId) throw new Error(`Missing seed skill: ${name}`);
      return { skillId, proficiency };
    };
    for (const role of definitions) {
      const slug = role.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Skip complete existing careers, including their staff-edited resources and stage order.
      if (await tx.query.careerPaths.findFirst({ where: eq(careerPaths.slug, slug) })) continue;
      const resource =
        (
          await tx
            .insert(learningResources)
            .values({
              seedKey: `phase6-${slug}-documentation`,
              title: `${role.title}: learning guide`,
              description:
                'Official learning material. Work through examples and apply the concepts in your project.',
              type: 'documentation',
              url: role.url,
              category: role.title,
              difficulty: 'beginner',
              addedBy: staffUserId,
            })
            .onConflictDoNothing({ target: learningResources.seedKey })
            .returning()
        )[0] ??
        (await tx.query.learningResources.findFirst({
          where: eq(learningResources.seedKey, `phase6-${slug}-documentation`),
        }));
      const stages = [
        {
          title: 'Foundations',
          description: `Build the foundations for ${role.title}.`,
          skills: role.foundation.map((name) => required(name, 'beginner')),
          activities: [
            {
              type: 'practice',
              title: 'Practice the foundations',
              description: 'Complete three small exercises and explain your solutions.',
            },
          ],
        },
        {
          title: 'Core skills',
          description: 'Work through the guide and practice the tools used in this career.',
          skills: role.core.map((name) => required(name)),
          activities: [
            {
              type: 'practice',
              title: 'Apply core concepts',
              description:
                'Build a focused example using each core skill and document what you learned.',
            },
          ],
        },
        {
          title: 'Applied project',
          description: role.brief,
          skills: role.core.map((name) => required(name)),
          activities: [{ type: 'project', title: role.project, description: role.brief }],
        },
        {
          title: 'Placement preparation',
          description:
            'Explain your project, review your resume, and practice role-specific interviews.',
          skills: [required('Communication')],
          activities: [
            {
              type: 'practice',
              title: 'Prepare a project walkthrough',
              description:
                'Explain your decisions, tradeoffs, and outcomes; then practice an interview in Preparation.',
            },
          ],
        },
      ].map((stage) => ({ ...stage, isActive: true, resourceIds: [resource.id] }));
      const [path] = await tx
        .insert(careerPaths)
        .values({
          title: role.title,
          slug,
          description: `A practical preparation path for becoming a ${role.title}.`,
          isActive: true,
          stages,
          createdBy: staffUserId,
        })
        .returning();
      await tx
        .insert(resourceCareerPaths)
        .values({ resourceId: resource.id, careerPathId: path.id });
      await tx
        .insert(resourceSkills)
        .values(
          [...new Set([...role.foundation, ...role.core])].map((name) => ({
            resourceId: resource.id,
            skillId: required(name).skillId,
          })),
        );
    }
  });
}
