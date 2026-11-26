import { db, schema } from '@career-portal/db';
import type { ProficiencyLevel } from '@career-portal/shared-types';
import { and, count, eq, ilike, sql } from 'drizzle-orm';

import { escapeLikePattern } from '@/shared/db/escape-like';

export class StudentRepository {
  async programMatchesDepartment(programId: string, departmentId: string): Promise<boolean> {
    const program = await db.query.academicPrograms.findFirst({ where: and(eq(schema.academicPrograms.id, programId), eq(schema.academicPrograms.departmentId, departmentId)) });
    return Boolean(program);
  }
  async findProfileByUserId(userId: string) {
    return db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, userId),
      with: {
        user: true,
        department: true,
        program: true,
        batch: true,
        studentSkills: {
          with: { skill: true },
        },
      },
    });
  }

  async findProfileById(id: string) {
    return db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.id, id),
      with: {
        user: true,
        department: true,
        program: true,
        batch: true,
        studentSkills: {
          with: { skill: true },
        },
      },
    });
  }

  async createProfile(data: {
    userId: string;
    rollNumber: string;
    departmentId: string;
    programId: string;
    batchId: string;
    cgpa?: number | null | undefined;
    bio?: string | null | undefined;
    linkedinUrl?: string | null | undefined;
    githubUrl?: string | null | undefined;
    portfolioUrl?: string | null | undefined;
    careerInterests?: string[] | undefined;
    projects?: unknown[] | undefined;
    certifications?: unknown[] | undefined;
    achievements?: unknown[] | undefined;
  }) {
    const inserted = await db
      .insert(schema.studentProfiles)
      .values({
        userId: data.userId,
        rollNumber: data.rollNumber,
        departmentId: data.departmentId,
        programId: data.programId,
        batchId: data.batchId,
        cgpa: data.cgpa !== undefined && data.cgpa !== null ? String(data.cgpa) : null,
        bio: data.bio ?? null,
        linkedinUrl: data.linkedinUrl ?? null,
        githubUrl: data.githubUrl ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        careerInterests: data.careerInterests ?? [],
        projects: data.projects ?? [],
        certifications: data.certifications ?? [],
        achievements: data.achievements ?? [],
      })
      .returning();

    if (!inserted[0]) return null;
    return this.findProfileById(inserted[0].id);
  }

  async updateProfile(
    id: string,
    data: {
      rollNumber?: string | undefined;
      departmentId?: string | undefined;
      programId?: string | undefined;
      batchId?: string | undefined;
      cgpa?: number | null | undefined;
      bio?: string | null | undefined;
      linkedinUrl?: string | null | undefined;
      githubUrl?: string | null | undefined;
      portfolioUrl?: string | null | undefined;
      careerInterests?: string[] | undefined;
      projects?: unknown[] | undefined;
      certifications?: unknown[] | undefined;
      achievements?: unknown[] | undefined;
      isPlacementEligible?: boolean | undefined;
    },
  ) {
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.rollNumber !== undefined) updatePayload.rollNumber = data.rollNumber;
    if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
    if (data.programId !== undefined) updatePayload.programId = data.programId;
    if (data.batchId !== undefined) updatePayload.batchId = data.batchId;
    if (data.cgpa !== undefined) updatePayload.cgpa = data.cgpa !== null ? String(data.cgpa) : null;
    if (data.bio !== undefined) updatePayload.bio = data.bio;
    if (data.linkedinUrl !== undefined) updatePayload.linkedinUrl = data.linkedinUrl;
    if (data.githubUrl !== undefined) updatePayload.githubUrl = data.githubUrl;
    if (data.portfolioUrl !== undefined) updatePayload.portfolioUrl = data.portfolioUrl;
    if (data.careerInterests !== undefined) updatePayload.careerInterests = data.careerInterests;
    if (data.projects !== undefined) updatePayload.projects = data.projects;
    if (data.certifications !== undefined) updatePayload.certifications = data.certifications;
    if (data.achievements !== undefined) updatePayload.achievements = data.achievements;
    if (data.isPlacementEligible !== undefined) updatePayload.isPlacementEligible = data.isPlacementEligible;

    await db
      .update(schema.studentProfiles)
      .set(updatePayload)
      .where(eq(schema.studentProfiles.id, id));

    return this.findProfileById(id);
  }

  async addStudentSkill(studentId: string, skillId: string, proficiency: ProficiencyLevel) {
    await db
      .insert(schema.studentSkills)
      .values({
        studentId,
        skillId,
        proficiency,
      })
      .onConflictDoUpdate({
        target: [schema.studentSkills.studentId, schema.studentSkills.skillId],
        set: { proficiency },
      });
  }

  async removeStudentSkill(studentId: string, skillId: string) {
    await db
      .delete(schema.studentSkills)
      .where(
        and(
          eq(schema.studentSkills.studentId, studentId),
          eq(schema.studentSkills.skillId, skillId),
        ),
      );
  }

  async getResumeCount(studentId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(schema.resumes)
      .where(eq(schema.resumes.studentId, studentId));
    return (result[0]?.count ?? 0);
  }

  async listProfiles(
    pagination: { page: number; pageSize: number },
    filters?: {
      search?: string;
      departmentId?: string;
      batchId?: string;
      isPlacementEligible?: boolean;
    },
  ) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (filters?.departmentId) {
      conditions.push(eq(schema.studentProfiles.departmentId, filters.departmentId));
    }
    if (filters?.batchId) {
      conditions.push(eq(schema.studentProfiles.batchId, filters.batchId));
    }
    if (filters?.isPlacementEligible !== undefined) {
      conditions.push(eq(schema.studentProfiles.isPlacementEligible, filters.isPlacementEligible));
    }
    if (filters?.search) {
      conditions.push(
        sql`(${ilike(schema.studentProfiles.rollNumber, `%${escapeLikePattern(filters.search)}%`)})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ total: count() })
      .from(schema.studentProfiles)
      .where(whereClause);
    const total = (countResult[0]?.total ?? 0);

    const profiles = await db.query.studentProfiles.findMany({
      where: whereClause,
      with: {
        user: true,
        department: true,
        program: true,
        batch: true,
        studentSkills: {
          with: { skill: true },
        },
      },
      limit: pageSize,
      offset,
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    return {
      profiles,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
