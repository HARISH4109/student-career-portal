import type {
  AcademicProgramDto,
  BatchDto,
  DepartmentDto,
} from '@career-portal/shared-types';

import { AcademicRepository } from './academic.repository';

export class AcademicService {
  constructor(private readonly academicRepo: AcademicRepository = new AcademicRepository()) {}

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

  async listPrograms(departmentId?: string): Promise<AcademicProgramDto[]> {
    const raw = await this.academicRepo.getAcademicPrograms(departmentId);
    return raw.map((p) => ({
      id: p.id,
      departmentId: p.departmentId,
      name: p.name,
      degreeLevel: p.degreeLevel,
      durationYears: p.durationYears,
      isActive: p.isActive,
    }));
  }

  async listBatches(): Promise<BatchDto[]> {
    const raw = await this.academicRepo.getBatches();
    return raw.map((b) => ({
      id: b.id,
      graduationYear: b.graduationYear,
      isActive: b.isActive,
    }));
  }
}
