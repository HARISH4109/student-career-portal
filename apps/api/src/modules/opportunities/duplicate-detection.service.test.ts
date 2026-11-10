import { describe, expect, it, vi } from 'vitest';

import { DuplicateDetectionService } from './duplicate-detection.service';

const { mockFindFirstOpportunity, mockFindFirstDraft } = vi.hoisted(() => ({
  mockFindFirstOpportunity: vi.fn(),
  mockFindFirstDraft: vi.fn(),
}));

vi.mock('@career-portal/db', () => ({
  db: {
    query: {
      opportunities: {
        findMany: mockFindFirstOpportunity,
      },
      opportunityDrafts: {
        findFirst: mockFindFirstDraft,
      },
    },
  },
  schema: {
    opportunities: {
      title: 'title',
    },
    opportunityDrafts: {
      id: 'id',
      title: 'title',
      companyName: 'company_name',
      status: 'status',
    },
  },
}));

describe('DuplicateDetectionService', () => {
  const service = new DuplicateDetectionService();

  describe('generateContentHash', () => {
    it('generates consistent SHA-256 hash for identical normalised content', () => {
      const hash1 = service.generateContentHash('  Software Engineer at Google  ');
      const hash2 = service.generateContentHash('Software Engineer at Google');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('generates different hashes for different text', () => {
      const hash1 = service.generateContentHash('Software Engineer at Google');
      const hash2 = service.generateContentHash('Product Manager at Microsoft');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('checkDuplicate', () => {
    it('returns isDuplicate: false for short input strings', async () => {
      const result = await service.checkDuplicate('SE', 'G');
      expect(result.isDuplicate).toBe(false);
    });

    it('returns isDuplicate: true when matching published opportunity is found in database', async () => {
      mockFindFirstOpportunity.mockResolvedValueOnce([{
        id: 'opp-123',
        title: 'Software Development Engineer',
        status: 'published',
        company: { name: 'Amazon' },
      }]);

      const result = await service.checkDuplicate('Software Development Engineer', 'Amazon');

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedOpportunityId).toBe('opp-123');
      expect(result.matchedTitle).toBe('Software Development Engineer');
      expect(result.matchedCompanyName).toBe('Amazon');
    });

    it('returns isDuplicate: false when matching opportunity in database has draft status', async () => {
      mockFindFirstOpportunity.mockResolvedValueOnce([{
        id: 'opp-draft-1',
        title: 'Frontend Engineer',
        status: 'draft',
        company: { name: 'Meta' },
      }]);

      const result = await service.checkDuplicate('Frontend Engineer', 'Meta');

      expect(result.isDuplicate).toBe(false);
      expect(result.matchedOpportunityId).toBeUndefined();
    });

    it('returns isDuplicate: false when no matching published opportunity exists', async () => {
      mockFindFirstOpportunity.mockResolvedValueOnce([]);

      const result = await service.checkDuplicate('Unique Machine Learning Lead', 'DeepMind');

      expect(result.isDuplicate).toBe(false);
      expect(result.matchedOpportunityId).toBeUndefined();
    });
  });
});
