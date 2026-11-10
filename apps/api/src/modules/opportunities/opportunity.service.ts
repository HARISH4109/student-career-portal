import { db, schema } from '@career-portal/db';
import type {
  AuthenticatedUser,
  CreateOpportunityDto,
  OpportunityListQuery,
  OpportunityResponseDto,
  PaginationMeta,
  UpdateOpportunityDto,
  UpdateOpportunityStatusDto,
} from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';

import { DuplicateDetectionService } from './duplicate-detection.service';
import { EligibilityService } from './eligibility.service';
import { OpportunityRepository } from './opportunity.repository';
import { validateCompensation } from './validate-compensation';

import { CompanyService } from '@/modules/companies/company.service';
import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

/** Valid status transitions for the opportunity lifecycle */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['published', 'rejected'],
  pending_review: ['published', 'rejected', 'draft'],
  published: ['closed', 'expired'],
  closed: ['published'], // allow re-publishing
  expired: ['published'], // allow re-publishing when deadline extended
  rejected: ['draft'],
};

export class OpportunityService {
  constructor(
    private readonly oppRepo: OpportunityRepository = new OpportunityRepository(),
    private readonly companyService: CompanyService = new CompanyService(),
    private readonly eligibilityService: EligibilityService = new EligibilityService(),
    private readonly duplicateService: DuplicateDetectionService = new DuplicateDetectionService(),
  ) {}

  async create(
    dto: CreateOpportunityDto,
    user: AuthenticatedUser,
  ): Promise<OpportunityResponseDto> {
    // Resolve company — either existing ID or create from name
    validateCompensation(dto.salaryMin, dto.salaryMax);
    let companyId = dto.companyId;
    if (!companyId && dto.companyName) {
      const company = await this.companyService.findOrCreate(dto.companyName);
      companyId = company.id;
    }
    if (!companyId) {
      throw new ValidationError('Either companyId or companyName is required');
    }

    return this.oppRepo.transaction(async (repository) => {
    const opportunity = await repository.create({
      companyId,
      title: dto.title,
      type: dto.type,
      description: dto.description,
      workMode: dto.workMode,
      location: dto.location ?? null,
      salaryMin: dto.salaryMin != null ? String(dto.salaryMin) : null,
      salaryMax: dto.salaryMax != null ? String(dto.salaryMax) : null,
      applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : null,
      applyUrl: dto.applyUrl ?? null,
      applicationEmail: dto.applicationEmail ?? null,
      status: 'draft',
      postedBy: user.id,
    });

    if (!opportunity) {
      throw new Error('Failed to create opportunity');
    }

    // Add eligibility criteria
    if (dto.eligibility.length > 0) {
      await repository.addEligibility(
        opportunity.id,
        dto.eligibility.map((e) => ({
          departmentId: e.departmentId ?? null,
          programId: e.programId ?? null,
          batchId: e.batchId ?? null,
          minCgpa: e.minCgpa != null ? String(e.minCgpa) : null,
        })),
      );
    }

    // Add required skills
    if (dto.skills.length > 0) {
      await repository.addSkills(opportunity.id, dto.skills);
    }

    const full = await repository.findById(opportunity.id);
    if (!full) throw new NotFoundError('Opportunity');
    return this.mapToResponse(full);
    });
  }

