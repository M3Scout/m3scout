import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface PlayerFieldPresenceRecord {
  id: string;
  match_id: string;
  match_player_id: string;
  player_id: string;
  period: number;
  entered_at_seconds: number;
  exited_at_seconds: number | null;
  role: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Single source of truth for player_field_presence reads.
 * IMPORTANT: Keep queryKey + queryFn shape consistent across the app to avoid cache collisions.
 */
export function usePlayerFieldPresence(matchId?: string) {
  return useQuery({
    queryKey: ["player-field-presence", matchId],
    enabled: !!matchId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!matchId) return [] as PlayerFieldPresenceRecord[];

      const { data, error } = await supabase
        .from("player_field_presence")
        .select("*")
        .eq("match_id", matchId)
        .order("period", { ascending: true })
        .order("entered_at_seconds", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PlayerFieldPresenceRecord[];
    },
  });
}
