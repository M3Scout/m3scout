import { safeArray } from "@/lib/utils";
import type { RatingBreakdownV2, CompetitionBreakdown } from "@/lib/playerRatingV2";

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
      const combinedWeight = Number(c?.combined_weight) || 0;
      const competitionScore = Number(c?.final_score) || 0;

      return {
        competition_id: String(c?.competition_id ?? "unknown"),
        competition_name: String(c?.competition_name ?? "Sem competição"),
        season_year: Number(c?.season_year ?? d.season_year ?? new Date().getFullYear()),
        final_coefficient: Number(c?.final_coefficient) || 1,
        matches: Number(c?.matches) || 0,
        minutes: Number(c?.minutes) || 0,
        goals: Number(c?.goals) || 0,
        assists: Number(c?.assists) || 0,
        yellow_cards: Number(c?.yellow_cards) || 0,
        red_cards: Number(c?.red_cards) || 0,
        tackles: Number(c?.tackles) || 0,
        interceptions: Number(c?.interceptions) || 0,
        recoveries: Number(c?.recoveries) || 0,
        recency_weight: Number(c?.recency_weight) || 0,
        minutes_factor: Number(c?.minutes_factor) || 0,
        combined_weight: combinedWeight,
        competition_level_score: Number(c?.competition_level_score) || 0,
        position_stats_score: Number(c?.position_stats_score) || 0,
        stat_breakdown: safeArray(c?.stat_breakdown)
          .filter(Boolean)
          .map((s: any) => ({
            stat: String(s?.stat ?? s?.name ?? "unknown"),
            label: String(s?.label ?? s?.name ?? "unknown"),
            value: Number(s?.value) || 0,
            score: Number(s?.score) || 0,
            weight: Number(s?.weight) || 0,
            adjusted_weight: Number(s?.adjusted_weight) || 0,
            available: Boolean(s?.available),
          })),
        competition_score: competitionScore,
        weighted_contribution: competitionScore * combinedWeight,
      };
    });

  return {
    calculated_at: String(d.calculated_at ?? new Date().toISOString()),
    position: String(d.position ?? ""),
    position_group: positionGroup,
    position_group_label: positionGroupLabelMap[positionGroup] || String(positionGroup),
    age: d.age ?? null,
    total_matches: Number(d.total_matches) || 0,
    total_minutes: Number(d.total_minutes) || 0,
    total_competitions: competitions.length,
    competitions,
    final_score_100: Number(d.scores.final_index_100) || 0,
    final_rating_0_5: Number(d.scores.rating_0_5) || 0,
    reliability: d.reliability || "low",
    stat_weights: [],
  };
}
