import { db, schema } from '@career-portal/db';
import { inArray } from 'drizzle-orm';

async function deduplicate(): Promise<void> {
  console.log('=== Starting Deduplication ===\n');

  // 1. Deduplicate Companies
  const allCompanies = await db.select().from(schema.companies);
  console.log(`Found ${String(allCompanies.length)} companies.`);

  const companiesByName = new Map<string, typeof allCompanies>();
  for (const comp of allCompanies) {
    const list = companiesByName.get(comp.name) ?? [];
    list.push(comp);
    companiesByName.set(comp.name, list);
  }

  for (const [name, compList] of companiesByName.entries()) {
    if (compList.length > 1) {
      const [primary, ...duplicates] = compList;
      if (!primary) continue;
      console.log(`Company "${name}": keeping primary ${primary.id}, removing ${String(duplicates.length)} duplicate(s).`);

      const duplicateIds = duplicates.map((d) => d.id);

      // Re-link any opportunities pointing to duplicate companies to the primary company
      await db
        .update(schema.opportunities)
        .set({ companyId: primary.id })
        .where(inArray(schema.opportunities.companyId, duplicateIds));

      // Remove the duplicate companies
      await db.delete(schema.companies).where(inArray(schema.companies.id, duplicateIds));
    }
  }

  // 2. Deduplicate Opportunities
  const allOpportunities = await db.select().from(schema.opportunities);
  console.log(`\nFound ${String(allOpportunities.length)} opportunities.`);

  const oppsByKey = new Map<string, typeof allOpportunities>();
  for (const opp of allOpportunities) {
    // Group by companyId + title + type
    const key = `${opp.companyId}::${opp.title}::${opp.type}`;
    const list = oppsByKey.get(key) ?? [];
    list.push(opp);
    oppsByKey.set(key, list);
  }

  let removedOppCount = 0;
  for (const [, oppList] of oppsByKey.entries()) {
    if (oppList.length > 1) {
      const [primary, ...duplicates] = oppList;
      if (!primary) continue;
      console.log(`Opportunity "${primary.title}": keeping ${primary.id}, removing ${String(duplicates.length)} duplicate(s).`);

      const duplicateIds = duplicates.map((d) => d.id);

      // Delete the duplicate opportunities (cascades to opportunity_skills & opportunity_eligibility)
      await db.delete(schema.opportunities).where(inArray(schema.opportunities.id, duplicateIds));
      removedOppCount += duplicateIds.length;
    }
  }

  console.log(`\nRemoved ${String(removedOppCount)} duplicate opportunities.`);

  // 3. Verify Final State
  const remainingCompanies = await db.select().from(schema.companies);
  const remainingOpportunities = await db.select().from(schema.opportunities);

  console.log('\n=== Final Clean State ===');
  console.log(`Unique Companies: ${String(remainingCompanies.length)}`);
  for (const comp of remainingCompanies) {
    console.log(`  - ${comp.name}`);
  }
  console.log(`Unique Opportunities: ${String(remainingOpportunities.length)}`);
  for (const opp of remainingOpportunities) {
    console.log(`  - [${opp.type.toUpperCase()}] ${opp.title} (${opp.location ?? 'N/A'})`);
  }
  console.log('\n=== Deduplication Complete ===');
}

deduplicate()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Deduplication failed:', err);
    process.exit(1);
  });
