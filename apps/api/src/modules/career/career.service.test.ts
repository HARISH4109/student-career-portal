import { describe, expect, it } from 'vitest';
import { classifySkill, normalizeSkill, roadmapProgress } from './career.service';

describe('Career rules', () => {
  describe('classifySkill', () => {
    it('compares proficiency while opportunity requirements use presence', () => {
      expect(classifySkill(null, 'beginner')).toBe('missing');
      expect(classifySkill('beginner', 'advanced')).toBe('below_target');
      expect(classifySkill('expert', 'advanced')).toBe('matched');
      expect(classifySkill('beginner', null)).toBe('matched');
    });

    it('handles null and undefined edge cases', () => {
      expect(classifySkill(null, null)).toBe('missing');
      expect(classifySkill(null, 'expert')).toBe('missing');
      expect(classifySkill('beginner', null)).toBe('matched');
      expect(classifySkill('intermediate', null)).toBe('matched');
      expect(classifySkill('advanced', null)).toBe('matched');
      expect(classifySkill('expert', null)).toBe('matched');
    });

    it('correctly handles same-level proficiency comparisons', () => {
      expect(classifySkill('beginner', 'beginner')).toBe('matched');
      expect(classifySkill('intermediate', 'intermediate')).toBe('matched');
      expect(classifySkill('advanced', 'advanced')).toBe('matched');
      expect(classifySkill('expert', 'expert')).toBe('matched');
    });

    it('correctly classifies below_target vs matched across all level transitions', () => {
      // Below target
      expect(classifySkill('beginner', 'intermediate')).toBe('below_target');
      expect(classifySkill('beginner', 'advanced')).toBe('below_target');
      expect(classifySkill('beginner', 'expert')).toBe('below_target');
      expect(classifySkill('intermediate', 'advanced')).toBe('below_target');
      expect(classifySkill('intermediate', 'expert')).toBe('below_target');
      expect(classifySkill('advanced', 'expert')).toBe('below_target');

      // Exceeding / Matched target
      expect(classifySkill('intermediate', 'beginner')).toBe('matched');
      expect(classifySkill('advanced', 'beginner')).toBe('matched');
      expect(classifySkill('advanced', 'intermediate')).toBe('matched');
      expect(classifySkill('expert', 'beginner')).toBe('matched');
      expect(classifySkill('expert', 'intermediate')).toBe('matched');
      expect(classifySkill('expert', 'advanced')).toBe('matched');
    });
  });

  describe('roadmapProgress', () => {
    it('orders stages independently of completion order', () => {
      expect(
        roadmapProgress([
          { id: 'first', isCompleted: false },
          { id: 'second', isCompleted: true },
        ]),
      ).toEqual({ progressPercent: 50, currentStageId: 'first' });
    });

    it('handles empty stage arrays gracefully', () => {
      expect(roadmapProgress([])).toEqual({ progressPercent: 0, currentStageId: null });
    });

    it('handles all stages completed', () => {
      expect(
        roadmapProgress([
          { id: 'stage-1', isCompleted: true },
          { id: 'stage-2', isCompleted: true },
          { id: 'stage-3', isCompleted: true },
        ]),
      ).toEqual({ progressPercent: 100, currentStageId: null });
    });

    it('handles no stages completed', () => {
      expect(
        roadmapProgress([
          { id: 'stage-1', isCompleted: false },
          { id: 'stage-2', isCompleted: false },
          { id: 'stage-3', isCompleted: false },
        ]),
      ).toEqual({ progressPercent: 0, currentStageId: 'stage-1' });
    });

    it('rounds percentage correctly and identifies first non-completed stage', () => {
      expect(
        roadmapProgress([
          { id: 'stage-1', isCompleted: true },
          { id: 'stage-2', isCompleted: false },
          { id: 'stage-3', isCompleted: true },
        ]),
      ).toEqual({ progressPercent: 67, currentStageId: 'stage-2' });

      expect(
        roadmapProgress([
          { id: 'stage-1', isCompleted: true },
          { id: 'stage-2', isCompleted: false },
          { id: 'stage-3', isCompleted: false },
        ]),
      ).toEqual({ progressPercent: 33, currentStageId: 'stage-2' });
    });
  });

  describe('normalizeSkill', () => {
    it('matches canonical skill topics without fuzzy inference', () => {
      expect(normalizeSkill(' React ')).toBe('react');
      expect(normalizeSkill('React fundamentals')).not.toBe(normalizeSkill('React'));
    });

    it('handles leading, trailing, and mixed whitespace and casing variations', () => {
      expect(normalizeSkill('   TypeScript   ')).toBe('typescript');
      expect(normalizeSkill('\tNODE.JS\n')).toBe('node.js');
      expect(normalizeSkill('  Python  ')).toBe('python');
      expect(normalizeSkill('GraphQL')).toBe('graphql');
      expect(normalizeSkill('   POSTGRESQL   ')).toBe('postgresql');
      expect(normalizeSkill('c++')).toBe('c++');
      expect(normalizeSkill('  C#  ')).toBe('c#');
      expect(normalizeSkill('')).toBe('');
    });
  });
});
