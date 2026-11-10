import type { ApiSuccessResponse } from '@career-portal/shared-types';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { HealthStatus } from './health.service';

import { createApp } from '@/app';


describe('GET /api/v1/health', () => {
  it('returns a health status envelope', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/health');
    const body = response.body as ApiSuccessResponse<HealthStatus>;

    expect([200, 503]).toContain(response.status);
    expect(body).toHaveProperty('success');
    expect(body.data).toHaveProperty('dependencies');
  });
});
