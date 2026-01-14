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
  describe('Tier S (> 1.01)', () => {
    it('should return S for coefficient 1.02', () => {
      expect(getTierFromCoefficient(1.02)).toBe('S');
    });

    it('should return S for coefficient 1.04 (Bundesliga case)', () => {
      expect(getTierFromCoefficient(1.04)).toBe('S');
    });

    it('should return S for coefficient 1.10', () => {
      expect(getTierFromCoefficient(1.10)).toBe('S');
    });

    it('should return S for coefficient 1.50', () => {
      expect(getTierFromCoefficient(1.50)).toBe('S');
    });
  });

  describe('Tier A (0.97 - 1.01)', () => {
    it('should return A for coefficient 1.01 (edge case)', () => {
      expect(getTierFromCoefficient(1.01)).toBe('A');
    });

    it('should return A for coefficient 0.99', () => {
      expect(getTierFromCoefficient(0.99)).toBe('A');
    });

    it('should return A for coefficient 0.97 (edge case)', () => {
      expect(getTierFromCoefficient(0.97)).toBe('A');
    });
  });

  describe('Tier B (0.93 - 0.96)', () => {
    it('should return B for coefficient 0.96', () => {
      expect(getTierFromCoefficient(0.96)).toBe('B');
    });

    it('should return B for coefficient 0.94', () => {
      expect(getTierFromCoefficient(0.94)).toBe('B');
    });

    it('should return B for coefficient 0.93 (edge case)', () => {
      expect(getTierFromCoefficient(0.93)).toBe('B');
    });
  });

  describe('Tier C (0.89 - 0.92)', () => {
    it('should return C for coefficient 0.92', () => {
      expect(getTierFromCoefficient(0.92)).toBe('C');
    });

    it('should return C for coefficient 0.90', () => {
      expect(getTierFromCoefficient(0.90)).toBe('C');
    });

    it('should return C for coefficient 0.89 (edge case)', () => {
      expect(getTierFromCoefficient(0.89)).toBe('C');
    });
  });

  describe('Tier D (< 0.89)', () => {
    it('should return D for coefficient 0.88', () => {
      expect(getTierFromCoefficient(0.88)).toBe('D');
    });

    it('should return D for coefficient 0.50', () => {
      expect(getTierFromCoefficient(0.50)).toBe('D');
    });

    it('should return D for coefficient 0', () => {
      expect(getTierFromCoefficient(0)).toBe('D');
    });
  });

  describe('Edge cases boundary precision', () => {
    // Testing the exact boundary between tiers
    it('1.010 should be A (not S)', () => {
      expect(getTierFromCoefficient(1.010)).toBe('A');
    });

    it('1.011 should be S', () => {
      expect(getTierFromCoefficient(1.011)).toBe('S');
    });

    it('0.969 should be B (not A)', () => {
      expect(getTierFromCoefficient(0.969)).toBe('B');
    });

    it('0.929 should be C (not B)', () => {
      expect(getTierFromCoefficient(0.929)).toBe('C');
    });

    it('0.889 should be D (not C)', () => {
      expect(getTierFromCoefficient(0.889)).toBe('D');
    });
  });
});

describe('getTierColorClasses', () => {
  it('should return correct color classes for each tier', () => {
    expect(getTierColorClasses('S')).toContain('amber');
    expect(getTierColorClasses('A')).toContain('primary');
    expect(getTierColorClasses('B')).toContain('emerald');
    expect(getTierColorClasses('C')).toContain('muted');
    expect(getTierColorClasses('D')).toContain('destructive');
  });

  it('should return default class for unknown tier', () => {
    expect(getTierColorClasses('X')).toContain('muted');
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
    expect(info.minCoefficient).toBe(1.02);
    expect(info.maxCoefficient).toBeNull();
  });

  it('should return correct info for Tier A', () => {
    const info = getTierInfo('A');
    expect(info.tier).toBe('A');
    expect(info.label).toBe('Alto');
    expect(info.minCoefficient).toBe(0.97);
    expect(info.maxCoefficient).toBe(1.01);
  });

  it('should return correct info for Tier D', () => {
    const info = getTierInfo('D');
    expect(info.tier).toBe('D');
    expect(info.label).toBe('Inferior');
    expect(info.minCoefficient).toBeNull();
    expect(info.maxCoefficient).toBe(0.88);
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
    expect(TIER_THRESHOLDS.S.label).toBe('> 1.01');
    expect(TIER_THRESHOLDS.A.label).toBe('0.97 – 1.01');
    expect(TIER_THRESHOLDS.B.label).toBe('0.93 – 0.96');
    expect(TIER_THRESHOLDS.C.label).toBe('0.89 – 0.92');
    expect(TIER_THRESHOLDS.D.label).toBe('< 0.89');
  });
});
