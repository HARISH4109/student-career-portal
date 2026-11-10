import { db, schema } from '@career-portal/db';
import { eq, sql } from 'drizzle-orm';

/**
 * Server-side eligibility checking service.
 * Never rely solely on frontend eligibility checks.
 */
export class EligibilityService {
  /**
   * Check if a student profile matches at least one eligibility criterion for the opportunity.
   * If the opportunity has NO eligibility rows, it's open to all.
   */
  async isStudentEligible(
    opportunityId: string,
    studentProfile: {
      departmentId: string;
      programId: string;
      batchId: string;
      cgpa: string | null;
    },
  ): Promise<boolean> {
    // Check if the opportunity has any eligibility criteria at all
    const eligibilityRows = await db.query.opportunityEligibility.findMany({
      where: eq(schema.opportunityEligibility.opportunityId, opportunityId),
    });

    // No eligibility criteria = open to all students
    if (eligibilityRows.length === 0) {
      return true;
    }

    // Check each criterion — student must match at least ONE row
    for (const row of eligibilityRows) {
      let matches = true;

      if (row.departmentId && row.departmentId !== studentProfile.departmentId) {
        matches = false;
      }
      if (matches && row.programId && row.programId !== studentProfile.programId) {
        matches = false;
      }
      if (matches && row.batchId && row.batchId !== studentProfile.batchId) {
        matches = false;
      }
      if (matches && row.minCgpa) {
        const studentCgpa = studentProfile.cgpa ? parseFloat(studentProfile.cgpa) : 0;
        const requiredCgpa = parseFloat(row.minCgpa);
        if (studentCgpa < requiredCgpa) {
          matches = false;
        }
      }

      if (matches) return true;
    }

    return false;
  }

  /**
   * Batch-check eligibility for multiple opportunities.
   * Returns a map of opportunityId → isEligible.
   */
  async checkBulkEligibility(
    opportunityIds: string[],
    studentProfile: {
      departmentId: string;
      programId: string;
      batchId: string;
      cgpa: string | null;
    },
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    if (opportunityIds.length === 0) return result;

    // Get all eligibility rows for these opportunities
    const allEligibility = await db.query.opportunityEligibility.findMany({
      where: sql`${schema.opportunityEligibility.opportunityId} IN (${sql.join(
        opportunityIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    });

    // Group by opportunity
    const byOpportunity = new Map<string, typeof allEligibility>();
    for (const row of allEligibility) {
      const rows = byOpportunity.get(row.opportunityId) ?? [];
      rows.push(row);
      byOpportunity.set(row.opportunityId, rows);
    }

    for (const oppId of opportunityIds) {
      const rows = byOpportunity.get(oppId);
      if (!rows || rows.length === 0) {
        // No criteria = open to all
        result.set(oppId, true);
        continue;
      }

      let eligible = false;
      for (const row of rows) {
        let matches = true;
        if (row.departmentId && row.departmentId !== studentProfile.departmentId) matches = false;
        if (matches && row.programId && row.programId !== studentProfile.programId) matches = false;
        if (matches && row.batchId && row.batchId !== studentProfile.batchId) matches = false;
        if (matches && row.minCgpa) {
          const studentCgpa = studentProfile.cgpa ? parseFloat(studentProfile.cgpa) : 0;
          if (studentCgpa < parseFloat(row.minCgpa)) matches = false;
        }
        if (matches) {
          eligible = true;
          break;
        }
      }
      result.set(oppId, eligible);
    }

    return result;
  }
}
