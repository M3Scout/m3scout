/**
 * Tests for dynamic goal weight calculation
 * 
 * Test cases:
 * A) Legacy fallback (awb=0 and passesAttempted=0) => goalWeight=0.80
 * B) Max participation (mins>=60, awb>=25, passesAttempted>=20) => goalWeight=1.00
 * C) Partial participation scenarios
 */

import { describe, it, expect } from "vitest";
import { computeGoalWeight, type GoalWeightContext } from "./matchRatingEngine";

describe("computeGoalWeight", () => {
  it("returns 0.80 for legacy matches (no participation data)", () => {
    const ctx: GoalWeightContext = {
      minutesPlayed: 90,
      actionsWithBall: 0,
      totalPassesAttempted: 0,
    };
    
    expect(computeGoalWeight(ctx)).toBeCloseTo(0.80, 2);
  });
  
  it("returns 0.80 when all context is zero", () => {
    const ctx: GoalWeightContext = {
      minutesPlayed: 0,
      actionsWithBall: 0,
      totalPassesAttempted: 0,
    };
    
    expect(computeGoalWeight(ctx)).toBeCloseTo(0.80, 2);
  });
  
  it("returns 1.00 for max participation", () => {
    // mins >= 60 (+0.05) + awb >= 15 (+0.05) + awb >= 25 (+0.05) + passes >= 20 (+0.05) = +0.20
    const ctx: GoalWeightContext = {
      minutesPlayed: 90,
      actionsWithBall: 30,
      totalPassesAttempted: 25,
    };
    
    expect(computeGoalWeight(ctx)).toBeCloseTo(1.00, 2);
  });
  
  it("returns 0.85 for mins >= 60 only", () => {
    const ctx: GoalWeightContext = {
      minutesPlayed: 70,
      actionsWithBall: 5, // < 15, no bonus
      totalPassesAttempted: 10, // < 20, no bonus
    };
    
    // base 0.80 + 0.05 (mins >= 60) = 0.85
    expect(computeGoalWeight(ctx)).toBeCloseTo(0.85, 2);
  });
  
  it("returns 0.90 for awb >= 15 and passes >= 20", () => {
    const ctx: GoalWeightContext = {
      minutesPlayed: 30, // < 60, no bonus
      actionsWithBall: 18, // >= 15 (+0.05), < 25
      totalPassesAttempted: 22, // >= 20 (+0.05)
    };
    
    // base 0.80 + 0.05 + 0.05 = 0.90
    expect(computeGoalWeight(ctx)).toBeCloseTo(0.90, 2);
  });
  
  it("returns 0.90 for awb >= 25 (includes 15 threshold)", () => {
    const ctx: GoalWeightContext = {
      minutesPlayed: 45, // < 60, no bonus
      actionsWithBall: 28, // >= 15 (+0.05) + >= 25 (+0.05) = +0.10
      totalPassesAttempted: 15, // < 20, no bonus
    };
    
    // base 0.80 + 0.05 + 0.05 = 0.90
    expect(computeGoalWeight(ctx)).toBeCloseTo(0.90, 2);
  });
  
  it("caps at 1.00 even with all bonuses", () => {
    const ctx: GoalWeightContext = {
      minutesPlayed: 100, // >= 60 (+0.05)
      actionsWithBall: 100, // >= 15 (+0.05) + >= 25 (+0.05) = +0.10
      totalPassesAttempted: 100, // >= 20 (+0.05)
    };
    
    // Total would be 0.80 + 0.20 = 1.00 (capped)
    expect(computeGoalWeight(ctx)).toBeCloseTo(1.00, 2);
  });
  
  it("never goes below 0.80", () => {
    // Even if somehow negative values were passed, should clamp to 0.80
    const ctx: GoalWeightContext = {
      minutesPlayed: 1,
      actionsWithBall: 1,
      totalPassesAttempted: 1,
    };
    
    // base 0.80, no bonuses met = 0.80
    expect(computeGoalWeight(ctx)).toBeCloseTo(0.80, 2);
  });
});
