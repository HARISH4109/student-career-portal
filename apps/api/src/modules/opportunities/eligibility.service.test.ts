import { describe, expect, it, vi } from 'vitest';

import { EligibilityService } from './eligibility.service';

const { mockFindManyEligibility } = vi.hoisted(() => ({
  mockFindManyEligibility: vi.fn(),
}));

vi.mock('@career-portal/db', () => ({
  db: {
    query: {
      opportunityEligibility: {
        findMany: mockFindManyEligibility,
      },
    },
  },
  schema: {
    opportunityEligibility: {
      opportunityId: 'opportunity_id',
    },
  },
}));

describe('EligibilityService', () => {
  const service = new EligibilityService();

  const studentProfile = {
    departmentId: 'dept-cse',
    programId: 'prog-btech-cse',
    batchId: 'batch-2025',
    cgpa: '8.50',
  };

  describe('Open criteria', () => {
    it('should return true if opportunity has no eligibility criteria (open to all)', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });
  });

  describe('CGPA threshold edge cases', () => {
    it('should return true when student CGPA is exactly at the threshold', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: null,
          minCgpa: '8.50',
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });

    it('should return false when student CGPA is just below the threshold', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: null,
          minCgpa: '8.51', // student has 8.50
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(false);
    });

    it('should return true when student CGPA is just above the threshold', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: null,
          minCgpa: '8.49',
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });

    it('should return false when student CGPA is null and criterion requires minCgpa', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: null,
          minCgpa: '6.00',
        },
      ]);

      const nullCgpaProfile = { ...studentProfile, cgpa: null };
      const result = await service.isStudentEligible('opp-1', nullCgpaProfile);
      expect(result).toBe(false);
    });

    it('should return true when student CGPA is null but criterion has no minCgpa requirement', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse',
          programId: null,
          batchId: null,
          minCgpa: null,
        },
      ]);

      const nullCgpaProfile = { ...studentProfile, cgpa: null };
      const result = await service.isStudentEligible('opp-1', nullCgpaProfile);
      expect(result).toBe(true);
    });
  });

  describe('Department matching', () => {
    it('should return true if student department matches', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse',
          programId: null,
          batchId: null,
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });

    it('should return false if student department does not match', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-ece', // Student is CSE
          programId: null,
          batchId: null,
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(false);
    });

    it('should return true if departmentId is null in row (all departments allowed)', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null, // all departments
          programId: null,
          batchId: null,
          minCgpa: '7.00',
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });
  });

  describe('Batch matching', () => {
    it('should return true when batchId matches student batch', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: 'batch-2025',
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });

    it('should return false when batchId does not match student batch', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: 'batch-2024', // Student is batch-2025
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(false);
    });

    it('should return true when batchId is null in criterion (all batches allowed)', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse',
          programId: null,
          batchId: null,
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });
  });

  describe('Program matching', () => {
    it('should return true when programId matches student program', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: 'prog-btech-cse',
          batchId: null,
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });

    it('should return false when programId does not match student program', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: 'prog-mtech-ai',
          batchId: null,
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(false);
    });

    it('should return true when programId is null in criterion (all programs allowed)', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: null,
          programId: null,
          batchId: 'batch-2025',
          minCgpa: null,
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });
  });

  describe('Complex multi-condition matching', () => {
    it('should return true if student matches all department, program, batch, and CGPA requirements', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse',
          programId: 'prog-btech-cse',
          batchId: 'batch-2025',
          minCgpa: '7.50',
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });

    it('should return false if department and batch match, but program fails', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse',
          programId: 'prog-dual-degree',
          batchId: 'batch-2025',
          minCgpa: '7.50',
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(false);
    });

    it('should return true if student matches at least ONE of multiple eligible rows', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-ece',
          programId: null,
          batchId: null,
          minCgpa: null,
        },
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse', // matches student
          programId: null,
          batchId: 'batch-2025',
          minCgpa: '8.00',
        },
      ]);

      const result = await service.isStudentEligible('opp-1', studentProfile);
      expect(result).toBe(true);
    });
  });

  describe('Bulk eligibility checks', () => {
    it('should return an empty map when opportunityIds is empty', async () => {
      const bulkResult = await service.checkBulkEligibility([], studentProfile);
      expect(bulkResult.size).toBe(0);
    });

    it('should correctly evaluate bulk eligibility for multiple opportunities', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-1',
          departmentId: 'dept-cse',
          programId: null,
          batchId: null,
          minCgpa: '8.00',
        },
        {
          opportunityId: 'opp-2',
          departmentId: 'dept-mechanical',
          programId: null,
          batchId: null,
          minCgpa: null,
        },
      ]);

      const bulkResult = await service.checkBulkEligibility(
        ['opp-1', 'opp-2', 'opp-open'],
        studentProfile,
      );

      expect(bulkResult.get('opp-1')).toBe(true); // Eligible
      expect(bulkResult.get('opp-2')).toBe(false); // Ineligible
      expect(bulkResult.get('opp-open')).toBe(true); // Open to all
    });

    it('should evaluate bulk eligibility with null CGPA students', async () => {
      mockFindManyEligibility.mockResolvedValueOnce([
        {
          opportunityId: 'opp-cgpa-req',
          departmentId: 'dept-cse',
          programId: null,
          batchId: null,
          minCgpa: '7.00',
        },
        {
          opportunityId: 'opp-no-cgpa',
          departmentId: 'dept-cse',
          programId: null,
          batchId: null,
          minCgpa: null,
        },
      ]);

      const nullCgpaProfile = { ...studentProfile, cgpa: null };
      const bulkResult = await service.checkBulkEligibility(
        ['opp-cgpa-req', 'opp-no-cgpa'],
        nullCgpaProfile,
      );

      expect(bulkResult.get('opp-cgpa-req')).toBe(false);
      expect(bulkResult.get('opp-no-cgpa')).toBe(true);
    });
  });
});