  async update(
    id: string,
    dto: UpdateOpportunityDto,
    user: AuthenticatedUser,
  ): Promise<OpportunityResponseDto> {
    const existing = await this.oppRepo.findById(id);
    if (!existing) throw new NotFoundError('Opportunity');
    this.requireOwner(existing.postedBy, user, existing.status);
    validateCompensation(dto.salaryMin !== undefined ? dto.salaryMin : existing.salaryMin === null ? null : Number(existing.salaryMin), dto.salaryMax !== undefined ? dto.salaryMax : existing.salaryMax === null ? null : Number(existing.salaryMax));
    if (
      dto.applicationDeadline !== undefined &&
      dto.applicationDeadline !== null
    ) {
      const newDeadline = new Date(dto.applicationDeadline);
      const isExistingSame =
        existing.applicationDeadline &&
        Math.abs(existing.applicationDeadline.getTime() - newDeadline.getTime()) < 60000;
      if (!isExistingSame && existing.status === 'published' && newDeadline <= new Date()) {
        throw new ValidationError('The application deadline must be in the future.');
      }
    }

    // Only draft, pending_review, published, closed, or expired can be edited
    if (!['draft', 'pending_review', 'published', 'closed', 'expired'].includes(existing.status)) {
      throw new ForbiddenError(`Cannot edit opportunity in "${existing.status}" status`);
    }

    // Resolve company if changing
    let companyId = dto.companyId;
    if (!companyId && dto.companyName) {
      const company = await this.companyService.findOrCreate(dto.companyName);
      companyId = company.id;
    }

    return this.oppRepo.transaction(async (repository) => {
    await repository.update(id, {
      ...(companyId ? { companyId } : {}),
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.description ? { description: dto.description } : {}),
      ...(dto.workMode ? { workMode: dto.workMode } : {}),
      ...(dto.location !== undefined ? { location: dto.location ?? null } : {}),
      ...(dto.salaryMin !== undefined ? { salaryMin: dto.salaryMin != null ? String(dto.salaryMin) : null } : {}),
      ...(dto.salaryMax !== undefined ? { salaryMax: dto.salaryMax != null ? String(dto.salaryMax) : null } : {}),
      ...(dto.applicationDeadline !== undefined
        ? { applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : null }
        : {}),
      ...(dto.applyUrl !== undefined ? { applyUrl: dto.applyUrl ?? null } : {}),
      ...(dto.applicationEmail !== undefined ? { applicationEmail: dto.applicationEmail ?? null } : {}),
    });

    // Replace eligibility if provided
    if (dto.eligibility !== undefined) {
      await repository.replaceEligibility(
        id,
        dto.eligibility.map((e) => ({
          departmentId: e.departmentId ?? null,
          programId: e.programId ?? null,
          batchId: e.batchId ?? null,
          minCgpa: e.minCgpa != null ? String(e.minCgpa) : null,
        })),
      );
    }

    // Replace skills if provided
    if (dto.skills !== undefined) {
      await repository.replaceSkills(id, dto.skills);
    }

    const full = await repository.findById(id);
    if (!full) throw new NotFoundError('Opportunity');
    return this.mapToResponse(full);
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateOpportunityStatusDto,
    user: AuthenticatedUser,
  ): Promise<OpportunityResponseDto> {
    const existing = await this.oppRepo.findById(id);
    if (!existing) throw new NotFoundError('Opportunity');
    this.requireOwner(existing.postedBy, user);

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ForbiddenError(
        `Cannot transition from "${existing.status}" to "${dto.status}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    if (dto.status === 'published' && existing.applicationDeadline && existing.applicationDeadline.getTime() <= Date.now()) {
      throw new ValidationError('Set a future application deadline before publishing');
    }

    if (dto.status === 'published' && existing.company.name) {
      const dupCheck = await this.duplicateService.checkDuplicate(
        existing.title,
        existing.company.name,
        { excludeOpportunityId: id, publishedOnly: true },
      );

      if (dupCheck.isDuplicate && dupCheck.matchedOpportunityId) {
        throw new ValidationError(
          `Cannot publish duplicate opportunity. A published opportunity "${(dupCheck.matchedTitle ?? '')}" for company "${(dupCheck.matchedCompanyName ?? '')}" already exists in the portal. To prevent duplicate postings, publishing is restricted.`,
        );
      }
    }
    await this.oppRepo.updateStatus(id, dto.status);
    const full = await this.oppRepo.findById(id);
    if (!full) throw new NotFoundError('Opportunity');
    return this.mapToResponse(full);
  }

  async delete(id: string, user: AuthenticatedUser): Promise<void> {
    const opp = await this.oppRepo.findById(id);
    if (!opp) throw new NotFoundError('Opportunity');

    this.requireOwner(opp.postedBy, user, opp.status);

    if (await this.oppRepo.getApplicationCount(id) > 0) {
      throw new ValidationError('An opportunity with applications must be retained. Close it instead.');
    }

    await this.oppRepo.delete(id);
  }

  async getById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<OpportunityResponseDto> {
    // Auto-expire before fetching
    await this.oppRepo.markExpiredOpportunities();

    const opp = await this.oppRepo.findById(id);
    if (!opp) throw new NotFoundError('Opportunity');

    // Students can only see published opportunities
    const isStudent = !user.permissions.includes('opportunities.create') && !user.permissions.includes('opportunities.publish');
    if (isStudent && opp.status !== 'published') {
      throw new NotFoundError('Opportunity');
    }

    const response = this.mapToResponse(opp);

    // Enrich with student context
    if (isStudent) {
      const studentProfile = await this.getStudentProfile(user.id);
      if (studentProfile) {
        const isEligible = await this.eligibilityService.isStudentEligible(id, {
          departmentId: studentProfile.departmentId,
          programId: studentProfile.programId,
          batchId: studentProfile.batchId,
          cgpa: studentProfile.cgpa,
        });
        const savedIds = await this.oppRepo.getSavedOpportunityIds(studentProfile.id);
        const appliedIds = await this.oppRepo.getAppliedOpportunityIds(studentProfile.id);

        response.isEligible = isEligible;
        response.isSaved = savedIds.has(id);
        response.hasApplied = appliedIds.has(id);
      }
    }

    response.applicationCount = await this.oppRepo.getApplicationCount(id);
    return response;
  }

  async list(
    query: OpportunityListQuery,
    user: AuthenticatedUser,
  ): Promise<{ opportunities: OpportunityResponseDto[]; meta: PaginationMeta }> {
    // Auto-expire before listing
    await this.oppRepo.markExpiredOpportunities();

    const isStudent = !user.permissions.includes('opportunities.create') && !user.permissions.includes('opportunities.publish');
    let studentProfile: Awaited<ReturnType<OpportunityService['getStudentProfile']>> = undefined;

    if (isStudent) {
      studentProfile = await this.getStudentProfile(user.id);
    }

    const filters: Parameters<OpportunityRepository['list']>[1] = {
      // Students only see published
      status: isStudent ? 'published' : query.status,
      type: query.type,
      workMode: query.workMode,
      companyId: query.companyId,
      location: query.location,
      skillId: query.skillId,
      search: query.search,
      closingSoon: query.closingSoon,
      studentProfile: studentProfile
        ? {
            id: studentProfile.id,
            departmentId: studentProfile.departmentId,
            programId: studentProfile.programId,
            batchId: studentProfile.batchId,
            cgpa: studentProfile.cgpa,
          }
        : null,
      eligibleOnly: query.eligibleOnly,
    };

    const result = await this.oppRepo.list(
      { page: query.page, pageSize: query.pageSize },
      filters,
      query.sortBy,
    );

    let responses = result.opportunities.map((o) => this.mapToResponse(o));
    const allOppIds = responses.map((r) => r.id);
    const appCounts = await this.oppRepo.getApplicationCounts(allOppIds);
    responses = responses.map((r) => ({
      ...r,
      applicationCount: appCounts.get(r.id) ?? 0,
    }));

    // Enrich with student context (bulk)
    if (isStudent && studentProfile) {
      const oppIds = responses.map((r) => r.id);
      const [eligibilityMap, savedIds, appliedIds] = await Promise.all([
        this.eligibilityService.checkBulkEligibility(oppIds, {
          departmentId: studentProfile.departmentId,
          programId: studentProfile.programId,
          batchId: studentProfile.batchId,
          cgpa: studentProfile.cgpa,
        }),
        this.oppRepo.getSavedOpportunityIds(studentProfile.id),
        this.oppRepo.getAppliedOpportunityIds(studentProfile.id),
      ]);

      responses = responses.map((r) => ({
        ...r,
        isEligible: eligibilityMap.get(r.id) ?? true,
        isSaved: savedIds.has(r.id),
        hasApplied: appliedIds.has(r.id),
        isClosingSoon: this.isClosingSoon(r.applicationDeadline as string | null),
      }));
    }

    return { opportunities: responses, meta: result.meta };
  }

  private requireOwner(
    postedBy: string,
    user: AuthenticatedUser,
    status?: 'draft' | 'pending_review' | 'published' | 'closed' | 'expired' | 'rejected',
  ): void {
    if (user.roles.includes('ADMIN')) return;
    if (postedBy === user.id) return;

    const isFaculty =
      user.roles.includes('PLACEMENT_FACULTY') ||
      user.roles.some((r) => r.toUpperCase().includes('FACULTY')) ||
      user.permissions.includes('opportunities.create') ||
      user.permissions.includes('opportunities.edit') ||
      user.permissions.includes('opportunities.publish');

    if (isFaculty && status !== 'draft') {
      return;
    }

    throw new ForbiddenError(
      status === 'draft'
        ? 'Only the opportunity owner or an administrator can modify a private draft'
        : 'Only the opportunity owner, faculty, or an administrator can modify it',
    );
  }

  private isClosingSoon(deadline: string | null | undefined): boolean {
    if (!deadline) return false;
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }

  private async getStudentProfile(userId: string) {
    return db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, userId),
    });
  }

  private mapToResponse(opp: NonNullable<Awaited<ReturnType<OpportunityRepository['findById']>>>): OpportunityResponseDto {
    const skills =
      opp.opportunitySkills.map((os) => ({
        skillId: os.skillId,
        name: os.skill.name,
        category: os.skill.category,
        isRequired: os.isRequired,
      }));

    const eligibility =
      opp.eligibility.map((e) => ({
        id: e.id,
        opportunityId: e.opportunityId,
        departmentId: e.departmentId ?? null,
        departmentName: e.department?.name ?? null,
        programId: e.programId ?? null,
        programName: e.program?.name ?? null,
        batchId: e.batchId ?? null,
        graduationYear: e.batch?.graduationYear ?? null,
        minCgpa: e.minCgpa ? parseFloat(e.minCgpa) : null,
      }));

    return {
      id: opp.id,
      companyId: opp.companyId,
      company: {
            id: opp.company.id,
            name: opp.company.name,
            logoUrl: opp.company.logoUrl ?? null,
            website: opp.company.website ?? null,
            industry: opp.company.industry ?? null,
            description: opp.company.description ?? null,
            createdAt: opp.company.createdAt,
            updatedAt: opp.company.updatedAt,
          },
      title: opp.title,
      type: opp.type,
      description: opp.description,
      workMode: opp.workMode,
      location: opp.location ?? null,
      salaryMin: opp.salaryMin != null ? parseFloat(opp.salaryMin) : null,
      salaryMax: opp.salaryMax != null ? parseFloat(opp.salaryMax) : null,
      applicationDeadline: opp.applicationDeadline
        ? new Date(opp.applicationDeadline).toISOString()
        : null,
      applyUrl: opp.applyUrl ?? null,
      applicationEmail: opp.applicationEmail ?? null,
      status: opp.status,
      postedBy: opp.postedBy,
      sourceDraftId: opp.sourceDraftId ?? null,
      skills,
      eligibility,
      applicationCount: 0,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    };
  }
}
