import { describe, expect, it } from 'vitest';

import { ProfileCompletionService } from './profile-completion.service';

describe('ProfileCompletionService', () => {
  const service = new ProfileCompletionService();

  it('calculates 0% for an empty profile', () => {
    const result = service.calculateCompletion({
      skillsCount: 0,
      projectsCount: 0,
      certificationsCount: 0,
      achievementsCount: 0,
      resumeCount: 0,
    });

    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.completedSections).toHaveLength(0);
    expect(result.missingSections).toHaveLength(7);
  });

  it('calculates partial score when only academic details are present', () => {
    const result = service.calculateCompletion({
      rollNumber: '2022CSE001',
      departmentId: '550e8400-e29b-41d4-a716-446655440001',
      programId: '550e8400-e29b-41d4-a716-446655440002',
      batchId: '550e8400-e29b-41d4-a716-446655440003',
      cgpa: 8.5,
      skillsCount: 0,
      projectsCount: 0,
      certificationsCount: 0,
      achievementsCount: 0,
      resumeCount: 0,
    });

    expect(result.percentage).toBe(20);
    expect(result.completedSections).toContain('Academic Information');
    expect(result.missingSections).toContain('Skills & Proficiencies');
  });

  it('calculates 100% when all 7 categories satisfy requirements', () => {
    const result = service.calculateCompletion({
      rollNumber: '2022CSE001',
      departmentId: '550e8400-e29b-41d4-a716-446655440001',
      programId: '550e8400-e29b-41d4-a716-446655440002',
      batchId: '550e8400-e29b-41d4-a716-446655440003',
      cgpa: 9.1,
      phone: '+1234567890',
      bio: 'Software engineer passionate about scalable backend microservices and databases.',
      linkedinUrl: 'https://linkedin.com/in/student',
      githubUrl: 'https://github.com/student',
      portfolioUrl: 'https://student.dev',
      skillsCount: 6,
      projectsCount: 3,
      certificationsCount: 2,
      achievementsCount: 1,
      resumeCount: 1,
    });

    expect(result.percentage).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.completedSections).toHaveLength(7);
    expect(result.missingSections).toHaveLength(0);
  });
});
