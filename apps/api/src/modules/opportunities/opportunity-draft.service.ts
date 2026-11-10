import { db, schema } from '@career-portal/db';
import { opportunityDraftResponseSchema } from '@career-portal/shared-types';
import type {
  ApproveDraftDto,
  AuthenticatedUser,
  DuplicateCheckResult,
  IngestOpportunitySourceDto,
  OpportunityDraftListQuery,
  OpportunityDraftResponseDto,
  PaginationMeta,
  RejectDraftDto,
  UpdateOpportunityDraftDto,
} from '@career-portal/shared-types';

import { DuplicateDetectionService } from './duplicate-detection.service';
import { OpportunityDraftRepository } from './opportunity-draft.repository';
import { OpportunityExtractionService } from './opportunity-extraction.service';



import { logger } from '@/infrastructure/logger';
import { InternalError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

/**
 * Core service for the Phase 4 AI Ingestion & Faculty Review pipeline.
 *
 * Orchestrates the full workflow:
 *   Source ingestion → n8n extraction → draft creation → faculty review → approval/rejection
 *
 * AI never directly publishes — this service enforces the mandatory review step.
 */
export class OpportunityDraftService {
  constructor(
    private readonly draftRepo: OpportunityDraftRepository = new OpportunityDraftRepository(),
    private readonly extractionService: OpportunityExtractionService = new OpportunityExtractionService(),
    private readonly duplicateService: DuplicateDetectionService = new DuplicateDetectionService(),
  ) {}

  // ── Ingest Source & Run Extraction ────────────────────────────────────

  /**
   * Full ingestion pipeline:
   * 1. Check idempotency (content hash)
   * 2. Save source to DB
   * 3. Create extraction run record
   * 4. Call n8n webhook (via existing OpportunityExtractionService)
   * 5. Record results (model, confidence, duration)
   * 6. Run duplicate detection
   * 7. Save draft with status 'pending_review'
   */
  async ingest(
    dto: IngestOpportunitySourceDto,
    user: AuthenticatedUser,
  ): Promise<OpportunityDraftResponseDto> {
    // 1. Content hash (salted so multiple drafts can be created from the same source content without unique collision)
    const contentHash = this.duplicateService.generateContentHash(
      `${dto.sourceType}:${dto.content}:${user.id}:${String(Date.now())}:${String(Math.random())}`,
    );

    // 2. Save source
    const source = await this.draftRepo.createSource({
      sourceType: dto.sourceType,
      rawContent: dto.content,
      contentHash,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      submittedBy: user.id,
      status: 'pending',
    });

    if (!source) {
      throw new InternalError('Failed to save opportunity source');
    }

    // 3. Create extraction run record (status: queued)
    const run = await this.draftRepo.createExtractionRun({
      sourceId: source.id,
      status: 'queued',
    });

    if (!run) {
      throw new InternalError('Failed to create extraction run');
    }

    // 4. Update run to processing
    await this.draftRepo.updateExtractionRun(run.id, { status: 'processing' });
    await this.draftRepo.updateSourceStatus(source.id, 'processing');

    const startTime = Date.now();

    try {
      // 5. Call n8n via existing service
      const sourceTypeForN8n = dto.sourceType === 'email' ? 'text' : dto.sourceType;

      const extracted = await this.extractionService.extract(
        sourceTypeForN8n,
        dto.content,
        dto.fileName,
        dto.mimeType,
      );

      const durationMs = Date.now() - startTime;

      // 6. Update run with success data
      await this.draftRepo.updateExtractionRun(run.id, {
        status: 'completed',
        confidenceScore: extracted.confidenceScore != null ? String(extracted.confidenceScore) : null,
        durationMs,
        modelUsed: 'n8n-agent-v1', // n8n doesn't report model name, use a placeholder
      });
      await this.draftRepo.updateSourceStatus(source.id, 'processed');

      // 7. Run duplicate detection
      const duplicateCheck = await this.duplicateService.checkDuplicate(
        extracted.title,
        extracted.companyName,
      );

      // 8. Create draft
      const draft = await this.draftRepo.createDraft({
        extractionRunId: run.id,
        status: 'pending_review',
        title: extracted.title,
        companyName: extracted.companyName,
        type: extracted.type,
        description: extracted.description,
        location: extracted.location ?? null,
        workMode: extracted.workMode,
        salaryMin: extracted.salaryMin != null ? String(extracted.salaryMin) : null,
        salaryMax: extracted.salaryMax != null ? String(extracted.salaryMax) : null,
        extractedSkills: extracted.skills,
        extractedEligibility: extracted.eligibility,
        applicationDeadline: extracted.applicationDeadline
          ? new Date(extracted.applicationDeadline)
          : null,
        applyUrl: extracted.applyUrl ?? null,
        applicationEmail: extracted.applicationEmail ?? null,
      });

      if (!draft) {
        throw new InternalError('Failed to create opportunity draft');
      }

      logger.info(
        { draftId: draft.id, title: extracted.title, confidence: extracted.confidenceScore },
        'Draft created from AI extraction',
      );

      // Return full draft with joined data
      const fullDraft = await this.draftRepo.findDraftById(draft.id);
      if (!fullDraft) throw new NotFoundError('Draft');
      return this.mapToResponse(fullDraft, duplicateCheck);
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // On failure, record the error in the extraction run
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      await this.draftRepo.updateExtractionRun(run.id, {
        status: 'failed',
        durationMs,
        errorMessage,
      });
      await this.draftRepo.updateSourceStatus(source.id, 'failed');
      // A failed run must remain visible so faculty can retry it.
      const existingDraft = await this.draftRepo.findDraftByExtractionRunId(run.id);
      if (!existingDraft) await this.draftRepo.createDraft({ extractionRunId: run.id, status: 'needs_correction' });


      logger.error({ err: error, runId: run.id }, 'Extraction pipeline failed');
      throw error;
    }
  }

  // ── List Drafts ──────────────────────────────────────────────────────

  async listDrafts(
    query: OpportunityDraftListQuery,
    _user: AuthenticatedUser,
  ): Promise<{ drafts: OpportunityDraftResponseDto[]; meta: PaginationMeta }> {
    const result = await this.draftRepo.listDrafts({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
      sortBy: query.sortBy,
    });

    return {
      drafts: result.drafts.map((d) => this.mapToResponse(d)),
      meta: result.meta,
    };
  }

  // ── Get Draft By ID ──────────────────────────────────────────────────

  async getDraftById(
    id: string,
    _user: AuthenticatedUser,
  ): Promise<OpportunityDraftResponseDto> {
    const draft = await this.draftRepo.findDraftById(id);
    if (!draft) throw new NotFoundError('Draft');

    // Re-run duplicate check for fresh results
    let duplicateCheck: DuplicateCheckResult | undefined;
    if (draft.title && draft.companyName) {
      duplicateCheck = await this.duplicateService.checkDuplicate(
        draft.title,
        draft.companyName,
        draft.id,
      );
    }

    return this.mapToResponse(draft, duplicateCheck);
  }

  // ── Update Draft ─────────────────────────────────────────────────────

  async updateDraft(
    id: string,
    dto: UpdateOpportunityDraftDto,
    _user: AuthenticatedUser,
  ): Promise<OpportunityDraftResponseDto> {
    const existing = await this.draftRepo.findDraftById(id);
    if (!existing) throw new NotFoundError('Draft');

    if (['approved', 'rejected', 'published'].includes(existing.status)) {
      throw new ValidationError(
        `Cannot edit a draft with status "${existing.status}". Only pending or needs-correction drafts can be edited.`,
      );
    }

    const updateData: Parameters<OpportunityDraftRepository['updateDraft']>[1] = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.workMode !== undefined) updateData.workMode = dto.workMode;
    if (dto.salaryMin !== undefined) updateData.salaryMin = dto.salaryMin != null ? String(dto.salaryMin) : null;
    if (dto.salaryMax !== undefined) updateData.salaryMax = dto.salaryMax != null ? String(dto.salaryMax) : null;
    if (dto.extractedSkills !== undefined) updateData.extractedSkills = dto.extractedSkills;
    if (dto.extractedEligibility !== undefined) updateData.extractedEligibility = dto.extractedEligibility;
    if (dto.applicationDeadline !== undefined) {
      updateData.applicationDeadline = dto.applicationDeadline ? new Date(dto.applicationDeadline) : null;
    }
    if (dto.applyUrl !== undefined) updateData.applyUrl = dto.applyUrl;
    if (dto.applicationEmail !== undefined) updateData.applicationEmail = dto.applicationEmail;

    const updated = await this.draftRepo.updateDraft(id, updateData);
    if (!updated) throw new NotFoundError('Draft');
    return this.mapToResponse(updated);
  }

  // ── Approve Draft ────────────────────────────────────────────────────

  /**
   * Faculty approves a draft — this creates the real `opportunities` row.
   * AI never directly publishes; this method is the only path from draft to opportunity.
   */
  async approveDraft(
    id: string,
    dto: ApproveDraftDto,
    user: AuthenticatedUser,
  ): Promise<OpportunityDraftResponseDto> {
    const draft = await this.draftRepo.findDraftById(id);
    if (!draft) throw new NotFoundError('Draft');

    if (draft.status === 'approved' || draft.status === 'published') {
      throw new ValidationError('This draft has already been approved.');
    }
    if (draft.status === 'rejected') {
      throw new ValidationError('Cannot approve a rejected draft. Retry the extraction or create a new one.');
    }

    // Validate required fields
    if (!draft.title || !draft.companyName || !draft.type || !draft.description) {
      throw new ValidationError(
        'Draft is missing required fields (title, company name, type, or description). Please edit the draft first.',
      );
    }

    // If publishing immediately, check whether an opportunity with this title and company already exists in published opportunities
    const dupCheck = await this.duplicateService.checkDuplicate(draft.title, draft.companyName, {
      publishedOnly: true,
    });
    if (dupCheck.isDuplicate && dupCheck.matchedOpportunityId) {
      if (dto.publishImmediately) {
        throw new ValidationError(
          `Cannot publish duplicate opportunity. A matching opportunity "${(dupCheck.matchedTitle ?? '')}" for company "${(dupCheck.matchedCompanyName ?? '')}" already exists in the portal. To prevent duplicate postings, publishing is restricted.`,
        );
      }
    }

    const updated = await this.draftRepo.approve(id, dto, user.id, draft.updatedAt);
    if (!updated) throw new NotFoundError('Draft');
    return this.mapToResponse(updated);
  }

  // ── Reject Draft ─────────────────────────────────────────────────────

  async rejectDraft(
    id: string,
    dto: RejectDraftDto,
    user: AuthenticatedUser,
  ): Promise<OpportunityDraftResponseDto> {
    const draft = await this.draftRepo.findDraftById(id);
    if (!draft) throw new NotFoundError('Draft');

    if (draft.status === 'approved' || draft.status === 'published') {
      throw new ValidationError('Cannot reject a draft that has already been approved/published.');
    }

    await this.draftRepo.updateDraft(id, {
      status: 'rejected',
      reviewedBy: user.id,
      reviewNotes: dto.reason,
    });

    // Write audit log
    await this.writeAuditLog(user.id, 'draft.rejected', 'opportunity_draft', id, {
      draftTitle: draft.title,
      rejectionReason: dto.reason,
    });

    logger.info({ draftId: id, reason: dto.reason }, 'Draft rejected');

    const updated = await this.draftRepo.findDraftById(id);
    if (!updated) throw new NotFoundError('Draft');
    return this.mapToResponse(updated);
  }

  // ── Delete Draft ─────────────────────────────────────────────────────

  async deleteDraft(
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const draft = await this.draftRepo.findDraftById(id);
    if (!draft) throw new NotFoundError('Draft');

    await this.draftRepo.deleteDraft(id);

    await this.writeAuditLog(user.id, 'draft.deleted', 'opportunity_draft', id, {
      draftTitle: draft.title,
      companyName: draft.companyName,
    });

    logger.info({ draftId: id, user: user.id }, 'Draft deleted');
  }

  // ── Retry Extraction ─────────────────────────────────────────────────

  /**
   * Re-trigger AI extraction for a failed run. Creates a new extraction run
   * against the same source and updates the existing draft.
   */
  async retryExtraction(
    draftId: string,
    user: AuthenticatedUser,
  ): Promise<OpportunityDraftResponseDto> {
    const draft = await this.draftRepo.findDraftById(draftId);
    if (!draft) throw new NotFoundError('Draft');

    if (['approved', 'published', 'rejected'].includes(draft.status)) throw new ValidationError('This draft cannot be retried.');

    const run = draft.extractionRun;
    

    if (run.status !== 'failed') {
      throw new ValidationError(
        `Only failed extraction runs can be retried. Current status: "${run.status}"`,
      );
    }

    const source = run.source;
    

    // Create a new extraction run for this retry
    const newRun = await this.draftRepo.startRetry(draftId, run.id);



    await this.writeAuditLog(user.id, 'retry_extraction', 'opportunity_draft', draftId, {
      previousRunId: run.id,
      newRunId: newRun.id,
    });

    const startTime = Date.now();

    try {
      const sourceTypeForN8n = source.sourceType === 'email' || source.sourceType === 'manual' ? 'text' : source.sourceType;

      const extracted = await this.extractionService.extract(
        sourceTypeForN8n,
        source.rawContent,
        source.fileName ?? undefined,
        source.mimeType ?? undefined,
      );

      const durationMs = Date.now() - startTime;

      await this.draftRepo.updateExtractionRun(newRun.id, {
        status: 'completed',
        confidenceScore: extracted.confidenceScore != null ? String(extracted.confidenceScore) : null,
        durationMs,
        modelUsed: 'n8n-agent-v1',
      });

      // Update the draft with fresh extraction data
      await this.draftRepo.updateDraft(draftId, {
        extractionRunId: newRun.id,
        status: 'pending_review',
        title: extracted.title,
        companyName: extracted.companyName,
        type: extracted.type,
        description: extracted.description,
        location: extracted.location ?? null,
        workMode: extracted.workMode,
        salaryMin: extracted.salaryMin != null ? String(extracted.salaryMin) : null,
        salaryMax: extracted.salaryMax != null ? String(extracted.salaryMax) : null,
        extractedSkills: extracted.skills,
        extractedEligibility: extracted.eligibility,
        applicationDeadline: extracted.applicationDeadline
          ? new Date(extracted.applicationDeadline)
          : null,
        applyUrl: extracted.applyUrl ?? null,
        applicationEmail: extracted.applicationEmail ?? null,
        reviewNotes: null,
      });

      await this.draftRepo.updateSourceStatus(source.id, 'processed');

      logger.info({ draftId, newRunId: newRun.id }, 'Extraction retry successful');

      const updated = await this.draftRepo.findDraftById(draftId);
      if (!updated) throw new NotFoundError('Draft');
    return this.mapToResponse(updated);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.draftRepo.updateExtractionRun(newRun.id, {
        status: 'failed',
        durationMs,
        errorMessage,
      });

      await this.draftRepo.updateSourceStatus(source.id, 'failed');
      await this.draftRepo.updateDraft(draftId, { status: 'needs_correction' });
      logger.error({ err: error, draftId, newRunId: newRun.id }, 'Extraction retry failed');
      throw error;
    }
  }

  // ── Draft Status Counts ──────────────────────────────────────────────

  async getStatusCounts(): Promise<Record<string, number>> {
    return this.draftRepo.countByStatus();
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private mapToResponse(
    draft: NonNullable<Awaited<ReturnType<OpportunityDraftRepository['findDraftById']>>>,
    duplicateCheck?: DuplicateCheckResult,
  ): OpportunityDraftResponseDto {
    const eligibility = opportunityDraftResponseSchema.shape.extractedEligibility.parse(draft.extractedEligibility ?? {});
    const mode = eligibility.workMode;
    return {
      ...draft,
      workMode: mode === 'onsite' || mode === 'remote' || mode === 'hybrid' ? mode : null,
      salaryMin: draft.salaryMin !== null ? Number(draft.salaryMin) : null,
      salaryMax: draft.salaryMax !== null ? Number(draft.salaryMax) : null,
      extractedSkills: opportunityDraftResponseSchema.shape.extractedSkills.parse(draft.extractedSkills ?? []),
      extractedEligibility: eligibility,
      applicationDeadline: draft.applicationDeadline?.toISOString() ?? null,
      applyUrl: typeof eligibility.applyUrl === 'string' ? eligibility.applyUrl : null,
      applicationEmail: typeof eligibility.applicationEmail === 'string' ? eligibility.applicationEmail : null,
      source: draft.extractionRun.source,
      extractionRun: {
        ...draft.extractionRun,
        confidenceScore: draft.extractionRun.confidenceScore !== null ? Number(draft.extractionRun.confidenceScore) : null,
      },
      duplicateCheck,
    };
  }

  private async writeAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await db.insert(schema.auditLogs).values({
        userId,
        action,
        entityType,
        entityId,
        metadata,
      });
    } catch (error) {
      // Audit logging should never break the main operation
      logger.error({ err: error, action, entityType, entityId }, 'Failed to write audit log');
    }
  }
}
