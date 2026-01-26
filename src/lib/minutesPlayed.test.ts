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
    it("Case C: Saiu 0'→45+5' (stored as 50) → regulatory shows 45, not 50", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: 50 },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 8 }
      );

      // CRITICAL FIX: Exit at 50 (meaning 45+5) should cap at 45 for regulatory
      // because the player exited in first half stoppage time
      expect(result.minutesPlayed).toBe(45);
      // Total still shows actual minutes including stoppage
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

    it("Case: Saiu aos 45+3 (stored as 48) → regulatory shows 45", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: 48 },
        { baseDuration: 90, addedTime1H: 3, addedTime2H: 5 }
      );

      // CRITICAL FIX: Exit at 48 (meaning 45+3) should cap at 45 for regulatory
      // because the player exited in first half stoppage time
      expect(result.minutesPlayed).toBe(45);
      // Total shows actual minutes including stoppage
      expect(result.minutesPlayedTotal).toBe(48);
    });
  });

  describe("Additional regulatory time scenarios", () => {
    it("1º tempo completo com +5 acréscimos → regulatory 45, não 50", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: 50 },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 0 }
      );
      expect(result.minutesPlayed).toBe(45);
    });

    it("2º tempo completo com +6 acréscimos → regulatory 45 (90-45)", () => {
      const result = calculateMinutesPlayed(
        { started: false, entered_minute: 46, exited_minute: null },
        { baseDuration: 90, addedTime1H: 0, addedTime2H: 6 }
      );
      // Entered at 46 (2nd half start), played until 90+6 (96)
      // Regulatory: 90 - 46 = 44
      expect(result.minutesPlayed).toBe(44);
      // Total: 96 - 46 = 50
      expect(result.minutesPlayedTotal).toBe(50);
    });

    it("Jogo inteiro com acréscimos → regulatory 90", () => {
      const result = calculateMinutesPlayed(
        { started: true, entered_minute: null, exited_minute: null },
        { baseDuration: 90, addedTime1H: 5, addedTime2H: 8 }
      );
      expect(result.minutesPlayed).toBe(90);
      expect(result.minutesPlayedTotal).toBe(103);
    });

    it("Entrou aos 30' e saiu no 45+4 (49) → regulatory 15 (30 a 45)", () => {
      const result = calculateMinutesPlayed(
        { started: false, entered_minute: 30, exited_minute: 49 },
        { baseDuration: 90, addedTime1H: 4, addedTime2H: 0 }
      );
      // Exit at 49 = 45+4, so regulatory end = 45
      // Regulatory: 45 - 30 = 15
      expect(result.minutesPlayed).toBe(15);
      // Total: 49 - 30 = 19
      expect(result.minutesPlayedTotal).toBe(19);
    });

    it("Entrou aos 60' e saiu no 90+3 (93) → regulatory 30 (60 a 90)", () => {
      const result = calculateMinutesPlayed(
        { started: false, entered_minute: 60, exited_minute: 93 },
        { baseDuration: 90, addedTime1H: 0, addedTime2H: 3 }
      );
      // Exit at 93 = 90+3, so regulatory end = 90
      // Regulatory: 90 - 60 = 30
      expect(result.minutesPlayed).toBe(30);
      // Total: 93 - 60 = 33
      expect(result.minutesPlayedTotal).toBe(33);
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
