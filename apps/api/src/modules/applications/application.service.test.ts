import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';

import type { ApplicationRepository } from './application.repository';
import { ApplicationService } from './application.service';

import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import type { AuthenticatedUser } from '@/shared/types/auth.types';

describe('ApplicationService - updateStudentSelfStatus', () => {
  const studentUserId = randomUUID();
  const studentProfileId = randomUUID();
  const applicationId = randomUUID();
  const opportunityId = randomUUID();

  const mockStudentUser: AuthenticatedUser = {
    id: studentUserId,
    email: 'student@cse.edu',
    roles: ['student'],
    permissions: ['applications.view_own'],
  };

  let appRepoMock: Mocked<ApplicationRepository>;
  let service: ApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();

    appRepoMock = {
      findById: vi.fn(),
      findByStudentAndOpportunity: vi.fn(),
      findStudentProfileByUserId: vi.fn(),
      findResumeById: vi.fn(),
      findOpportunityById: vi.fn(),
      findDefaultResumeByStudentId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      updateStudentApplicationStatus: vi.fn(),
      listByStudent: vi.fn(),
      listByOpportunity: vi.fn(),
    } as unknown as Mocked<ApplicationRepository>;

    service = new ApplicationService(appRepoMock);
  });

  it('throws NotFoundError if the application does not exist', async () => {
    appRepoMock.findById.mockResolvedValueOnce(null);

    await expect(
      service.updateStudentSelfStatus(
        applicationId,
        { status: 'interview', remarks: 'Got interview call' },
        mockStudentUser,
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError if the student is not the owner of the application', async () => {
    const otherStudentProfileId = randomUUID();

    appRepoMock.findById.mockResolvedValueOnce({
      id: applicationId,
      studentId: otherStudentProfileId,
      opportunityId,
      status: 'applied',
    } as never);

    appRepoMock.findStudentProfileByUserId.mockResolvedValueOnce({
      id: studentProfileId,
      userId: studentUserId,
    } as never);

    await expect(
      service.updateStudentSelfStatus(
        applicationId,
        { status: 'interview', remarks: 'Got call' },
        mockStudentUser,
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws ValidationError for an unsupported status', async () => {
    appRepoMock.findById.mockResolvedValueOnce({
      id: applicationId,
      studentId: studentProfileId,
      opportunityId,
      status: 'applied',
    } as never);

    appRepoMock.findStudentProfileByUserId.mockResolvedValueOnce({
      id: studentProfileId,
      userId: studentUserId,
    } as never);

    await expect(
      service.updateStudentSelfStatus(
        applicationId,
        // @ts-expect-error testing invalid status runtime validation
        { status: 'invalid_status', remarks: 'test' },
        mockStudentUser,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ForbiddenError when a student attempts to self-assign selected or interview', async () => {
    appRepoMock.findById.mockResolvedValue({
      id: applicationId,
      studentId: studentProfileId,
      opportunityId,
      status: 'applied',
    } as never);

    appRepoMock.findStudentProfileByUserId.mockResolvedValue({
      id: studentProfileId,
      userId: studentUserId,
    } as never);

    await expect(
      service.updateStudentSelfStatus(
        applicationId,
        { status: 'selected', remarks: 'Self-selected' },
        mockStudentUser,
      ),
    ).rejects.toThrow(ForbiddenError);

    await expect(
      service.updateStudentSelfStatus(
        applicationId,
        { status: 'interview', remarks: 'Got interview call' },
        mockStudentUser,
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('successfully withdraws a non-terminal application and returns mapped response', async () => {
    const existingApp = {
      id: applicationId,
      studentId: studentProfileId,
      opportunityId,
      status: 'applied',
      student: {
        user: { fullName: 'CSE Student' },
        rollNumber: 'CS2026-001',
      },
      opportunity: {
        id: opportunityId,
        title: 'Full Stack Engineer',
        company: { name: 'Tech Corp' },
        departmentId: randomUUID(),
        type: 'job',
        workMode: 'remote',
        location: 'Bengaluru',
        status: 'published',
        postedBy: randomUUID(),
        opportunitySkills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedApp = {
      ...existingApp,
      status: 'withdrawn',
      statusHistory: [
        {
          id: randomUUID(),
          status: 'withdrawn',
          changedBy: studentUserId,
          changedByUser: { fullName: 'CSE Student' },
          remarks: 'Accepted another offer',
          changedAt: new Date(),
        },
      ],
    };

    appRepoMock.findById
      .mockResolvedValueOnce(existingApp as never)
      .mockResolvedValueOnce(updatedApp as never);

    appRepoMock.findStudentProfileByUserId.mockResolvedValueOnce({
      id: studentProfileId,
      userId: studentUserId,
    } as never);

    const result = await service.updateStudentSelfStatus(
      applicationId,
      { status: 'withdrawn', remarks: 'Accepted another offer' },
      mockStudentUser,
    );

    expect(appRepoMock.updateStudentApplicationStatus).toHaveBeenCalledWith(
      applicationId,
      'withdrawn',
      studentUserId,
      'Accepted another offer',
    );
    expect(result.status).toBe('withdrawn');
    expect(result.statusHistory).toHaveLength(1);
    expect(result.statusHistory[0]?.remarks).toBe('Accepted another offer');
  });
});
