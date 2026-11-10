import { schema } from '@career-portal/db';
import {
  careerPathInputSchema,
  careerStageSchema,
  resourceInputSchema,
  type AuthenticatedUser,
  type CareerCatalogQuery,
  type CareerPathDto,
  type CareerPathInput,
  type CareerProficiency,
  type GapSkillDto,
  type LearningResourceDto,
  type ResourceInput,
  type ResourceStatus,
  type RoadmapDto,
  type RoadmapStageDto,
  type SkillGapDto,
  type SkillGapInput,
} from '@career-portal/shared-types';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { CareerRepository } from './career.repository';

import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

const snapshotSchema = careerStageSchema.extend({
  skillNames: z.record(z.string()),
  resources: z.array(
    z.object({ id: z.string().uuid(), title: z.string(), url: z.string(), type: z.string() }),
  ),
});
const levels: CareerProficiency[] = ['beginner', 'intermediate', 'advanced', 'expert'];
export const normalizeSkill = (name: string): string => name.trim().toLowerCase();
export function classifySkill(
  current: CareerProficiency | null,
  required: CareerProficiency | null,
): GapSkillDto['status'] {
  return !current
    ? 'missing'
    : required && levels.indexOf(current) < levels.indexOf(required)
      ? 'below_target'
      : 'matched';
}
export function roadmapProgress(stages: Array<{ id: string; isCompleted: boolean }>): {
  progressPercent: number;
  currentStageId: string | null;
} {
  return {
    progressPercent: stages.length
      ? Math.round((100 * stages.filter((stage) => stage.isCompleted).length) / stages.length)
      : 0,
    currentStageId: stages.find((stage) => !stage.isCompleted)?.id ?? null,
  };
}
export class CareerService {
  constructor(private readonly repo = new CareerRepository()) {}
  private async student(userId: string) {
    const student = await this.repo.profile(userId);
    if (!student) throw new NotFoundError('Student profile');
    return student;
  }
  private pathDto(row: NonNullable<Awaited<ReturnType<CareerRepository['path']>>>): CareerPathDto {
    return { id: row.id, ...careerPathInputSchema.parse(rowInput(row)) };
  }
  async path(id: string, manage = false): Promise<CareerPathDto> {
    const row = await this.repo.path(id);
    if (!row || (!row.isActive && !manage)) throw new NotFoundError('Career path');
    return this.pathDto(row);
  }
  async paths(query: CareerCatalogQuery, manage: boolean) {
    if (query.status === 'all' && !manage) throw new ForbiddenError();
    const result = await this.repo.paths(query);
    return { data: result.data.map((row) => this.pathDto(row)), meta: result.meta };
  }
  private async validatePath(
    input: CareerPathInput,
    allowInactiveResources = false,
  ): Promise<void> {
    const active = input.stages.filter((stage) => stage.isActive);
    if (input.isActive && (!active.length || active.some((stage) => !stage.skills.length)))
      throw new ValidationError('Published careers need active stages with required skills');
    const skills = new Set((await this.repo.skills()).map((skill) => skill.id));
    for (const stage of input.stages) {
      if (new Set(stage.skills.map((skill) => skill.skillId)).size !== stage.skills.length)
        throw new ValidationError('A stage cannot repeat a skill');
      if (stage.skills.some((skill) => !skills.has(skill.skillId)))
        throw new ValidationError('Unknown skill reference');
      const resources = await this.repo.resourcesByIds([...new Set(stage.resourceIds)]);
      if (resources.length !== new Set(stage.resourceIds).size)
        throw new ValidationError('Unknown resource reference');
      if (
        !allowInactiveResources &&
        input.isActive &&
        stage.isActive &&
        resources.some((resource) => !resource.isActive)
      )
        throw new ValidationError('Published stages must link active resources');
    }
  }
  async savePath(input: CareerPathInput, userId: string, id?: string): Promise<CareerPathDto> {
    if (id) await this.path(id, true);
    await this.validatePath(input);
    const row = await this.repo.savePath(input, userId, id);
    if (!row) throw new NotFoundError('Career path');
    return this.pathDto(row);
  }
  private async resourceDto(
    row: NonNullable<Awaited<ReturnType<CareerRepository['resource']>>>,
    studentId?: string,
    context?: Awaited<ReturnType<CareerRepository['resourceContexts']>>,
  ): Promise<LearningResourceDto> {
    const loaded = context ?? (await this.repo.resourceContexts([row.id], studentId));
    const links = {
      skillIds: loaded.skillLinks
        .filter((link) => link.resourceId === row.id)
        .map((link) => link.skillId),
      careerPathIds: loaded.pathLinks
        .filter((link) => link.resourceId === row.id)
        .map((link) => link.careerPathId),
    };
    const progress = loaded.progressRows.find((progress) => progress.resourceId === row.id);
    return {
      id: row.id,
      ...resourceInputSchema.parse({
        title: row.title,
        description: row.description ?? '',
        type: row.type,
        url: row.url,
        category: row.category,
        difficulty: row.difficulty,
        isActive: row.isActive,
        ...links,
      }),
      progress: progress
        ? {
            status: progress.status,
            progressPercent: progress.progressPercent,
            completedAt: progress.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  }
  async resources(query: CareerCatalogQuery, user: AuthenticatedUser) {
    if (query.status === 'all' && !user.permissions.includes('resources.manage'))
      throw new ForbiddenError();
    const student = await this.repo.profile(user.id);
    const result = await this.repo.resources(query);
    const context = await this.repo.resourceContexts(
      result.data.map((resource) => resource.id),
      student?.id,
    );
    return {
      data: await Promise.all(
        result.data.map((row) => this.resourceDto(row, student?.id, context)),
      ),
      meta: result.meta,
    };
  }
  async resource(id: string, user: AuthenticatedUser): Promise<LearningResourceDto> {
    const row = await this.repo.resource(id);
    if (!row || (!row.isActive && !user.permissions.includes('resources.manage')))
      throw new NotFoundError('Resource');
    return this.resourceDto(row, (await this.repo.profile(user.id))?.id);
  }
  async saveResource(
    input: ResourceInput,
    userId: string,
    id?: string,
  ): Promise<LearningResourceDto> {
    if (id && !(await this.repo.resource(id))) throw new NotFoundError('Resource');
    const known = new Set((await this.repo.skills()).map((skill) => skill.id));
    if (input.skillIds.some((skill) => !known.has(skill)))
      throw new ValidationError('Unknown skill reference');
    for (const career of input.careerPathIds)
      if (!(await this.repo.path(career)))
        throw new ValidationError('Unknown career path reference');
    return this.repo.transaction(async (repo) => {
      const row = await repo.saveResource(input, userId, id);
      if (!row) throw new NotFoundError('Resource');
      return new CareerService(repo).resourceDto(row);
    });
  }
  async updateProgress(resourceId: string, status: ResourceStatus, userId: string) {
    const student = await this.student(userId);
    const resource = await this.repo.resource(resourceId);
    if (!resource) throw new NotFoundError('Resource');
    if (!resource.isActive) {
      const linked = await this.repo.ownsLinkedResource(resourceId, student.id);
      if (!linked) throw new NotFoundError('Resource');
    }
    const previous = await this.repo.resourceProgress(student.id, resourceId);
    const values = {
      status,
      progressPercent: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0,
      completedAt: status === 'completed' ? (previous?.completedAt ?? new Date()) : null,
    };
    const [row] = await this.repo.database
      .insert(schema.resourceProgress)
      .values({ studentId: student.id, resourceId, ...values })
      .onConflictDoUpdate({
        target: [schema.resourceProgress.studentId, schema.resourceProgress.resourceId],
        set: values,
      })
      .returning();
    return row;
  }
  async roadmaps(userId: string): Promise<RoadmapDto[]> {
    const student = await this.student(userId);
    const rows = await this.repo.roadmaps(student.id);
    const progress = await this.repo.progressForResources(
      [
        ...new Set(
          rows.flatMap((row) =>
            row.stages.flatMap(
              (stage) =>
                snapshotSchema.parse(
                  stage.snapshot ?? { title: stage.title, skillNames: {}, resources: [] },
                ).resourceIds,
            ),
          ),
        ),
      ],
      student.id,
    );
    return rows.map((row) => this.roadmapDto(row, progress));
  }
  async roadmap(id: string, userId: string): Promise<RoadmapDto> {
    const student = await this.student(userId);
    const row = await this.repo.roadmap(id);
    if (!row || row.studentId !== student.id) throw new NotFoundError('Roadmap');
    const progress = await this.repo.progressForResources(
      [
        ...new Set(
          row.stages.flatMap(
            (stage) =>
              snapshotSchema.parse(
                stage.snapshot ?? { title: stage.title, skillNames: {}, resources: [] },
              ).resourceIds,
          ),
        ),
      ],
      student.id,
    );
    return this.roadmapDto(row, progress);
  }
  private roadmapDto(
    row: NonNullable<Awaited<ReturnType<CareerRepository['roadmap']>>>,
    progress: Awaited<ReturnType<CareerRepository['progressForResources']>>,
  ): RoadmapDto {
    const stages: RoadmapStageDto[] = row.stages
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((stage) => ({
        ...snapshotSchema.parse(
          stage.snapshot ?? {
            title: stage.title,
            description: stage.description ?? '',
            skillNames: {},
            resources: [],
          },
        ),
        id: stage.id,
        isCompleted: stage.isCompleted,
        startedAt: stage.startedAt?.toISOString() ?? null,
        completedAt: stage.completedAt?.toISOString() ?? null,
      }));
    return {
      id: row.id,
      careerPathId: row.careerPathId,
      targetRole: row.targetRole,
      status: row.status,
      ...roadmapProgress(stages),
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      stages: stages.map((stage) => ({
        ...stage,
        resources: stage.resources.map((resource) => ({
          ...resource,
          progressStatus:
            progress.find((record) => record.resourceId === resource.id)?.status ?? 'not_started',
        })),
      })),
    };
  }
  async start(careerPathId: string, userId: string): Promise<RoadmapDto> {
    const student = await this.student(userId);
    return this.repo.transaction(async (repo) => {
      await repo.lockStudent(student.id);
      const active = (await repo.roadmaps(student.id)).find((row) => row.status === 'active');
      if (active?.careerPathId === careerPathId)
        return new CareerService(repo).roadmap(active.id, userId);
      const service = new CareerService(repo);
      const path = await service.path(careerPathId);
      await service.validatePath(pathInput(path), true);
      await repo.database
        .update(schema.careerRoadmaps)
        .set({ status: 'archived' })
        .where(
          and(
            eq(schema.careerRoadmaps.studentId, student.id),
            eq(schema.careerRoadmaps.status, 'active'),
          ),
        );
      const [roadmap] = await repo.database
        .insert(schema.careerRoadmaps)
        .values({ studentId: student.id, careerPathId, targetRole: path.title })
        .returning();
      if (!roadmap) throw new Error('Roadmap insert failed');
      const allSkills = await repo.skills();
      for (const [orderIndex, stage] of path.stages.filter((stage) => stage.isActive).entries()) {
        const resources = (await repo.resourcesByIds(stage.resourceIds)).filter(
          (resource) => resource.isActive,
        );
        const resourceIds = resources.map((resource) => resource.id);
        const [created] = await repo.database
          .insert(schema.roadmapStages)
          .values({
            roadmapId: roadmap.id,
            title: stage.title,
            description: stage.description,
            orderIndex,
            startedAt: orderIndex === 0 ? new Date() : null,
            snapshot: {
              ...stage,
              resourceIds,
              skillNames: Object.fromEntries(
                allSkills
                  .filter((skill) => stage.skills.some((required) => required.skillId === skill.id))
                  .map((skill) => [skill.id, skill.name]),
              ),
              resources: resources.map((resource) => ({
                id: resource.id,
                title: resource.title,
                type: resource.type,
                url: resource.url,
              })),
            },
          })
          .returning();
        if (!created) throw new Error('Stage insert failed');
        if (stage.skills.length)
          await repo.database
            .insert(schema.roadmapStageSkills)
            .values(stage.skills.map((skill) => ({ stageId: created.id, skillId: skill.skillId })));
        if (resourceIds.length)
          await repo.database.insert(schema.roadmapStageResources).values(
            resourceIds.map((resourceId) => ({
              stageId: created.id,
              resourceId,
            })),
          );
      }
      return service.roadmap(roadmap.id, userId);
    });
  }
  async completeStage(
    id: string,
    stageId: string,
    isCompleted: boolean,
    userId: string,
  ): Promise<RoadmapDto> {
    const student = await this.student(userId);
    return this.repo.transaction(async (repo) => {
      await repo.lockStudent(student.id);
      const service = new CareerService(repo);
      const map = await service.roadmap(id, userId);
      if (map.status === 'archived') throw new ValidationError('Archived roadmaps are read-only');
      const stage = map.stages.find((stage) => stage.id === stageId);
      if (!stage) throw new NotFoundError('Roadmap stage');
      const now = new Date();
      await repo.database
        .update(schema.roadmapStages)
        .set({
          isCompleted,
          startedAt: stage.startedAt ? new Date(stage.startedAt) : now,
          completedAt: isCompleted ? (stage.completedAt ? new Date(stage.completedAt) : now) : null,
        })
        .where(and(eq(schema.roadmapStages.id, stageId), eq(schema.roadmapStages.roadmapId, id)));
      stage.isCompleted = isCompleted;
      const progress = roadmapProgress(map.stages);
      const completed = progress.progressPercent === 100;
      if (!completed)
        await repo.database
          .update(schema.careerRoadmaps)
          .set({ status: 'archived' })
          .where(
            and(
              eq(schema.careerRoadmaps.studentId, student.id),
              eq(schema.careerRoadmaps.status, 'active'),
              ne(schema.careerRoadmaps.id, id),
            ),
          );
      await repo.database
        .update(schema.careerRoadmaps)
        .set({
          status: completed ? 'completed' : 'active',
          progressPercent: progress.progressPercent,
          completedAt: completed ? (map.completedAt ? new Date(map.completedAt) : now) : null,
        })
        .where(eq(schema.careerRoadmaps.id, id));
      if (progress.currentStageId)
        await repo.database
          .update(schema.roadmapStages)
          .set({ startedAt: now })
          .where(
            and(
              eq(schema.roadmapStages.id, progress.currentStageId),
              eq(schema.roadmapStages.roadmapId, id),
              sqlStartedAtNull(),
            ),
          );
      return service.roadmap(id, userId);
    });
  }
  async analyze(input: SkillGapInput, user: AuthenticatedUser): Promise<SkillGapDto> {
    // A single transaction keeps profile, catalog and assessment inputs consistent.
    return this.repo.transaction(async (repo) => {
      await repo.database.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      return new CareerService(repo).computeAnalysis(input, user);
    });
  }
  private async computeAnalysis(
    input: SkillGapInput,
    user: AuthenticatedUser,
  ): Promise<SkillGapDto> {
    const student = await this.student(user.id);
    const inventory = await this.repo.inventory(student.id);
    const skills = await this.repo.skills();
    const requirements = new Map<
      string,
      { proficiency: CareerProficiency | null; stageOrder: number }
    >();
    const optionalSkills: SkillGapDto['optionalSkills'] = [];
    let targetRole = '';
    let path: CareerPathDto | null = null;
    if (input.careerPathId) {
      path = await this.path(input.careerPathId);
      targetRole = path.title;
      path.stages
        .filter((stage) => stage.isActive)
        .forEach((stage, stageOrder) => {
          stage.skills.forEach((skill) => {
            const previous = requirements.get(skill.skillId);
            requirements.set(skill.skillId, {
              proficiency:
                previous?.proficiency &&
                levels.indexOf(previous.proficiency) > levels.indexOf(skill.proficiency)
                  ? previous.proficiency
                  : skill.proficiency,
              stageOrder: previous?.stageOrder ?? stageOrder,
            });
          });
        });
    } else if (input.opportunityId) {
      const opportunity = await this.repo.database.query.opportunities.findFirst({
        where: eq(schema.opportunities.id, input.opportunityId),
        with: { opportunitySkills: true },
      });
      if (
        !opportunity ||
        (opportunity.status !== 'published' &&
          opportunity.postedBy !== user.id &&
          !user.roles.includes('ADMIN'))
      )
        throw new NotFoundError('Opportunity');
      targetRole = opportunity.title;
      for (const skill of opportunity.opportunitySkills) {
        if (skill.isRequired) requirements.set(skill.skillId, { proficiency: null, stageOrder: 0 });
        else
          optionalSkills.push({
            skillId: skill.skillId,
            name: skills.find((known) => known.id === skill.skillId)?.name ?? '',
          });
      }
    }
    const answers = await this.repo.assessmentAnswers(student.id);
    const unclassified = new Set<string>();
    const evidence = new Map<string, { count: number; correct: number }>();
    for (const answer of answers) {
      if (!answer.topic) continue;
      const skill = skills.find(
        (skill) => normalizeSkill(skill.name) === normalizeSkill(answer.topic ?? ''),
      );
      if (!skill) {
        unclassified.add(answer.topic);
        continue;
      }
      const previous = evidence.get(skill.id) ?? { count: 0, correct: 0 };
      previous.count++;
      if (answer.isCorrect) previous.correct++;
      evidence.set(skill.id, previous);
    }
    const results: GapSkillDto[] = [];
    for (const [skillId, required] of requirements) {
      const name = skills.find((skill) => skill.id === skillId)?.name ?? skillId;
      const current = inventory.find((skill) => skill.skillId === skillId)?.proficiency ?? null;
      const status = classifySkill(current, required.proficiency);
      const assessment = evidence.get(skillId);
      const accuracy = assessment
        ? Math.round((10000 * assessment.correct) / assessment.count) / 100
        : null;
      const needsPractice = assessment ? assessment.correct / assessment.count < 0.6 : false;
      const priority =
        status === 'missing' ? 1 : status === 'below_target' ? 2 : needsPractice ? 3 : 4;
      const actions: GapSkillDto['actions'] = [];
      const reason = `${name} ${status === 'missing' ? 'is missing from your profile' : status === 'below_target' ? 'is below the target proficiency' : 'needs practice based on evaluated assessments'} for ${targetRole}.`;
      if (priority < 4) {
        const resources = await this.repo.recommendedResources(skillId);
        for (const { resource } of resources)
          actions.push({ type: 'resource', title: resource.title, url: resource.url, reason });
        if (path)
          for (const stage of path.stages.filter(
            (stage) => stage.isActive && stage.skills.some((skill) => skill.skillId === skillId),
          )) {
            for (const activity of stage.activities)
              actions.push({
                type: activity.type,
                title: activity.title,
                url: null,
                reason: `${reason} ${activity.description}`,
              });
            for (const resource of await this.repo.resourcesByIds(stage.resourceIds))
              if (resource.isActive && !actions.some((action) => action.url === resource.url))
                actions.push({
                  type: 'resource',
                  title: resource.title,
                  url: resource.url,
                  reason,
                });
          }
        for (const test of await this.repo.recommendedTests(name))
          actions.push({
            type: 'mock_test',
            title: test.title,
            url: `/dashboard/preparation`,
            reason: `${reason} Practice with ${test.title}.`,
          });
      }
      results.push({
        skillId,
        name,
        currentProficiency: current,
        requiredProficiency: required.proficiency,
        status,
        stageOrder: required.stageOrder,
        priority,
        assessment: assessment
          ? {
              accuracy: accuracy ?? 0,
              questionCount: assessment.count,
              source: 'evaluated_mock_tests',
            }
          : null,
        needsPractice,
        actions,
      });
    }
    results.sort(
      (a, b) =>
        a.priority - b.priority || a.stageOrder - b.stageOrder || a.name.localeCompare(b.name),
    );
    const result = {
      targetRole,
      careerPathId: input.careerPathId ?? null,
      opportunityId: input.opportunityId ?? null,
      ruleVersion: 'phase6-rules-v1',
      skills: results,
      optionalSkills,
      currentSkills: inventory.map(({ skillId, proficiency }) => ({ skillId, proficiency })),
      unclassifiedTopics: [...unclassified].sort(),
    };
    const [row] = await this.repo.database
      .insert(schema.skillGapAnalyses)
      .values({
        studentId: student.id,
        targetRole,
        careerPathId: result.careerPathId,
        opportunityId: result.opportunityId,
        currentSkills: result.currentSkills,
        requiredSkills: [...requirements].map(([skillId, requirement]) => ({
          skillId,
          ...requirement,
        })),
        gapSkills: results.filter((skill) => skill.status !== 'matched'),
        recommendations: results.flatMap((skill) => skill.actions),
        ruleVersion: result.ruleVersion,
        result,
      })
      .returning();
    if (!row) throw new Error('Analysis insert failed');
    return { id: row.id, createdAt: row.createdAt.toISOString(), ...result };
  }
  async analyses(userId: string) {
    const student = await this.student(userId);
    return (await this.repo.analyses(student.id)).map((row) => ({
      id: row.id,
      targetRole: row.targetRole,
      createdAt: row.createdAt.toISOString(),
    }));
  }
  async analysis(id: string, userId: string): Promise<SkillGapDto> {
    const student = await this.student(userId);
    const row = await this.repo.analysis(id);
    if (!row || row.studentId !== student.id) throw new NotFoundError('Analysis');
    if (!row.result)
      throw new ValidationError('This legacy analysis has no Phase 6 detail; run a new analysis');
    return {
      ...(row.result as Omit<SkillGapDto, 'id' | 'createdAt'>),
      id: row.id,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
function rowInput(row: {
  title: string;
  description: string;
  isActive: boolean;
  stages: unknown;
}): CareerPathInput {
  return careerPathInputSchema.parse({
    title: row.title,
    description: row.description,
    isActive: row.isActive,
    stages: row.stages,
  });
}
function pathInput(path: CareerPathDto): CareerPathInput {
  return {
    title: path.title,
    description: path.description,
    isActive: path.isActive,
    stages: path.stages,
  };
}
function sqlStartedAtNull() {
  return isNull(schema.roadmapStages.startedAt);
}
