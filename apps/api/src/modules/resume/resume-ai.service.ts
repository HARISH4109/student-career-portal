import type {
  ResumeAnalysisResponseDto,
  ResumeContent,
  ResumeEnhanceTextResponseDto,
  ResumeMatchResponseDto,
} from '@career-portal/shared-types';
import axios from 'axios';

import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';

export class ResumeAiService {
  private readonly client = axios.create({
    baseURL: env.AI_SERVICE_BASE_URL,
    timeout: 60_000,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': env.AI_SERVICE_INTERNAL_TOKEN,
    },
  });

  async analyzeResume(content: ResumeContent, resumeId: string): Promise<Omit<ResumeAnalysisResponseDto, 'id' | 'createdAt'>> {
    try {
      const response = await this.client.post<{
        success: boolean;
        data?: {
          overallScore: number;
          atsScore: number;
          skillScore: number;
          keywordScore: number;
          formatScore: number;
          missingSkills: string[];
          improvementSuggestions: { area: string; suggestion: string; priority: 'high' | 'medium' | 'low' }[];
          aiInsights: string[];
          aiSummaryRewrite: string | null;
          modelVersion: string;
          analyzedAt: string;
        };
      }>('/v1/resume/analyze', {
        content,
      });

      if (response.data.success && response.data.data) {
        const d = response.data.data;
        return {
          resumeId,
          overallScore: d.overallScore,
          atsScore: d.atsScore,
          skillScore: d.skillScore,
          keywordScore: d.keywordScore,
          formatScore: d.formatScore,
          missingSkills: d.missingSkills,
          improvementSuggestions: d.improvementSuggestions,
          aiInsights: d.aiInsights,
          aiSummaryRewrite: d.aiSummaryRewrite || null,
          modelVersion: d.modelVersion,
          analyzedAt: d.analyzedAt,
        };
      }
    } catch (error) {
      logger.warn({ err: error, resumeId }, 'AI service unavailable or error during resume analysis — using local fallback');
    }

    // Local deterministic fallback analyzer
    return this.fallbackAnalyze(content, resumeId);
  }

  async enhanceText(
    text: string,
    sectionType: 'experience' | 'project' | 'summary' = 'experience',
    context?: Record<string, unknown>  ,
  ): Promise<ResumeEnhanceTextResponseDto> {
    try {
      const response = await this.client.post<{
        success: boolean;
        data?: ResumeEnhanceTextResponseDto;
      }>('/v1/resume/enhance-text', {
        text,
        sectionType,
        context: context ?? {},
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      logger.warn({ err: error }, 'AI service unavailable for text enhancement — using fallback');
    }

    // Fallback enhancement
    const trimmed = text.trim();
    const fallbackText = trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
    return {
      enhancedText: fallbackText,
      bulletPoints: [],
      keyChanges: ['AI enhancement unavailable; original content preserved with punctuation cleanup.'],
      modelVersion: 'local-fallback-v1.0',
    };
  }

  async matchOpportunity(
    resumeContent: ResumeContent,
    opportunitySkills: string[],
    eligibilityContext?: {
      requiredCgpa?: number | undefined;
      studentCgpa?: number | undefined;
      eligibleDepartments?: string[] | undefined;
      studentDepartment?: string | undefined;
    }  ,
  ): Promise<ResumeMatchResponseDto> {
    try {
      const response = await this.client.post<{
        success: boolean;
        data?: ResumeMatchResponseDto;
      }>('/v1/resume/match-opportunity', {
        resumeContent,
        opportunitySkills,
        eligibilityContext,
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      logger.warn({ err: error }, 'AI service unavailable for opportunity matching — using local fallback');
    }

    return this.fallbackMatch(resumeContent, opportunitySkills, eligibilityContext);
  }

  // ── Fallback Implementations ────────────────────────────────────────────

  private fallbackAnalyze(content: ResumeContent, resumeId: string): Omit<ResumeAnalysisResponseDto, 'id' | 'createdAt'> {
    const hasSummary = Boolean(content.summary && content.summary.length >= 50);
    const skillsCount = content.skills.length;
    const projectsCount = content.projects.length;
    const expCount = content.experience.length;

    let formatScore = 50;
    if (content.fullName && content.email) formatScore += 20;
    if (content.phone) formatScore += 10;
    if (content.linkedinUrl || content.githubUrl) formatScore += 20;

    let skillScore = 30;
    if (skillsCount >= 8) skillScore = 95;
    else if (skillsCount >= 4) skillScore = 75;
    else if (skillsCount >= 1) skillScore = 50;

    let keywordScore = 40;
    if (projectsCount >= 2) keywordScore += 30;
    else if (projectsCount === 1) keywordScore += 15;
    if (expCount >= 1) keywordScore += 30;

    let atsScore = Math.round((formatScore * 0.4) + (keywordScore * 0.4) + (hasSummary ? 20 : 0));
    formatScore = Math.min(100, formatScore);
    skillScore = Math.min(100, skillScore);
    keywordScore = Math.min(100, keywordScore);
    atsScore = Math.min(100, atsScore);

    const overallScore = Math.round((atsScore * 0.35) + (skillScore * 0.30) + (keywordScore * 0.20) + (formatScore * 0.15));

    const suggestions: { area: string; suggestion: string; priority: 'high' | 'medium' | 'low' }[] = [];
    if (!hasSummary) {
      suggestions.push({
        area: 'Summary',
        suggestion: 'Add a concise 2-3 line professional summary highlighting your key technical strengths.',
        priority: 'high',
      });
    }
    if (skillsCount < 5) {
      suggestions.push({
        area: 'Skills',
        suggestion: 'Include more relevant programming languages, developer tools, and frameworks.',
        priority: 'high',
      });
    }
    if (projectsCount < 2) {
      suggestions.push({
        area: 'Projects',
        suggestion: 'Showcase at least 2 complete software projects with live or GitHub links.',
        priority: 'medium',
      });
    }

    return {
      resumeId,
      overallScore,
      atsScore,
      skillScore,
      keywordScore,
      formatScore,
      missingSkills: ['Git', 'Docker', 'REST APIs', 'Unit Testing'].filter(
        (s) => !content.skills.map((k) => k.toLowerCase()).includes(s.toLowerCase()),
      ),
      improvementSuggestions: suggestions,
      aiInsights: [],
      aiSummaryRewrite: null,
      modelVersion: 'local-fallback-v1.0',
      analyzedAt: new Date().toISOString(),
    };
  }

  private fallbackMatch(
    resumeContent: ResumeContent,
    opportunitySkills: string[],
    eligibility?: {
      requiredCgpa?: number | undefined;
      studentCgpa?: number | undefined;
      eligibleDepartments?: string[] | undefined;
      studentDepartment?: string | undefined;
    }  ,
  ): ResumeMatchResponseDto {
    const resumeSkillsLower = new Set([
      ...resumeContent.skills.map((s) => s.toLowerCase()),
      ...resumeContent.projects.flatMap((p) => p.technologies.map((t) => t.toLowerCase())),
    ]);

    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of opportunitySkills) {
      if (resumeSkillsLower.has(req.toLowerCase())) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const ratio = opportunitySkills.length > 0 ? matched.length / opportunitySkills.length : 1;
    const matchScore = Math.round(ratio * 80 + (resumeContent.projects.length >= 2 ? 20 : 10));

    let isEligible = true;
    const reasons: string[] = [];

    if (eligibility?.requiredCgpa && eligibility.studentCgpa && eligibility.studentCgpa < eligibility.requiredCgpa) {
      isEligible = false;
      reasons.push(`Student CGPA (${String(eligibility.studentCgpa)}) is lower than minimum requirement (${String(eligibility.requiredCgpa)}).`);
    }

    if (matched.length > 0) {
      reasons.push(`Candidate possesses ${String(matched.length)} of ${String(opportunitySkills.length)} required skills.`);
    }

    return {
      matchScore: Math.min(100, matchScore),
      matchedSkills: matched,
      missingSkills: missing,
      explanatoryReasons: reasons,
      isEligible,
    };
  }
}
