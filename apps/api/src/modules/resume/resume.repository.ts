import { db, schema } from '@career-portal/db';
import type { ResumeContent } from '@career-portal/shared-types';
import { and, desc, eq } from 'drizzle-orm';

import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

export class ResumeRepository {
  async findResumesByStudentId(studentId: string) {
    return db.query.resumes.findMany({
      where: eq(schema.resumes.studentId, studentId),
      orderBy: (resumes, { desc }) => [desc(resumes.updatedAt)],
    });
  }

  async findResumeById(id: string) {
    return db.query.resumes.findFirst({
      where: eq(schema.resumes.id, id),
      with: {
        student: {
          with: { user: true },
        },
      },
    });
  }

  async createResume(data: {
    studentId: string;
    title: string;
    templateId?: string | undefined;
    content: ResumeContent;
    fileUrl?: string | null | undefined;
    version?: number | undefined;
    isPrimary?: boolean | undefined;
  }) {
    // If primary, unset other primaries first in transaction
    return db.transaction(async (tx) => {
      await tx.select({ id: schema.studentProfiles.id }).from(schema.studentProfiles).where(eq(schema.studentProfiles.id, data.studentId)).for('update');
      if (data.isPrimary) {
        await tx
          .update(schema.resumes)
          .set({ isPrimary: false })
          .where(eq(schema.resumes.studentId, data.studentId));
      }

      const inserted = await tx
        .insert(schema.resumes)
        .values({
          studentId: data.studentId,
          title: data.title,
          templateId: data.templateId ?? 'modern',
          content: data.content,
          fileUrl: data.fileUrl ?? null,
          version: data.version ?? 1,
          isPrimary: data.isPrimary ?? false,
        })
        .returning();

      if (!inserted[0]) throw new Error('Insert did not return a record');
      return inserted[0];
    });
  }

  async updateResume(
    id: string,
    studentId: string,
    data: {
      title?: string | undefined;
      templateId?: string | undefined;
      content?: ResumeContent | undefined;
      fileUrl?: string | null | undefined;
      version?: number | undefined;
      isPrimary?: boolean | undefined;
    },
  ) {
    return db.transaction(async (tx) => {
      await tx.select({ id: schema.studentProfiles.id }).from(schema.studentProfiles).where(eq(schema.studentProfiles.id, studentId)).for('update');
      if (data.isPrimary) {
        await tx
          .update(schema.resumes)
          .set({ isPrimary: false })
          .where(eq(schema.resumes.studentId, studentId));
      }

      const updatePayload: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.templateId !== undefined) updatePayload.templateId = data.templateId;
      if (data.content !== undefined) updatePayload.content = data.content;
      if (data.fileUrl !== undefined) updatePayload.fileUrl = data.fileUrl;
      if (data.version !== undefined) updatePayload.version = data.version;
      if (data.isPrimary !== undefined) updatePayload.isPrimary = data.isPrimary;

      const updated = await tx
        .update(schema.resumes)
        .set(updatePayload)
        .where(eq(schema.resumes.id, id))
        .returning();

      if (!updated[0]) throw new NotFoundError('Resume');
      return updated[0];
    });
  }

  async setPrimaryResume(studentId: string, resumeId: string) {
    return db.transaction(async (tx) => {
      await tx.select({ id: schema.studentProfiles.id }).from(schema.studentProfiles).where(eq(schema.studentProfiles.id, studentId)).for('update');
      // Unset all primaries for this student
      await tx
        .update(schema.resumes)
        .set({ isPrimary: false })
        .where(eq(schema.resumes.studentId, studentId));

      // Set target as primary
      const updated = await tx
        .update(schema.resumes)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(and(eq(schema.resumes.id, resumeId), eq(schema.resumes.studentId, studentId)))
        .returning();

      if (!updated[0]) throw new NotFoundError('Resume');
      return updated[0];
    });
  }

  async deleteResume(id: string, studentId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.select({ id: schema.studentProfiles.id }).from(schema.studentProfiles)
        .where(eq(schema.studentProfiles.id, studentId)).for('update');
      const application = await tx.query.opportunityApplications.findFirst({ where: eq(schema.opportunityApplications.resumeId, id) });
      if (application) throw new ConflictError('This resume is attached to an application and must be retained');
      const [deleted] = await tx.delete(schema.resumes).where(and(eq(schema.resumes.id, id), eq(schema.resumes.studentId, studentId))).returning();
      if (!deleted) throw new NotFoundError('Resume');
      if (deleted.isPrimary) {
        const replacement = await tx.query.resumes.findFirst({ where: eq(schema.resumes.studentId, studentId), orderBy: [desc(schema.resumes.createdAt)] });
        if (replacement) await tx.update(schema.resumes).set({ isPrimary: true, updatedAt: new Date() }).where(eq(schema.resumes.id, replacement.id));
      }
    });
  }

  async saveAnalysis(data: {
    resumeId: string;
    overallScore: number;
    atsScore: number;
    skillScore: number;
    keywordScore: number;
    formatScore: number;
    missingSkills: string[];
    improvementSuggestions: unknown[];
    aiInsights?: string[] | undefined;
    aiSummaryRewrite?: string | null | undefined;
    modelVersion?: string | undefined;
  }) {
    const inserted = await db
      .insert(schema.resumeAnalyses)
      .values({
        resumeId: data.resumeId,
        overallScore: String(data.overallScore),
        atsScore: String(data.atsScore),
        skillScore: String(data.skillScore),
        keywordScore: String(data.keywordScore),
        formatScore: String(data.formatScore),
        missingSkills: data.missingSkills,
        improvementSuggestions: data.improvementSuggestions,
        aiInsights: data.aiInsights ?? [],
        aiSummaryRewrite: data.aiSummaryRewrite ?? null,
        modelVersion: data.modelVersion ?? 'v1.0',
      })
      .returning();

    if (!inserted[0]) throw new Error('Insert did not return a record');
      return inserted[0];
  }

  async getAnalysesByResumeId(resumeId: string) {
    return db.query.resumeAnalyses.findMany({
      where: eq(schema.resumeAnalyses.resumeId, resumeId),
      orderBy: [desc(schema.resumeAnalyses.analyzedAt)],
    });
  }
}
