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

// Extended interface to track computation status
export interface ExtendedCompetitionBreakdown extends CompetitionBreakdown {
  has_data: boolean;
  computed: boolean;
  reason_no_data?: string;
}

export interface ExtendedRatingBreakdownV2 extends RatingBreakdownV2 {
  has_data: boolean;
  computed: boolean;
  reason_no_data?: string;
  competitions: ExtendedCompetitionBreakdown[];
}

// Comprehensive stat key to Portuguese label mapping
const STAT_KEY_LABELS: Record<string, string> = {
  // Goalkeeper
  'saves': 'Defesas',
  'saves_per_90': 'Defesas/90',
  'saves_90': 'Defesas/90',
  'goals_conceded': 'Gols Sofridos',
  'goals_conceded_inv': 'Gols Sofridos (inv)',
  'goals_conceded_90': 'Gols Sofridos/90',
  'clean_sheets': 'Clean Sheets',
  'penalties_saved': 'Pênaltis Defendidos',
  'errors': 'Erros',
  'errors_inv': 'Erros (inv)',
  'errors_leading_to_goal': 'Erros que Resultam em Gol',
  'aerial_duels': 'Duelos Aéreos',
  'aerial_duels_90': 'Duelos Aéreos/90',
  'high_claims': 'Saídas de Gol',
  'punches': 'Socos',
  
  // Defensive
  'tackles': 'Desarmes',
  'tackles_90': 'Desarmes/90',
  'interceptions': 'Interceptações',
  'interceptions_90': 'Interceptações/90',
  'recoveries': 'Recuperações',
  'recoveries_90': 'Recuperações/90',
  'clearances': 'Cortes',
  'duels_won': 'Duelos Vencidos',
  'duels_won_pct': 'Duelos Vencidos (%)',
  'ground_duels_won': 'Duelos Terrestres Vencidos',
  
  // Passing
  'accurate_passes': 'Passes Certos',
  'accurate_passes_90': 'Passes Certos/90',
  'pass_accuracy': 'Precisão de Passes',
  'key_passes': 'Passes Decisivos',
  'key_passes_90': 'Passes Decisivos/90',
  'key_pass_accuracy': 'Precisão Passes Decisivos',
  'chances_created': 'Chances Criadas',
  'chances_created_90': 'Chances Criadas/90',
  'long_passes_accurate': 'Passes Longos Certos',
  
  // Attacking
  'goals': 'Gols',
  'goals_per_90': 'Gols/90',
  'assists': 'Assistências',
  'ga_per_90': 'G+A/90',
  'shots': 'Finalizações',
  'shots_90': 'Finalizações/90',
  'shots_on_target': 'Finalizações no Gol',
  'shots_on_target_90': 'Finalizações no Gol/90',
  'successful_dribbles': 'Dribles Bem-Sucedidos',
  'offensive_involvement': 'Envolvimento Ofensivo',
  
  // Discipline / General
  'discipline': 'Disciplina',
  'minutes_games': 'Minutos/Jogos',
  'yellow_cards': 'Cartões Amarelos',
  'red_cards': 'Cartões Vermelhos',
  'fouls_committed': 'Faltas Cometidas',
  'fouls_drawn': 'Faltas Sofridas',
};

// Convert snake_case to Title Case for fallback
function snakeToTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Get human-readable stat label
function getStatLabel(statKey: string, providedLabel?: string): string {
  // 1. Check provided label first
  if (providedLabel && providedLabel.trim() && providedLabel.trim().length > 0) {
    return providedLabel;
  }

  // 2. Check mapping
  const mappedLabel = STAT_KEY_LABELS[statKey];
  if (mappedLabel) return mappedLabel;

  // 3. Convert snake_case to Title Case
  if (statKey && statKey.length > 0 && statKey !== "unknown") {
    return snakeToTitleCase(statKey);
  }

  return "Estatística";
}

