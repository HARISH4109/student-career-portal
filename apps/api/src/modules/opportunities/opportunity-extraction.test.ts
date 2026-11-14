import { extractedOpportunitySchema } from '@career-portal/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  normalizeN8nPayload,
  OpportunityExtractionService,
} from './opportunity-extraction.service';

import { env } from '@/config/env';
import { InternalError, ValidationError } from '@/shared/errors/app-error';

describe('Opportunity Extraction & n8n Payload Normalization', () => {
  let service: OpportunityExtractionService;

  beforeEach(() => {
    service = new OpportunityExtractionService();
    vi.restoreAllMocks();
  });

  describe('1. normalizeN8nPayload — Wrapper Unwrapping', () => {
    it('unwraps array-wrapped n8n payloads [ { ... } ]', () => {
      const raw = [{ title: 'Software Engineer', companyName: 'Google' }];
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.title).toBe('Software Engineer');
      expect(result.companyName).toBe('Google');
    });

    it('unwraps nested n8n structure: [ { json: { ... } } ]', () => {
      const raw = [{ json: { title: 'DevOps Engineer', companyName: 'Amazon', type: 'job' } }];
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.title).toBe('DevOps Engineer');
      expect(result.companyName).toBe('Amazon');
    });

    it('unwraps { data: { ... } } wrapper', () => {
      const raw = { data: { title: 'Frontend Developer', companyName: 'Meta' } };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.title).toBe('Frontend Developer');
    });

    it('unwraps { output: { ... } } wrapper', () => {
      const raw = { output: { title: 'Data Scientist', companyName: 'Apple' } };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.title).toBe('Data Scientist');
    });

    it('unwraps { body: { ... } } wrapper', () => {
      const raw = { body: { title: 'ML Researcher', companyName: 'OpenAI' } };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.title).toBe('ML Researcher');
    });

    it('returns raw primitive or non-object safely', () => {
      expect(normalizeN8nPayload(null)).toBeNull();
      expect(normalizeN8nPayload('raw-string')).toBe('raw-string');
      expect(normalizeN8nPayload(123)).toBe(123);
    });
  });

  describe('2. normalizeN8nPayload — Type and WorkMode Normalization', () => {
    it('normalizes job vs internship variants', () => {
      expect((normalizeN8nPayload({ type: 'JOB' }) as Record<string, unknown>).type).toBe('job');
      expect((normalizeN8nPayload({ type: 'INTERNSHIP' }) as Record<string, unknown>).type).toBe(
        'internship',
      );
      expect(
        (normalizeN8nPayload({ type: 'Summer Internship 2026' }) as Record<string, unknown>).type,
      ).toBe('internship');
      expect((normalizeN8nPayload({}) as Record<string, unknown>).type).toBe('job'); // default
    });

    it('normalizes workMode casing and phrasing variations', () => {
      expect(
        (normalizeN8nPayload({ workMode: 'REMOTE' }) as Record<string, unknown>).workMode,
      ).toBe('remote');
      expect(
        (normalizeN8nPayload({ workMode: 'Work From Home / Remote' }) as Record<string, unknown>)
          .workMode,
      ).toBe('remote');
      expect(
        (normalizeN8nPayload({ workMode: 'Hybrid (3 days in office)' }) as Record<string, unknown>)
          .workMode,
      ).toBe('hybrid');
      expect(
        (normalizeN8nPayload({ workMode: 'ONSITE (PAN India)' }) as Record<string, unknown>)
          .workMode,
      ).toBe('onsite');
      expect((normalizeN8nPayload({}) as Record<string, unknown>).workMode).toBe('onsite'); // default
    });
  });

  describe('3. normalizeN8nPayload — Salary Parsing & Currency Multipliers', () => {
    it('parses LPA and Lakhs multiplier (100,000)', () => {
      const raw = { salaryMin: '12 LPA', salaryMax: '15 Lakhs' };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.salaryMin).toBe(1200000);
      expect(result.salaryMax).toBe(1500000);
    });

    it('parses Crore multiplier (10,000,000)', () => {
      const raw = { salaryMin: '1.2 Cr', salaryMax: '1.5 Crore' };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.salaryMin).toBe(12000000);
      expect(result.salaryMax).toBe(15000000);
    });

    it('parses Thousand / K multiplier (1,000)', () => {
      const raw = { salaryMin: '40k', salaryMax: '60 thousand' };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.salaryMin).toBe(40000);
      expect(result.salaryMax).toBe(60000);
    });

    it('parses salary range string (e.g., "6 - 10 LPA")', () => {
      const raw = { salary: '6 - 10 LPA' };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.salaryMin).toBe(600000);
      expect(result.salaryMax).toBe(1000000);
    });

    it('parses single salary string (e.g., "8 LPA")', () => {
      const raw = { compensation: '8 LPA' };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.salaryMin).toBe(800000);
      expect(result.salaryMax).toBeNull();
    });

    it('handles explicit unpaid or zero salary variants', () => {
      const variants = ['unpaid', '0', 'nil', 'none', 'free'];
      for (const v of variants) {
        const result = normalizeN8nPayload({ salaryMin: v }) as Record<string, unknown>;
        expect(result.salaryMin).toBe(0);
      }
    });

    it('handles undisclosed or not provided compensation as null', () => {
      const variants = [
        'Not Provided',
        'not specified',
        'Undisclosed',
        'Competitive',
        'Best in industry',
        'as per standards',
        'N/A',
        '-',
        '',
      ];
      for (const v of variants) {
        const result = normalizeN8nPayload({ salaryMin: v }) as Record<string, unknown>;
        expect(result.salaryMin).toBeNull();
      }
    });

    it('falls back to 0 salary when description explicitly mentions "unpaid" or "no stipend"', () => {
      const raw = {
        title: 'Content Writing Intern',
        description: 'This is an unpaid summer internship with college credit.',
      };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.salaryMin).toBe(0);
      expect(result.salaryMax).toBe(0);
    });
  });

  describe('4. normalizeN8nPayload — Skills, Eligibility & Missing Fields', () => {
    it('splits comma/semicolon/newline-delimited skills into a clean array', () => {
      const raw = { skills: 'TypeScript, React.js; Node.js\nPostgreSQL , Docker' };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.skills).toEqual(['TypeScript', 'React.js', 'Node.js', 'PostgreSQL', 'Docker']);
    });

    it('normalizes missing or non-array skills to empty array', () => {
      expect((normalizeN8nPayload({}) as Record<string, unknown>).skills).toEqual([]);
      expect((normalizeN8nPayload({ skills: null }) as Record<string, unknown>).skills).toEqual([]);
    });

    it('normalizes department codes, allowed batches, and minCgpa in eligibility', () => {
      const raw = {
        eligibility: {
          minCgpa: '7.5',
          departmentCodes: 'CSE, ECE; IT',
          allowedBatches: '2025, 2026',
        },
      };
      const result = normalizeN8nPayload(raw) as { eligibility: Record<string, unknown> };
      expect(result.eligibility.minCgpa).toBe(7.5);
      expect(result.eligibility.departmentCodes).toEqual(['CSE', 'ECE', 'IT']);
      expect(result.eligibility.allowedBatches).toEqual([2025, 2026]);
    });

    it('normalizes confidence score between 0 and 1 by multiplying by 100', () => {
      const raw1 = { confidenceScore: 0.95 };
      expect(
        (normalizeN8nPayload(raw1) as Record<string, unknown>).confidenceScore,
      ).toBe(95);

      const raw2 = { confidenceScore: 88 };
      expect(
        (normalizeN8nPayload(raw2) as Record<string, unknown>).confidenceScore,
      ).toBe(88);
    });

    it('normalizes "Not Specified" deadline strings to null', () => {
      const raw = { applicationDeadline: 'Not Specified' };
      expect(
        (normalizeN8nPayload(raw) as Record<string, unknown>).applicationDeadline,
      ).toBeNull();
    });

    it('normalizes invalid applyUrl and applicationEmail to null', () => {
      const raw = {
        applyUrl: 'not specified',
        applicationEmail: 'n/a',
      };
      const result = normalizeN8nPayload(raw) as Record<string, unknown>;
      expect(result.applyUrl).toBeNull();
      expect(result.applicationEmail).toBeNull();
    });
  });

  describe('5. extractedOpportunitySchema Validation', () => {
    it('validates a complete and correctly normalized opportunity payload', () => {
      const validPayload = {
        title: 'Cloud Infrastructure Engineer',
        companyName: 'HashiCorp',
        type: 'job' as const,
        description: 'Manage Terraform and Nomad infrastructure across cloud regions.',
        workMode: 'remote' as const,
        location: 'Remote, India',
        salaryMin: 1800000,
        salaryMax: 2400000,
        applicationDeadline: '2026-12-31T23:59:59.000Z',
        applyUrl: 'https://careers.hashicorp.com/jobs/101',
        applicationEmail: 'recruiting@hashicorp.com',
        skills: ['Terraform', 'Go', 'AWS'],
        eligibility: {
          minCgpa: 8.0,
          departmentCodes: ['CSE', 'IT'],
          allowedBatches: [2026],
          description: 'CSE/IT graduates with >= 8.0 CGPA',
        },
        confidenceScore: 92,
      };

      const parsed = extractedOpportunitySchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.title).toBe('Cloud Infrastructure Engineer');
        expect(parsed.data.salaryMin).toBe(1800000);
        expect(parsed.data.skills).toHaveLength(3);
      }
    });

    it('rejects payload when title or companyName is missing or empty', () => {
      const missingTitle = {
        companyName: 'Acme',
        type: 'job',
        description: 'Valid description',
      };
      expect(extractedOpportunitySchema.safeParse(missingTitle).success).toBe(false);

      const emptyCompanyName = {
        title: 'Backend Engineer',
        companyName: '',
        type: 'job',
        description: 'Valid description',
      };
      expect(extractedOpportunitySchema.safeParse(emptyCompanyName).success).toBe(false);
    });

    it('rejects payload when description is missing or empty', () => {
      const missingDesc = {
        title: 'Backend Engineer',
        companyName: 'Acme',
        type: 'job',
      };
      expect(extractedOpportunitySchema.safeParse(missingDesc).success).toBe(false);
    });

    it('rejects payload when type is not "job" or "internship"', () => {
      const invalidType = {
        title: 'Contractor',
        companyName: 'Acme',
        type: 'part-time',
        description: 'Valid description',
      };
      expect(extractedOpportunitySchema.safeParse(invalidType).success).toBe(false);
    });
  });

  describe('6. OpportunityExtractionService.extract Integration with n8n Webhook', () => {
    it('throws InternalError when webhook URL is not configured', async () => {
      const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
      env.N8N_EXTRACTION_WEBHOOK_URL = undefined;

      await expect(service.extract('text', 'Senior Software Engineer')).rejects.toThrow(
        InternalError,
      );

      env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
    });

    it('throws ValidationError when n8n webhook returns incomplete/invalid payload', async () => {
      const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
      env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ unexpected: 'garbage data without title' }),
      });

      await expect(service.extract('url', 'https://jobs.example.com/1')).rejects.toThrow(
        ValidationError,
      );

      env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
    });

    it('successfully extracts and normalizes payload end-to-end', async () => {
      const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
      env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';

      const mockResponse = {
        title: 'Associate Product Manager',
        companyName: 'Flipkart',
        type: 'job',
        description: 'Lead product initiatives across checkout and cart experiences.',
        workMode: 'onsite',
        salary: '18-22 LPA',
        confidenceScore: 0.94,
        skills: 'Product Management, SQL, Agile',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockResponse]),
      });

      const result = await service.extract('text', 'Looking for Associate Product Managers');

      expect(result.title).toBe('Associate Product Manager');
      expect(result.companyName).toBe('Flipkart');
      expect(result.salaryMin).toBe(1800000);
      expect(result.salaryMax).toBe(2200000);
      expect(result.confidenceScore).toBe(94);
      expect(result.skills).toEqual(['Product Management', 'SQL', 'Agile']);

      env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
    });
  });
});
