import { useQuery } from "@tanstack/react-query";
import { getMergedSeasonTotals } from "@/lib/recalculatePlayerScores";
import type { MatchDerivedStats } from "@/hooks/usePlayerMatchStats";

export function useMergedSeasonTotals(
  playerId: string | null | undefined,
  seasonYear: number
) {
  return useQuery<MatchDerivedStats>({
    queryKey: ["merged-season-totals", playerId, seasonYear],
    queryFn:  () => getMergedSeasonTotals(playerId!, seasonYear),
    enabled:  !!playerId,
    staleTime: 5 * 60 * 1000,
  });
}
