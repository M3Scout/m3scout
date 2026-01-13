import { describe, it, expect } from 'vitest';
import {
  getScoreColor,
  getScoreBarColor,
  getScoreBadgeColor,
  getScoreLevel,
} from './scoring';

describe('Score Color Functions', () => {
  describe('getScoreColor', () => {
    it('returns emerald for Alto (score >= 80)', () => {
      expect(getScoreColor(80)).toBe('text-emerald-500');
      expect(getScoreColor(85)).toBe('text-emerald-500');
      expect(getScoreColor(100)).toBe('text-emerald-500');
    });

    it('returns blue for Bom (score 60-79)', () => {
      expect(getScoreColor(60)).toBe('text-blue-500');
      expect(getScoreColor(64)).toBe('text-blue-500');
      expect(getScoreColor(79)).toBe('text-blue-500');
    });

    it('returns amber for Médio (score 40-59)', () => {
      expect(getScoreColor(40)).toBe('text-amber-500');
      expect(getScoreColor(44)).toBe('text-amber-500');
      expect(getScoreColor(59)).toBe('text-amber-500');
    });

    it('returns red for Ruim (score < 40)', () => {
      expect(getScoreColor(0)).toBe('text-red-500');
      expect(getScoreColor(36)).toBe('text-red-500');
      expect(getScoreColor(39)).toBe('text-red-500');
    });
  });

  describe('getScoreBarColor', () => {
    it('returns emerald for Alto (score >= 80)', () => {
      expect(getScoreBarColor(80)).toBe('bg-emerald-500');
      expect(getScoreBarColor(84)).toBe('bg-emerald-500');
      expect(getScoreBarColor(100)).toBe('bg-emerald-500');
    });

    it('returns blue for Bom (score 60-79)', () => {
      expect(getScoreBarColor(60)).toBe('bg-blue-500');
      expect(getScoreBarColor(64)).toBe('bg-blue-500');
      expect(getScoreBarColor(79)).toBe('bg-blue-500');
    });

    it('returns amber for Médio (score 40-59)', () => {
      expect(getScoreBarColor(40)).toBe('bg-amber-500');
      expect(getScoreBarColor(44)).toBe('bg-amber-500');
      expect(getScoreBarColor(59)).toBe('bg-amber-500');
    });

    it('returns red for Ruim (score < 40)', () => {
      expect(getScoreBarColor(0)).toBe('bg-red-500');
      expect(getScoreBarColor(36)).toBe('bg-red-500');
      expect(getScoreBarColor(39)).toBe('bg-red-500');
    });
  });

  describe('getScoreBadgeColor', () => {
    it('returns emerald border and text for Alto (score >= 80)', () => {
      expect(getScoreBadgeColor(80)).toBe('border-emerald-500 text-emerald-500');
      expect(getScoreBadgeColor(84)).toBe('border-emerald-500 text-emerald-500');
      expect(getScoreBadgeColor(100)).toBe('border-emerald-500 text-emerald-500');
    });

    it('returns blue border and text for Bom (score 60-79)', () => {
      expect(getScoreBadgeColor(60)).toBe('border-blue-500 text-blue-500');
      expect(getScoreBadgeColor(64)).toBe('border-blue-500 text-blue-500');
      expect(getScoreBadgeColor(79)).toBe('border-blue-500 text-blue-500');
    });

    it('returns amber border and text for Médio (score 40-59)', () => {
      expect(getScoreBadgeColor(40)).toBe('border-amber-500 text-amber-500');
      expect(getScoreBadgeColor(44)).toBe('border-amber-500 text-amber-500');
      expect(getScoreBadgeColor(59)).toBe('border-amber-500 text-amber-500');
    });

    it('returns red border and text for Ruim (score < 40)', () => {
      expect(getScoreBadgeColor(0)).toBe('border-red-500 text-red-500');
      expect(getScoreBadgeColor(36)).toBe('border-red-500 text-red-500');
      expect(getScoreBadgeColor(39)).toBe('border-red-500 text-red-500');
    });
  });

  describe('getScoreLevel', () => {
    it('returns Alto for score >= 80', () => {
      expect(getScoreLevel(80).label).toBe('Alto');
      expect(getScoreLevel(84).label).toBe('Alto');
      expect(getScoreLevel(100).label).toBe('Alto');
    });

    it('returns Bom for score 60-79', () => {
      expect(getScoreLevel(60).label).toBe('Bom');
      expect(getScoreLevel(64).label).toBe('Bom');
      expect(getScoreLevel(79).label).toBe('Bom');
    });

    it('returns Médio for score 40-59', () => {
      expect(getScoreLevel(40).label).toBe('Médio');
      expect(getScoreLevel(44).label).toBe('Médio');
      expect(getScoreLevel(59).label).toBe('Médio');
    });

    it('returns Ruim for score < 40', () => {
      expect(getScoreLevel(0).label).toBe('Ruim');
      expect(getScoreLevel(36).label).toBe('Ruim');
      expect(getScoreLevel(39).label).toBe('Ruim');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('handles exact boundary values correctly', () => {
      // Boundary: 80 (Alto threshold)
      expect(getScoreColor(79.9)).toBe('text-blue-500');
      expect(getScoreColor(80)).toBe('text-emerald-500');

      // Boundary: 60 (Bom threshold)
      expect(getScoreColor(59.9)).toBe('text-amber-500');
      expect(getScoreColor(60)).toBe('text-blue-500');

      // Boundary: 40 (Médio threshold)
      expect(getScoreColor(39.9)).toBe('text-red-500');
      expect(getScoreColor(40)).toBe('text-amber-500');
    });

    it('all three functions are consistent for same score', () => {
      const testScores = [0, 36, 40, 44, 60, 64, 80, 84, 100];
      
      testScores.forEach(score => {
        const textColor = getScoreColor(score);
        const bgColor = getScoreBarColor(score);
        const badgeColor = getScoreBadgeColor(score);
        
        // Extract the color name (e.g., "emerald", "blue", "amber", "red")
        const textColorName = textColor.replace('text-', '').replace('-500', '');
        const bgColorName = bgColor.replace('bg-', '').replace('-500', '');
        const badgeBorderColor = badgeColor.split(' ')[0].replace('border-', '').replace('-500', '');
        const badgeTextColor = badgeColor.split(' ')[1].replace('text-', '').replace('-500', '');
        
        // All should use the same color
        expect(textColorName).toBe(bgColorName);
        expect(textColorName).toBe(badgeBorderColor);
        expect(textColorName).toBe(badgeTextColor);
      });
    });

    it('never returns primary or destructive (old incorrect colors)', () => {
      const testScores = [0, 20, 39, 40, 59, 60, 79, 80, 100];
      
      testScores.forEach(score => {
        expect(getScoreColor(score)).not.toContain('primary');
        expect(getScoreColor(score)).not.toContain('destructive');
        expect(getScoreBarColor(score)).not.toContain('primary');
        expect(getScoreBarColor(score)).not.toContain('destructive');
        expect(getScoreBadgeColor(score)).not.toContain('primary');
        expect(getScoreBadgeColor(score)).not.toContain('destructive');
      });
    });
  });
});
