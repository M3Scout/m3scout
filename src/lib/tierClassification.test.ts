import { describe, it, expect } from 'vitest';
import {
  getTierFromCoefficient,
  getTierColorClasses,
  getTierAdminBadgeClass,
  getTierInfo,
  TIER_COLORS,
  TIER_THRESHOLDS
} from './tierClassification';

describe('getTierFromCoefficient', () => {
  describe('Tier S (>= 0.9400)', () => {
    it('should return S for coefficient 0.9400 (edge case)', () => {
      expect(getTierFromCoefficient(0.9400)).toBe('S');
    });

    it('should return S for coefficient 0.95', () => {
      expect(getTierFromCoefficient(0.95)).toBe('S');
    });

    it('should return S for coefficient 1.00', () => {
      expect(getTierFromCoefficient(1.00)).toBe('S');
    });

    it('should return S for coefficient 1.20', () => {
      expect(getTierFromCoefficient(1.20)).toBe('S');
    });
  });

  describe('Tier A (0.8500 - 0.9399)', () => {
    it('should return A for coefficient 0.9399 (edge case)', () => {
      expect(getTierFromCoefficient(0.9399)).toBe('A');
    });

    it('should return A for coefficient 0.90', () => {
      expect(getTierFromCoefficient(0.90)).toBe('A');
    });

    it('should return A for coefficient 0.8500 (edge case)', () => {
      expect(getTierFromCoefficient(0.8500)).toBe('A');
    });
  });

  describe('Tier B (0.7400 - 0.8499)', () => {
    it('should return B for coefficient 0.8499 (edge case)', () => {
      expect(getTierFromCoefficient(0.8499)).toBe('B');
    });

    it('should return B for coefficient 0.80', () => {
      expect(getTierFromCoefficient(0.80)).toBe('B');
    });

    it('should return B for coefficient 0.7400 (edge case)', () => {
      expect(getTierFromCoefficient(0.7400)).toBe('B');
    });
  });

  describe('Tier C (0.6000 - 0.7399)', () => {
    it('should return C for coefficient 0.7399 (edge case)', () => {
      expect(getTierFromCoefficient(0.7399)).toBe('C');
    });

    it('should return C for coefficient 0.67', () => {
      expect(getTierFromCoefficient(0.67)).toBe('C');
    });

    it('should return C for coefficient 0.6000 (edge case)', () => {
      expect(getTierFromCoefficient(0.6000)).toBe('C');
    });
  });

  describe('Tier D (< 0.6000)', () => {
    it('should return D for coefficient 0.5999 (edge case)', () => {
      expect(getTierFromCoefficient(0.5999)).toBe('D');
    });

    it('should return D for coefficient 0.40', () => {
      expect(getTierFromCoefficient(0.40)).toBe('D');
    });

    it('should return D for coefficient 0', () => {
      expect(getTierFromCoefficient(0)).toBe('D');
    });
  });

  describe('Edge cases boundary precision', () => {
    it('0.9400 should be S', () => {
      expect(getTierFromCoefficient(0.9400)).toBe('S');
    });

    it('0.9399 should be A (not S)', () => {
      expect(getTierFromCoefficient(0.9399)).toBe('A');
    });

    it('0.8500 should be A', () => {
      expect(getTierFromCoefficient(0.8500)).toBe('A');
    });

    it('0.8499 should be B (not A)', () => {
      expect(getTierFromCoefficient(0.8499)).toBe('B');
    });

    it('0.7400 should be B', () => {
      expect(getTierFromCoefficient(0.7400)).toBe('B');
    });

    it('0.7399 should be C (not B)', () => {
      expect(getTierFromCoefficient(0.7399)).toBe('C');
    });

    it('0.6000 should be C', () => {
      expect(getTierFromCoefficient(0.6000)).toBe('C');
    });

    it('0.5999 should be D (not C)', () => {
      expect(getTierFromCoefficient(0.5999)).toBe('D');
    });
  });
});

describe('getTierColorClasses', () => {
  it('should return correct color classes for each tier', () => {
    expect(getTierColorClasses('S')).toContain('amber');
    expect(getTierColorClasses('A')).toContain('emerald');
    expect(getTierColorClasses('B')).toContain('blue');
    expect(getTierColorClasses('C')).toContain('zinc');
    expect(getTierColorClasses('D')).toContain('red');
  });

  it('should return default class for unknown tier', () => {
    expect(getTierColorClasses('X')).toContain('zinc');
  });
});

describe('getTierAdminBadgeClass', () => {
  it('should return correct admin badge classes for each tier', () => {
    expect(getTierAdminBadgeClass('S')).toBe('admin-badge-tier-s');
    expect(getTierAdminBadgeClass('A')).toBe('admin-badge-tier-a');
    expect(getTierAdminBadgeClass('B')).toBe('admin-badge-tier-b');
    expect(getTierAdminBadgeClass('C')).toBe('admin-badge-tier-c');
    expect(getTierAdminBadgeClass('D')).toBe('admin-badge-tier-d');
  });
});

describe('getTierInfo', () => {
  it('should return correct info for Tier S', () => {
    const info = getTierInfo('S');
    expect(info.tier).toBe('S');
    expect(info.label).toBe('Elite');
    expect(info.minCoefficient).toBe(0.94);
    expect(info.maxCoefficient).toBeNull();
  });

  it('should return correct info for Tier A', () => {
    const info = getTierInfo('A');
    expect(info.tier).toBe('A');
    expect(info.label).toBe('Alto');
    expect(info.minCoefficient).toBe(0.85);
    expect(info.maxCoefficient).toBe(0.9399);
  });

  it('should return correct info for Tier D', () => {
    const info = getTierInfo('D');
    expect(info.tier).toBe('D');
    expect(info.label).toBe('Inferior');
    expect(info.minCoefficient).toBeNull();
    expect(info.maxCoefficient).toBe(0.5999);
  });
});

describe('TIER_COLORS constant', () => {
  it('should have entries for all tiers', () => {
    expect(TIER_COLORS).toHaveProperty('S');
    expect(TIER_COLORS).toHaveProperty('A');
    expect(TIER_COLORS).toHaveProperty('B');
    expect(TIER_COLORS).toHaveProperty('C');
    expect(TIER_COLORS).toHaveProperty('D');
  });
});

describe('TIER_THRESHOLDS constant', () => {
  it('should have correct threshold labels', () => {
    expect(TIER_THRESHOLDS.S.label).toBe('>= 0.9400');
    expect(TIER_THRESHOLDS.A.label).toBe('0.8500 – 0.9399');
    expect(TIER_THRESHOLDS.B.label).toBe('0.7400 – 0.8499');
    expect(TIER_THRESHOLDS.C.label).toBe('0.6000 – 0.7399');
    expect(TIER_THRESHOLDS.D.label).toBe('< 0.6000');
  });
});
