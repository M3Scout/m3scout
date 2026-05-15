CREATE OR REPLACE FUNCTION public.remove_player_live_stats_group(
  p_player_id uuid,
  p_season_year integer,
  p_competition_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_ids uuid[] := ARRAY[]::uuid[];
  v_match_player_ids uuid[] := ARRAY[]::uuid[];
  v_deleted_stats integer := 0;
  v_removed_players integer := 0;
  v_deleted_player_stats integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'scout'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to remove live stats';
  END IF;

  SELECT
    COALESCE(array_agg(DISTINCT mp.match_id), ARRAY[]::uuid[]),
    COALESCE(array_agg(DISTINCT mp.id), ARRAY[]::uuid[])
  INTO v_match_ids, v_match_player_ids
  FROM public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
  WHERE mp.player_id = p_player_id
    AND m.season_year = p_season_year
    AND (
      (p_competition_id IS NULL AND m.competition_id IS NULL)
      OR m.competition_id = p_competition_id
    )
    AND m.status = 'applied'::match_status
    AND COALESCE(mp.is_removed, false) = false;

  IF COALESCE(array_length(v_match_ids, 1), 0) > 0 THEN
    DELETE FROM public.match_player_stats mps
    WHERE mps.player_id = p_player_id
      AND mps.match_id = ANY(v_match_ids);
    GET DIAGNOSTICS v_deleted_stats = ROW_COUNT;

    UPDATE public.match_players mp
    SET is_removed = true,
        removed_at = COALESCE(mp.removed_at, now())
    WHERE mp.id = ANY(v_match_player_ids);
    GET DIAGNOSTICS v_removed_players = ROW_COUNT;
  END IF;

  DELETE FROM public.player_stats ps
  WHERE ps.player_id = p_player_id
    AND ps.season_year = p_season_year
    AND (
      (p_competition_id IS NULL AND ps.competition_id IS NULL)
      OR ps.competition_id = p_competition_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.match_players mp2
      JOIN public.matches m2 ON m2.id = mp2.match_id
      WHERE mp2.player_id = p_player_id
        AND m2.season_year = p_season_year
        AND (
          (p_competition_id IS NULL AND m2.competition_id IS NULL)
          OR m2.competition_id = p_competition_id
        )
        AND m2.status = 'applied'::match_status
        AND COALESCE(mp2.is_removed, false) = false
    );
  GET DIAGNOSTICS v_deleted_player_stats = ROW_COUNT;

  RETURN jsonb_build_object(
    'match_ids', v_match_ids,
    'removed_match_players', v_removed_players,
    'deleted_match_player_stats', v_deleted_stats,
    'deleted_player_stats', v_deleted_player_stats
  );
END;
$$;