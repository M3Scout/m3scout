/**
 * Unified Competitions Utility
 * 
 * Fetches and deduplicates competitions from both:
 * - Live match data (match_players + matches)
 * - Manual/legacy data (player_stats)
 * 
 * This is the SINGLE SOURCE for competition dropdowns in attribute radars.
 */

import { supabase } from "@/integrations/supabase/client";

export interface UnifiedCompetition {
  id: string;
  name: string;
  seasonYear: number;
  /** Most recent match date for sorting */
  lastMatchDate: string | null;
  /** Origin can be "live", "manual", or "both" - for debugging only, NOT shown in UI */
  _origin: "live" | "manual" | "both";
}

export interface UnifiedCompetitionResult {
  competitions: UnifiedCompetition[];
  /** Unique years across all competitions, sorted desc */
  years: number[];
}

/**
 * Fetches all competitions for a player from both live and manual sources.
 * Returns deduplicated list sorted by most recent first.
 */
export async function fetchUnifiedCompetitions(
  playerId: string
): Promise<UnifiedCompetitionResult> {
  // Fetch from both sources in parallel
  const [liveResult, manualResult] = await Promise.all([
    fetchLiveCompetitions(playerId),
    fetchManualCompetitions(playerId),
  ]);

  // Merge and deduplicate
  const competitionMap = new Map<string, UnifiedCompetition>();

  // Add live competitions first
  for (const comp of liveResult) {
    const key = `${comp.id}-${comp.seasonYear}`;
    competitionMap.set(key, comp);
  }

  // Merge manual competitions
  for (const comp of manualResult) {
    const key = `${comp.id}-${comp.seasonYear}`;
    const existing = competitionMap.get(key);
    
    if (existing) {
      // Mark as "both" if already exists from live
      existing._origin = "both";
      // Keep the most recent match date
      if (comp.lastMatchDate && (!existing.lastMatchDate || comp.lastMatchDate > existing.lastMatchDate)) {
        existing.lastMatchDate = comp.lastMatchDate;
      }
    } else {
      competitionMap.set(key, comp);
    }
  }

  // Convert to array and sort by most recent first
  const competitions = Array.from(competitionMap.values()).sort((a, b) => {
    // First by season year (desc)
    if (b.seasonYear !== a.seasonYear) {
      return b.seasonYear - a.seasonYear;
    }
    // Then by last match date (desc)
    if (a.lastMatchDate && b.lastMatchDate) {
      return b.lastMatchDate.localeCompare(a.lastMatchDate);
    }
    return 0;
  });

  // Extract unique years
  const yearsSet = new Set<number>();
  for (const comp of competitions) {
    yearsSet.add(comp.seasonYear);
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return { competitions, years };
}

/**
 * Fetches competitions from live match data
 */
async function fetchLiveCompetitions(playerId: string): Promise<UnifiedCompetition[]> {
  const { data, error } = await supabase
    .from("match_players")
    .select(`
      match:matches!inner (
        id,
        match_date,
        season_year,
        competition_id,
        status,
        competition:competitions (
          id,
          name,
          display_name
        )
      )
    `)
    .eq("player_id", playerId)
    .neq("is_removed", true)
    .in("match.status", ["finished", "applied"]);

  if (error || !data) {
    console.error("[UnifiedCompetitions] Error fetching live:", error);
    return [];
  }

  // Aggregate by competition_id + season_year
  const compMap = new Map<string, UnifiedCompetition>();

  for (const row of data) {
    const match = row.match as any;
    if (!match?.competition_id || !match?.competition) continue;

    const comp = match.competition;
    const seasonYear = match.season_year as number;
    const key = `${comp.id}-${seasonYear}`;

    const existing = compMap.get(key);
    if (!existing) {
      compMap.set(key, {
        id: comp.id,
        name: comp.display_name || comp.name,
        seasonYear,
        lastMatchDate: match.match_date,
        _origin: "live",
      });
    } else {
      // Update last match date if more recent
      if (match.match_date > (existing.lastMatchDate || "")) {
        existing.lastMatchDate = match.match_date;
      }
    }
  }

  return Array.from(compMap.values());
}

/**
 * Fetches competitions from manual_player_stats (not player_stats!)
 * Manual stats are a FALLBACK - only used if no live data exists for that competition/season
 */
async function fetchManualCompetitions(playerId: string): Promise<UnifiedCompetition[]> {
  const { data, error } = await supabase
    .from("manual_player_stats")
    .select(`
      season_year,
      competition_id,
      minutes,
      games,
      competitions:competition_id (
        id,
        name,
        display_name
      )
    `)
    .eq("player_id", playerId)
    .not("competition_id", "is", null)
    .gt("games", 0);

  if (error || !data) {
    console.error("[UnifiedCompetitions] Error fetching manual:", error);
    return [];
  }

  const compMap = new Map<string, UnifiedCompetition>();

  for (const row of data) {
    const comp = (row as any).competitions;
    if (!comp?.id) continue;

    const seasonYear = row.season_year as number;
    const key = `${comp.id}-${seasonYear}`;

    if (!compMap.has(key)) {
      compMap.set(key, {
        id: comp.id,
        name: comp.display_name || comp.name,
        seasonYear,
        lastMatchDate: null, // Manual stats don't have match dates
        _origin: "manual",
      });
    }
  }

  return Array.from(compMap.values());
}
