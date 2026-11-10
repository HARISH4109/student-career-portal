import { db, schema } from '@career-portal/db';
import { extractedEligibilitySchema, type ApproveDraftDto } from '@career-portal/shared-types';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';

import { validateCompensation } from './validate-compensation';

import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

/**
 * Data-access layer for the AI extraction pipeline entities:
 * `opportunity_sources`, `ai_extraction_runs`, and `opportunity_drafts`.
 *
 * Follows the same patterns as OpportunityRepository — thin wrappers around
 * Drizzle queries with no business logic.
 */
export class OpportunityDraftRepository {
  async startRetry(id: string, previousRunId: string) {
    return db.transaction(async (tx) => {
      const [draft] = await tx.select().from(schema.opportunityDrafts).where(eq(schema.opportunityDrafts.id, id)).for('update');
      if (!draft) throw new NotFoundError('Draft');
      const previousRun = await tx.query.aiExtractionRuns.findFirst({ where: eq(schema.aiExtractionRuns.id, draft.extractionRunId) });
      if (draft.extractionRunId !== previousRunId || previousRun?.status !== 'failed' || ['approved', 'published', 'rejected'].includes(draft.status)) {
        throw new ConflictError('This extraction cannot be retried or another retry is already running.');
      }
      const [run] = await tx.insert(schema.aiExtractionRuns).values({ sourceId: previousRun.sourceId, status: 'processing' }).returning();
      if (!run) throw new Error('Failed to create retry run');
      await tx.update(schema.opportunityDrafts).set({ extractionRunId: run.id, updatedAt: new Date() }).where(eq(schema.opportunityDrafts.id, id));
      await tx.update(schema.opportunitySources).set({ status: 'processing', updatedAt: new Date() }).where(eq(schema.opportunitySources.id, previousRun.sourceId));
      return run;
    });
  }
  async approve(id: string, dto: ApproveDraftDto, reviewerId: string, expectedUpdatedAt: Date) {
    await db.transaction(async (tx) => {
      const [draft] = await tx.select().from(schema.opportunityDrafts)
        .where(eq(schema.opportunityDrafts.id, id)).for('update');
      if (!draft) throw new NotFoundError('Draft');
      const run = await tx.query.aiExtractionRuns.findFirst({ where: eq(schema.aiExtractionRuns.id, draft.extractionRunId) });
      if (run?.status === 'processing' || run?.status === 'queued') throw new ConflictError('Wait for extraction to finish before approval.');
      if (draft.updatedAt.getTime() !== expectedUpdatedAt.getTime() || ['approved', 'published', 'rejected'].includes(draft.status)) {
        throw new ConflictError('This draft changed during review. Reload it before approving.');
      }
      if (!draft.title || !draft.companyName || !draft.type || !draft.description) throw new ValidationError('Complete the required draft fields before approval.');
      validateCompensation(draft.salaryMin === null ? null : Number(draft.salaryMin), draft.salaryMax === null ? null : Number(draft.salaryMax));
      if (dto.publishImmediately && draft.applicationDeadline && draft.applicationDeadline <= new Date()) throw new ValidationError('The application deadline must be in the future.');
      const raw = typeof draft.extractedEligibility === 'object' && draft.extractedEligibility !== null
        ? draft.extractedEligibility as Record<string, unknown> : {};
      const eligibility = extractedEligibilitySchema.parse(raw);
      let companyId = dto.companyId;
      if (!companyId) {
        const existing = await tx.query.companies.findFirst({ where: eq(schema.companies.name, draft.companyName) });
        const company = existing ?? (await tx.insert(schema.companies).values({ name: draft.companyName }).returning())[0];
        if (!company) throw new Error('Failed to resolve company');
        companyId = company.id;
      }
      const [opportunity] = await tx.insert(schema.opportunities).values({
        companyId, title: draft.title, type: draft.type, description: draft.description,
        workMode: raw.workMode === 'remote' || raw.workMode === 'hybrid' ? raw.workMode : 'onsite',
        location: draft.location, salaryMin: draft.salaryMin, salaryMax: draft.salaryMax,
        applicationDeadline: draft.applicationDeadline,
        applyUrl: typeof raw.applyUrl === 'string' ? raw.applyUrl : null,
        applicationEmail: typeof raw.applicationEmail === 'string' ? raw.applicationEmail : null,
        status: dto.publishImmediately ? 'published' : 'draft', postedBy: reviewerId, sourceDraftId: id,
      }).returning();
      if (!opportunity) throw new Error('Failed to create opportunity');
      const skillInputs = dto.skills ? [...dto.skills] : [];
      if (dto.skills === undefined && Array.isArray(draft.extractedSkills)) {
        for (const name of draft.extractedSkills) {
          if (typeof name !== 'string' || !name.trim()) continue;
          await tx.insert(schema.skills).values({ name: name.trim(), category: 'technical' }).onConflictDoNothing();
          const skill = await tx.query.skills.findFirst({ where: eq(schema.skills.name, name.trim()) });
          if (skill) skillInputs.push({ skillId: skill.id, isRequired: true });
        }
      }
      for (const skill of skillInputs) await tx.insert(schema.opportunitySkills).values({ opportunityId: opportunity.id, ...skill }).onConflictDoNothing();
      const criteria = dto.eligibility ? [...dto.eligibility] : [];
      if (dto.eligibility === undefined) {
        const departments: (string | null)[] = [];
        for (const code of eligibility.departmentCodes) {
          const trimmed = typeof code === 'string' ? code.trim() : '';
          if (!trimmed) continue;
          const department = await tx.query.departments.findFirst({
            where: or(
              eq(schema.departments.code, trimmed),
              ilike(schema.departments.code, trimmed),
              ilike(schema.departments.name, `%${trimmed}%`),
            ),
          });
          if (department) {
            departments.push(department.id);
          }
        }
        const batches: (string | null)[] = [];
        for (const year of eligibility.allowedBatches) {
          const numYear = year;
          if (isNaN(numYear)) continue;
          let batch = await tx.query.batches.findFirst({ where: eq(schema.batches.graduationYear, numYear) });
          if (!batch) {
            const [created] = await tx
              .insert(schema.batches)
              .values({ graduationYear: numYear })
              .onConflictDoNothing()
              .returning();
            batch = created ?? (await tx.query.batches.findFirst({ where: eq(schema.batches.graduationYear, numYear) }));
          }
          if (batch) {
            batches.push(batch.id);
          }
        }
        if (departments.length || batches.length || eligibility.minCgpa !== null) {
          for (const departmentId of departments.length ? departments : [null]) {
            for (const batchId of batches.length ? batches : [null]) criteria.push({ departmentId, batchId, minCgpa: eligibility.minCgpa });
          }
        }
      }
      for (const criterion of criteria) await tx.insert(schema.opportunityEligibility).values({
        opportunityId: opportunity.id, departmentId: criterion.departmentId ?? null,
        programId: criterion.programId ?? null, batchId: criterion.batchId ?? null,
        minCgpa: criterion.minCgpa != null ? String(criterion.minCgpa) : null,
      });
      await tx.update(schema.opportunityDrafts).set({ status: 'approved', resultingOpportunityId: opportunity.id, reviewedBy: reviewerId, updatedAt: new Date() }).where(eq(schema.opportunityDrafts.id, id));
      await tx.insert(schema.auditLogs).values({ userId: reviewerId, action: 'draft.approved', entityType: 'opportunity_draft', entityId: id, metadata: { resultingOpportunityId: opportunity.id } });
    });
    return this.findDraftById(id);
  }
  // ── Source CRUD ──────────────────────────────────────────────────────────

