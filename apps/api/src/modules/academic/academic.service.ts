import type {
  AcademicProgramDto,
  AcademicProgramWithStreamsDto,
  AcademicStreamDto,
  BatchDto,
  CreateAcademicProgramDto,
  CreateAcademicStreamDto,
  CreateBatchDto,
  CreateDepartmentDto,
  DepartmentDto,
  UpdateAcademicProgramDto,
  UpdateAcademicStreamDto,
  UpdateBatchDto,
  UpdateDepartmentDto,
} from '@career-portal/shared-types';

import { AcademicRepository } from './academic.repository';
import { auditService } from '@/modules/audit/audit.service';
import { NotFoundError, ValidationError } from '@/shared/errors/app-error';

export interface AcademicAuditContext {
  requestId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class AcademicService {
  constructor(private readonly academicRepo: AcademicRepository = new AcademicRepository()) { }

  async listDepartments(): Promise<DepartmentDto[]> {
    const raw = await this.academicRepo.getDepartments();
    return raw.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      isActive: d.isActive,
    }));
  }

  async listPrograms(departmentId?: string): Promise<AcademicProgramWithStreamsDto[]> {
    let targetDeptId = departmentId;
    if (!targetDeptId) {
      const cseDept = await this.academicRepo.findCseDepartment();
      if (cseDept) {
        targetDeptId = cseDept.id;
      }
    }
    const raw = await this.academicRepo.getAcademicPrograms(targetDeptId);
    return raw.map((p) => ({
      id: p.id,
      departmentId: p.departmentId,
      name: p.name,
      degreeLevel: p.degreeLevel,
      durationYears: p.durationYears,
      isActive: p.isActive,
      streams: (p.streams ?? []).map((s) => ({
        id: s.id,
        programId: s.programId,
        name: s.name,
        code: s.code,
        isActive: s.isActive,
        createdAt: s.createdAt?.toISOString?.() ?? undefined,
        updatedAt: s.updatedAt?.toISOString?.() ?? undefined,
      })),
    }));
  }

  async getProgramById(id: string): Promise<AcademicProgramWithStreamsDto> {
    const p = await this.academicRepo.findProgramById(id);
    if (!p) throw new NotFoundError('Academic program');
    return {
      id: p.id,
      departmentId: p.departmentId,
      name: p.name,
      degreeLevel: p.degreeLevel,
      durationYears: p.durationYears,
      isActive: p.isActive,
      streams: (p.streams ?? []).map((s) => ({
        id: s.id,
        programId: s.programId,
        name: s.name,
        code: s.code,
        isActive: s.isActive,
        createdAt: s.createdAt?.toISOString?.() ?? undefined,
        updatedAt: s.updatedAt?.toISOString?.() ?? undefined,
      })),
    };
  }

  async createProgram(dto: CreateAcademicProgramDto): Promise<AcademicProgramDto> {
    let departmentId = dto.departmentId;
    if (!departmentId) {
      const cseDept = await this.academicRepo.findCseDepartment();
      if (cseDept) {
        departmentId = cseDept.id;
      } else {
        const firstDept = await this.academicRepo.findFirstDepartment();
        if (firstDept) {
          departmentId = firstDept.id;
        } else {
          throw new ValidationError('No department found to associate program with');
        }
      }
    }

    const created = await this.academicRepo.createProgram({
      departmentId,
      name: dto.name,
      degreeLevel: dto.degreeLevel,
      durationYears: dto.durationYears ?? 4,
    });

    if (!created) {
      throw new Error('Failed to create academic program');
    }

    void auditService.log({
      action: 'academic.course_created',
      entityType: 'course',
      entityId: created.id,
      metadata: { name: created.name, degreeLevel: created.degreeLevel, durationYears: created.durationYears },
    });

    return {
      id: created.id,
      departmentId: created.departmentId,
      name: created.name,
      degreeLevel: created.degreeLevel,
      durationYears: created.durationYears,
      isActive: created.isActive,
    };
  }

  async updateProgram(id: string, dto: UpdateAcademicProgramDto): Promise<AcademicProgramDto> {
    const existing = await this.academicRepo.findProgramById(id);
    if (!existing) throw new NotFoundError('Academic program');

    const updateData: {
      departmentId?: string;
      name?: string;
      degreeLevel?: string;
      durationYears?: number;
      isActive?: boolean;
    } = {};
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.degreeLevel !== undefined) updateData.degreeLevel = dto.degreeLevel;
    if (dto.durationYears !== undefined) updateData.durationYears = dto.durationYears;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.academicRepo.updateProgram(id, updateData);

    if (!updated) throw new NotFoundError('Academic program');

    void auditService.log({
      action: 'academic.course_updated',
      entityType: 'course',
      entityId: id,
      metadata: { changes: updateData },
    });

    return {
      id: updated.id,
      departmentId: updated.departmentId,
      name: updated.name,
      degreeLevel: updated.degreeLevel,
      durationYears: updated.durationYears,
      isActive: updated.isActive,
    };
  }

  async deleteProgram(id: string): Promise<{ id: string; isActive: boolean }> {
    const existing = await this.academicRepo.findProgramById(id);
    if (!existing) throw new NotFoundError('Academic program');

    const updated = await this.academicRepo.updateProgram(id, { isActive: false });
    if (!updated) throw new NotFoundError('Academic program');

    void auditService.log({
      action: 'academic.course_deactivated',
      entityType: 'course',
      entityId: id,
      metadata: { name: existing.name },
    });

    return {
      id: updated.id,
      isActive: updated.isActive,
    };
  }

  async listStreams(programId?: string): Promise<AcademicStreamDto[]> {
    const raw = await this.academicRepo.getAcademicStreams(programId);
    return raw.map((s) => ({
      id: s.id,
      programId: s.programId,
      name: s.name,
      code: s.code,
      isActive: s.isActive,
      createdAt: s.createdAt?.toISOString?.() ?? undefined,
      updatedAt: s.updatedAt?.toISOString?.() ?? undefined,
    }));
  }

  async getStreamById(id: string): Promise<AcademicStreamDto> {
    const s = await this.academicRepo.findStreamById(id);
    if (!s) throw new NotFoundError('Academic stream');
    return {
      id: s.id,
      programId: s.programId,
      name: s.name,
      code: s.code,
      isActive: s.isActive,
      createdAt: s.createdAt?.toISOString?.() ?? undefined,
      updatedAt: s.updatedAt?.toISOString?.() ?? undefined,
    };
  }

  async createStream(dto: CreateAcademicStreamDto): Promise<AcademicStreamDto> {
    const program = await this.academicRepo.findProgramById(dto.programId);
    if (!program) throw new NotFoundError('Academic program');

    const created = await this.academicRepo.createStream({
      programId: dto.programId,
      name: dto.name,
      code: dto.code,
    });

    if (!created) {
      throw new Error('Failed to create academic stream');
    }

    void auditService.log({
      action: 'academic.stream_created',
      entityType: 'stream',
      entityId: created.id,
      metadata: { name: created.name, code: created.code, programId: created.programId },
    });

    return {
      id: created.id,
      programId: created.programId,
      name: created.name,
      code: created.code,
      isActive: created.isActive,
      createdAt: created.createdAt?.toISOString?.() ?? undefined,
      updatedAt: created.updatedAt?.toISOString?.() ?? undefined,
    };
  }

  async updateStream(id: string, dto: UpdateAcademicStreamDto): Promise<AcademicStreamDto> {
    const existing = await this.academicRepo.findStreamById(id);
    if (!existing) throw new NotFoundError('Academic stream');

    const updateData: {
      programId?: string;
      name?: string;
      code?: string;
      isActive?: boolean;
    } = {};
    if (dto.programId !== undefined) updateData.programId = dto.programId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.academicRepo.updateStream(id, updateData);

    if (!updated) throw new NotFoundError('Academic stream');

    void auditService.log({
      action: 'academic.stream_updated',
      entityType: 'stream',
      entityId: id,
      metadata: { changes: updateData },
    });

    return {
      id: updated.id,
      programId: updated.programId,
      name: updated.name,
      code: updated.code,
      isActive: updated.isActive,
      createdAt: updated.createdAt?.toISOString?.() ?? undefined,
      updatedAt: updated.updatedAt?.toISOString?.() ?? undefined,
    };
  }

  async deleteStream(id: string): Promise<{ id: string; isActive: boolean }> {
    const existing = await this.academicRepo.findStreamById(id);
    if (!existing) throw new NotFoundError('Academic stream');

    const updated = await this.academicRepo.updateStream(id, { isActive: false });
    if (!updated) throw new NotFoundError('Academic stream');

    void auditService.log({
      action: 'academic.stream_deactivated',
      entityType: 'stream',
      entityId: id,
      metadata: { name: existing.name },
    });

    return {
      id: updated.id,
      isActive: updated.isActive,
    };
  }

  async listBatches(): Promise<BatchDto[]> {
    const raw = await this.academicRepo.getBatches();
    return raw.map((b) => ({
      id: b.id,
      graduationYear: b.graduationYear,
      isActive: b.isActive,
    }));
  }

  async createDepartment(
    dto: CreateDepartmentDto,
    actorId?: string,
    ctx?: AcademicAuditContext,
  ): Promise<DepartmentDto> {
    const created = await this.academicRepo.createDepartment({
      name: dto.name,
      code: dto.code,
      description: dto.description,
    });
    if (!created) {
      throw new Error('Failed to create department');
    }

    await auditService.log({
      userId: actorId ?? null,
      action: 'academic.department_created',
      entityType: 'department',
      entityId: created.id,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { name: created.name, code: created.code },
    });

    return {
      id: created.id,
      name: created.name,
      code: created.code,
      description: created.description,
      isActive: created.isActive,
    };
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
    actorId?: string,
    ctx?: AcademicAuditContext,
  ): Promise<DepartmentDto> {
    const existing = await this.academicRepo.findDepartmentById(id);
    if (!existing) throw new NotFoundError('Department');

    const updated = await this.academicRepo.updateDepartment(id, dto);
    if (!updated) throw new NotFoundError('Department');

    await auditService.log({
      userId: actorId ?? null,
      action: 'academic.department_updated',
      entityType: 'department',
      entityId: id,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { changes: dto },
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      isActive: updated.isActive,
    };
  }

  async deleteDepartment(
    id: string,
    actorId?: string,
    ctx?: AcademicAuditContext,
  ): Promise<{ id: string; isActive: boolean }> {
    const existing = await this.academicRepo.findDepartmentById(id);
    if (!existing) throw new NotFoundError('Department');

    const updated = await this.academicRepo.updateDepartment(id, { isActive: false });
    if (!updated) throw new NotFoundError('Department');

    await auditService.log({
      userId: actorId ?? null,
      action: 'academic.department_deactivated',
      entityType: 'department',
      entityId: id,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { name: existing.name },
    });

    return { id: updated.id, isActive: updated.isActive };
  }

  async createBatch(
    dto: CreateBatchDto,
    actorId?: string,
    ctx?: AcademicAuditContext,
  ): Promise<BatchDto> {
    const created = await this.academicRepo.createBatch(dto);
    if (!created) throw new Error('Failed to create batch');

    await auditService.log({
      userId: actorId ?? null,
      action: 'academic.batch_created',
      entityType: 'batch',
      entityId: created.id,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { graduationYear: created.graduationYear },
    });

    return {
      id: created.id,
      graduationYear: created.graduationYear,
      isActive: created.isActive,
    };
  }

  async updateBatch(
    id: string,
    dto: UpdateBatchDto,
    actorId?: string,
    ctx?: AcademicAuditContext,
  ): Promise<BatchDto> {
    const existing = await this.academicRepo.findBatchById(id);
    if (!existing) throw new NotFoundError('Batch');

    const updated = await this.academicRepo.updateBatch(id, dto);
    if (!updated) throw new NotFoundError('Batch');

    await auditService.log({
      userId: actorId ?? null,
      action: 'academic.batch_updated',
      entityType: 'batch',
      entityId: id,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { changes: dto },
    });

    return {
      id: updated.id,
      graduationYear: updated.graduationYear,
      isActive: updated.isActive,
    };
  }

  async deleteBatch(
    id: string,
    actorId?: string,
    ctx?: AcademicAuditContext,
  ): Promise<{ id: string; isActive: boolean }> {
    const existing = await this.academicRepo.findBatchById(id);
    if (!existing) throw new NotFoundError('Batch');

    const updated = await this.academicRepo.updateBatch(id, { isActive: false });
    if (!updated) throw new NotFoundError('Batch');

    await auditService.log({
      userId: actorId ?? null,
      action: 'academic.batch_deactivated',
      entityType: 'batch',
      entityId: id,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { graduationYear: existing.graduationYear },
    });

    return { id: updated.id, isActive: updated.isActive };
  }
}
