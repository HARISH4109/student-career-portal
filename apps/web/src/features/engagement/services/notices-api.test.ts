import { beforeAll, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/lib/api-client';
import {
  createNotice,
  expireNotice,
  getStaffNotices,
  getStudentNotices,
  publishNotice,
  setNoticePin,
  updateNotice,
} from './notices-api';

vi.mock('@/shared/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Notices API client', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it('builds query parameters correctly for student notices', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } },
    });

    await getStudentNotices({
      category: 'placement',
      search: 'campus',
      isPinned: true,
      page: 2,
      pageSize: 10,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/notices?category=placement&search=campus&isPinned=true&page=2&pageSize=10',
    );
  });

  it('calls /manage endpoint for staff notices', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } },
    });

    await getStaffNotices({ category: 'academic' });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notices/manage?category=academic');
  });

  it('submits create notice payload correctly', async () => {
    const mockNotice = {
      id: '123',
      title: 'Drive',
      content: 'Content',
      category: 'placement' as const,
      status: 'published' as const,
      postedBy: 'staff-id',
      targetAudience: {},
      attachments: [],
      isPinned: false,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: mockNotice } });

    const result = await createNotice({
      title: 'Drive',
      content: 'Content',
      category: 'placement',
      status: 'published',
      targetAudience: {},
      attachments: [],
      isPinned: false,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notices', expect.objectContaining({ title: 'Drive' }));
    expect(result.id).toBe('123');
  });

  it('submits update notice payload correctly', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { data: { id: '123', title: 'Updated' } },
    });

    await updateNotice('123', { title: 'Updated' });
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/notices/123', { title: 'Updated' });
  });

  it('calls pin, expire, and publish endpoints', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { data: { id: '123' } } });

    await setNoticePin('123', true);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/notices/123/pin', { isPinned: true });

    await expireNotice('123');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/notices/123/expire');

    await publishNotice('123');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/notices/123/publish');
  });
});
