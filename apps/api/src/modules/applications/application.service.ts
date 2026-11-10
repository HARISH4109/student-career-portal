import { db, schema } from '@career-portal/db';
import type {
  ApplicationListQuery,
  ApplicationResponseDto,
  AuthenticatedUser,
  CreateApplicationDto,
  PaginationMeta,
  UpdateApplicationStatusDto,
} from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';

import { ApplicationRepository, type ApplicationStatus } from './application.repository';

import { EligibilityService } from '@/modules/opportunities/eligibility.service';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

/** Application statuses that allow withdrawal */
const WITHDRAWABLE_STATUSES = ['applied', 'under_review', 'shortlisted'];

export class ApplicationService {
  constructor(
    private readonly appRepo: ApplicationRepository = new ApplicationRepository(),
    private readonly eligibilityService: EligibilityService = new EligibilityService(),
  ) {}

  async apply(
    dto: CreateApplicationDto,
    user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    // Get student profile
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, user.id),
    });
    if (!studentProfile) {
      throw new NotFoundError('Student profile');
    }

    if (!studentProfile.isPlacementEligible) throw new ForbiddenError('Your profile is not eligible for placements');

    // Check opportunity exists and is published
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(schema.opportunities.id, dto.opportunityId),
    });
    if (!opportunity) {
      throw new NotFoundError('Opportunity');
    }
    if (opportunity.status !== 'published') {
      throw new ForbiddenError('Cannot apply to an opportunity that is not published');
    }

    // Check deadline
    if (opportunity.applicationDeadline) {
      const deadline = new Date(opportunity.applicationDeadline);
      if (deadline <= new Date()) {
        throw new ForbiddenError('Application deadline has passed');
      }
    }

    // Check duplicate application
    const existing = await this.appRepo.findByStudentAndOpportunity(
      studentProfile.id,
      dto.opportunityId,
    );
    if (existing) {
      throw new ConflictError('You have already applied to this opportunity');
    }

    // Server-side eligibility check
    const isEligible = await this.eligibilityService.isStudentEligible(dto.opportunityId, {
      departmentId: studentProfile.departmentId,
      programId: studentProfile.programId,
      batchId: studentProfile.batchId,
      cgpa: studentProfile.cgpa,
    });
    if (!isEligible) {
      throw new ForbiddenError('You do not meet the eligibility criteria for this opportunity');
    }

    // Verify resume belongs to student if provided, or fallback to first resume
    let resumeId: string | null = null;
    if (dto.resumeId) {
      const resume = await db.query.resumes.findFirst({
        where: eq(schema.resumes.id, dto.resumeId),
      });
      if (!resume || resume.studentId !== studentProfile.id) {
        throw new ValidationError('Resume not found or does not belong to you');
      }
      resumeId = resume.id;
    } else {
      const defaultResume = await db.query.resumes.findFirst({
        where: eq(schema.resumes.studentId, studentProfile.id),
      });
      resumeId = defaultResume?.id ?? null;
    }

    // Create application
    const application = await this.appRepo.create({
      opportunityId: dto.opportunityId,
      studentId: studentProfile.id,
      resumeId,
      coverNote: dto.coverNote ?? null,
      changedBy: user.id,
    });

    

    const full = await this.appRepo.findById(application.id);
    if (!full) throw new NotFoundError('Application');
    return this.mapToResponse(full);
  }

  async withdraw(id: string, user: AuthenticatedUser): Promise<ApplicationResponseDto> {
    const application = await this.appRepo.findById(id);
    if (!application) throw new NotFoundError('Application');

    // Verify ownership
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, user.id),
    });
    if (!studentProfile || application.studentId !== studentProfile.id) {
      throw new ForbiddenError('You can only withdraw your own applications');
    }

    // Check if withdrawal is allowed
    if (!WITHDRAWABLE_STATUSES.includes(application.status)) {
      throw new ForbiddenError(
        `Cannot withdraw application in "${application.status}" status. Allowed statuses: ${WITHDRAWABLE_STATUSES.join(', ')}`,
      );
    }

    await this.appRepo.updateStatus(id, application.status, 'withdrawn', user.id, 'Withdrawn by student');

    const full = await this.appRepo.findById(id);
    if (!full) throw new NotFoundError('Application');
    return this.mapToResponse(full);
  }

  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    const application = await this.appRepo.findById(id);
    if (!application) throw new NotFoundError('Application');

    if (!user.permissions.includes('applications.update_status')) throw new ForbiddenError();
    if (application.opportunity.postedBy !== user.id && !user.roles.includes('ADMIN')) {
      throw new ForbiddenError('Only the opportunity owner or an administrator can manage applications');
    }
    const stages: ApplicationStatus[] = ['applied', 'under_review', 'shortlisted', 'assessment', 'interview', 'selected'];
    if (['selected', 'rejected', 'withdrawn'].includes(application.status)
      || dto.status === 'withdrawn'
      || (dto.status !== 'rejected' && stages.indexOf(dto.status) <= stages.indexOf(application.status))) {
      throw new ValidationError(`Cannot transition from "${application.status}" to "${dto.status}"`);
    }
    await this.appRepo.updateStatus(id, application.status, dto.status, user.id, dto.remarks ?? null);

    const full = await this.appRepo.findById(id);
    if (!full) throw new NotFoundError('Application');
    return this.mapToResponse(full);
  }

  async getById(id: string, user: AuthenticatedUser): Promise<ApplicationResponseDto> {
    const application = await this.appRepo.findById(id);
    if (!application) throw new NotFoundError('Application');

    // Students can only view own applications
    if (!user.permissions.includes('applications.view_all')) {
      const studentProfile = await db.query.studentProfiles.findFirst({
        where: eq(schema.studentProfiles.userId, user.id),
      });
      if (!studentProfile || application.studentId !== studentProfile.id) {
        throw new ForbiddenError('You can only view your own applications');
      }
    }

    return this.mapToResponse(application);
  }

  async listMyApplications(
    user: AuthenticatedUser,
    query: ApplicationListQuery,
  ): Promise<{ applications: ApplicationResponseDto[]; meta: PaginationMeta }> {
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, user.id),
    });
    if (!studentProfile) {
      return { applications: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
    }

    const filters: { status?: ApplicationStatus; opportunityId?: string } = {};
    if (query.status) filters.status = query.status;
    if (query.opportunityId) filters.opportunityId = query.opportunityId;

    const result = await this.appRepo.listByStudent(
      studentProfile.id,
      { page: query.page, pageSize: query.pageSize },
      filters,
    );

    return {
      applications: result.applications.map((a) => this.mapToResponse(a)),
      meta: result.meta,
    };
  }

  async listByOpportunity(
    opportunityId: string,
    pagination: { page: number; pageSize: number },
    statusFilter?: ApplicationStatus,
  ): Promise<{ applications: ApplicationResponseDto[]; meta: PaginationMeta }> {
    const result = await this.appRepo.listByOpportunity(opportunityId, pagination, statusFilter);
    return {
      applications: result.applications.map((a) => this.mapToResponse(a)),
      meta: result.meta,
    };
  }

  private mapToResponse(app: NonNullable<Awaited<ReturnType<ApplicationRepository['findById']>>>): ApplicationResponseDto {
    const statusHistory =
      app.statusHistory.slice().sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime()).map((h) => ({
        id: h.id,
        status: h.status,
        changedBy: h.changedBy,
        changedByName: h.changedByUser.fullName,
        remarks: h.remarks ?? null,
        changedAt: h.changedAt,
      }));

    return {
      id: app.id,
      opportunityId: app.opportunityId,
      opportunity: {
            id: app.opportunity.id,
            companyId: app.opportunity.companyId,
            company: {
                  id: app.opportunity.company.id,
                  name: app.opportunity.company.name,
                  logoUrl: app.opportunity.company.logoUrl ?? null,
                  website: app.opportunity.company.website ?? null,
                  industry: app.opportunity.company.industry ?? null,
                  description: app.opportunity.company.description ?? null,
                  createdAt: app.opportunity.company.createdAt,
                  updatedAt: app.opportunity.company.updatedAt,
                },
            title: app.opportunity.title,
            type: app.opportunity.type,
            description: app.opportunity.description,
            workMode: app.opportunity.workMode,
            location: app.opportunity.location ?? null,
            salaryMin: app.opportunity.salaryMin ? parseFloat(app.opportunity.salaryMin) : null,
            salaryMax: app.opportunity.salaryMax ? parseFloat(app.opportunity.salaryMax) : null,
            applicationDeadline: app.opportunity.applicationDeadline
              ? new Date(app.opportunity.applicationDeadline).toISOString()
              : null,
            status: app.opportunity.status,
            postedBy: app.opportunity.postedBy,
            sourceDraftId: app.opportunity.sourceDraftId ?? null,
            skills:
              app.opportunity.opportunitySkills.map((os) => ({
                skillId: os.skillId,
                name: os.skill.name,
                category: os.skill.category,
                isRequired: os.isRequired,
              })),
            eligibility: [],
            applicationCount: 0,
            createdAt: app.opportunity.createdAt,
            updatedAt: app.opportunity.updatedAt,
          },
      studentId: app.studentId,
      studentName: app.student.user.fullName,
      studentRollNumber: app.student.rollNumber,
      resumeId: app.resumeId ?? null,
      resumeTitle: app.resume?.title ?? undefined,
      status: app.status,
      coverNote: app.coverNote ?? null,
      aiMatchScore: app.aiMatchScore ? parseFloat(app.aiMatchScore) : null,
      statusHistory,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }
}
