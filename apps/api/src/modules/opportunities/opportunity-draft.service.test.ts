import type { AuthenticatedUser } from '@career-portal/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpportunityDraftService } from './opportunity-draft.service';

import { ValidationError } from '@/shared/errors/app-error';

// Mock DB insert for audit logs
vi.mock('@career-portal/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
  },
  schema: {
    auditLogs: {},
  },
}));

function makeMockDraftRepo() { return {
      createSource: vi.fn(),
      startRetry: vi.fn(),
      updateSourceStatus: vi.fn(),
      createExtractionRun: vi.fn(),
      updateExtractionRun: vi.fn(),
      createDraft: vi.fn(),
      findDraftById: vi.fn(),
      listDrafts: vi.fn(),
      updateDraft: vi.fn(),
      countByStatus: vi.fn(),
      approve: vi.fn(),
      findDraftByExtractionRunId: vi.fn(),
      deleteDraft: vi.fn(),
    }; }

function makeMockExtractionService() { return {
      extract: vi.fn(),
    }; }

function makeMockDuplicateService() { return {
      generateContentHash: vi.fn().mockReturnValue('mock-hash-1234'),
      findExistingSourceByHash: vi.fn().mockResolvedValue(null),
      checkDuplicate: vi.fn().mockResolvedValue({ isDuplicate: false }),
    }; }

const draftRunFixture = { extractionRun: { id: 'run-1', sourceId: 'src-1', status: 'completed', confidenceScore: null, source: { id: 'src-1', sourceType: 'text', rawContent: 'Fixture content', status: 'processed', submittedBy: 'user-1', createdAt: new Date() }, createdAt: new Date() } };

