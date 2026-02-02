-- Drop the existing goal_type check constraint
ALTER TABLE public.player_season_goals DROP CONSTRAINT player_season_goals_goal_type_check;

-- Add updated constraint with new goal types
ALTER TABLE public.player_season_goals ADD CONSTRAINT player_season_goals_goal_type_check 
  CHECK (goal_type = ANY (ARRAY[
    'goals'::text, 
    'assists'::text, 
    'matches'::text, 
    'minutes'::text, 
    'clean_sheets'::text, 
    'saves'::text, 
    'shots'::text, 
    'tackles'::text, 
    'yellow_cards_max'::text,
    -- New goal types
    'interceptions'::text,
    'pass_accuracy'::text,
    'saves_difficult'::text
  ]));