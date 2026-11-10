import { config } from 'dotenv';
import { careerCatalogQuerySchema } from '../packages/shared-types/src/dto/career.dto';
import { CareerService } from '../apps/api/src/modules/career/career.service';

config({ path: '.env', quiet: true });
async function check(): Promise<void> {
  const service = new CareerService();
  const query = careerCatalogQuerySchema.parse({ pageSize: 100 });
  const catalog = await service.paths(query, false);
  if (catalog.data.length !== 10) throw new Error('Expected ten active career paths');
  for (const path of catalog.data) {
    const detail = await service.path(path.id);
    if (detail.stages.length !== 4 || detail.stages.some((stage) => !stage.skills.length || !stage.resourceIds.length)) throw new Error('A starter path is missing required content');
  }
  const resources = await service.resources(query, { id: process.env.CAREER_SEED_STAFF_USER_ID ?? '', email: '', fullName: '', roles: ['PLACEMENT_FACULTY'], permissions: ['resources.view', 'resources.manage'] });
  const linked = resources.data.filter((resource) => resource.skillIds.length && resource.careerPathIds.length);
  if (linked.length < 10) throw new Error('Expected ten resources with skill and career links');
  for (const [url, expectedStatus] of [['http://localhost:4000/api/v1/health', 200], ['http://localhost:4000/api/v1/career-paths', 401], ['http://localhost:5173/dashboard/careers', 200]] as const) {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.status !== expectedStatus) throw new Error(`Readiness check failed for ${url}`);
  }
  console.log('PASS: ten active careers, forty complete stages, ten linked learning guides, healthy API/database/Redis, protected catalog route, and reachable web app.');
}
check().then(() => process.exit(0)).catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Check failed'); process.exit(1); });
