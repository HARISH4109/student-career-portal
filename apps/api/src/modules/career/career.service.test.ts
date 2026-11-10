import { describe, expect, it } from 'vitest';
import { classifySkill, normalizeSkill, roadmapProgress } from './career.service';
describe('Career rules', () => {
  it('compares proficiency while opportunity requirements use presence', () => {
    expect(classifySkill(null, 'beginner')).toBe('missing');
    expect(classifySkill('beginner', 'advanced')).toBe('below_target');
    expect(classifySkill('expert', 'advanced')).toBe('matched');
    expect(classifySkill('beginner', null)).toBe('matched');
  });
  it('orders stages independently of completion order', () => {
    expect(
      roadmapProgress([
        { id: 'first', isCompleted: false },
        { id: 'second', isCompleted: true },
      ]),
    ).toEqual({ progressPercent: 50, currentStageId: 'first' });
    expect(roadmapProgress([])).toEqual({ progressPercent: 0, currentStageId: null });
  });
  it('matches canonical skill topics without fuzzy inference', () => {
    expect(normalizeSkill(' React ')).toBe('react');
    expect(normalizeSkill('React fundamentals')).not.toBe(normalizeSkill('React'));
  });
});
