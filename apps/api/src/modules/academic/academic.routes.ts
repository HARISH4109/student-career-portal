import { Router } from 'express';

import { AcademicController } from './academic.controller';

const controller = new AcademicController();

export const academicRouter = Router();

academicRouter.get('/departments', controller.getDepartments);
academicRouter.get('/programs', controller.getPrograms);
academicRouter.get('/batches', controller.getBatches);
