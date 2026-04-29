import { describe, it, expect } from "vitest";
import {
  clampStatValue,
  validateSeasonStats,
  getStatLimit,
  SEASON_STAT_LIMITS,
} from "./statLimits";

describe("statLimits", () => {
  describe("clampStatValue", () => {
    it("clampa valores negativos para 0", () => {
      expect(clampStatValue("goals", -5)).toBe(0);
      expect(clampStatValue("matches", -1)).toBe(0);
    });

    it("clampa valores acima do máximo", () => {
      expect(clampStatValue("goals", 9999)).toBe(SEASON_STAT_LIMITS.goals.max);
      expect(clampStatValue("matches", 500)).toBe(SEASON_STAT_LIMITS.matches.max);
    });

    it("mantém valores válidos dentro do range", () => {
      expect(clampStatValue("goals", 25)).toBe(25);
      expect(clampStatValue("minutes", 3000)).toBe(3000);
    });

    it("trata NaN/Infinity como 0 (não-finitos viram min)", () => {
      expect(clampStatValue("goals", NaN)).toBe(0);
      expect(clampStatValue("goals", Infinity)).toBe(0);
    });

    it("aplica fallback razoável para keys desconhecidas", () => {
      expect(clampStatValue("foo_bar", -10)).toBe(0);
      expect(clampStatValue("foo_bar", 10)).toBe(10);
    });
  });

  describe("getStatLimit", () => {
    it("devolve limites configurados", () => {
      const lim = getStatLimit("yellow_cards");
      expect(lim.min).toBe(0);
      expect(lim.max).toBe(200);
    });

    it("devolve fallback para chaves não mapeadas", () => {
      const lim = getStatLimit("__unknown__");
      expect(lim.min).toBe(0);
      expect(lim.max).toBeGreaterThan(0);
    });
  });

  describe("validateSeasonStats", () => {
    it("não retorna issues para valores válidos", () => {
      const issues = validateSeasonStats({
        goals: 10,
        assists: 5,
        matches: 20,
        accurate_passes: 100,
        total_passes: 150,
      });
      expect(issues).toEqual([]);
    });

    it("detecta valores acima do máximo", () => {
      const issues = validateSeasonStats({ goals: 9999 });
      expect(issues.length).toBe(1);
      expect(issues[0].key).toBe("goals");
      expect(issues[0].message).toMatch(/limite razoável/i);
    });

    it("detecta valores negativos", () => {
      const issues = validateSeasonStats({ matches: -3 });
      expect(issues.length).toBe(1);
      expect(issues[0].message).toMatch(/negativo/i);
    });

    it("detecta sucesso > total em pares", () => {
      const issues = validateSeasonStats({
        accurate_passes: 200,
        total_passes: 100,
      });
      expect(issues.some((i) => i.key === "accurate_passes")).toBe(true);
    });

    it("não dispara erro de par quando total = 0", () => {
      const issues = validateSeasonStats({
        accurate_passes: 5,
        total_passes: 0,
      });
      // sem total registrado, não validamos o par
      expect(issues.find((i) => i.key === "accurate_passes")).toBeUndefined();
    });
  });
});
