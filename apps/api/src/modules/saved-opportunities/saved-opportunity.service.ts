import { db, schema } from '@career-portal/db';
import type {
  AuthenticatedUser,
  PaginationMeta,
  PaginationQuery,
  SavedOpportunityResponseDto,
} from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';

import { SavedOpportunityRepository } from './saved-opportunity.repository';

import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

export class SavedOpportunityService {
  constructor(
    private readonly savedRepo: SavedOpportunityRepository = new SavedOpportunityRepository(),
  ) {}

  async save(
    opportunityId: string,
    user: AuthenticatedUser,
  ): Promise<SavedOpportunityResponseDto> {
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, user.id),
    });
    if (!studentProfile) throw new NotFoundError('Student profile');

    // Verify opportunity exists
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(schema.opportunities.id, opportunityId),
    });
    if (!opportunity || opportunity.status !== 'published') throw new NotFoundError('Opportunity');

    // Check for duplicate
    const existing = await this.savedRepo.findByStudentAndOpportunity(
      studentProfile.id,
      opportunityId,
    );
    if (existing) {
      throw new ConflictError('Opportunity already saved');
    }

    const saved = await this.savedRepo.save(studentProfile.id, opportunityId);
    if (!saved) throw new Error('Failed to save opportunity');

    return {
      id: saved.id,
      studentId: saved.studentId,
      opportunityId: saved.opportunityId,
      createdAt: saved.createdAt,
    };
  }

  async unsave(opportunityId: string, user: AuthenticatedUser): Promise<void> {
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, user.id),
    });
    if (!studentProfile) throw new NotFoundError('Student profile');

    await this.savedRepo.unsave(studentProfile.id, opportunityId);
  }

  async list(
    user: AuthenticatedUser,
    pagination: PaginationQuery,
  ): Promise<{ saved: SavedOpportunityResponseDto[]; meta: PaginationMeta }> {
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, user.id),
    });
    if (!studentProfile) {
      return { saved: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
    }

    const result = await this.savedRepo.listByStudent(studentProfile.id, pagination);
    return {
      saved: result.saved.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        opportunityId: s.opportunityId,
        createdAt: s.createdAt,
      })),
      meta: result.meta,
    };
  }
}
