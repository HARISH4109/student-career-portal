import { db, schema } from '@career-portal/db';
import { and, eq } from 'drizzle-orm';

export class AcademicRepository {
  async getDepartments() {
    return db.query.departments.findMany({
      where: eq(schema.departments.isActive, true),
      orderBy: (deps, { asc }) => [asc(deps.name)],
    });
  }

  async getAcademicPrograms(departmentId?: string) {
    const whereClause = departmentId
      ? and(
        eq(schema.academicPrograms.departmentId, departmentId),
        eq(schema.academicPrograms.isActive, true),
      )
      : eq(schema.academicPrograms.isActive, true);

    return db.query.academicPrograms.findMany({
      where: whereClause,
      with: {
        department: true,
        streams: {
          where: eq(schema.academicStreams.isActive, true),
          orderBy: (streams, { asc }) => [asc(streams.name)],
        },
      },
      orderBy: (progs, { asc }) => [asc(progs.name)],
    });
  }

  async findProgramById(id: string) {
    return db.query.academicPrograms.findFirst({
      where: eq(schema.academicPrograms.id, id),
      with: {
        department: true,
        streams: {
          where: eq(schema.academicStreams.isActive, true),
          orderBy: (streams, { asc }) => [asc(streams.name)],
        },
      },
    });
  }

  async createProgram(data: {
    departmentId: string;
    name: string;
    degreeLevel: string;
    durationYears: number;
  }) {
    const [created] = await db
      .insert(schema.academicPrograms)
      .values({
        departmentId: data.departmentId,
        name: data.name,
        degreeLevel: data.degreeLevel,
        durationYears: data.durationYears,
      })
      .returning();
    return created;
  }

  async updateProgram(
    id: string,
    data: {
      departmentId?: string;
      name?: string;
      degreeLevel?: string;
      durationYears?: number;
      isActive?: boolean;
    },
  ) {
    const [updated] = await db
      .update(schema.academicPrograms)
      .set(data)
      .where(eq(schema.academicPrograms.id, id))
      .returning();
    return updated ?? null;
  }

  async getAcademicStreams(programId?: string) {
    const whereClause = programId
      ? and(
        eq(schema.academicStreams.programId, programId),
        eq(schema.academicStreams.isActive, true),
      )
      : eq(schema.academicStreams.isActive, true);

    return db.query.academicStreams.findMany({
      where: whereClause,
      orderBy: (streams, { asc }) => [asc(streams.name)],
    });
  }

  async findStreamById(id: string) {
    return db.query.academicStreams.findFirst({
      where: eq(schema.academicStreams.id, id),
    });
  }

  async createStream(data: {
    programId: string;
    name: string;
    code: string;
  }) {
    const [created] = await db
      .insert(schema.academicStreams)
      .values({
        programId: data.programId,
        name: data.name,
        code: data.code,
      })
      .returning();
    return created;
  }

  async updateStream(
    id: string,
    data: {
      programId?: string;
      name?: string;
      code?: string;
      isActive?: boolean;
    },
  ) {
    const [updated] = await db
      .update(schema.academicStreams)
      .set(data)
      .where(eq(schema.academicStreams.id, id))
      .returning();
    return updated ?? null;
  }

  async getBatches() {
    return db.query.batches.findMany({
      where: eq(schema.batches.isActive, true),
      orderBy: (batches, { desc }) => [desc(batches.graduationYear)],
    });
  }

  async findCseDepartment() {
    return db.query.departments.findFirst({
      where: eq(schema.departments.code, 'CSE'),
    });
  }

  async findFirstDepartment() {
    return db.query.departments.findFirst({
      where: eq(schema.departments.isActive, true),
    });
  }

  async findDepartmentById(id: string) {
    return db.query.departments.findFirst({
      where: eq(schema.departments.id, id),
    });
  }

  async createDepartment(data: { name: string; code: string; description?: string | undefined }) {
    const [created] = await db
      .insert(schema.departments)
      .values({
        name: data.name,
        code: data.code,
        description: data.description ?? null,
      })
      .returning();
    return created;
  }

  async updateDepartment(
    id: string,
    data: { name?: string | undefined; code?: string | undefined; description?: string | undefined; isActive?: boolean | undefined },
  ) {
    const [updated] = await db
      .update(schema.departments)
      .set(data)
      .where(eq(schema.departments.id, id))
      .returning();
    return updated ?? null;
  }

  async findBatchById(id: string) {
    return db.query.batches.findFirst({
      where: eq(schema.batches.id, id),
    });
  }

  async createBatch(data: { graduationYear: number }) {
    const [created] = await db
      .insert(schema.batches)
      .values({
        graduationYear: data.graduationYear,
      })
      .returning();
    return created;
  }

  async updateBatch(id: string, data: { graduationYear?: number | undefined; isActive?: boolean | undefined }) {
    const [updated] = await db
      .update(schema.batches)
      .set(data)
      .where(eq(schema.batches.id, id))
      .returning();
    return updated ?? null;
  }
}
