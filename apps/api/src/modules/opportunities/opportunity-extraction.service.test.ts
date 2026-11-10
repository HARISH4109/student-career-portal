import { describe, expect, it, vi, beforeEach } from 'vitest';

import { OpportunityExtractionService } from './opportunity-extraction.service';

import { env } from '@/config/env';
import { InternalError, ValidationError } from '@/shared/errors/app-error';


describe('OpportunityExtractionService', () => {
  let service: OpportunityExtractionService;

  beforeEach(() => {
    service = new OpportunityExtractionService();
    vi.restoreAllMocks();
  });

  it('throws InternalError if N8N_EXTRACTION_WEBHOOK_URL is not configured', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = undefined;

    await expect(service.extract('url', 'https://example.com/jobs/1')).rejects.toThrow(
      InternalError,
    );

    env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
  });

  it('successfully parses valid extracted data from n8n response', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/job-extraction';

    const mockPayload = {
      title: 'Full Stack Engineer',
      type: 'job',
      companyName: 'Acme Corp',
      description: 'Exciting full stack role with React and Node.js',
      workMode: 'hybrid',
      location: 'Bengaluru, India',
      salaryMin: 1200000,
      salaryMax: 1800000,
      applicationDeadline: '2026-10-31T23:59:59.000Z',
      skills: ['TypeScript', 'React', 'Node.js'],
      eligibility: {
        departmentCodes: ['CSE', 'ECE'],
        allowedBatches: [2026],
        minCgpa: 7.5,
        description: 'B.Tech CSE/ECE only with >= 7.5 CGPA',
      },
      confidenceScore: 0.95,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPayload),
    });

    const result = await service.extract('url', 'https://example.com/jobs/1');

    expect(result.title).toBe('Full Stack Engineer');
    expect(result.companyName).toBe('Acme Corp');
    expect(result.confidenceScore).toBe(95);
    expect(result.skills).toEqual(['TypeScript', 'React', 'Node.js']);
    expect(result.eligibility.minCgpa).toBe(7.5);
    expect(result.eligibility.description).toBe('B.Tech CSE/ECE only with >= 7.5 CGPA');

    env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
  });

  it('handles array-wrapped n8n webhook responses', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/job-extraction';

    const mockPayload = {
      title: 'Backend Intern',
      type: 'internship',
      companyName: 'Stripe',
      description: 'Internship opportunity for backend developers',
      workMode: 'remote',
      skills: ['Go', 'PostgreSQL'],
      eligibility: {
        departmentCodes: [],
        allowedBatches: [],
        description: 'Open to all final year engineering students',
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockPayload]), // array-wrapped
    });

    const result = await service.extract('text', 'Looking for backend interns...');

    expect(result.title).toBe('Backend Intern');
    expect(result.companyName).toBe('Stripe');
    expect(result.type).toBe('internship');

    env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
  });

  it('normalizes compensation written as a range in lakhs', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';
    try {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ title: 'Engineer', companyName: 'Test Company', type: 'job', description: 'Build services', salary: '6-8 LPA' }) });
      const result = await service.extract('text', 'Engineer role');
      expect(result.salaryMin).toBe(600000);
      expect(result.salaryMax).toBe(800000);
    } finally {
      env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
    }
  });

  it('throws ValidationError if n8n returns schema-violating data', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/job-extraction';

    const invalidPayload = {
      title: 'Missing company and description',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(invalidPayload),
    });

    await expect(service.extract('url', 'https://example.com')).rejects.toThrow(
      ValidationError,
    );

    env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
  });

  it('supports image/flyer extraction with base64 dataUrl, fileName, and mimeType', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/job-extraction';

    const mockPayload = {
      title: 'Graduate Trainee Engineer',
      type: 'job',
      companyName: 'Infosys',
      description: 'Campus hiring drive for 2026 batch graduates',
      workMode: 'onsite',
      location: 'Mysore, India',
      salaryMin: 450000,
      salaryMax: 650000,
      skills: ['Java', 'Python'],
      eligibility: {
        departmentCodes: ['CSE', 'ISE', 'ECE'],
        allowedBatches: [2026],
        minCgpa: 6.5,
        description: 'No active backlogs',
      },
      confidenceScore: 0.92,
    };

    let capturedBody: Record<string, unknown> = {};
    global.fetch = vi.fn().mockImplementationOnce((_url: string, options: RequestInit) => {
      if (typeof options.body !== 'string') throw new Error('Expected JSON body');
      capturedBody = JSON.parse(options.body) as Record<string, unknown>;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPayload),
      });
    });

    const result = await service.extract(
      'image',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'placement_poster.png',
      'image/png',
    );

    expect(result.title).toBe('Graduate Trainee Engineer');
    expect(result.companyName).toBe('Infosys');
    expect(capturedBody.sourceType).toBe('image');
    expect(capturedBody.fileName).toBe('placement_poster.png');
    expect(capturedBody.mimeType).toBe('image/png');
    expect(capturedBody.imageBase64).toBeDefined();
    expect(capturedBody.dataUrl).toContain('data:image/png;base64,');

    env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
  });

  it('correctly normalizes applyUrl and applicationEmail from n8n response', async () => {
    const originalUrl = env.N8N_EXTRACTION_WEBHOOK_URL;
    env.N8N_EXTRACTION_WEBHOOK_URL = 'https://n8n.example.com/webhook/job-extraction';

    const mockPayload = {
      title: 'DevOps Intern',
      type: 'internship',
      companyName: 'Cloud Native Labs',
      description: 'DevOps internship.\n\nHow to Apply:\n• Apply Link: https://forms.gle/test123\n• Submit Email: careers@cloudnative.io',
      workMode: 'remote',
      applyUrl: 'https://forms.gle/test123',
      applicationEmail: 'careers@cloudnative.io',
      skills: ['Docker', 'Kubernetes'],
      eligibility: {
        departmentCodes: ['CSE', 'IT'],
        allowedBatches: [2026],
        description: null,
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPayload),
    });

    const result = await service.extract('text', 'Looking for devops intern...');

    expect(result.applyUrl).toBe('https://forms.gle/test123');
    expect(result.applicationEmail).toBe('careers@cloudnative.io');
    expect(result.description).toContain('careers@cloudnative.io');

    env.N8N_EXTRACTION_WEBHOOK_URL = originalUrl;
  });
});
