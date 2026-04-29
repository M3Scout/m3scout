import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Stats Provider (Single Source of Truth)
 *
 * This is the ONLY place that should query match-derived stats for a player.
 * Both the internal dashboard and the public profile must consume this through
 * the usePlayerMatchStats hook (which wraps this provider).
 */

export interface PlayerMatchStatsQueryOptions {
  playerId: string;
  seasonYear?: number;
  competitionId?: string;
}

export interface MatchPlayerRowWithMatch {
  id: string;
  match_id: string;
  player_id: string;
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played: number | null;
  match: {
    id: string;
    match_date: string;
    opponent_name: string;
    team_name_display: string | null;
    competition_id: string | null;
    season_year: number;
    duration_minutes: number;
    added_time_first_half: number | null;
    added_time_second_half: number | null;
    status: string;
    competition?: {
      id: string;
      name: string;
      display_name: string | null;
    } | null;
  } | null;
}

export type MatchPlayerStatsRow = Record<string, any> & {
  id: string;
  match_id: string;
  player_id: string;
  // Official persisted rating (Single Source of Truth)
  rating: number | null;
  rating_minutes_played: number | null;
  rating_minutes_factor: number | null;
  rating_computed_at: string | null;
  rating_engine_version: string;
};

export interface PlayerMatchStatsRawResult {
  matchPlayers: MatchPlayerRowWithMatch[];
  matchStats: MatchPlayerStatsRow[];
}

export async function fetchPlayerMatchStatsRaw({
  playerId,
  seasonYear,
  competitionId,
}: PlayerMatchStatsQueryOptions): Promise<PlayerMatchStatsRawResult> {
  let matchPlayersQuery = supabase
    .from("match_players")
    .select(
      `
        id,
        match_id,
        player_id,
        started,
        entered_minute,
        exited_minute,
        minutes_played,
        match:matches!inner (
          id,
          match_date,
          opponent_name,
          team_name_display,
          competition_id,
          season_year,
          duration_minutes,
          added_time_first_half,
          added_time_second_half,
          status,
          competition:competitions (
            id,
            name,
            display_name
          )
        )
      `
    )
    .eq("player_id", playerId)
    // handle NULLs safely: treat NULL as not removed
    .neq("is_removed", true)
    // Regra de Ouro: somente jogos APLICADOS contam nas estatísticas do atleta.
    // Jogos 'finished' (Aguardando Aplicar) ficam de fora até o usuário clicar em "Aplicar".
    .eq("match.status", "applied");

  if (seasonYear) {
    matchPlayersQuery = matchPlayersQuery.eq("match.season_year", seasonYear);
  }
  if (competitionId) {
    matchPlayersQuery = matchPlayersQuery.eq("match.competition_id", competitionId);
  }

  const { data: matchPlayers, error: mpError } = await matchPlayersQuery;
  if (mpError) throw mpError;

  const typedMatchPlayers = (matchPlayers as unknown as MatchPlayerRowWithMatch[] | null) ?? [];
  const matchIds = Array.from(
    new Set(typedMatchPlayers.filter((mp) => mp.match).map((mp) => mp.match_id))
  );

  if (matchIds.length === 0) {
    return { matchPlayers: [], matchStats: [] };
  }

  const { data: statsData, error: statsError } = await supabase
    .from("match_player_stats")
    .select("*")
    .eq("player_id", playerId)
    .in("match_id", matchIds);

  if (statsError) throw statsError;

  return {
    matchPlayers: typedMatchPlayers,
    matchStats: (statsData as unknown as MatchPlayerStatsRow[] | null) ?? [],
  };
}
