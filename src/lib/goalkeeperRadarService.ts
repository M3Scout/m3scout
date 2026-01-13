/**
 * Goalkeeper Radar Service
 * 
 * Service for calculating and persisting GK radar scores with percentile normalization.
 * Fetches all GK data for comparison and saves results to auto_rating_details.
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  GKStatRow, 
  GKRadarResult, 
  GKPercentileData,
  calculateGKRates,
  aggregateGKStatsWithRecency,
  computeGKRadarWithPercentile,
  computeGKRadar,
  gkRadarToDetails,
  isGKPosition
} from "@/lib/goalkeeperRadar";

interface GKPlayer {
  id: string;
  position: string;
  auto_rating_details: Record<string, unknown> | null;
}

interface GKStatsRow {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  matches: number;
  minutes: number;
  saves: number;
  saves_inside_box: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  shots_on_target_against: number;
  penalty_faced: number;
  claims: number;
  punches: number;
  high_claims: number;
  crosses_faced: number;
  crosses_stopped: number;
  errors_leading_to_shot: number;
  successful_runs_out: number;
  total_runs_out: number;
  accurate_passes: number;
  total_passes: number;
  long_passes_accurate: number;
  long_passes_total: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  competitions: {
    tier: string;
    final_coefficient: number;
  } | null;
}

/**
 * Fetch all goalkeeper players
 */
async function fetchAllGoalkeepers(): Promise<GKPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, position, auto_rating_details")
    .or("position.ilike.%goleiro%,position.ilike.%gk%,position.ilike.%goalkeeper%")
    .eq("is_archived", false);

  if (error) {
    console.error("Error fetching goalkeepers:", error);
    return [];
  }

  return (data || []).filter(p => isGKPosition(p.position)) as GKPlayer[];
}

/**
 * Fetch stats for a specific goalkeeper
 */
async function fetchGKStats(playerId: string): Promise<GKStatRow[]> {
  const { data, error } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, season_year, competition_id,
      matches, minutes, saves, saves_inside_box, goals_conceded, clean_sheets,
      penalties_saved, errors_leading_to_goal, shots_on_target_against, penalty_faced,
      claims, punches, high_claims, crosses_faced, crosses_stopped, errors_leading_to_shot,
      successful_runs_out, total_runs_out, accurate_passes, total_passes,
      long_passes_accurate, long_passes_total, yellow_cards, red_cards, fouls_committed,
      competitions(tier, final_coefficient)
    `)
    .eq("player_id", playerId)
    .order("season_year", { ascending: false });

  if (error) {
    console.error("Error fetching GK stats:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    competition_tier: row.competitions?.tier,
    competition_coefficient: row.competitions?.final_coefficient,
  }));
}

/**
 * Fetch all GK stats for percentile calculation
 */
async function fetchAllGKStatsForPercentile(): Promise<Map<string, GKStatRow[]>> {
  // First get all goalkeeper IDs
  const goalkeepers = await fetchAllGoalkeepers();
  const gkIds = goalkeepers.map(gk => gk.id);

  if (gkIds.length === 0) {
    return new Map();
  }

  // Fetch all stats for these GKs
  const { data, error } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, season_year, competition_id,
      matches, minutes, saves, saves_inside_box, goals_conceded, clean_sheets,
      penalties_saved, errors_leading_to_goal, shots_on_target_against, penalty_faced,
      claims, punches, high_claims, crosses_faced, crosses_stopped, errors_leading_to_shot,
      successful_runs_out, total_runs_out, accurate_passes, total_passes,
      long_passes_accurate, long_passes_total, yellow_cards, red_cards, fouls_committed,
      competitions(tier, final_coefficient)
    `)
    .in("player_id", gkIds)
    .order("season_year", { ascending: false });

  if (error) {
    console.error("Error fetching all GK stats:", error);
    return new Map();
  }

  // Group by player_id
  const byPlayer = new Map<string, GKStatRow[]>();
  for (const row of data || []) {
    const mappedRow: GKStatRow = {
      ...row,
      competition_tier: (row as any).competitions?.tier,
      competition_coefficient: (row as any).competitions?.final_coefficient,
    };
    
    if (!byPlayer.has(row.player_id)) {
      byPlayer.set(row.player_id, []);
    }
    byPlayer.get(row.player_id)!.push(mappedRow);
  }

  return byPlayer;
}

