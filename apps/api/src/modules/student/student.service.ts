import { studentProfileResponseSchema } from '@career-portal/shared-types';
import type {
  AuthenticatedUser,
  CreateStudentProfileDto,
  PaginationMeta,
  PaginationQuery,
  ProficiencyLevel,
  ProfileCompletionResponseDto,
  StudentProfileResponseDto,
  UpdateStudentProfileDto,
} from '@career-portal/shared-types';

import { ProfileCompletionService } from './profile-completion.service';
import { StudentRepository } from './student.repository';

import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository = new StudentRepository(),
    private readonly completionService: ProfileCompletionService = new ProfileCompletionService(),
  ) {}

  async getOwnProfile(userId: string): Promise<StudentProfileResponseDto> {
    const profile = await this.studentRepo.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Student profile');
    }
    return this.mapToResponse(profile);
  }

  async createOrUpdateOwnProfile(
    userId: string,
    dto: CreateStudentProfileDto | UpdateStudentProfileDto,
  ): Promise<StudentProfileResponseDto> {
    let profile: Awaited<ReturnType<StudentRepository['findProfileByUserId']>> | null =
      await this.studentRepo.findProfileByUserId(userId);

    const departmentId = dto.departmentId ?? profile?.departmentId;
    const programId = dto.programId ?? profile?.programId;
    if (departmentId && programId && !(await this.studentRepo.programMatchesDepartment(programId, departmentId))) {
      throw new ValidationError('The selected program does not belong to the selected department.');
    }

    if (!profile) {
      // Must have required fields for initial profile creation
      if (!dto.rollNumber || !dto.departmentId || !dto.programId || !dto.batchId) {
        throw new ForbiddenError(
          'rollNumber, departmentId, programId, and batchId are required for creating profile',
        );
      }
      profile = await this.studentRepo.createProfile({
        userId,
        rollNumber: dto.rollNumber,
        departmentId: dto.departmentId,
        programId: dto.programId,
        batchId: dto.batchId,
        cgpa: dto.cgpa,
        bio: dto.bio,
        linkedinUrl: dto.linkedinUrl,
        githubUrl: dto.githubUrl,
        portfolioUrl: dto.portfolioUrl,
        careerInterests: dto.careerInterests,
        projects: dto.projects,
        certifications: dto.certifications,
        achievements: dto.achievements,
      });
    } else {
      const existingCgpa = profile.cgpa !== null && profile.cgpa !== undefined ? Number(profile.cgpa) : null;
      const incomingCgpa = dto.cgpa !== undefined ? (dto.cgpa !== null ? Number(dto.cgpa) : null) : undefined;
      const modifiesVerifiedAcademicField =
        (dto.rollNumber !== undefined && dto.rollNumber !== profile.rollNumber) ||
        (dto.departmentId !== undefined && dto.departmentId !== profile.departmentId) ||
        (dto.programId !== undefined && dto.programId !== profile.programId) ||
        (dto.batchId !== undefined && dto.batchId !== profile.batchId) ||
        (incomingCgpa !== undefined && incomingCgpa !== existingCgpa);

      if (modifiesVerifiedAcademicField) {
        throw new ForbiddenError(
          'Verified academic details (roll number, department, program, batch, CGPA) cannot be modified after profile creation. Contact placement faculty.',
        );
      }

      profile = await this.studentRepo.updateProfile(profile.id, {
        bio: dto.bio,
        linkedinUrl: dto.linkedinUrl,
        githubUrl: dto.githubUrl,
        portfolioUrl: dto.portfolioUrl,
        careerInterests: dto.careerInterests,
        projects: dto.projects,
        certifications: dto.certifications,
        achievements: dto.achievements,
      });
    }

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    return this.mapToResponse(profile);
  }

  async getProfileCompletion(userId: string): Promise<ProfileCompletionResponseDto> {
    const profile = await this.studentRepo.findProfileByUserId(userId);
    if (!profile) {
      return this.completionService.calculateCompletion({
        skillsCount: 0,
        projectsCount: 0,
        certificationsCount: 0,
        achievementsCount: 0,
        resumeCount: 0,
      });
    }

    const resumeCount = await this.studentRepo.getResumeCount(profile.id);
    const projects = studentProfileResponseSchema.shape.projects.parse(profile.projects ?? []);
    const certs = studentProfileResponseSchema.shape.certifications.parse(profile.certifications ?? []);
    const achievements = studentProfileResponseSchema.shape.achievements.parse(profile.achievements ?? []);
    const skillsCount = profile.studentSkills.length;

    return this.completionService.calculateCompletion({
      rollNumber: profile.rollNumber,
      departmentId: profile.departmentId,
      programId: profile.programId,
      batchId: profile.batchId,
      cgpa: profile.cgpa,
      phone: profile.user.phone,
      bio: profile.bio,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      skillsCount,
      projectsCount: projects.length,
      certificationsCount: certs.length,
      achievementsCount: achievements.length,
      resumeCount,
    });
  }

  async addSkill(userId: string, skillId: string, proficiency: ProficiencyLevel) {
    const profile = await this.studentRepo.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    await this.studentRepo.addStudentSkill(profile.id, skillId, proficiency);
    return this.getOwnProfile(userId);
  }

  async removeSkill(userId: string, skillId: string) {
    const profile = await this.studentRepo.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    await this.studentRepo.removeStudentSkill(profile.id, skillId);
    return this.getOwnProfile(userId);
  }

  async getStudentById(
    studentId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<StudentProfileResponseDto> {
    const profile = await this.studentRepo.findProfileById(studentId);
    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    // Authorization check: student can only view own profile unless has view_all_profiles
    const isOwner = profile.userId === requestingUser.id;
    const canViewAll = requestingUser.permissions.includes('students.view_all_profiles');

    if (!isOwner && !canViewAll) {
      throw new ForbiddenError('You do not have permission to view this student profile');
    }

    return this.mapToResponse(profile);
  }

  async listStudents(
    pagination: PaginationQuery,
    filters?: {
      search?: string;
      departmentId?: string;
      batchId?: string;
      isPlacementEligible?: boolean;
    },
  ): Promise<{ profiles: StudentProfileResponseDto[]; meta: PaginationMeta }> {
    const result = await this.studentRepo.listProfiles(pagination, filters);
    return {
      profiles: result.profiles.map((p) => this.mapToResponse(p)),
      meta: result.meta,
    };
  }

  // ── Mapping Helper ──────────────────────────────────────────────────────
  private mapToResponse(profile: NonNullable<Awaited<ReturnType<StudentRepository['findProfileById']>>>): StudentProfileResponseDto {
    const skills =
      profile.studentSkills.map((ss) => ({
        skillId: ss.skillId,
        name: ss.skill.name,
        category: ss.skill.category,
        proficiency: ss.proficiency,
      }));

    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user.fullName,
      email: profile.user.email,
      phone: profile.user.phone ?? null,
      avatarUrl: profile.user.avatarUrl ?? null,
      rollNumber: profile.rollNumber,
      departmentId: profile.departmentId,
      department: {
            id: profile.department.id,
            name: profile.department.name,
            code: profile.department.code,
            description: profile.department.description,
            isActive: profile.department.isActive,
          },
      programId: profile.programId,
      program: {
            id: profile.program.id,
            departmentId: profile.program.departmentId,
            name: profile.program.name,
            degreeLevel: profile.program.degreeLevel,
            durationYears: profile.program.durationYears,
            isActive: profile.program.isActive,
          },
      batchId: profile.batchId,
      batch: {
            id: profile.batch.id,
            graduationYear: profile.batch.graduationYear,
            isActive: profile.batch.isActive,
          },
      cgpa: profile.cgpa ? parseFloat(profile.cgpa) : null,
      bio: profile.bio ?? null,
      linkedinUrl: profile.linkedinUrl ?? null,
      githubUrl: profile.githubUrl ?? null,
      portfolioUrl: profile.portfolioUrl ?? null,
      careerInterests: studentProfileResponseSchema.shape.careerInterests.parse(profile.careerInterests ?? []),
      projects: studentProfileResponseSchema.shape.projects.parse(profile.projects ?? []),
      certifications: studentProfileResponseSchema.shape.certifications.parse(profile.certifications ?? []),
      achievements: studentProfileResponseSchema.shape.achievements.parse(profile.achievements ?? []),
      skills,
      isPlacementEligible: profile.isPlacementEligible,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
