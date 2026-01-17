import { describe, it, expect } from 'vitest';
import { getFootballMinute, formatGameMinute } from './formatters';

describe('getFootballMinute', () => {
  describe('basic rounding rules', () => {
    it('should return 0 for 0:00 (0 seconds)', () => {
      expect(getFootballMinute(0)).toBe(0);
    });

    it('should return 0 for 0:30 (30 seconds) - boundary case, should NOT round up', () => {
      expect(getFootballMinute(30)).toBe(0);
    });

    it('should return 1 for 0:31 (31 seconds) - should round up', () => {
      expect(getFootballMinute(31)).toBe(1);
    });

    it('should return 7 for 7:00 (420 seconds) - exact minute', () => {
      expect(getFootballMinute(420)).toBe(7);
    });

    it('should return 7 for 7:15 (435 seconds) - seconds <= 30', () => {
      expect(getFootballMinute(435)).toBe(7);
    });

    it('should return 7 for 7:30 (450 seconds) - boundary, should NOT round up', () => {
      expect(getFootballMinute(450)).toBe(7);
    });

    it('should return 8 for 7:31 (451 seconds) - should round up', () => {
      expect(getFootballMinute(451)).toBe(8);
    });

    it('should return 7 for 6:35 (395 seconds) - should round up', () => {
      expect(getFootballMinute(395)).toBe(7);
    });

    it('should return 6 for 6:29 (389 seconds) - should NOT round up', () => {
      expect(getFootballMinute(389)).toBe(6);
    });

    it('should return 6 for 6:30 (390 seconds) - boundary, should NOT round up', () => {
      expect(getFootballMinute(390)).toBe(6);
    });
  });

  describe('end of first half edge cases', () => {
    it('should return 44 for 44:30 (2670 seconds)', () => {
      expect(getFootballMinute(2670)).toBe(44);
    });

    it('should return 45 for 44:31 (2671 seconds) - rounds up to 45', () => {
      expect(getFootballMinute(2671)).toBe(45);
    });

    it('should return 45 for 44:59 (2699 seconds) - rounds up to 45', () => {
      expect(getFootballMinute(2699)).toBe(45);
    });

    it('should return 45 for 45:00 (2700 seconds) - exact 45 minutes', () => {
      expect(getFootballMinute(2700)).toBe(45);
    });

    it('should return 45 for 45:30 (2730 seconds) - boundary in added time', () => {
      expect(getFootballMinute(2730)).toBe(45);
    });

    it('should return 46 for 45:31 (2731 seconds) - added time rounds up', () => {
      expect(getFootballMinute(2731)).toBe(46);
    });
  });

  describe('invalid inputs', () => {
    it('should return 0 for negative seconds', () => {
      expect(getFootballMinute(-1)).toBe(0);
    });

    it('should return 0 for NaN', () => {
      expect(getFootballMinute(NaN)).toBe(0);
    });

    it('should return 0 for Infinity', () => {
      expect(getFootballMinute(Infinity)).toBe(0);
    });

    it('should return 0 for -Infinity', () => {
      expect(getFootballMinute(-Infinity)).toBe(0);
    });
  });
});

describe('formatGameMinute', () => {
  describe('first half (period 1)', () => {
    it('should format 0 seconds as "0\'" or "1\'" depending on context', () => {
      // 0 seconds at start shows 0'
      expect(formatGameMinute(0, 1)).toBe("0'");
    });

    it('should format 31 seconds as "1\'" (rounds up)', () => {
      expect(formatGameMinute(31, 1)).toBe("1'");
    });

    it('should format 7:15 (435s) as "7\'"', () => {
      expect(formatGameMinute(435, 1)).toBe("7'");
    });

    it('should format 6:35 (395s) as "7\'" (rounds up)', () => {
      expect(formatGameMinute(395, 1)).toBe("7'");
    });

    it('should format 44:59 (2699s) as "45\'" (rounds up to limit)', () => {
      expect(formatGameMinute(2699, 1)).toBe("45'");
    });

    it('should format 45:00 (2700s) as "45\'"', () => {
      expect(formatGameMinute(2700, 1)).toBe("45'");
    });

    it('should format 45:31 (2731s) as "45+1\'" (added time)', () => {
      expect(formatGameMinute(2731, 1)).toBe("45+1'");
    });

    it('should format 46:31 (2791s) as "45+2\'" (added time)', () => {
      expect(formatGameMinute(2791, 1)).toBe("45+2'");
    });
  });

  describe('second half (period 2)', () => {
    it('should format 0 seconds as "45\'" (start of second half)', () => {
      expect(formatGameMinute(0, 2)).toBe("45'");
    });

    it('should format 31 seconds as "46\'" (rounds up)', () => {
      expect(formatGameMinute(31, 2)).toBe("46'");
    });

    it('should format 7:15 (435s) as "52\'" (45 + 7)', () => {
      expect(formatGameMinute(435, 2)).toBe("52'");
    });

    it('should format 44:59 (2699s) as "90\'" (rounds up to limit)', () => {
      expect(formatGameMinute(2699, 2)).toBe("90'");
    });

    it('should format 45:00 (2700s) as "90\'"', () => {
      expect(formatGameMinute(2700, 2)).toBe("90'");
    });

    it('should format 45:31 (2731s) as "90+1\'" (added time)', () => {
      expect(formatGameMinute(2731, 2)).toBe("90+1'");
    });

    it('should format 48:31 (2911s) as "90+4\'" (added time)', () => {
      expect(formatGameMinute(2911, 2)).toBe("90+4'");
    });
  });

  describe('null/undefined handling', () => {
    it('should return "—" for null', () => {
      expect(formatGameMinute(null, 1)).toBe("—");
    });

    it('should return "—" for undefined', () => {
      expect(formatGameMinute(undefined, 1)).toBe("—");
    });

    it('should return "—" for NaN', () => {
      expect(formatGameMinute(NaN, 1)).toBe("—");
    });
  });

  describe('default period', () => {
    it('should default to period 1 when not specified', () => {
      expect(formatGameMinute(435)).toBe("7'");
    });
  });
});
