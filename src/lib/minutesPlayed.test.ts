import { describe, it, expect } from "vitest";
import {
  calculateMinutesPlayed,
  normalizeMinuteReg,
  normalizeMinuteTotal,
  getMatchEffectiveDuration,
  getMinutesPlayedPercent,
  STANDARD_MATCH_DURATION,
} from "./minutesPlayed";

describe("normalizeMinuteReg", () => {
  it("caps numeric values at 90", () => {
    expect(normalizeMinuteReg(45)).toBe(45);
    expect(normalizeMinuteReg(90)).toBe(90);
    expect(normalizeMinuteReg(95)).toBe(90);
    expect(normalizeMinuteReg(102)).toBe(90);
  });

  it("handles string format with added time (45+X → 45)", () => {
    expect(normalizeMinuteReg("45+5")).toBe(45);
    expect(normalizeMinuteReg("90+8")).toBe(90);
  });

  it("handles null/undefined", () => {
    expect(normalizeMinuteReg(null)).toBe(0);
    expect(normalizeMinuteReg(undefined as unknown as null)).toBe(0);
  });
});

describe("normalizeMinuteTotal", () => {
  const effectiveDuration = 103; // 90 + 5 + 8

  it("calculates full added time minutes", () => {
    expect(normalizeMinuteTotal("45+5", effectiveDuration)).toBe(50);
    expect(normalizeMinuteTotal("90+8", effectiveDuration)).toBe(98);
  });

  it("caps at effective duration", () => {
    expect(normalizeMinuteTotal(110, effectiveDuration)).toBe(103);
    expect(normalizeMinuteTotal("90+15", effectiveDuration)).toBe(103);
  });

  it("handles numeric values", () => {
    expect(normalizeMinuteTotal(71, effectiveDuration)).toBe(71);
    expect(normalizeMinuteTotal(98, effectiveDuration)).toBe(98);
  });
});

describe("getMatchEffectiveDuration", () => {
  it("calculates effective duration with added time", () => {
    expect(getMatchEffectiveDuration(90, 5, 8)).toBe(103);
    expect(getMatchEffectiveDuration(90, 0, 0)).toBe(90);
    expect(getMatchEffectiveDuration(90, 3, 6)).toBe(99);
  });
});

describe("calculateMinutesPlayed", () => {
  describe("Starter playing full game with added time", () => {
    it("Case A: Jogo 90 + acréscimo 1T=5, 2T=8 → Titular completo", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: null },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 8 }
      );

      expect(result.minutesPlayed).toBe(90);
      expect(result.minutesPlayedTotal).toBe(103);
      expect(result.hasAddedTime).toBe(true);
      expect(getMinutesPlayedPercent(result.minutesPlayed)).toBe(100);
    });
  });

  describe("Substitute entering at 71'", () => {
    it("Case B: Entrou 71' e jogo foi até 90+7 (97 effective)", () => {
      const result = calculateMinutesPlayed(
        { started: false, entered_minute: 71, exited_minute: null },
        { baseDuration: 90, addedTime1H: 0, addedTime2H: 7 }
      );

      // Regulatory: 90 - 71 = 19 (capped at 90)
      expect(result.minutesPlayed).toBe(19);
      // Total: 97 - 71 = 26
      expect(result.minutesPlayedTotal).toBe(26);
      expect(result.hasAddedTime).toBe(true);
      expect(result.rangeDisplay).toBe("71' → 90'");
      expect(result.rangeDisplayTotal).toBe("71' → 90+7'");
    });
  });

  describe("Starter substituted out at first half added time", () => {
    it("Case C: Saiu 0'→45+5'", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: 50 },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 8 }
      );

      // Regulatory: min(50, 90) - 0 = 50, but 50 is the "45+5" value
      // Using numeric exit: 50 caps at 90, so 50 → 50 for reg
      // But wait, normalizeMinuteReg(50) = 50 (not over 90)
      expect(result.minutesPlayed).toBe(50);
      expect(result.minutesPlayedTotal).toBe(50);
    });

    it("Case C alternative: Saiu no minuto 45 (fim do 1T regular)", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: 45 },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 8 }
      );

      expect(result.minutesPlayed).toBe(45);
      expect(result.minutesPlayedTotal).toBe(45);
    });
  });

  describe("Without added time (standard 90' game)", () => {
    it("Starter plays full 90 minutes", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: null }
      );

      expect(result.minutesPlayed).toBe(90);
      expect(result.minutesPlayedTotal).toBe(90);
      expect(result.hasAddedTime).toBe(false);
    });

    it("Substitute enters at 60'", () => {
      const result = calculateMinutesPlayed(
        { started: false, entered_minute: 60, exited_minute: null }
      );

      expect(result.minutesPlayed).toBe(30);
      expect(result.minutesPlayedTotal).toBe(30);
    });
  });

  describe("Percentage calculations", () => {
    it("100% for full game", () => {
      expect(getMinutesPlayedPercent(90)).toBe(100);
    });

    it("Caps at 100% even if somehow > 90", () => {
      expect(getMinutesPlayedPercent(100)).toBe(100);
    });

    it("50% for 45 minutes", () => {
      expect(getMinutesPlayedPercent(45)).toBe(50);
    });

    it("~21% for 19 minutes", () => {
      expect(getMinutesPlayedPercent(19)).toBe(21);
    });
  });

  describe("Edge cases with added time entry", () => {
    it("Case: Entrou aos 90+2 (92) e jogo acabou 90+7 (97)", () => {
      const result = calculateMinutesPlayed(
        { started: false, entered_minute: 92, exited_minute: null },
        { baseDuration: 90, addedTime1H: 0, addedTime2H: 7 }
      );

      // Regulatory: startReg = 90 (capped), endReg = 90, so 90 - 90 = 0
      expect(result.minutesPlayed).toBe(0);
      // Total: 97 - 92 = 5
      expect(result.minutesPlayedTotal).toBe(5);
      expect(result.rangeDisplay).toBe("90' → 90'");
    });

    it("Case: Saiu aos 45+3 (48)", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: 48 },
        { baseDuration: 90, addedTime1H: 3, addedTime2H: 5 }
      );

      // Regulatory: normalizeMinuteReg(48) = 48, so 48 - 0 = 48
      expect(result.minutesPlayed).toBe(48);
      // Total: normalizeMinuteTotal(48, 98) = 48
      expect(result.minutesPlayedTotal).toBe(48);
    });
  });

  describe("Manual override", () => {
    it("Uses manual override for regulatory, capped at 90", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: null, minutes_played: 85 },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 8 }
      );

      expect(result.minutesPlayed).toBe(85);
      // Total still calculated from entry/exit
      expect(result.minutesPlayedTotal).toBe(103);
    });

    it("Caps manual override at 90", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: null, minutes_played: 100 }
      );

      expect(result.minutesPlayed).toBe(90);
    });
  });
});
