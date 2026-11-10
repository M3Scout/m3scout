import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HomePlayer {
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  current_club: string | null;
  photo_url: string | null;
  auto_rating?: number | null;
}

const COLS = "id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating, created_at";

/**
 * Atletas da home: todos os atletas públicos. Quem tem minutos na temporada
 * (atual, ou anterior se a atual estiver vazia) vem primeiro, por minutos;
 * os demais em seguida, por auto_rating.
 */
export function useHomePlayers(limit = 12) {
  const [players, setPlayers] = useState<HomePlayer[]>([]);

  useEffect(() => {
    let cancelled = false;
    const currentYear = new Date().getFullYear();

    (async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { data } = await (supabase
        .from("public_players_safe" as any)
        .select(COLS)
        .order("auto_rating", { ascending: false, nullsFirst: false }) as any);
      const all = (data as HomePlayer[] | null) ?? [];

      let rankedIds: string[] = [];
      for (const year of [currentYear, currentYear - 1]) {
        if (cancelled) return;
        const { data: rankData } = await (supabase as any).rpc("get_public_player_minutes_ranking", { p_season_year: year });
        const rows = (rankData as any[]) ?? [];
        if (rows.length) {
          rankedIds = rows.map((r) => r.player_id as string);
          break;
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */

      const pos = new Map(rankedIds.map((id, i) => [id, i]));
      const ordered = [...all].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity));
      if (!cancelled) setPlayers(ordered.slice(0, limit));
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return players;
}
