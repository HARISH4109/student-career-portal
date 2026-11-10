import { db, schema } from '@career-portal/db';
import { count, eq, ilike } from 'drizzle-orm';

export class CompanyRepository {
  async findById(id: string) {
    return db.query.companies.findFirst({
      where: eq(schema.companies.id, id),
    });
  }

  async findByName(name: string) {
    return db.query.companies.findFirst({
      where: eq(schema.companies.name, name),
    });
  }

  async create(data: {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    industry?: string | null;
    description?: string | null;
  }) {
    const inserted = await db
      .insert(schema.companies)
      .values({
        name: data.name,
        logoUrl: data.logoUrl ?? null,
        website: data.website ?? null,
        industry: data.industry ?? null,
        description: data.description ?? null,
      })
      .returning();

    return inserted[0] ?? null;
  }

  async list(pagination: { page: number; pageSize: number }, search?: string) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const whereClause = search
      ? ilike(schema.companies.name, `%${search}%`)
      : undefined;

    const countResult = await db
      .select({ total: count() })
      .from(schema.companies)
      .where(whereClause);
    const total = (countResult[0]?.total ?? 0);

    const companies = await db.query.companies.findMany({
      where: whereClause,
      limit: pageSize,
      offset,
      orderBy: (c, { asc }) => [asc(c.name)],
    });

    return {
      companies,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
