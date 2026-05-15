
-- Trigger: when a match_player_stats row is deleted, clean up any stale
-- aggregated player_stats row for the same (player_id, competition_id, season_year)
-- if there are no remaining LIVE applied matches for that combination.
-- This prevents deleted live matches from continuing to show in unified
-- views via the legacy player_stats fallback branch.

CREATE OR REPLACE FUNCTION public.cleanup_aggregated_stats_after_match_stat_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competition_id uuid;
  v_season_year integer;
  v_remaining integer;
BEGIN
  SELECT m.competition_id, m.season_year
    INTO v_competition_id, v_season_year
    FROM public.matches m
   WHERE m.id = OLD.match_id;

  IF v_competition_id IS NULL OR v_season_year IS NULL THEN
    RETURN OLD;
  END IF;

  -- Count remaining live coverage for this player in same competition/season
  SELECT COUNT(*)
    INTO v_remaining
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
   WHERE mp.player_id = OLD.player_id
     AND COALESCE(mp.is_removed, false) = false
     AND m.competition_id = v_competition_id
     AND m.season_year = v_season_year
     AND m.status = 'applied'::match_status;

  IF v_remaining = 0 THEN
    DELETE FROM public.player_stats
     WHERE player_id = OLD.player_id
       AND competition_id = v_competition_id
       AND season_year = v_season_year;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_aggregated_stats_after_mps_delete ON public.match_player_stats;
CREATE TRIGGER trg_cleanup_aggregated_stats_after_mps_delete
AFTER DELETE ON public.match_player_stats
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_aggregated_stats_after_match_stat_delete();

-- Also trigger cleanup when match_players is soft-removed (is_removed flipped to true).
CREATE OR REPLACE FUNCTION public.cleanup_aggregated_stats_after_match_player_remove()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competition_id uuid;
  v_season_year integer;
  v_remaining integer;
BEGIN
  IF COALESCE(NEW.is_removed, false) = false OR COALESCE(OLD.is_removed, false) = true THEN
    RETURN NEW;
  END IF;

  SELECT m.competition_id, m.season_year
    INTO v_competition_id, v_season_year
    FROM public.matches m
   WHERE m.id = NEW.match_id;

  IF v_competition_id IS NULL OR v_season_year IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_remaining
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
   WHERE mp.player_id = NEW.player_id
     AND COALESCE(mp.is_removed, false) = false
     AND m.competition_id = v_competition_id
     AND m.season_year = v_season_year
     AND m.status = 'applied'::match_status;

  IF v_remaining = 0 THEN
    DELETE FROM public.player_stats
     WHERE player_id = NEW.player_id
       AND competition_id = v_competition_id
       AND season_year = v_season_year;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_aggregated_stats_after_mp_remove ON public.match_players;
CREATE TRIGGER trg_cleanup_aggregated_stats_after_mp_remove
AFTER UPDATE OF is_removed ON public.match_players
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_aggregated_stats_after_match_player_remove();