function extractStatKeyFromBreakdownRow(s: any): string {
  const candidates = [s?.stat_key, s?.stat, s?.key, s?.name];
  const rawKey = candidates.find((k) => typeof k === "string" && k.trim().length > 0 && k !== "unknown") ?? "";
  return rawKey || "unknown";
}

function normalizeStatBreakdownRow(s: any) {
  const statKey = extractStatKeyFromBreakdownRow(s);
  const statLabel = getStatLabel(statKey, s?.stat_label ?? s?.label);

  const score = safeNumber(s?.subscore_100 ?? s?.score ?? s?.score_0_100, 0);
  const weightPct = safeNumber(s?.weight_pct ?? s?.adjusted_weight ?? 0);

  // CRITICAL: value_raw == 0 is still valid information.
  // So we consider a stat "available" if the raw value exists (even 0).
  const hasRawValueField =
    s &&
    typeof s === "object" &&
    ((s.value_raw !== undefined && s.value_raw !== null) ||
      (s.value !== undefined && s.value !== null));

  const isAvailable = Boolean(s?.available) || weightPct > 0 || hasRawValueField;

  return {
    stat: statKey,
    label: statLabel,
    value: safeNumber(s?.value ?? s?.value_raw, 0),
    score,
    weight: safeNumber(s?.weight ?? s?.weight_pct, 0),
    adjusted_weight: weightPct,
    available: isAvailable,
    max: safeNumber(s?.max, 100),
  };
}

/**
 * Adapts the auto_rating_details JSON stored in the database into the UI-friendly RatingBreakdownV2 shape.
 *
 * We currently support:
 * - Native UI V2 shape (already matches RatingBreakdownV2)
 * - DB function V2 shape: { version: 'v2', scores: { final_index_100, rating_0_5 }, competitions: [...] }
 */
