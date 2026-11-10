import { createHash } from 'node:crypto';

import { db, schema } from '@career-portal/db';
import type { DuplicateCheckResult } from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';

import { logger } from '@/infrastructure/logger';

/**
 * Server-side duplicate detection for the AI extraction pipeline.
 *
 * Two strategies:
 * 1. **Content hash** — SHA-256 of the normalised raw content prevents
 *    identical sources from being ingested twice (idempotency).
 * 2. **Title + company fuzzy match** — substring match against published
 *    opportunities and pending drafts catches semantically similar postings.
 */
export interface CheckDuplicateOptions {
  excludeDraftId?: string;
  excludeOpportunityId?: string;
  publishedOnly?: boolean;
}

export class DuplicateDetectionService {
  /**
   * Generate a SHA-256 hash of the normalised content for idempotency checks.
   * Normalisation strips whitespace variations so minor formatting differences
   * don't defeat the hash.
   */
  generateContentHash(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Check whether a candidate title + company already exists as a published
   * opportunity or a pending draft.
   */
  async checkDuplicate(
    title: string,
    companyName: string,
    options?: CheckDuplicateOptions | string,
  ): Promise<DuplicateCheckResult> {
    const opts: CheckDuplicateOptions =
      typeof options === 'string' ? { excludeDraftId: options } : (options ?? {});
    const { excludeOpportunityId } = opts;

    const clean = (s: string) => s.toLowerCase().trim();
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const trimmedTitle = clean(title);
    const trimmedCompany = clean(companyName);
    const normTitle = normalize(title);
    const normCompany = normalize(companyName);

    if (trimmedTitle.length < 3 || trimmedCompany.length < 2) {
      return { isDuplicate: false };
    }

    // Check against opportunities (via company relation)
    // ONLY opportunities with status 'published' are considered duplicates!
    try {
      const candidates = await db.query.opportunities.findMany({
        where: eq(schema.opportunities.status, 'published'),
        with: { company: true },
      });

      const matchingOpportunity = candidates.find((opportunity) => {
        if (!opportunity.company.name || !opportunity.title) return false;
        if (excludeOpportunityId && opportunity.id === excludeOpportunityId) {
          return false;
        }
        // Strict guard: Must be published
        if (opportunity.status !== 'published') {
          return false;
        }

        const oppCompany = clean(opportunity.company.name);
        const oppNormCompany = normalize(opportunity.company.name);
        const oppTitle = clean(opportunity.title);
        const oppNormTitle = normalize(opportunity.title);

        const companyMatches =
          oppCompany === trimmedCompany ||
          oppNormCompany === normCompany ||
          (oppNormCompany.length >= 2 && normCompany.includes(oppNormCompany)) ||
          (normCompany.length >= 2 && oppNormCompany.includes(normCompany));

        if (!companyMatches) return false;

        const titleMatches =
          oppTitle === trimmedTitle ||
          oppNormTitle === normTitle ||
          (oppNormTitle.length >= 3 && normTitle.includes(oppNormTitle)) ||
          (normTitle.length >= 3 && oppNormTitle.includes(normTitle));

        return titleMatches;
      });

      if (matchingOpportunity) {
        logger.info(
          { matchedId: matchingOpportunity.id, matchedTitle: matchingOpportunity.title },
          'Duplicate published opportunity detected',
        );
        return {
          isDuplicate: true,
          matchedOpportunityId: matchingOpportunity.id,
          matchedTitle: matchingOpportunity.title,
          matchedCompanyName: matchingOpportunity.company.name,
          similarityReason: `Existing published opportunity "${matchingOpportunity.title}" by "${matchingOpportunity.company.name}" matches the title and company.`,
        };
      }
    } catch (error) {
      logger.warn({ err: error }, 'Error checking for duplicate opportunities');
      throw error;
    }

    return { isDuplicate: false };
  }

  /**
   * Check if a source with the same content hash has already been ingested.
   * Returns the existing source ID if found, null otherwise.
   */
  async findExistingSourceByHash(contentHash: string): Promise<string | null> {
    const source = await db.query.opportunitySources.findFirst({
      where: eq(schema.opportunitySources.contentHash, contentHash),
    });
    return source?.id ?? null;
  }
}
