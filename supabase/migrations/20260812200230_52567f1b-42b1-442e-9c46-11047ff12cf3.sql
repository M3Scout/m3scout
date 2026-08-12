CREATE OR REPLACE FUNCTION public.sync_player_current_club()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_player_id uuid := COALESCE(NEW.player_id, OLD.player_id);
  resolved_club text;
  resolved_status text;
  resolved_contract_id uuid;
BEGIN
  -- Prevent infinite recursion: this trigger updates its own table
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  SELECT id, club_name,
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 'emprestado' ELSE 'contracted' END
  INTO resolved_contract_id, resolved_club, resolved_status
  FROM public.player_contract_history
  WHERE player_id = target_player_id
    AND COALESCE(is_archived, false) = false
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 1 ELSE 2 END,
    start_date DESC
  LIMIT 1;

  UPDATE public.player_contract_history
  SET is_current = (id = resolved_contract_id)
  WHERE player_id = target_player_id
    AND COALESCE(is_current, false) IS DISTINCT FROM (id = resolved_contract_id);

  UPDATE public.players
  SET current_club = resolved_club,
      contract_status = COALESCE(resolved_status, 'free'),
      contract_start = CASE WHEN resolved_contract_id IS NULL THEN NULL ELSE contract_start END,
      contract_end = CASE WHEN resolved_contract_id IS NULL THEN NULL ELSE contract_end END
  WHERE id = target_player_id
    AND (current_club IS DISTINCT FROM resolved_club
      OR contract_status IS DISTINCT FROM COALESCE(resolved_status, 'free'));

  RETURN NULL;
END;
$function$;