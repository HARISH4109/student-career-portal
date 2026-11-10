import type {
  CompanyResponseDto,
  CreateCompanyDto,
  PaginationMeta,
  PaginationQuery,
} from '@career-portal/shared-types';

import { CompanyRepository } from './company.repository';

import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

export class CompanyService {
  constructor(
    private readonly companyRepo: CompanyRepository = new CompanyRepository(),
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    // Check for duplicate company name
    const existing = await this.companyRepo.findByName(dto.name);
    if (existing) {
      throw new ConflictError(`Company "${dto.name}" already exists`);
    }

    const company = await this.companyRepo.create({
      name: dto.name,
      logoUrl: dto.logoUrl ?? null,
      website: dto.website ?? null,
      industry: dto.industry ?? null,
      description: dto.description ?? null,
    });

    if (!company) {
      throw new Error('Failed to create company');
    }

    return this.mapToResponse(company);
  }

  async getById(id: string): Promise<CompanyResponseDto> {
    const company = await this.companyRepo.findById(id);
    if (!company) {
      throw new NotFoundError('Company');
    }
    return this.mapToResponse(company);
  }

  async list(
    pagination: PaginationQuery,
    search?: string,
  ): Promise<{ companies: CompanyResponseDto[]; meta: PaginationMeta }> {
    const result = await this.companyRepo.list(pagination, search);
    return {
      companies: result.companies.map((c) => this.mapToResponse(c)),
      meta: result.meta,
    };
  }

  /**
   * Find or create a company by name. Used during opportunity creation
   * when faculty provides a company name instead of an existing companyId.
   */
  async findOrCreate(name: string): Promise<CompanyResponseDto> {
    const existing = await this.companyRepo.findByName(name);
    if (existing) {
      return this.mapToResponse(existing);
    }

    const created = await this.companyRepo.create({ name });
    if (!created) {
      throw new Error('Failed to create company');
    }
    return this.mapToResponse(created);
  }

  private mapToResponse(company: NonNullable<Awaited<ReturnType<CompanyRepository['findById']>>>): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl ?? null,
      website: company.website ?? null,
      industry: company.industry ?? null,
      description: company.description ?? null,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
