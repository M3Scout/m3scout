-- Add new event types to match_event_type enum for complete scouting statistics
-- These stats are required for the new UI category organization

-- 1. ATAQUE: Impedimento e Finalização Bloqueada (ofensivo)
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'offside';
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'shot_blocked';

-- 2. PASSES: Cruzamentos
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'cross_success';
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'cross_failed';

-- 3. DRIBLES/POSSE: Ações com a bola
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'ball_action';

-- 4. DEFESA: Driblado e Chute bloqueado (defensivo)
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'was_dribbled';
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'blocked_shot';

-- Add corresponding columns to match_player_stats table for aggregation
ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS offsides integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS shots_blocked integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS crosses_success integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS crosses_failed integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS ball_actions integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS was_dribbled integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS blocked_shots integer NOT NULL DEFAULT 0;

-- Update the apply_event_stats function to handle the new event types
CREATE OR REPLACE FUNCTION public.apply_event_stats(
  p_delta integer,
  p_event_type text,
  p_match_id uuid,
  p_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column_name text;
BEGIN
  -- Map event type to column name
  v_column_name := CASE p_event_type
    -- Attack
    WHEN 'goal' THEN 'goals'
    WHEN 'shot' THEN 'shots'
    WHEN 'shot_on_target' THEN 'shots_on_target'
    WHEN 'offside' THEN 'offsides'
    WHEN 'shot_blocked' THEN 'shots_blocked'
    -- Passes
    WHEN 'assist' THEN 'assists'
    WHEN 'key_pass' THEN 'key_passes'
    WHEN 'chance_created' THEN 'chances_created'
    WHEN 'pass_success' THEN 'passes_completed'
    WHEN 'pass_total' THEN 'passes_total'
    WHEN 'cross_success' THEN 'crosses_success'
    WHEN 'cross_failed' THEN 'crosses_failed'
    -- Dribbles/Possession
    WHEN 'dribble_success' THEN 'dribbles_success'
    WHEN 'dribble_attempt' THEN 'dribbles_total'
    WHEN 'foul_suffered' THEN 'fouls_suffered'
    WHEN 'possession_lost' THEN 'possession_lost'
    WHEN 'ball_action' THEN 'ball_actions'
    -- Defense
    WHEN 'tackle' THEN 'tackles'
    WHEN 'interception' THEN 'interceptions'
    WHEN 'recovery' THEN 'recoveries'
    WHEN 'clearance' THEN 'clearances'
    WHEN 'duel_won' THEN 'duels_won'
    WHEN 'duel_total' THEN 'duels_total'
    WHEN 'aerial_duel_won' THEN 'aerial_duels_won'
    WHEN 'aerial_duel_total' THEN 'aerial_duels_total'
    WHEN 'ground_duel_won' THEN 'duels_won' -- Maps to same column as duel_won
    WHEN 'ground_duel_total' THEN 'duels_total' -- Maps to same column as duel_total
    WHEN 'foul_committed' THEN 'fouls_committed'
    WHEN 'was_dribbled' THEN 'was_dribbled'
    WHEN 'blocked_shot' THEN 'blocked_shots'
    -- Discipline
    WHEN 'yellow' THEN 'yellow_cards'
    WHEN 'red' THEN 'red_cards'
    -- Goalkeeper
    WHEN 'save' THEN 'saves'
    WHEN 'goal_conceded' THEN 'goals_conceded'
    ELSE NULL
  END;

  -- If no matching column, exit silently
  IF v_column_name IS NULL THEN
    RETURN;
  END IF;

  -- Upsert the stat - create record if not exists, update if exists
  INSERT INTO public.match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  -- Apply the delta to the correct column using dynamic SQL
  EXECUTE format(
    'UPDATE public.match_player_stats SET %I = GREATEST(0, %I + $1) WHERE match_id = $2 AND player_id = $3',
    v_column_name,
    v_column_name
  ) USING p_delta, p_match_id, p_player_id;
END;
$$;