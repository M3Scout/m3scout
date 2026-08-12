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