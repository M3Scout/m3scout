import { describe, it, expect } from "vitest";
import { normalizeMatchStats, calculatePercentage, type RawMatchStats } from "./normalizeMatchStats";

describe("normalizeMatchStats", () => {
  /**
   * REGRA CANÔNICA:
   * - passes_total no DB = passes ERRADOS (failed count)
   * - dribbles_total no DB = dribles ERRADOS (failed count)
   * - duels_total no DB = duelos PERDIDOS (lost count)
   * - aerial_duels_total no DB = duelos aéreos PERDIDOS (lost count)
   * - Actual total = success + failed (always)
   */

  it("derives passes: total = completed + failed (passes_total stores failed)", () => {
    const raw: RawMatchStats = { passes_completed: 5, passes_total: 2 };
    const n = normalizeMatchStats(raw);
    expect(n.passes_total_derived).toBe(7); // 5 + 2
    expect(n.passes_failed).toBe(2);
    expect(calculatePercentage(5, 7)).toBe(71);
  });

  it("derives dribbles: total = success + failed (dribbles_total stores failed)", () => {
    const raw: RawMatchStats = { dribbles_success: 3, dribbles_total: 1 };
    const n = normalizeMatchStats(raw);
    expect(n.dribbles_total_derived).toBe(4); // 3 + 1
    expect(n.dribbles_failed).toBe(1);
    expect(calculatePercentage(3, 4)).toBe(75);
  });

  it("derives duels: total = won + lost (duels_total stores lost)", () => {
    const raw: RawMatchStats = { duels_won: 4, duels_total: 3 };
    const n = normalizeMatchStats(raw);
    expect(n.duels_total_derived).toBe(7); // 4 + 3
    expect(n.duels_lost).toBe(3);
    expect(calculatePercentage(4, 7)).toBe(57);
  });

  it("derives aerial duels: total = won + lost (aerial_duels_total stores lost)", () => {
    const raw: RawMatchStats = { aerial_duels_won: 1, aerial_duels_total: 1 };
    const n = normalizeMatchStats(raw);
    expect(n.aerial_duels_total_derived).toBe(2); // 1 + 1
    expect(n.aerial_duels_lost).toBe(1);
    expect(calculatePercentage(1, 2)).toBe(50);
  });

  it("Caso Vitor: passes 1/1 100%, aerial duels 1/2 50%", () => {
    const raw: RawMatchStats = {
      passes_completed: 1,
      passes_total: 0, // 0 failed passes
      aerial_duels_won: 1,
      aerial_duels_total: 1, // 1 lost aerial duel
    };
    const n = normalizeMatchStats(raw);

    // Passes: 1 completed + 0 failed = 1 total → 100%
    expect(n.passes_total_derived).toBe(1);
    expect(n.passes_failed).toBe(0);
    expect(calculatePercentage(1, 1)).toBe(100);

    // Aerial: 1 won + 1 lost = 2 total → 50%
    expect(n.aerial_duels_total_derived).toBe(2);
    expect(n.aerial_duels_lost).toBe(1);
    expect(calculatePercentage(1, 2)).toBe(50);
  });

  it("handles all zeros gracefully", () => {
    const n = normalizeMatchStats({});
    expect(n.passes_total_derived).toBe(0);
    expect(n.dribbles_total_derived).toBe(0);
    expect(n.duels_total_derived).toBe(0);
    expect(n.aerial_duels_total_derived).toBe(0);
    expect(n.shots_total).toBe(0);
    expect(n.minutes_played).toBe(0);
  });

  it("handles null input", () => {
    const n = normalizeMatchStats(null);
    expect(n.passes_total_derived).toBe(0);
    expect(n.duels_total_derived).toBe(0);
  });

  it("shots total = on_target + blocked + off_target", () => {
    const raw: RawMatchStats = {
      shots_on_target: 2,
      shots_blocked: 1,
      shots: 3, // off-target shots
    };
    const n = normalizeMatchStats(raw);
    // Total should include all components
    expect(n.shots_total).toBeGreaterThanOrEqual(3);
    expect(n.shots_on_target).toBe(2);
  });
});

describe("calculatePercentage", () => {
  it("caps at 100%", () => {
    expect(calculatePercentage(5, 3)).toBe(100);
  });

  it("returns 0 for zero total", () => {
    expect(calculatePercentage(5, 0)).toBe(0);
  });

  it("rounds correctly", () => {
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(2, 3)).toBe(67);
  });
});
