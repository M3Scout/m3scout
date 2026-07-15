-- players.current_club was only ever written by AddContractModal.tsx on insert,
-- unconditionally overwriting it with whatever contract was just added — even a
-- backdated/historical one — and never re-synced on edit, "Definir como Atual",
-- archive/unarchive, or delete. This trigger makes player_contract_history the
-- single source of truth: whenever it changes, recompute current_club from the
-- contract marked is_current, falling back to the most recent non-archived one
-- by start_date. sort_order is deliberately NOT used as a fallback tiebreaker —
-- real data audit (Vitor Emanoel) showed sort_order values badly out of sync
-- with actual chronological order (oldest 2024 contracts had a more "first"
-- sort_order than a 2026 contract), so start_date is the only trustworthy signal
-- when no contract is explicitly marked current.

CREATE OR REPLACE FUNCTION public.sync_player_current_club()
RETURNS TRIGGER AS $$
DECLARE
  target_player_id uuid := COALESCE(NEW.player_id, OLD.player_id);
  resolved_club text;
BEGIN
  SELECT club_name INTO resolved_club
  FROM public.player_contract_history
  WHERE player_id = target_player_id
    AND is_archived = false
  ORDER BY
    is_current DESC,
    start_date DESC
  LIMIT 1;

  UPDATE public.players
  SET current_club = resolved_club
  WHERE id = target_player_id
    AND current_club IS DISTINCT FROM resolved_club;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_current_club_on_contract_change ON public.player_contract_history;
CREATE TRIGGER sync_current_club_on_contract_change
AFTER INSERT OR UPDATE OR DELETE ON public.player_contract_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_current_club();

-- One-off backfill: fix every player whose cached current_club is already stale.
UPDATE public.players p
SET current_club = resolved.club_name
FROM (
  SELECT DISTINCT ON (player_id) player_id, club_name
  FROM public.player_contract_history
  WHERE is_archived = false
  ORDER BY player_id, is_current DESC, start_date DESC
) resolved
WHERE p.id = resolved.player_id
  AND p.current_club IS DISTINCT FROM resolved.club_name;
