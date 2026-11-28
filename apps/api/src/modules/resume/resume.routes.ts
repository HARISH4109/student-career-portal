import { Router } from 'express';
import express from 'express';

import { ResumeController } from './resume.controller';

import { aiRateLimiter } from '@/middlewares/ai-rate-limit.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new ResumeController();

export const resumeRouter = Router();

// All resume routes require authentication
resumeRouter.use(requireAuth);

resumeRouter.get('/', requirePermission('resumes.manage_own'), controller.getResumes);
resumeRouter.post('/', requirePermission('resumes.manage_own'), controller.createResume);
resumeRouter.post('/upload', express.json({ limit: '20mb' }), requirePermission('resumes.manage_own'), controller.uploadResume);
resumeRouter.get('/:id', controller.getResumeById);
resumeRouter.put('/:id', requirePermission('resumes.manage_own'), controller.updateResume);
resumeRouter.patch('/:id', requirePermission('resumes.manage_own'), controller.updateResume);
resumeRouter.post('/:id/duplicate', requirePermission('resumes.manage_own'), controller.duplicateResume);
resumeRouter.patch('/:id/primary', requirePermission('resumes.manage_own'), controller.setPrimaryResume);
resumeRouter.delete('/:id', requirePermission('resumes.manage_own'), controller.deleteResume);

// Resume AI enhancement, analysis & matching routes
resumeRouter.post('/enhance-text', requirePermission('resumes.manage_own'), aiRateLimiter, controller.enhanceText);
resumeRouter.post('/:id/analyze', requirePermission('resume_analysis.analyze_own'), aiRateLimiter, controller.analyzeResume);
resumeRouter.get('/:id/analyses', requirePermission('resume_analysis.analyze_own'), controller.getAnalyses);
resumeRouter.post('/:id/match', requirePermission('resumes.manage_own'), aiRateLimiter, controller.matchOpportunity);
