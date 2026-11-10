import { db, schema } from '@career-portal/db';
import { eq } from 'drizzle-orm';

export class AcademicRepository {
  async getDepartments() {
    return db.query.departments.findMany({
      where: eq(schema.departments.isActive, true),
      orderBy: (deps, { asc }) => [asc(deps.name)],
    });
  }

  async getAcademicPrograms(departmentId?: string) {
    return db.query.academicPrograms.findMany({
      where: departmentId
        ? eq(schema.academicPrograms.departmentId, departmentId)
        : eq(schema.academicPrograms.isActive, true),
      with: { department: true },
      orderBy: (progs, { asc }) => [asc(progs.name)],
    });
  }

  async getBatches() {
    return db.query.batches.findMany({
      where: eq(schema.batches.isActive, true),
      orderBy: (batches, { desc }) => [desc(batches.graduationYear)],
    });
  }
}
