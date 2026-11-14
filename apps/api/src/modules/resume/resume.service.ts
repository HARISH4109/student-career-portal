import type {
  AuthenticatedUser,
  CreateResumeDto,
  ResumeAnalysisResponseDto,
  ResumeContent,
  ResumeEnhanceTextResponseDto,
  ResumeMatchResponseDto,
  ResumeResponseDto,
  UpdateResumeDto,
  UploadResumeDto,
} from '@career-portal/shared-types';

import { extractPdfText } from '../opportunities/pdf-source';
import { StudentRepository } from '../student/student.repository';

import { ResumeAiService } from './resume-ai.service';
import { parseResumeText } from './resume-parser';
import { ResumeRepository } from './resume.repository';
import { auditService } from '../audit/audit.service';

import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

export class ResumeService {
  constructor(
    private readonly resumeRepo: ResumeRepository = new ResumeRepository(),
    private readonly studentRepo: StudentRepository = new StudentRepository(),
    private readonly aiService: ResumeAiService = new ResumeAiService(),
  ) {}

  async getResumes(userId: string): Promise<ResumeResponseDto[]> {
    const student = await this.getStudentOrThrow(userId);
    const list = await this.resumeRepo.findResumesByStudentId(student.id);
    return list.map((r) => this.mapToResponse(r));
  }

  async getResumeById(
    resumeId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeRepo.findResumeById(resumeId);
    if (!resume) {
      throw new NotFoundError('Resume');
    }

    const isOwner = resume.student.userId === requestingUser.id;
    const canViewAll = requestingUser.permissions.includes('resumes.view_all');

    if (!isOwner && !canViewAll) {
      throw new ForbiddenError('You do not have permission to view this resume');
    }

    return this.mapToResponse(resume);
  }

  async createResume(userId: string, dto: CreateResumeDto): Promise<ResumeResponseDto> {
    const student = await this.getStudentOrThrow(userId);

    // If this is the student's first resume, make it primary by default
    const existing = await this.resumeRepo.findResumesByStudentId(student.id);
    const isPrimary = existing.length === 0 ? true : dto.isPrimary;

    const created = await this.resumeRepo.createResume({
      studentId: student.id,
      title: dto.title,
      templateId: dto.templateId,
      content: dto.content,
      isPrimary,
      version: 1,
    });

    void auditService.log({
      userId,
      action: 'resume.created',
      entityType: 'resume',
      entityId: created.id,
      metadata: { title: created.title },
    });

    return this.mapToResponse(created);
  }

  async uploadResume(
    userId: string,
    dto: UploadResumeDto,
  ): Promise<ResumeResponseDto> {
    const student = await this.getStudentOrThrow(userId);

    let content: ResumeContent;
    let title = dto.title?.trim() || dto.fileName.replace(/\.[^/.]+$/, '').trim();
    if (!title) title = 'Uploaded Resume';

    if (dto.fileType === 'json') {
      try {
        const parsed = JSON.parse(dto.fileContent);
        const parsedContent = parsed.content || parsed;
        content = {
          fullName: parsedContent.fullName || student.user?.fullName || 'Student',
          email: parsedContent.email || student.user?.email || 'student@university.edu',
          phone: parsedContent.phone || '',
          location: parsedContent.location || '',
          linkedinUrl: parsedContent.linkedinUrl || '',
          githubUrl: parsedContent.githubUrl || '',
          portfolioUrl: parsedContent.portfolioUrl || '',
          summary: parsedContent.summary || '',
          education: Array.isArray(parsedContent.education) ? parsedContent.education : [],
          experience: Array.isArray(parsedContent.experience) ? parsedContent.experience : [],
          skills: Array.isArray(parsedContent.skills) ? parsedContent.skills : [],
          projects: Array.isArray(parsedContent.projects) ? parsedContent.projects : [],
          certifications: Array.isArray(parsedContent.certifications) ? parsedContent.certifications : [],
          achievements: Array.isArray(parsedContent.achievements) ? parsedContent.achievements : [],
          customSections: Array.isArray(parsedContent.customSections) ? parsedContent.customSections : [],
          isUploaded: true,
          uploadedFileName: dto.fileName,
        };
        if (parsed.title) title = parsed.title;
      } catch {
        throw new ValidationError('Invalid JSON resume format.');
      }
    } else {
      let rawText = dto.fileContent;
      if (dto.fileType === 'pdf') {
        rawText = await extractPdfText(dto.fileContent);
      }

      content = parseResumeText(rawText, student, dto.fileName);
    }

    const existing = await this.resumeRepo.findResumesByStudentId(student.id);
    const isPrimary = existing.length === 0;

    const created = await this.resumeRepo.createResume({
      studentId: student.id,
      title,
      templateId: 'modern',
      content,
      fileUrl: dto.fileType === 'pdf' && dto.fileContent.startsWith('data:') ? dto.fileContent : null,
      isPrimary,
      version: 1,
    });

    void auditService.log({
      userId,
      action: 'resume.uploaded',
      entityType: 'resume',
      entityId: created.id,
      metadata: { title, fileName: dto.fileName },
    });

    return this.mapToResponse(created);
  }

