import type {
  ProfileCompletionCategory,
  ProfileCompletionResponseDto,
} from '@career-portal/shared-types';

export interface ProfileCalculationInput {
  rollNumber?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  batchId?: string | null;
  cgpa?: string | number | null;
  phone?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  skillsCount: number;
  projectsCount: number;
  certificationsCount: number;
  achievementsCount: number;
  resumeCount: number;
}

export class ProfileCompletionService {
  /**
   * Deterministically calculates profile completion percentage across 7 key sections.
   */
  calculateCompletion(input: ProfileCalculationInput): ProfileCompletionResponseDto {
    const categories: ProfileCompletionCategory[] = [];

    // 1. Academic Details (Weight: 20%)
    const hasAcademic =
      Boolean(input.departmentId) &&
      Boolean(input.programId) &&
      Boolean(input.batchId) &&
      Boolean(input.rollNumber);
    const hasCgpa = input.cgpa !== null && input.cgpa !== undefined && input.cgpa !== '';
    const academicScore = hasAcademic ? (hasCgpa ? 20 : 15) : 0;
    categories.push({
      id: 'academic',
      name: 'Academic Information',
      weight: 20,
      isCompleted: hasAcademic && hasCgpa,
      score: academicScore,
      detail: hasAcademic
        ? hasCgpa
          ? 'Complete academic profile and CGPA.'
          : 'Add your CGPA for 100% academic completion.'
        : 'Select your department, program, batch, and roll number.',
    });

    // 2. Contact & Bio (Weight: 15%)
    const hasPhone = Boolean(input.phone?.trim());
    const hasBio = Boolean(input.bio?.trim() && input.bio.trim().length >= 20);
    let contactScore = 0;
    if (hasPhone) contactScore += 7.5;
    if (hasBio) contactScore += 7.5;
    categories.push({
      id: 'contact_bio',
      name: 'Contact & Bio',
      weight: 15,
      isCompleted: hasPhone && hasBio,
      score: contactScore,
      detail:
        hasPhone && hasBio
          ? 'Contact details and bio provided.'
          : 'Provide your phone number and a short bio (at least 20 characters).',
    });

    // 3. Technical Skills (Weight: 15%)
    let skillScore = 0;
    if (input.skillsCount >= 4) {
      skillScore = 15;
    } else if (input.skillsCount >= 1) {
      skillScore = Math.round((input.skillsCount / 4) * 15);
    }
    categories.push({
      id: 'skills',
      name: 'Skills & Proficiencies',
      weight: 15,
      isCompleted: input.skillsCount >= 4,
      score: skillScore,
      detail:
        input.skillsCount >= 4
          ? `${String(input.skillsCount)} skills added.`
          : `Add at least 4 skills with proficiency levels (currently ${String(input.skillsCount)}).`,
    });

    // 4. Projects (Weight: 20%)
    let projectScore = 0;
    if (input.projectsCount >= 2) {
      projectScore = 20;
    } else if (input.projectsCount === 1) {
      projectScore = 10;
    }
    categories.push({
      id: 'projects',
      name: 'Projects & Portfolio',
      weight: 20,
      isCompleted: input.projectsCount >= 2,
      score: projectScore,
      detail:
        input.projectsCount >= 2
          ? `${String(input.projectsCount)} project(s) showcase your experience.`
          : `Add at least 2 technical projects (currently ${String(input.projectsCount)}).`,
    });

    // 5. Certifications & Achievements (Weight: 10%)
    const hasCertOrAchieve = input.certificationsCount >= 1 || input.achievementsCount >= 1;
    categories.push({
      id: 'certifications',
      name: 'Certifications & Achievements',
      weight: 10,
      isCompleted: hasCertOrAchieve,
      score: hasCertOrAchieve ? 10 : 0,
      detail: hasCertOrAchieve
        ? 'Certifications or achievements added.'
        : 'Add at least 1 industry certification or academic achievement.',
    });

    // 6. Social Links (Weight: 10%)
    const hasSocial =
      Boolean(input.linkedinUrl?.trim()) ||
      Boolean(input.githubUrl?.trim()) ||
      Boolean(input.portfolioUrl?.trim());
    categories.push({
      id: 'social_links',
      name: 'Professional Links',
      weight: 10,
      isCompleted: hasSocial,
      score: hasSocial ? 10 : 0,
      detail: hasSocial
        ? 'Professional links connected.'
        : 'Add your LinkedIn, GitHub, or Portfolio link.',
    });

    // 7. Resume (Weight: 10%)
    const hasResume = input.resumeCount >= 1;
    categories.push({
      id: 'resume',
      name: 'Resume Builder',
      weight: 10,
      isCompleted: hasResume,
      score: hasResume ? 10 : 0,
      detail: hasResume
        ? `${String(input.resumeCount)} resume(s) created in portal.`
        : 'Create at least 1 resume using the portal Resume Builder.',
    });

    const totalScore = Math.min(
      100,
      Math.round(categories.reduce((acc, cat) => acc + cat.score, 0)),
    );

    const completedSections = categories.filter((c) => c.isCompleted).map((c) => c.name);
    const missingSections = categories.filter((c) => !c.isCompleted).map((c) => c.name);

    return {
      percentage: totalScore,
      isComplete: totalScore >= 85,
      completedSections,
      missingSections,
      categories,
    };
  }
}