/**
 * Build percentile comparison data for all GKs
 */
function buildPercentileData(
  allGKStats: Map<string, GKStatRow[]>
): GKPercentileData[] {
  const percentileData: GKPercentileData[] = [];

  for (const [playerId, stats] of allGKStats) {
    if (stats.length === 0) continue;

    // Aggregate with recency weighting
    const aggregated = aggregateGKStatsWithRecency(stats);
    
    // Skip GKs with insufficient minutes
    if (aggregated.minutes < 180) continue;

    // Calculate rates
    const rates = calculateGKRates(aggregated);

    // Determine primary tier (most minutes played)
    const tierMinutes = new Map<string, number>();
    for (const s of stats) {
      if (s.competition_tier) {
        const current = tierMinutes.get(s.competition_tier) || 0;
        tierMinutes.set(s.competition_tier, current + (s.minutes || 0));
      }
    }
    
    let primaryTier: string | null = null;
    let maxMinutes = 0;
    for (const [tier, mins] of tierMinutes) {
      if (mins > maxMinutes) {
        maxMinutes = mins;
        primaryTier = tier;
      }
    }

    percentileData.push({
      player_id: playerId,
      rates,
      minutes: aggregated.minutes,
      tier: primaryTier,
    });
  }

  return percentileData;
}

/**
 * Calculate and save GK radar for a single player
 */
export async function calculateAndSaveGKRadar(
  playerId: string,
  usePercentile = true
): Promise<GKRadarResult | null> {
  try {
    // Fetch player's stats
    const playerStats = await fetchGKStats(playerId);
    
    if (playerStats.length === 0) {
      console.log(`[GK_RADAR] No stats found for player ${playerId}`);
      return null;
    }

    let result: GKRadarResult;

    if (usePercentile) {
      // Fetch all GK stats for percentile comparison
      const allGKStats = await fetchAllGKStatsForPercentile();
      const percentileData = buildPercentileData(allGKStats);

      // Determine player's primary tier
      const tierMinutes = new Map<string, number>();
      for (const s of playerStats) {
        if (s.competition_tier) {
          const current = tierMinutes.get(s.competition_tier) || 0;
          tierMinutes.set(s.competition_tier, current + (s.minutes || 0));
        }
      }
      
      let playerTier: string | null = null;
      let maxMinutes = 0;
      for (const [tier, mins] of tierMinutes) {
        if (mins > maxMinutes) {
          maxMinutes = mins;
          playerTier = tier;
        }
      }

      // Calculate with percentile
      result = computeGKRadarWithPercentile(playerStats, percentileData, playerTier);
      
      console.log(`[GK_RADAR] Calculated with percentile for ${playerId}:`, {
        gksCompared: result.percentile_context?.total_gks_compared,
        tierUsed: result.percentile_context?.tier_used,
        scores: result.scores,
      });
    } else {
      // Calculate without percentile (fallback)
      result = computeGKRadar(playerStats, true);
    }

    // Save to auto_rating_details
    if (result.scores) {
      const { data: player } = await supabase
        .from("players")
        .select("auto_rating_details")
        .eq("id", playerId)
        .maybeSingle();

      const existingDetails = (player?.auto_rating_details as Record<string, unknown>) || {};
      const gkDetails = gkRadarToDetails(result);
      const newDetails = {
        ...existingDetails,
        ...gkDetails,
      };

      const { error } = await supabase
        .from("players")
        .update({ auto_rating_details: newDetails as any })
        .eq("id", playerId);

      if (error) {
        console.error(`[GK_RADAR] Error saving radar for ${playerId}:`, error);
      } else {
        console.log(`[GK_RADAR] Saved radar for ${playerId}`);
      }
    }

    return result;
  } catch (error) {
    console.error(`[GK_RADAR] Error calculating radar for ${playerId}:`, error);
    return null;
  }
}

