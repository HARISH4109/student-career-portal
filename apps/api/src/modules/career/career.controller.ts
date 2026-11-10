import {
  careerCatalogQuerySchema,
  careerPathInputSchema,
  resourceInputSchema,
  resourceStatusSchema,
  skillGapInputSchema,
  stageCompletionSchema,
  startRoadmapSchema,
} from '@career-portal/shared-types';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';

import { CareerService } from './career.service';

import { requestUser } from '@/shared/http/request-user';
import { sendSuccess } from '@/shared/http/send-success';

const id = (req: Request, key = 'id'): string => z.string().uuid().parse(req.params[key]);
function action(operation: (req: Request) => Promise<unknown>, created = false): RequestHandler {
  return (req, res, next) => {
    void operation(req)
      .then((data) => {
        sendSuccess(res, data, created ? 201 : 200);
      })
      .catch(next);
  };
}
function catalog(
  operation: (req: Request) => Promise<{
    data: unknown;
    meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
  }>,
): RequestHandler {
  return (req, res, next) => {
    void operation(req)
      .then(({ data, meta }) => {
        sendSuccess(res, data, 200, meta);
      })
      .catch(next);
  };
}
export class CareerController {
  constructor(private readonly service = new CareerService()) {}
  paths = catalog((req) =>
    this.service.paths(
      careerCatalogQuerySchema.parse(req.query),
      requestUser(req).permissions.includes('career_paths.manage'),
    ),
  );
  path = action((req) =>
    this.service.path(id(req), requestUser(req).permissions.includes('career_paths.manage')),
  );
  createPath = action(
    (req) => this.service.savePath(careerPathInputSchema.parse(req.body), requestUser(req).id),
    true,
  );
  updatePath = action((req) =>
    this.service.savePath(careerPathInputSchema.parse(req.body), requestUser(req).id, id(req)),
  );
  resources = catalog((req) =>
    this.service.resources(careerCatalogQuerySchema.parse(req.query), requestUser(req)),
  );
  resource = action((req) => this.service.resource(id(req), requestUser(req)));
  createResource = action(
    async (req) => {
      if (Array.isArray(req.body)) {
        const inputs = z.array(resourceInputSchema).parse(req.body);
        return Promise.all(
          inputs.map((input) => this.service.saveResource(input, requestUser(req).id)),
        );
      }
      return this.service.saveResource(resourceInputSchema.parse(req.body), requestUser(req).id);
    },
    true,
  );
  updateResource = action((req) =>
    this.service.saveResource(resourceInputSchema.parse(req.body), requestUser(req).id, id(req)),
  );
  progress = action((req) =>
    this.service.updateProgress(
      id(req),
      resourceStatusSchema.parse(req.body).status,
      requestUser(req).id,
    ),
  );
  roadmaps = action((req) => this.service.roadmaps(requestUser(req).id));
  roadmap = action((req) => this.service.roadmap(id(req), requestUser(req).id));
  start = action(
    (req) =>
      this.service.start(startRoadmapSchema.parse(req.body).careerPathId, requestUser(req).id),
    true,
  );
  stage = action((req) =>
    this.service.completeStage(
      id(req),
      id(req, 'stageId'),
      stageCompletionSchema.parse(req.body).isCompleted,
      requestUser(req).id,
    ),
  );
  analyze = action(
    (req) => this.service.analyze(skillGapInputSchema.parse(req.body), requestUser(req)),
    true,
  );
  analyses = action((req) => this.service.analyses(requestUser(req).id));
  analysis = action((req) => this.service.analysis(id(req), requestUser(req).id));
}
