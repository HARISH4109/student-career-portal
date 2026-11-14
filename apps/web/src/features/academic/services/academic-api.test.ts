import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/lib/api-client';
import {
  createAcademicProgram,
  createAcademicStream,
  deleteAcademicProgram,
  getAcademicPrograms,
} from './academic-api';

vi.mock('@/shared/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('academic-api client', () => {
  it('calls GET /api/v1/academic/programs and returns programs with streams', async () => {
    const mockPrograms = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        departmentId: '22222222-2222-2222-2222-222222222222',
        name: 'B.Tech Computer Science & Engineering',
        degreeLevel: 'B.Tech',
        durationYears: 4,
        isActive: true,
        streams: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            programId: '11111111-1111-1111-1111-111111111111',
            name: 'Artificial Intelligence & Data Science',
            code: 'AI-DS',
            isActive: true,
          },
        ],
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: mockPrograms },
    });

    const result = await getAcademicPrograms();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/academic/programs');
    expect(result).toEqual(mockPrograms);
  });

  it('calls POST /api/v1/academic/programs with program payload', async () => {
    const payload = {
      name: 'Master of Computer Applications (MCA)',
      degreeLevel: 'MCA',
      durationYears: 2,
    };
    const mockCreated = {
      id: '44444444-4444-4444-4444-444444444444',
      departmentId: '22222222-2222-2222-2222-222222222222',
      ...payload,
      isActive: true,
      streams: [],
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: mockCreated },
    });

    const result = await createAcademicProgram(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/academic/programs', payload);
    expect(result.name).toBe('Master of Computer Applications (MCA)');
  });

  it('calls POST /api/v1/academic/streams with stream payload', async () => {
    const streamPayload = {
      programId: '11111111-1111-1111-1111-111111111111',
      name: 'Cyber Security',
      code: 'CSE-CS',
    };
    const mockCreatedStream = {
      id: '55555555-5555-5555-5555-555555555555',
      ...streamPayload,
      isActive: true,
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: mockCreatedStream },
    });

    const result = await createAcademicStream(streamPayload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/academic/streams', streamPayload);
    expect(result.code).toBe('CSE-CS');
  });

  it('calls DELETE /api/v1/academic/programs/:id to drop program', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

    await deleteAcademicProgram('11111111-1111-1111-1111-111111111111');
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/api/v1/academic/programs/11111111-1111-1111-1111-111111111111',
    );
  });
});

