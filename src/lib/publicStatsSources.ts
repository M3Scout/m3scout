import { supabase } from "@/integrations/supabase/client";

/**
 * Linhas brutas de estatísticas de um atleta público, no mesmo formato das
 * consultas do app (ver migration get_public_player_stats_sources). Usado pelo
 * perfil público para calcular exatamente os mesmos números da área logada.
 */
export interface PublicStatsSources {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match_players: any[];
  presence: { match_id: string; period: number; entered_at_seconds: number | null; exited_at_seconds: number | null }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match_player_stats: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manual: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player_stats: any[];
}

const EMPTY: PublicStatsSources = { match_players: [], presence: [], match_player_stats: [], manual: [], player_stats: [] };
const cache = new Map<string, { at: number; p: Promise<PublicStatsSources> }>();

/** Uma chamada por atleta, compartilhada entre os hooks (cache de 30 s). */
export function fetchPublicStatsSources(playerId: string): Promise<PublicStatsSources> {
  const hit = cache.get(playerId);
  if (hit && Date.now() - hit.at < 30_000) return hit.p;
  const p = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_public_player_stats_sources", { p_player_id: playerId });
    if (error) throw error;
    return { ...EMPTY, ...(data ?? {}) } as PublicStatsSources;
  })();
  p.catch(() => cache.delete(playerId));
  cache.set(playerId, { at: Date.now(), p });
  return p;
}
