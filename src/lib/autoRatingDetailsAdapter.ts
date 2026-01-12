import { safeArray } from "@/lib/utils";
import type { RatingBreakdownV2, CompetitionBreakdown } from "@/lib/playerRatingV2";

// Helper to safely get numeric value with fallback
function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Adapts the auto_rating_details JSON stored in the database into the UI-friendly RatingBreakdownV2 shape.
 *
 * We currently support:
 * - Native UI V2 shape (already matches RatingBreakdownV2)
 * - DB function V2 shape: { version: 'v2', scores: { final_index_100, rating_0_5 }, competitions: [...] }
 */
export function adaptAutoRatingDetailsToV2(details: unknown): RatingBreakdownV2 | null {
  if (!details || typeof details !== "object") return null;
  const d: any = details;

  // Already in UI shape
  if (
    typeof d.final_score_100 === "number" &&
    typeof d.final_rating_0_5 === "number" &&
    Array.isArray(d.competitions)
  ) {
    return d as RatingBreakdownV2;
  }

  // DB V2 shape
  if (d.version !== "v2") return null;
  if (!d.scores || typeof d.scores !== "object") return null;
  if (!Array.isArray(d.competitions)) return null;

  const positionGroup: RatingBreakdownV2["position_group"] =
    d.position_group || "midfielder";

  const positionGroupLabelMap: Record<string, string> = {
    goalkeeper: "Goleiro",
    center_back: "Defensor",
    defensive_mid: "Volante",
    midfielder: "Meio-Campo",
    forward: "Atacante",
  };

  const competitions: CompetitionBreakdown[] = safeArray(d.competitions)
    .filter(Boolean)
    .map((c: any): CompetitionBreakdown => {
      // Support both old field names and new V2 field names with defensive checks
      const yearWeight = safeNumber(c?.year_weight ?? c?.recency_weight, 0);
      const inYearWeight = safeNumber(c?.in_year_weight ?? c?.minutes_factor, 0);
      const finalWeight = safeNumber(c?.final_weight ?? c?.combined_weight, 0);
      const competitionScore = safeNumber(c?.final_score ?? c?.competition_score, 0);
      const positionStatsScore = safeNumber(c?.position_stats_score, 0);
      const competitionLevelScore = safeNumber(c?.competition_level_score, 0);
      
      // If competition_score is 0 but we have component scores, compute it
      const computedScore = competitionScore > 0 
        ? competitionScore 
        : (positionStatsScore * 0.70 + competitionLevelScore * 0.30);
      
      // Calculate weighted contribution
      const weightedContribution = computedScore * (finalWeight > 0 ? finalWeight : 1);

      return {
        competition_id: String(c?.competition_id ?? "unknown"),
        competition_name: String(c?.competition_name ?? c?.name ?? "Sem competição"),
        season_year: safeNumber(c?.season_year ?? d.season_year, new Date().getFullYear()),
        final_coefficient: safeNumber(c?.final_coefficient, 1),
        matches: safeNumber(c?.matches, 0),
        minutes: safeNumber(c?.minutes, 0),
        goals: safeNumber(c?.goals, 0),
        assists: safeNumber(c?.assists, 0),
        yellow_cards: safeNumber(c?.yellow_cards, 0),
        red_cards: safeNumber(c?.red_cards, 0),
        tackles: safeNumber(c?.tackles, 0),
        interceptions: safeNumber(c?.interceptions, 0),
        recoveries: safeNumber(c?.recoveries, 0),
        // V2 Year-based weighting fields
        year_weight: yearWeight,
        in_year_weight: inYearWeight,
        final_weight: finalWeight,
        // Legacy fields for UI compatibility
        recency_weight: yearWeight,
        minutes_factor: inYearWeight,
        combined_weight: finalWeight,
        competition_level_score: competitionLevelScore,
        position_stats_score: positionStatsScore,
        stat_breakdown: safeArray(c?.stat_breakdown)
          .filter(Boolean)
          .map((s: any) => ({
            stat: String(s?.stat ?? s?.key ?? s?.name ?? "unknown"),
            label: String(s?.label ?? s?.name ?? ""),
            value: safeNumber(s?.value, 0),
            score: safeNumber(s?.score, 50),
            weight: safeNumber(s?.weight, 0),
            adjusted_weight: safeNumber(s?.adjusted_weight, safeNumber(s?.weight, 0)),
            available: Boolean(s?.available ?? (safeNumber(s?.score, 0) > 0)),
          })),
        competition_score: computedScore,
        weighted_contribution: weightedContribution,
      };
    });

  // Calculate final score from competitions if scores.final_index_100 is missing or 0
  const rawFinalScore = safeNumber(d.scores?.final_index_100, 0);
  let finalScore100 = rawFinalScore;
  
  if (finalScore100 === 0 && competitions.length > 0) {
    const totalWeight = competitions.reduce((sum, c) => sum + c.final_weight, 0);
    const totalContribution = competitions.reduce((sum, c) => sum + c.weighted_contribution, 0);
    finalScore100 = totalWeight > 0 ? totalContribution / totalWeight : 50;
  }
  
  const rawRating = safeNumber(d.scores?.rating_0_5, 0);
  const finalRating05 = rawRating > 0 ? rawRating : Math.round((finalScore100 / 20) * 2) / 2;

  return {
    calculated_at: String(d.calculated_at ?? new Date().toISOString()),
    position: String(d.position ?? ""),
    position_group: positionGroup,
    position_group_label: positionGroupLabelMap[positionGroup] || String(positionGroup),
    age: d.age ?? null,
    total_matches: safeNumber(d.total_matches, 0),
    total_minutes: safeNumber(d.total_minutes, 0),
    total_competitions: competitions.length,
    competitions,
    final_score_100: Math.round(finalScore100 * 10) / 10,
    final_rating_0_5: finalRating05,
    reliability: d.reliability || "low",
    stat_weights: safeArray(d.stat_weights),
  };
}