/**
 * Recalculate GK radar for all goalkeepers
 */
export async function recalculateAllGKRadars(): Promise<{
  success: number;
  failed: number;
  skipped: number;
}> {
  const stats = { success: 0, failed: 0, skipped: 0 };

  try {
    // Fetch all goalkeepers
    const goalkeepers = await fetchAllGoalkeepers();
    console.log(`[GK_RADAR] Found ${goalkeepers.length} goalkeepers to process`);

    if (goalkeepers.length === 0) {
      return stats;
    }

    // Fetch all GK stats once for percentile comparison
    const allGKStats = await fetchAllGKStatsForPercentile();
    const percentileData = buildPercentileData(allGKStats);

    console.log(`[GK_RADAR] Built percentile data for ${percentileData.length} GKs`);

    // Process each goalkeeper
    for (const gk of goalkeepers) {
      try {
        const playerStats = allGKStats.get(gk.id);
        
        if (!playerStats || playerStats.length === 0) {
          stats.skipped++;
          continue;
        }

        // Determine player's primary tier
        const tierMinutes = new Map<string, number>();
        for (const s of playerStats) {
          if (s.competition_tier) {
            const current = tierMinutes.get(s.competition_tier) || 0;
            tierMinutes.set(s.competition_tier, current + (s.minutes || 0));
          }
        }
        
        let playerTier: string | null = null;
        let maxMinutes = 0;
        for (const [tier, mins] of tierMinutes) {
          if (mins > maxMinutes) {
            maxMinutes = mins;
            playerTier = tier;
          }
        }

        // Calculate with percentile
        const result = computeGKRadarWithPercentile(playerStats, percentileData, playerTier);

        // Save to auto_rating_details
        if (result.scores) {
          const existingDetails = (gk.auto_rating_details as Record<string, unknown>) || {};
          const gkDetails = gkRadarToDetails(result);
          const newDetails = {
            ...existingDetails,
            ...gkDetails,
          };

          const { error } = await supabase
            .from("players")
            .update({ auto_rating_details: newDetails as any })
            .eq("id", gk.id);

          if (error) {
            console.error(`[GK_RADAR] Error saving for ${gk.id}:`, error);
            stats.failed++;
          } else {
            stats.success++;
          }
        } else {
          stats.skipped++;
        }
      } catch (err) {
        console.error(`[GK_RADAR] Error processing ${gk.id}:`, err);
        stats.failed++;
      }
    }

    console.log(`[GK_RADAR] Bulk recalculation complete:`, stats);
    return stats;
  } catch (error) {
    console.error("[GK_RADAR] Error in bulk recalculation:", error);
    return stats;
  }
}

/**
 * Get GK radar from auto_rating_details (cached)
 */
export function getGKRadarFromDetails(
  autoRatingDetails: Record<string, unknown> | null
): GKRadarResult | null {
  if (!autoRatingDetails) return null;

  const gkRadar = autoRatingDetails.gk_radar as Record<string, unknown> | null;
  if (!gkRadar) return null;

  // Check if it has the expected structure
  if (
    typeof gkRadar.DEF !== "number" ||
    typeof gkRadar.ANT !== "number" ||
    typeof gkRadar.TAT !== "number" ||
    typeof gkRadar.DIS !== "number" ||
    typeof gkRadar.AER !== "number"
  ) {
    return null;
  }

  return {
    scores: {
      DEF: gkRadar.DEF as number,
      ANT: gkRadar.ANT as number,
      TAT: gkRadar.TAT as number,
      DIS: gkRadar.DIS as number,
      AER: gkRadar.AER as number,
    },
    confidence: (gkRadar.confidence as string)?.toLowerCase() as any || "medium",
    minutes_used: (gkRadar.minutes_used as number) || 0,
    breakdown: (gkRadar.breakdown as any) || {
      DEF: {},
      ANT: {},
      TAT: {},
      DIS: {},
      AER: {},
    },
    percentile_context: gkRadar.percentile_context as any,
  };
}
