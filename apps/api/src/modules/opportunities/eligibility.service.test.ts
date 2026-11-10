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

  it('should return true if opportunity has no eligibility criteria (open to all)', async () => {
    mockFindManyEligibility.mockResolvedValueOnce([]);

    const result = await service.isStudentEligible('opp-1', studentProfile);
    expect(result).toBe(true);
  });

  it('should return true if student matches all department and CGPA requirements', async () => {
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

  it('should return false if student CGPA is below the minimum required', async () => {
    mockFindManyEligibility.mockResolvedValueOnce([
      {
        opportunityId: 'opp-1',
        departmentId: 'dept-cse',
        programId: null,
        batchId: null,
        minCgpa: '9.00', // Student has 8.50
      },
    ]);

    const result = await service.isStudentEligible('opp-1', studentProfile);
    expect(result).toBe(false);
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

    const bulkResult = await service.checkBulkEligibility(['opp-1', 'opp-2', 'opp-open'], studentProfile);

    expect(bulkResult.get('opp-1')).toBe(true); // Eligible
    expect(bulkResult.get('opp-2')).toBe(false); // Ineligible
    expect(bulkResult.get('opp-open')).toBe(true); // Open to all
  });
});
