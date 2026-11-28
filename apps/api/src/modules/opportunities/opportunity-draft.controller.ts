import {
  approveDraftSchema,
  ingestOpportunitySourceSchema,
  opportunityDraftListQuerySchema,
  rejectDraftSchema,
  updateOpportunityDraftSchema,
} from '@career-portal/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { OpportunityDraftService } from './opportunity-draft.service';

import { ValidationError } from '@/shared/errors/app-error';
import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

export class OpportunityDraftController {
  constructor(
    private readonly draftService: OpportunityDraftService = new OpportunityDraftService(),
  ) {}

  /** Submit a raw source (text/URL/image/PDF/email) for AI extraction and draft creation */
  ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ingestOpportunitySourceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid source ingestion data', this.formatZodErrors(parsed.error));
      }
      const draft = await this.draftService.ingest(parsed.data, requestUser(req));
      sendSuccess(res, draft, 201);
    } catch (error) {
      next(error);
    }
  };

  /** List drafts with optional status filtering and pagination */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = opportunityDraftListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', this.formatZodErrors(parsed.error));
      }
      const { drafts, meta } = await this.draftService.listDrafts(parsed.data, requestUser(req));
      sendSuccess(res, drafts, 200, meta);
    } catch (error) {
      next(error);
    }
  };

  /** Get count of drafts by status (e.g. for badge counts in navigation tabs) */
  getCounts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counts = await this.draftService.getStatusCounts();
      sendSuccess(res, counts);
    } catch (error) {
      next(error);
    }
  };

  /** Get single draft by ID with joined source, extraction metadata, and duplicate check */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const draft = await this.draftService.getDraftById(id, requestUser(req));
      sendSuccess(res, draft);
    } catch (error) {
      next(error);
    }
  };

  /** Update editable fields of a draft before approving */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateOpportunityDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid draft update data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const updated = await this.draftService.updateDraft(id, parsed.data, requestUser(req));
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  /** Faculty approves draft — publishes/creates real opportunity */
  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = approveDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid draft approval data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const approved = await this.draftService.approveDraft(id, parsed.data, requestUser(req));
      sendSuccess(res, approved);
    } catch (error) {
      next(error);
    }
  };

  /** Faculty rejects draft with mandatory reason */
  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = rejectDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid draft rejection data', this.formatZodErrors(parsed.error));
      }
      const id = String(req.params.id);
      const rejected = await this.draftService.rejectDraft(id, parsed.data, requestUser(req));
      sendSuccess(res, rejected);
    } catch (error) {
      next(error);
    }
  };

  /** Retry AI extraction for a failed draft */
  retry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const retried = await this.draftService.retryExtraction(id, requestUser(req));
      sendSuccess(res, retried);
    } catch (error) {
      next(error);
    }
  };

  /** Retry AI extraction for a failed extraction run (canonical /extraction/runs/:id/retry) */
  retryByRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const retried = await this.draftService.retryExtractionByRunId(id, requestUser(req));
      sendSuccess(res, retried);
    } catch (error) {
      next(error);
    }
  };

  /** Faculty permanently deletes a draft and associated extraction data */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.draftService.deleteDraft(id, requestUser(req));
      sendSuccess(res, { message: 'Draft deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  private formatZodErrors(error: import('zod').ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return details;
  }
}