export function adaptAutoRatingDetailsToV2(details: unknown): ExtendedRatingBreakdownV2 | null {
  if (!details || typeof details !== "object") return null;
  const d: any = details;

  // Already in UI shape
  if (
    typeof d.final_score_100 === "number" &&
    typeof d.final_rating_0_5 === "number" &&
    Array.isArray(d.competitions)
  ) {
    // Extend with computation flags
    const hasData = d.total_minutes > 0 || d.total_matches > 0 || d.competitions.length > 0;
    const computed = hasData && d.final_score_100 !== undefined;

    return {
      ...d,
      has_data: hasData,
      computed: computed,
      reason_no_data: hasData ? undefined : "no_stats_available",
      competitions: (d.competitions || []).map((c: any) => {
        const minutes = safeNumber(c?.minutes, 0);
        const matches = safeNumber(c?.matches, 0);

        // IMPORTANT: Some records still carry the DB-shaped stat_breakdown rows
        // (stat_key/stat_label/subscore_100/weight_pct/value_raw).
        // Normalize them so the UI always has { stat, label, value, score, adjusted_weight, available }.
        const normalizedBreakdown = safeArray(c?.stat_breakdown).filter(Boolean).map(normalizeStatBreakdownRow);

        return {
          ...c,
          stat_breakdown: normalizedBreakdown,
          has_data: minutes > 0 || matches > 0,
          computed: minutes > 0,
          reason_no_data: minutes > 0 ? undefined : "no_minutes",
        };
      }),
    } as ExtendedRatingBreakdownV2;
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

  const competitions: ExtendedCompetitionBreakdown[] = safeArray(d.competitions)
    .filter(Boolean)
    .map((c: any): ExtendedCompetitionBreakdown => {
      // Support both old field names and new V2 field names with defensive checks
      const yearWeight = safeNumber(c?.year_weight ?? c?.recency_weight, 0);
      const inYearWeight = safeNumber(c?.in_year_weight ?? c?.minutes_factor, 0);
      const finalWeight = safeNumber(c?.final_weight ?? c?.combined_weight, 0);
      const positionStatsScore = safeNumber(c?.position_stats_score, 0);
      const competitionLevelScore = safeNumber(c?.competition_level_score, 0);
      const minutes = safeNumber(c?.minutes, 0);
      const matches = safeNumber(c?.matches, 0);
      
      // CRITICAL: Check if data exists and scores were computed
      const hasData = minutes > 0 || matches > 0;
      
      // Parse stat breakdown and map stat keys properly
      const rawStatBreakdown = safeArray(c?.stat_breakdown).filter(Boolean);

      // DEV: Log raw breakdown to trace key extraction
      if (import.meta.env.DEV && rawStatBreakdown.length > 0) {
        console.debug("[BREAKDOWN] raw stats for comp/year", {
          competition: c?.competition_name,
          season_year: c?.season_year,
          sample: rawStatBreakdown.slice(0, 3),
        });
      }

      const statBreakdown = rawStatBreakdown.map(normalizeStatBreakdownRow);

      // Competition is computed if:
      // 1. Has minutes > 0, AND
      // 2. Has at least one available stat with adjusted_weight > 0, OR
      // 3. position_stats_score > 0 or competition_level_score > 0
      const availableStats = statBreakdown.filter((s) => s.available && s.adjusted_weight > 0);
      const computed = hasData && (
        availableStats.length > 0 ||
        positionStatsScore > 0 ||
        competitionLevelScore > 0
      );

      // Use the stored final_score, or calculate from components
      const rawCompetitionScore = safeNumber(c?.final_score ?? c?.competition_score, 0);
      const computedScore = computed
        ? (rawCompetitionScore > 0 ? rawCompetitionScore : (positionStatsScore * 0.70 + competitionLevelScore * 0.30))
        : 0;

      // Weighted contribution
      const weightedContribution = computed ? computedScore * (finalWeight > 0 ? finalWeight : 1) : 0;

      return {
        competition_id: String(c?.competition_id ?? "unknown"),
        competition_name: String(c?.competition_name ?? c?.name ?? "Sem competição"),
        season_year: safeNumber(c?.season_year ?? d.season_year, new Date().getFullYear()),
        final_coefficient: safeNumber(c?.final_coefficient, 1),
        matches: matches,
        minutes: minutes,
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
        stat_breakdown: statBreakdown,
        competition_score: computedScore,
        weighted_contribution: weightedContribution,
        // Computation flags
        has_data: hasData,
        computed: computed,
        reason_no_data: !hasData ? "no_minutes" : (!computed ? "missing_stat_data" : undefined),
      };
    });

  // Calculate overall computation status
  const computedCompetitions = competitions.filter(c => c.computed);
  const hasData = computedCompetitions.length > 0;
  
  // Get final scores from the stored data
  const rawFinalScore = safeNumber(d.scores?.final_index_100, 0);
  const rawRating = safeNumber(d.scores?.rating_0_5, 0);
  
  // Final score: use stored if > 0, otherwise recalculate from competitions
  let finalScore100 = rawFinalScore;
  if (finalScore100 === 0 && computedCompetitions.length > 0) {
    const totalWeight = computedCompetitions.reduce((sum, c) => sum + c.final_weight, 0);
    const totalContribution = computedCompetitions.reduce((sum, c) => sum + c.weighted_contribution, 0);
    if (totalWeight > 0) {
      finalScore100 = totalContribution / totalWeight;
    }
  }
  
  // Rating: use stored if > 0, otherwise calculate from final score
  const finalRating05 = rawRating > 0 ? rawRating : Math.round((finalScore100 / 20) * 2) / 2;
  
  // Overall computed status
  const computed = hasData && (finalScore100 > 0 || rawRating > 0);

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
    // Computation flags
    has_data: hasData,
    computed: computed,
    reason_no_data: !hasData ? "no_stats_available" : (!computed ? "min_stats_not_met" : undefined),
  };
}
