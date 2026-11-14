import { randomUUID } from 'node:crypto';
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStatusSchema,
} from '@career-portal/shared-types';
import { describe, expect, it } from 'vitest';

import { validateCompensation } from './validate-compensation';

import { ValidationError } from '@/shared/errors/app-error';

describe('Opportunity Validation (DTOs and Rules)', () => {
  const validUuid = randomUUID();
  const validFutureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  describe('createOpportunitySchema', () => {
    it('passes for a valid opportunity payload with companyId', () => {
      const validPayload = {
        companyId: validUuid,
        title: 'Software Development Engineer',
        type: 'job' as const,
        description: 'Design and develop scalable microservices in Node.js and TypeScript.',
        workMode: 'hybrid' as const,
        location: 'Bengaluru, India',
        salaryMin: 1200000,
        salaryMax: 1800000,
        applicationDeadline: validFutureDate,
        applyUrl: 'https://careers.example.com/apply/101',
        applicationEmail: 'careers@example.com',
        skills: [{ skillId: randomUUID(), isRequired: true }],
        eligibility: [
          {
            departmentId: randomUUID(),
            minCgpa: 7.5,
          },
        ],
      };

      const result = createOpportunitySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('passes for a valid opportunity payload with companyName instead of companyId', () => {
      const payload = {
        companyName: 'Acme Technologies',
        title: 'Backend Intern',
        type: 'internship' as const,
        description: 'Internship role for final year students.',
        workMode: 'remote' as const,
        skills: [],
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.companyName).toBe('Acme Technologies');
        expect(result.data.workMode).toBe('remote');
      }
    });

    it('fails when both companyId and companyName are missing', () => {
      const payload = {
        title: 'Frontend Developer',
        type: 'job' as const,
        description: 'React developer position.',
        workMode: 'onsite' as const,
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((issue) => issue.message.includes('Either companyId or companyName is required'))).toBe(true);
      }
    });

    it('fails when required fields (title, description, type) are missing', () => {
      const payload = {
        companyId: validUuid,
        // missing title, description, type
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.title).toBeDefined();
        expect(fieldErrors.description).toBeDefined();
        expect(fieldErrors.type).toBeDefined();
      }
    });

    it('fails when title is an empty string', () => {
      const payload = {
        companyId: validUuid,
        title: '',
        type: 'job' as const,
        description: 'Valid description',
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
      }
    });

    it('fails when invalid enum values are provided for type', () => {
      const payload = {
        companyId: validUuid,
        title: 'DevOps Engineer',
        type: 'freelance', // Invalid enum
        description: 'Valid description',
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.type).toBeDefined();
      }
    });

    it('fails when invalid enum values are provided for workMode', () => {
      const payload = {
        companyId: validUuid,
        title: 'DevOps Engineer',
        type: 'job' as const,
        description: 'Valid description',
        workMode: 'flexible', // Invalid enum (only remote, onsite, hybrid allowed)
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.workMode).toBeDefined();
      }
    });

    it('fails when salaryMin or salaryMax is negative', () => {
      const payload = {
        companyId: validUuid,
        title: 'QA Engineer',
        type: 'job' as const,
        description: 'Valid description',
        salaryMin: -1000,
        salaryMax: -500,
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.salaryMin).toBeDefined();
        expect(fieldErrors.salaryMax).toBeDefined();
      }
    });

    it('handles empty skills and eligibility arrays properly with defaults', () => {
      const payload = {
        companyId: validUuid,
        title: 'Junior Developer',
        type: 'job' as const,
        description: 'Valid description',
        skills: [],
        eligibility: [],
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skills).toEqual([]);
        expect(result.data.eligibility).toEqual([]);
        expect(result.data.workMode).toBe('onsite'); // defaults to onsite
      }
    });

    it('fails when skill ID is not a valid UUID', () => {
      const payload = {
        companyId: validUuid,
        title: 'Junior Developer',
        type: 'job' as const,
        description: 'Valid description',
        skills: [{ skillId: 'invalid-non-uuid-skill' }],
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('skills'))).toBe(true);
      }
    });

    it('fails when applicationDeadline is a malformed datetime string', () => {
      const payload = {
        companyId: validUuid,
        title: 'Cloud Architect',
        type: 'job' as const,
        description: 'Valid description',
        applicationDeadline: '2025/12/31 not-a-date',
      };

      const result = createOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.applicationDeadline).toBeDefined();
      }
    });
  });

  describe('updateOpportunitySchema', () => {
    it('allows valid partial updates', () => {
      const payload = {
        title: 'Senior Software Engineer',
        salaryMin: 1500000,
        salaryMax: 2200000,
      };

      const result = updateOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Senior Software Engineer');
        expect(result.data.salaryMin).toBe(1500000);
      }
    });

    it('fails on negative salary in update payload', () => {
      const payload = {
        salaryMin: -50000,
      };

      const result = updateOpportunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.salaryMin).toBeDefined();
      }
    });
  });

  describe('updateOpportunityStatusSchema', () => {
    it('accepts valid status values', () => {
      const validStatuses = ['draft', 'published', 'closed', 'expired', 'rejected'] as const;
      for (const status of validStatuses) {
        const result = updateOpportunityStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status values', () => {
      const result = updateOpportunityStatusSchema.safeParse({ status: 'archived' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCompensation', () => {
    it('passes for valid non-negative compensation ranges where min <= max', () => {
      expect(() => validateCompensation(500000, 800000)).not.toThrow();
      expect(() => validateCompensation(500000, 500000)).not.toThrow();
      expect(() => validateCompensation(0, 0)).not.toThrow();
      expect(() => validateCompensation(null, 500000)).not.toThrow();
      expect(() => validateCompensation(500000, null)).not.toThrow();
      expect(() => validateCompensation(undefined, undefined)).not.toThrow();
      expect(() => validateCompensation(null, null)).not.toThrow();
    });

    it('throws ValidationError when minimum compensation exceeds maximum compensation', () => {
      expect(() => validateCompensation(1000000, 800000)).toThrow(ValidationError);
      expect(() => validateCompensation(1000000, 800000)).toThrow(
        'Minimum compensation cannot exceed maximum compensation.',
      );
    });

    it('throws ValidationError when compensation is negative', () => {
      expect(() => validateCompensation(-1, 500000)).toThrow(ValidationError);
      expect(() => validateCompensation(500000, -100)).toThrow(ValidationError);
      expect(() => validateCompensation(-500, -100)).toThrow(ValidationError);
    });

    it('throws ValidationError when compensation exceeds 10 billion', () => {
      expect(() => validateCompensation(10_000_000_000, 11_000_000_000)).toThrow(ValidationError);
      expect(() => validateCompensation(10_000_000_000, 11_000_000_000)).toThrow(
        'Compensation must be a non-negative amount below 10 billion.',
      );
    });

    it('throws ValidationError when compensation is not finite (Infinity or NaN)', () => {
      expect(() => validateCompensation(Infinity, 100000)).toThrow(ValidationError);
      expect(() => validateCompensation(100000, NaN)).toThrow(ValidationError);
    });
  });

  describe('Business Rule: Past Deadline Validation', () => {
    it('detects past deadlines when attempting to publish', () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const isPast = pastDeadline.getTime() <= Date.now();
      expect(isPast).toBe(true);

      // Simulates the service logic check:
      // if (status === 'published' && deadline <= now) throw new ValidationError(...)
      const validatePublishDeadline = (status: string, deadline: Date) => {
        if (status === 'published' && deadline.getTime() <= Date.now()) {
          throw new ValidationError('Set a future application deadline before publishing');
        }
      };

      expect(() => validatePublishDeadline('published', pastDeadline)).toThrow(ValidationError);
      expect(() => validatePublishDeadline('published', pastDeadline)).toThrow(
        'Set a future application deadline before publishing',
      );

      const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(() => validatePublishDeadline('published', futureDeadline)).not.toThrow();
    });
  });
});
