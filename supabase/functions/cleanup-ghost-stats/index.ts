/**
 * Cleanup Ghost Stats Edge Function
 * 
 * Identifies and archives player_stats records that were incorrectly created
 * by the old Apply flow when Live Match data already exists.
 * 
 * Usage:
 *   GET /cleanup-ghost-stats?mode=dry-run  → Report only (no changes)
 *   POST /cleanup-ghost-stats?mode=apply   → Archive ghost records
 * 
 * Query params:
 *   - mode: 'dry-run' (default) or 'apply'
 *   - player_id: (optional) limit to specific player
 *   - season_year: (optional) limit to specific season
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GhostRecord {
  id: string;
  player_id: string;
  player_name: string;
  season_year: number;
  competition_id: string;
  competition_name: string;
  manual_matches: number;
  manual_minutes: number;
  live_matches: number;
  live_minutes: number;
  similarity_score: number;
  detection_reason: string;
}

interface CleanupReport {
  mode: string;
  timestamp: string;
  total_ghost_records: number;
  total_archived: number;
  by_reason: Record<string, number>;
  top_affected_players: { player_id: string; player_name: string; count: number }[];
  top_affected_competitions: { competition_id: string; competition_name: string; count: number }[];
  top_affected_seasons: { season_year: number; count: number }[];
  ghost_records: GhostRecord[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "dry-run";
    const filterPlayerId = url.searchParams.get("player_id");
    const filterSeasonYear = url.searchParams.get("season_year");

    if (mode !== "dry-run" && mode !== "apply") {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Use 'dry-run' or 'apply'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow POST for apply mode
    if (mode === "apply" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Apply mode requires POST request" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[CLEANUP] Starting ghost stats cleanup in ${mode} mode`);

    // Step 1: Get all player_stats records that are not archived
    let playerStatsQuery = supabase
      .from("player_stats")
      .select(`
        id,
        player_id,
        season_year,
        competition_id,
        matches,
        minutes,
        goals,
        assists,
        tackles,
        interceptions,
        created_at,
        players!inner(full_name),
        competitions(name, display_name)
      `)
      .or("is_archived.is.null,is_archived.eq.false")
      .not("competition_id", "is", null);

    if (filterPlayerId) {
      playerStatsQuery = playerStatsQuery.eq("player_id", filterPlayerId);
    }
    if (filterSeasonYear) {
      playerStatsQuery = playerStatsQuery.eq("season_year", parseInt(filterSeasonYear));
    }

    const { data: playerStatsData, error: psError } = await playerStatsQuery;

    if (psError) {
      throw new Error(`Error fetching player_stats: ${psError.message}`);
    }

    console.log(`[CLEANUP] Found ${playerStatsData?.length || 0} non-archived player_stats records`);

    // Step 2: Get aggregated live match stats for comparison
    const { data: liveStatsData, error: liveError } = await supabase
      .from("unified_player_season_stats")
      .select("*")
      .eq("data_source", "live");

    if (liveError) {
      throw new Error(`Error fetching live stats: ${liveError.message}`);
    }

    // Build lookup map for live stats
    const liveStatsMap = new Map<string, any>();
    (liveStatsData || []).forEach((ls: any) => {
      const key = `${ls.player_id}-${ls.season_year}-${ls.competition_id}`;
      liveStatsMap.set(key, ls);
    });

    console.log(`[CLEANUP] Found ${liveStatsMap.size} live stat keys`);

    // Step 3: Identify ghost records
    const ghostRecords: GhostRecord[] = [];

    for (const ps of playerStatsData || []) {
      const key = `${ps.player_id}-${ps.season_year}-${ps.competition_id}`;
      const liveStats = liveStatsMap.get(key);
      const playerName = (ps as any).players?.full_name || "Unknown";
      const competitionName = (ps as any).competitions?.display_name || 
                              (ps as any).competitions?.name || "Unknown";

      let detectionReason: string | null = null;
      let similarityScore = 0;

      if (liveStats) {
        // Case 1: Live data exists for this key - this is a ghost!
        detectionReason = "live_exists";

        // Calculate similarity score
        const liveMatches = Number(liveStats.matches) || 0;
        const liveMinutes = Number(liveStats.minutes) || 0;
        const liveGoals = Number(liveStats.goals) || 0;
        const liveAssists = Number(liveStats.assists) || 0;

        const manualMatches = ps.matches || 0;
        const manualMinutes = ps.minutes || 0;
        const manualGoals = ps.goals || 0;
        const manualAssists = ps.assists || 0;

        // Check for exact match (strong indicator of duplication)
        if (
          manualMatches === liveMatches &&
          manualGoals === liveGoals &&
          manualAssists === liveAssists
        ) {
          detectionReason = "exact_match_live";
          similarityScore = 100;
        } else if (manualMatches > 0 && liveMatches > 0) {
          // Calculate similarity as percentage
          const matchDiff = Math.abs(manualMatches - liveMatches) / Math.max(manualMatches, liveMatches);
          const minuteDiff = Math.abs(manualMinutes - liveMinutes) / Math.max(manualMinutes, liveMinutes, 1);
          similarityScore = Math.round((1 - (matchDiff + minuteDiff) / 2) * 100);
        }

        ghostRecords.push({
          id: ps.id,
          player_id: ps.player_id,
          player_name: playerName,
          season_year: ps.season_year,
          competition_id: ps.competition_id,
          competition_name: competitionName,
          manual_matches: ps.matches || 0,
          manual_minutes: ps.minutes || 0,
          live_matches: liveMatches,
          live_minutes: liveMinutes,
          similarity_score: similarityScore,
          detection_reason: detectionReason,
        });
      }
    }

    console.log(`[CLEANUP] Identified ${ghostRecords.length} ghost records`);

    // Step 4: Build report
    const report: CleanupReport = {
      mode,
      timestamp: new Date().toISOString(),
      total_ghost_records: ghostRecords.length,
      total_archived: 0,
      by_reason: {},
      top_affected_players: [],
      top_affected_competitions: [],
      top_affected_seasons: [],
      ghost_records: ghostRecords.slice(0, 100), // Limit to 100 in response
    };

    // Count by reason
    ghostRecords.forEach((gr) => {
      report.by_reason[gr.detection_reason] = (report.by_reason[gr.detection_reason] || 0) + 1;
    });

    // Top affected players
    const playerCounts = new Map<string, { player_name: string; count: number }>();
    ghostRecords.forEach((gr) => {
      const existing = playerCounts.get(gr.player_id) || { player_name: gr.player_name, count: 0 };
      existing.count++;
      playerCounts.set(gr.player_id, existing);
    });
    report.top_affected_players = Array.from(playerCounts.entries())
      .map(([player_id, data]) => ({ player_id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Top affected competitions
    const compCounts = new Map<string, { competition_name: string; count: number }>();
    ghostRecords.forEach((gr) => {
      const existing = compCounts.get(gr.competition_id) || { competition_name: gr.competition_name, count: 0 };
      existing.count++;
      compCounts.set(gr.competition_id, existing);
    });
    report.top_affected_competitions = Array.from(compCounts.entries())
      .map(([competition_id, data]) => ({ competition_id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Top affected seasons
    const seasonCounts = new Map<number, number>();
    ghostRecords.forEach((gr) => {
      seasonCounts.set(gr.season_year, (seasonCounts.get(gr.season_year) || 0) + 1);
    });
    report.top_affected_seasons = Array.from(seasonCounts.entries())
      .map(([season_year, count]) => ({ season_year, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Step 5: Apply archiving if mode is 'apply'
    if (mode === "apply" && ghostRecords.length > 0) {
      const ghostIds = ghostRecords.map((gr) => gr.id);

      // Archive in batches of 100
      const batchSize = 100;
      let archivedCount = 0;

      for (let i = 0; i < ghostIds.length; i += batchSize) {
        const batch = ghostIds.slice(i, i + batchSize);
        
        const { error: archiveError, count } = await supabase
          .from("player_stats")
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archived_reason: "auto_cleanup_live_dup",
          })
          .in("id", batch);

        if (archiveError) {
          console.error(`[CLEANUP] Error archiving batch ${i / batchSize + 1}:`, archiveError);
        } else {
          archivedCount += batch.length;
          console.log(`[CLEANUP] Archived batch ${i / batchSize + 1}: ${batch.length} records`);
        }
      }

      report.total_archived = archivedCount;
      console.log(`[CLEANUP] Total archived: ${archivedCount}`);
    }

    return new Response(
      JSON.stringify(report, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[CLEANUP] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
