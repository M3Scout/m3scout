-- Add missing stats fields for comprehensive player statistics
-- These fields support both outfield players and goalkeepers

-- Outfield player stats
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS shots_blocked integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS offsides integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS clearances integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS ground_duels_won integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS ground_duels_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS successful_dribbles integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS total_dribbles integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS possession_lost integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS fouls_drawn integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS fouls_committed integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS times_dribbled_past integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS long_passes_accurate integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS long_passes_total integer NOT NULL DEFAULT 0;

-- Goalkeeper-specific stats  
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS saves_inside_box integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS punches integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS successful_runs_out integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS total_runs_out integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS high_claims integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS aerial_duels_total integer NOT NULL DEFAULT 0;

-- Add validation trigger for new fields
CREATE OR REPLACE FUNCTION public.validate_player_stats_non_negative()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.matches < 0 THEN RAISE EXCEPTION 'matches cannot be negative'; END IF;
  IF NEW.minutes < 0 THEN RAISE EXCEPTION 'minutes cannot be negative'; END IF;
  IF NEW.goals < 0 THEN RAISE EXCEPTION 'goals cannot be negative'; END IF;
  IF NEW.assists < 0 THEN RAISE EXCEPTION 'assists cannot be negative'; END IF;
  IF NEW.yellow_cards < 0 THEN RAISE EXCEPTION 'yellow_cards cannot be negative'; END IF;
  IF NEW.red_cards < 0 THEN RAISE EXCEPTION 'red_cards cannot be negative'; END IF;
  IF NEW.tackles < 0 THEN RAISE EXCEPTION 'tackles cannot be negative'; END IF;
  IF NEW.interceptions < 0 THEN RAISE EXCEPTION 'interceptions cannot be negative'; END IF;
  IF NEW.recoveries < 0 THEN RAISE EXCEPTION 'recoveries cannot be negative'; END IF;
  IF NEW.saves < 0 THEN RAISE EXCEPTION 'saves cannot be negative'; END IF;
  IF NEW.goals_conceded < 0 THEN RAISE EXCEPTION 'goals_conceded cannot be negative'; END IF;
  IF NEW.clean_sheets < 0 THEN RAISE EXCEPTION 'clean_sheets cannot be negative'; END IF;
  IF NEW.penalties_saved < 0 THEN RAISE EXCEPTION 'penalties_saved cannot be negative'; END IF;
  IF NEW.errors_leading_to_goal < 0 THEN RAISE EXCEPTION 'errors_leading_to_goal cannot be negative'; END IF;
  IF NEW.aerial_duels_won < 0 THEN RAISE EXCEPTION 'aerial_duels_won cannot be negative'; END IF;
  IF NEW.accurate_passes < 0 THEN RAISE EXCEPTION 'accurate_passes cannot be negative'; END IF;
  IF NEW.total_passes < 0 THEN RAISE EXCEPTION 'total_passes cannot be negative'; END IF;
  IF NEW.duels_won < 0 THEN RAISE EXCEPTION 'duels_won cannot be negative'; END IF;
  IF NEW.total_duels < 0 THEN RAISE EXCEPTION 'total_duels cannot be negative'; END IF;
  IF NEW.chances_created < 0 THEN RAISE EXCEPTION 'chances_created cannot be negative'; END IF;
  IF NEW.key_passes < 0 THEN RAISE EXCEPTION 'key_passes cannot be negative'; END IF;
  IF NEW.shots < 0 THEN RAISE EXCEPTION 'shots cannot be negative'; END IF;
  IF NEW.shots_on_target < 0 THEN RAISE EXCEPTION 'shots_on_target cannot be negative'; END IF;
  -- New fields validation
  IF NEW.shots_blocked < 0 THEN RAISE EXCEPTION 'shots_blocked cannot be negative'; END IF;
  IF NEW.offsides < 0 THEN RAISE EXCEPTION 'offsides cannot be negative'; END IF;
  IF NEW.clearances < 0 THEN RAISE EXCEPTION 'clearances cannot be negative'; END IF;
  IF NEW.ground_duels_won < 0 THEN RAISE EXCEPTION 'ground_duels_won cannot be negative'; END IF;
  IF NEW.ground_duels_total < 0 THEN RAISE EXCEPTION 'ground_duels_total cannot be negative'; END IF;
  IF NEW.successful_dribbles < 0 THEN RAISE EXCEPTION 'successful_dribbles cannot be negative'; END IF;
  IF NEW.total_dribbles < 0 THEN RAISE EXCEPTION 'total_dribbles cannot be negative'; END IF;
  IF NEW.possession_lost < 0 THEN RAISE EXCEPTION 'possession_lost cannot be negative'; END IF;
  IF NEW.fouls_drawn < 0 THEN RAISE EXCEPTION 'fouls_drawn cannot be negative'; END IF;
  IF NEW.fouls_committed < 0 THEN RAISE EXCEPTION 'fouls_committed cannot be negative'; END IF;
  IF NEW.times_dribbled_past < 0 THEN RAISE EXCEPTION 'times_dribbled_past cannot be negative'; END IF;
  IF NEW.long_passes_accurate < 0 THEN RAISE EXCEPTION 'long_passes_accurate cannot be negative'; END IF;
  IF NEW.long_passes_total < 0 THEN RAISE EXCEPTION 'long_passes_total cannot be negative'; END IF;
  IF NEW.saves_inside_box < 0 THEN RAISE EXCEPTION 'saves_inside_box cannot be negative'; END IF;
  IF NEW.punches < 0 THEN RAISE EXCEPTION 'punches cannot be negative'; END IF;
  IF NEW.successful_runs_out < 0 THEN RAISE EXCEPTION 'successful_runs_out cannot be negative'; END IF;
  IF NEW.total_runs_out < 0 THEN RAISE EXCEPTION 'total_runs_out cannot be negative'; END IF;
  IF NEW.high_claims < 0 THEN RAISE EXCEPTION 'high_claims cannot be negative'; END IF;
  IF NEW.aerial_duels_total < 0 THEN RAISE EXCEPTION 'aerial_duels_total cannot be negative'; END IF;
  RETURN NEW;
END;
$function$;