  async createSource(data: {
    sourceType: 'email' | 'pdf' | 'image' | 'text' | 'url' | 'manual';
    rawContent: string;
    contentHash?: string;
    fileName?: string | undefined;
    mimeType?: string | undefined;
    submittedBy: string;
    status?: string;
  }) {
    const inserted = await db
      .insert(schema.opportunitySources)
      .values({
        sourceType: data.sourceType,
        rawContent: data.rawContent,
        contentHash: data.contentHash ?? null,
        fileName: data.fileName ?? null,
        mimeType: data.mimeType ?? null,
        submittedBy: data.submittedBy,
        status: data.status ?? 'pending',
      })
      .returning();

    return inserted[0] ?? null;
  }

  async updateSourceStatus(id: string, status: string) {
    await db
      .update(schema.opportunitySources)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.opportunitySources.id, id));
  }

  async findSourceById(id: string) {
    return db.query.opportunitySources.findFirst({
      where: eq(schema.opportunitySources.id, id),
    });
  }

  // ── Extraction Run CRUD ─────────────────────────────────────────────────

  async createExtractionRun(data: {
    sourceId: string;
    status?: 'queued' | 'processing' | 'completed' | 'failed';
    modelUsed?: string | null;
  }) {
    const inserted = await db
      .insert(schema.aiExtractionRuns)
      .values({
        sourceId: data.sourceId,
        status: data.status ?? 'queued',
        modelUsed: data.modelUsed ?? null,
      })
      .returning();

    return inserted[0] ?? null;
  }

  async updateExtractionRun(
    id: string,
    data: Partial<{
      status: 'queued' | 'processing' | 'completed' | 'failed';
      modelUsed: string | null;
      confidenceScore: string | null;
      durationMs: number | null;
      errorMessage: string | null;
    }>,
  ) {
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      updatePayload[key] = value;
    }

    await db
      .update(schema.aiExtractionRuns)
      .set(updatePayload)
      .where(eq(schema.aiExtractionRuns.id, id));
  }

  async findExtractionRunById(id: string) {
    return db.query.aiExtractionRuns.findFirst({
      where: eq(schema.aiExtractionRuns.id, id),
      with: { source: true },
    });
  }

  // ── Draft CRUD ──────────────────────────────────────────────────────────

  async createDraft(data: {
    extractionRunId: string;
    status?: 'extracted' | 'pending_review' | 'needs_correction' | 'approved' | 'rejected' | 'published';
    title?: string | null;
    companyName?: string | null;
    type?: 'job' | 'internship' | null;
    description?: string | null;
    location?: string | null;
    workMode?: 'remote' | 'onsite' | 'hybrid';
    salaryMin?: string | null;
    salaryMax?: string | null;
    extractedSkills?: unknown;
    extractedEligibility?: unknown;
    applicationDeadline?: Date | null;
    applyUrl?: string | null;
    applicationEmail?: string | null;
  }) {
    const rawEligibility =
      typeof data.extractedEligibility === 'object' && data.extractedEligibility !== null
        ? (data.extractedEligibility as Record<string, unknown>)
        : {};
    const eligibilityWithContacts = {
      ...rawEligibility,
      ...(data.workMode !== undefined ? { workMode: data.workMode } : {}),
      ...(data.applyUrl ? { applyUrl: data.applyUrl } : {}),
      ...(data.applicationEmail ? { applicationEmail: data.applicationEmail } : {}),
    };

    const inserted = await db
      .insert(schema.opportunityDrafts)
      .values({
        extractionRunId: data.extractionRunId,
        status: data.status ?? 'pending_review',
        title: data.title ?? null,
        companyName: data.companyName ?? null,
        type: data.type ?? null,
        description: data.description ?? null,
        location: data.location ?? null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        extractedSkills: data.extractedSkills ?? [],
        extractedEligibility: eligibilityWithContacts,
        applicationDeadline: data.applicationDeadline ?? null,
      })
      .returning();

    return inserted[0] ?? null;
  }

  async findDraftById(id: string) {
    return db.query.opportunityDrafts.findFirst({
      where: eq(schema.opportunityDrafts.id, id),
      with: {
        extractionRun: {
          with: { source: true },
        },
        reviewedByUser: true,
      },
    });
  }

  async listDrafts(params: {
    page: number;
    pageSize: number;
    status?: typeof schema.opportunityDrafts.$inferSelect.status | undefined;
    sortBy?: 'newest' | 'oldest';
  }) {
    const { page, pageSize, status, sortBy = 'newest' } = params;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (status) {
      conditions.push(eq(schema.opportunityDrafts.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy =
      sortBy === 'oldest'
        ? asc(schema.opportunityDrafts.createdAt)
        : desc(schema.opportunityDrafts.createdAt);

    const [drafts, totalResult] = await Promise.all([
      db.query.opportunityDrafts.findMany({
        where: whereClause,
        orderBy,
        limit: pageSize,
        offset,
        with: {
          extractionRun: {
            with: { source: true },
          },
          reviewedByUser: true,
        },
      }),
      db
        .select({ count: count() })
        .from(schema.opportunityDrafts)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      drafts,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async updateDraft(
    id: string,
    data: Partial<{
      extractionRunId: string;
      status: 'extracted' | 'pending_review' | 'needs_correction' | 'approved' | 'rejected' | 'published';
      title: string | null;
      companyName: string | null;
      type: 'job' | 'internship' | null;
      description: string | null;
      location: string | null;
      workMode: 'remote' | 'onsite' | 'hybrid';
      salaryMin: string | null;
      salaryMax: string | null;
      extractedSkills: unknown;
      extractedEligibility: unknown;
      applicationDeadline: Date | null;
      applyUrl: string | null;
      applicationEmail: string | null;
      resultingOpportunityId: string | null;
      reviewedBy: string | null;
      reviewNotes: string | null;
    }>,
  ) {
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(schema.opportunityDrafts)
        .where(eq(schema.opportunityDrafts.id, id)).for('update');
      if (!existing) return;
      validateCompensation(data.salaryMin !== undefined ? data.salaryMin === null ? null : Number(data.salaryMin) : existing.salaryMin === null ? null : Number(existing.salaryMin), data.salaryMax !== undefined ? data.salaryMax === null ? null : Number(data.salaryMax) : existing.salaryMax === null ? null : Number(existing.salaryMax));
      if (['approved', 'published', 'rejected'].includes(existing.status)) throw new ConflictError('This draft is already finalized.');
      const { workMode, applyUrl, applicationEmail, ...columns } = data;
      const previous = typeof existing.extractedEligibility === 'object' && existing.extractedEligibility !== null
        ? existing.extractedEligibility as Record<string, unknown> : {};
      const incoming = typeof data.extractedEligibility === 'object' && data.extractedEligibility !== null
        ? data.extractedEligibility as Record<string, unknown> : {};
      await tx.update(schema.opportunityDrafts).set({
        ...columns,
        extractedEligibility: {
          ...previous, ...incoming,
          ...(workMode !== undefined ? { workMode } : {}),
          ...(applyUrl !== undefined ? { applyUrl } : {}),
          ...(applicationEmail !== undefined ? { applicationEmail } : {}),
        },
        updatedAt: new Date(),
      }).where(eq(schema.opportunityDrafts.id, id));
    });

    return this.findDraftById(id);
  }

  /** Count drafts by status — used for badge counts in the UI */
  async countByStatus() {
    const results = await db
      .select({
        status: schema.opportunityDrafts.status,
        count: count(),
      })
      .from(schema.opportunityDrafts)
      .groupBy(schema.opportunityDrafts.status);

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.status] = row.count;
    }
    return counts;
  }

  /** Find drafts linked to a specific extraction run (for retry lookups) */
  async findDraftByExtractionRunId(extractionRunId: string) {
    return db.query.opportunityDrafts.findFirst({
      where: eq(schema.opportunityDrafts.extractionRunId, extractionRunId),
    });
  }

  /** Delete a draft and clean up its extraction run and unshared source */
  async deleteDraft(id: string) {
    const draft = await db.query.opportunityDrafts.findFirst({
      where: eq(schema.opportunityDrafts.id, id),
      with: { extractionRun: true },
    });
    if (!draft) return;

    await db.transaction(async (tx) => {
      // 1. Delete draft
      await tx.delete(schema.opportunityDrafts).where(eq(schema.opportunityDrafts.id, id));

      // 2. Delete extraction run
      if (draft.extractionRunId) {
        await tx.delete(schema.aiExtractionRuns).where(eq(schema.aiExtractionRuns.id, draft.extractionRunId));
      }

      // 3. Clean up source if no other extraction run references it
      const sourceId = draft.extractionRun.sourceId;
      if (sourceId) {
        const otherRun = await tx.query.aiExtractionRuns.findFirst({
          where: eq(schema.aiExtractionRuns.sourceId, sourceId),
        });
        if (!otherRun) {
          await tx.delete(schema.opportunitySources).where(eq(schema.opportunitySources.id, sourceId));
        }
      }
    });
  }
}