  // Old parser superseded by standalone resume-parser.ts
  _unusedOldParser(
    rawText: string,
    student: { user?: { fullName?: string | null; email?: string | null } | null },
    fileName: string,
  ): ResumeContent {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. Email extraction
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : (student.user?.email || 'student@university.edu');

    // 2. Phone extraction
    const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    // 3. Name extraction
    let fullName = student.user?.fullName || '';
    if (lines.length > 0 && lines[0] && !lines[0].includes('@') && lines[0].length < 50) {
      fullName = lines[0];
    }
    if (!fullName) fullName = 'Student Name';

    // 4. Skills extraction
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'NestJS', 'FastAPI', 'Django', 'Flask', 'Spring Boot',
      'HTML', 'CSS', 'Tailwind', 'TailwindCSS', 'Sass', 'Bootstrap',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Cassandra',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Git', 'GitHub', 'CI/CD', 'REST API', 'GraphQL',
      'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Data Science', 'Pandas', 'NumPy',
      'Figma', 'Agile', 'Scrum', 'Jira',
    ];
    const detectedSkills: string[] = [];
    const textLower = rawText.toLowerCase();
    for (const skill of commonSkills) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textLower)) {
        detectedSkills.push(skill);
      }
    }

    // 5. Summary extraction
    let summary = '';
    const summaryHeaderIndex = lines.findIndex((l) => /^(summary|objective|profile|about me)/i.test(l));
    if (summaryHeaderIndex !== -1 && lines[summaryHeaderIndex + 1]) {
      summary = lines.slice(summaryHeaderIndex + 1, summaryHeaderIndex + 4).join(' ');
    } else if (lines.length > 1) {
      summary = lines.slice(1, 4).filter((l) => !l.includes('@') && !l.includes('http')).join(' ');
    }
    if (summary.length > 500) summary = summary.substring(0, 500);

    return {
      fullName,
      email,
      phone,
      location: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      summary,
      education: [],
      experience: [],
      skills: detectedSkills.length > 0 ? detectedSkills : ['Problem Solving', 'Communication'],
      projects: [],
      certifications: [],
      achievements: [],
      isUploaded: true,
      uploadedFileName: fileName,
      customSections: [],
    };
  }

  async updateResume(
    userId: string,
    resumeId: string,
    dto: UpdateResumeDto,
  ): Promise<ResumeResponseDto> {
    const student = await this.getStudentOrThrow(userId);
    const resume = await this.resumeRepo.findResumeById(resumeId);

    if (!resume || resume.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    const updated = await this.resumeRepo.updateResume(resumeId, student.id, {
      title: dto.title,
      templateId: dto.templateId,
      content: dto.content,
      isPrimary: dto.isPrimary,
    });

    return this.mapToResponse(updated);
  }

  async duplicateResume(userId: string, resumeId: string): Promise<ResumeResponseDto> {
    const student = await this.getStudentOrThrow(userId);
    const original = await this.resumeRepo.findResumeById(resumeId);

    if (!original || original.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    const duplicateTitle = `${original.title} (Copy)`;
    const newVersion = (original.version) + 1;

    const duplicated = await this.resumeRepo.createResume({
      studentId: student.id,
      title: duplicateTitle,
      templateId: original.templateId,
      content: original.content as ResumeContent,
      isPrimary: false,
      version: newVersion,
    });

    return this.mapToResponse(duplicated);
  }

  async setPrimaryResume(userId: string, resumeId: string): Promise<ResumeResponseDto> {
    const student = await this.getStudentOrThrow(userId);
    const resume = await this.resumeRepo.findResumeById(resumeId);

    if (!resume || resume.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    const updated = await this.resumeRepo.setPrimaryResume(student.id, resumeId);
    return this.mapToResponse(updated);
  }

  async deleteResume(userId: string, resumeId: string): Promise<void> {
    const student = await this.getStudentOrThrow(userId);
    const resume = await this.resumeRepo.findResumeById(resumeId);

    if (!resume || resume.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    await this.resumeRepo.deleteResume(resumeId, student.id);

    void auditService.log({
      userId,
      action: 'resume.deleted',
      entityType: 'resume',
      entityId: resumeId,
      metadata: { title: resume.title },
    });
  }

  async analyzeResume(userId: string, resumeId: string): Promise<ResumeAnalysisResponseDto> {
    const student = await this.getStudentOrThrow(userId);
    const resume = await this.resumeRepo.findResumeById(resumeId);

    if (!resume || resume.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    const analysisData = await this.aiService.analyzeResume(
      resume.content as ResumeContent,
      resumeId,
    );

    const saved = await this.resumeRepo.saveAnalysis({
      resumeId,
      overallScore: analysisData.overallScore,
      atsScore: analysisData.atsScore,
      skillScore: analysisData.skillScore,
      keywordScore: analysisData.keywordScore,
      formatScore: analysisData.formatScore,
      missingSkills: analysisData.missingSkills,
      improvementSuggestions: analysisData.improvementSuggestions,
      aiInsights: analysisData.aiInsights,
      aiSummaryRewrite: analysisData.aiSummaryRewrite ?? null,
      modelVersion: analysisData.modelVersion,
    });

    void auditService.log({
      userId,
      action: 'resume.ai_analyzed',
      entityType: 'resume',
      entityId: resumeId,
      metadata: { atsScore: analysisData.atsScore, overallScore: analysisData.overallScore },
    });

    return {
      id: saved.id,
      resumeId: saved.resumeId,
      overallScore: Number(saved.overallScore),
      atsScore: Number(saved.atsScore),
      skillScore: Number(saved.skillScore),
      keywordScore: Number(saved.keywordScore),
      formatScore: Number(saved.formatScore),
      missingSkills: Array.isArray(saved.missingSkills) ? (saved.missingSkills as string[]) : [],
      improvementSuggestions: Array.isArray(saved.improvementSuggestions)
        ? (saved.improvementSuggestions as ResumeAnalysisResponseDto['improvementSuggestions'])
        : [],
      aiInsights: Array.isArray(saved.aiInsights) ? (saved.aiInsights as string[]) : [],
      aiSummaryRewrite: (saved.aiSummaryRewrite) ?? null,
      modelVersion: saved.modelVersion,
      analyzedAt: saved.analyzedAt,
    };
  }

  async getAnalyses(userId: string, resumeId: string): Promise<ResumeAnalysisResponseDto[]> {
    const student = await this.getStudentOrThrow(userId);
    const resume = await this.resumeRepo.findResumeById(resumeId);

    if (!resume || resume.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    const list = await this.resumeRepo.getAnalysesByResumeId(resumeId);
    return list.map((a) => ({
      id: a.id,
      resumeId: a.resumeId,
      overallScore: Number(a.overallScore),
      atsScore: Number(a.atsScore),
      skillScore: Number(a.skillScore),
      keywordScore: Number(a.keywordScore),
      formatScore: Number(a.formatScore),
      missingSkills: Array.isArray(a.missingSkills) ? (a.missingSkills as string[]) : [],
      improvementSuggestions: Array.isArray(a.improvementSuggestions)
        ? (a.improvementSuggestions as ResumeAnalysisResponseDto['improvementSuggestions'])
        : [],
      aiInsights: Array.isArray(a.aiInsights) ? (a.aiInsights as string[]) : [],
      aiSummaryRewrite: a.aiSummaryRewrite,
      modelVersion: a.modelVersion,
      analyzedAt: a.analyzedAt,
    }));
  }

  async matchOpportunity(
    userId: string,
    resumeId: string,
    opportunitySkills: string[],
    eligibilityContext?: {
      requiredCgpa?: number | undefined;
      studentCgpa?: number | undefined;
      eligibleDepartments?: string[] | undefined;
      studentDepartment?: string | undefined;
    }  ,
  ): Promise<ResumeMatchResponseDto> {
    const student = await this.getStudentOrThrow(userId);
    const resume = await this.resumeRepo.findResumeById(resumeId);

    if (!resume || resume.studentId !== student.id) {
      throw new NotFoundError('Resume');
    }

    return this.aiService.matchOpportunity(
      resume.content as ResumeContent,
      opportunitySkills,
      eligibilityContext,
    );
  }

  async enhanceText(
    text: string,
    sectionType: 'experience' | 'project' | 'summary' = 'experience',
    context?: Record<string, unknown>  ,
  ): Promise<ResumeEnhanceTextResponseDto> {
    return this.aiService.enhanceText(text, sectionType, context);
  }

  // ── Private Helpers ────────────────────────────────────────────────────
  private async getStudentOrThrow(userId: string) {
    const student = await this.studentRepo.findProfileByUserId(userId);
    if (!student) {
      throw new NotFoundError('Student profile. Please complete your profile first.');
    }
    return student;
  }

  private mapToResponse(resume: Awaited<ReturnType<ResumeRepository['createResume']>>): ResumeResponseDto {
    return {
      id: resume.id,
      studentId: resume.studentId,
      title: resume.title,
      templateId: resume.templateId,
      content: resume.content as ResumeContent,
      fileUrl: resume.fileUrl ?? null,
      version: resume.version,
      isPrimary: resume.isPrimary,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }
}