describe('OpportunityDraftService', () => {
  let draftService: OpportunityDraftService;
  let mockDraftRepo: ReturnType<typeof makeMockDraftRepo>;
  let mockExtractionService: ReturnType<typeof makeMockExtractionService>;
  let mockDuplicateService: ReturnType<typeof makeMockDuplicateService>;

  const mockUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'faculty@university.edu',
    roles: ['PLACEMENT_FACULTY'],
    permissions: ['opportunities.create', 'opportunities.publish'],
  };

  beforeEach(() => {
    mockDraftRepo = makeMockDraftRepo();


    mockExtractionService = makeMockExtractionService();

    mockDuplicateService = makeMockDuplicateService();


    draftService = new OpportunityDraftService(
      mockDraftRepo,
      mockExtractionService,
      mockDuplicateService,
    );
  });

  describe('ingest', () => {
    it('creates source, runs extraction, creates draft, and returns full draft with duplicate check', async () => {
      mockDraftRepo.createSource.mockResolvedValue({
        id: 'src-1',
        sourceType: 'url',
        rawContent: 'https://example.com/job',
        submittedBy: mockUser.id,
        status: 'pending',
        createdAt: new Date(),
      });

      mockDraftRepo.createExtractionRun.mockResolvedValue({
        id: 'run-1',
        sourceId: 'src-1',
        status: 'queued',
        createdAt: new Date(),
      });

      mockExtractionService.extract.mockResolvedValue({
        title: 'Backend Engineer',
        companyName: 'Acme Corp',
        type: 'job',
        description: 'Great backend role',
        workMode: 'hybrid',
        location: 'Bengaluru',
        salaryMin: 1000000,
        salaryMax: 1500000,
        skills: ['Node.js', 'PostgreSQL'],
        eligibility: { minCgpa: 7.0, departmentCodes: ['CSE'] },
        confidenceScore: 88,
      });

      mockDuplicateService.checkDuplicate.mockResolvedValue({
        isDuplicate: false,
      });

      mockDraftRepo.createDraft.mockResolvedValue({
        id: 'draft-1',
        extractionRunId: 'run-1',
        ...draftRunFixture,
        status: 'pending_review',
        title: 'Backend Engineer',
        companyName: 'Acme Corp',
        type: 'job',
        description: 'Great backend role',
      });

      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        extractionRunId: 'run-1',
        ...draftRunFixture,
        status: 'pending_review',
        title: 'Backend Engineer',
        companyName: 'Acme Corp',
        type: 'job',
        description: 'Great backend role',
        location: 'Bengaluru',
        salaryMin: '1000000',
        salaryMax: '1500000',
        extractedSkills: ['Node.js', 'PostgreSQL'],
        extractedEligibility: { minCgpa: 7.0, departmentCodes: ['CSE'], workMode: 'hybrid' },
        applicationDeadline: null,
        resultingOpportunityId: null,
        reviewedBy: null,
        reviewNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        extractionRun: {
          id: 'run-1',
          sourceId: 'src-1',
          status: 'completed',
          confidenceScore: 88,
          durationMs: 120,
          modelUsed: 'n8n-agent-v1',
          source: {
            id: 'src-1',
            sourceType: 'url',
            rawContent: 'https://example.com/job',
            submittedBy: mockUser.id,
            status: 'processed',
            createdAt: new Date(),
          },
        },
      });

      const result = await draftService.ingest(
        { sourceType: 'url', content: 'https://example.com/job' },
        mockUser,
      );

      expect(mockDraftRepo.createSource).toHaveBeenCalled();
      expect(mockDraftRepo.createExtractionRun).toHaveBeenCalled();
      expect(mockExtractionService.extract).toHaveBeenCalledWith('url', 'https://example.com/job', undefined, undefined);
      expect(mockDraftRepo.updateExtractionRun).toHaveBeenCalledWith('run-1', expect.objectContaining({ status: 'completed' }));
      expect(mockDraftRepo.createDraft).toHaveBeenCalled();
      expect(result.id).toBe('draft-1');
      expect(result.title).toBe('Backend Engineer');
      expect(result.duplicateCheck?.isDuplicate).toBe(false);
    });

    it('attaches duplicate check result when a similar opportunity is detected', async () => {
      mockDraftRepo.createSource.mockResolvedValue({ id: 'src-1', sourceType: 'text', rawContent: 'Text' });
      mockDraftRepo.createExtractionRun.mockResolvedValue({ id: 'run-1', sourceId: 'src-1' });
      mockExtractionService.extract.mockResolvedValue({
        title: 'Software Developer',
        companyName: 'Tech Corp',
        type: 'job',
        description: 'Desc',
        confidenceScore: 90,
      });

      mockDuplicateService.checkDuplicate.mockResolvedValue({
        isDuplicate: true,
        matchedOpportunityId: '22222222-2222-2222-2222-222222222222',
        matchedTitle: 'Software Developer',
        similarityReason: 'Exact title and company match with an existing opportunity',
      });

      mockDraftRepo.createDraft.mockResolvedValue({ id: 'draft-2' });
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-2',
        extractionRunId: 'run-1',
        ...draftRunFixture,
        status: 'pending_review',
        title: 'Software Developer',
        companyName: 'Tech Corp',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await draftService.ingest({ sourceType: 'text', content: 'Text' }, mockUser);
      expect(result.duplicateCheck?.isDuplicate).toBe(true);
      expect(result.duplicateCheck?.matchedOpportunityId).toBe('22222222-2222-2222-2222-222222222222');
    });
  });

  describe('approveDraft', () => {
    it('creates an opportunity from draft, sets draft status to approved, and links resultingOpportunityId', async () => {
      const mockDraft = {
        id: 'draft-1',
        ...draftRunFixture,
        status: 'pending_review',
        title: 'Cloud Architect',
        companyName: 'Google',
        type: 'job',
        description: 'Lead cloud architecture',
        location: 'Hyderabad',
        salaryMin: '2500000',
        salaryMax: '3500000',
        extractedSkills: ['GCP', 'Kubernetes'],
        extractedEligibility: { minCgpa: 8.0, workMode: 'hybrid' },
        applicationDeadline: new Date('2026-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDraftRepo.findDraftById.mockResolvedValue(mockDraft);
      mockDraftRepo.approve.mockResolvedValue({ ...mockDraft, ...draftRunFixture, status: 'approved', resultingOpportunityId: 'opp-1' });
      const result = await draftService.approveDraft('draft-1', { publishImmediately: true }, mockUser);
      expect(mockDraftRepo.approve).toHaveBeenCalledWith('draft-1', { publishImmediately: true }, mockUser.id, mockDraft.updatedAt);
      expect(result.resultingOpportunityId).toBe('opp-1');
    });

    it('throws ValidationError if draft is already approved', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        ...draftRunFixture,
        status: 'approved',
      });

      await expect(
        draftService.approveDraft('draft-1', { publishImmediately: true }, mockUser),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError if draft is rejected', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        ...draftRunFixture,
        status: 'rejected',
      });

      await expect(
        draftService.approveDraft('draft-1', { publishImmediately: true }, mockUser),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when approving with publishImmediately: true if duplicate published opportunity exists', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        ...draftRunFixture,
        status: 'pending_review',
        title: 'Cloud Architect',
        companyName: 'Google',
        type: 'job',
        description: 'Role description',
      });

      mockDuplicateService.checkDuplicate.mockResolvedValueOnce({
        isDuplicate: true,
        matchedOpportunityId: 'opp-published-1',
        matchedTitle: 'Cloud Architect',
        matchedCompanyName: 'Google',
      });

      await expect(
        draftService.approveDraft('draft-1', { publishImmediately: true }, mockUser),
      ).rejects.toThrow('Cannot publish duplicate opportunity');
    });
  });

  describe('rejectDraft', () => {
    it('sets draft status to rejected and stores review notes', async () => {
      mockDraftRepo.findDraftById
        .mockResolvedValueOnce({
          id: 'draft-1',
          ...draftRunFixture,
          status: 'pending_review',
        })
        .mockResolvedValueOnce({
          id: 'draft-1',
          ...draftRunFixture,
          status: 'rejected',
          reviewNotes: 'Illegible scanned document',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockDraftRepo.updateDraft.mockResolvedValue({});

      const result = await draftService.rejectDraft(
        'draft-1',
        { reason: 'Illegible scanned document' },
        mockUser,
      );

      expect(mockDraftRepo.updateDraft).toHaveBeenCalledWith(
        'draft-1',
        {
          status: 'rejected',
          reviewedBy: mockUser.id,
          reviewNotes: 'Illegible scanned document',
        },
      );
      expect(result.status).toBe('rejected');
    });

    it('throws ValidationError when rejecting an already approved draft', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        ...draftRunFixture,
        status: 'approved',
      });

      await expect(
        draftService.rejectDraft('draft-1', { reason: 'No longer needed' }, mockUser),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('retryExtraction', () => {
    it('throws ValidationError if extraction run was not failed', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        extractionRun: { status: 'completed' },
      });

      await expect(draftService.retryExtraction('draft-1', mockUser)).rejects.toThrow(
        ValidationError,
      );
    });

    it('creates new run and re-triggers extraction for failed runs', async () => {
      mockDraftRepo.findDraftById
        .mockResolvedValueOnce({
          id: 'draft-1',
          extractionRun: {
            id: 'old-run',
            status: 'failed',
            source: {
              id: 'src-1',
              sourceType: 'text',
              rawContent: 'Some text',
            },
          },
        })
        .mockResolvedValueOnce({
          id: 'draft-1',
          ...draftRunFixture,
          status: 'pending_review',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockDraftRepo.startRetry.mockResolvedValue({ id: 'new-run' });
      mockExtractionService.extract.mockResolvedValue({
        title: 'Frontend Dev',
        companyName: 'Meta',
        type: 'job',
        description: 'React dev',
        confidenceScore: 85,
      });

      await draftService.retryExtraction('draft-1', mockUser);

      expect(mockDraftRepo.startRetry).toHaveBeenCalledWith('draft-1', 'old-run');
      expect(mockExtractionService.extract).toHaveBeenCalledWith('text', 'Some text', undefined, undefined);
      expect(mockDraftRepo.updateExtractionRun).toHaveBeenCalledWith(
        'new-run',
        expect.objectContaining({ status: 'completed' }),
      );
    });
  });

  describe('deleteDraft', () => {
    it('deletes draft and writes audit log', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue({
        id: 'draft-1',
        title: 'Backend Engineer',
        companyName: 'Acme Corp',
      });

      await draftService.deleteDraft('draft-1', mockUser);

      expect(mockDraftRepo.deleteDraft).toHaveBeenCalledWith('draft-1');
    });

    it('throws NotFoundError if draft does not exist', async () => {
      mockDraftRepo.findDraftById.mockResolvedValue(null);

      await expect(draftService.deleteDraft('non-existent', mockUser)).rejects.toThrow();
    });
  });
});
