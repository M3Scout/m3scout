-- Drop and recreate constraint with new goal types for goalkeeper
ALTER TABLE player_season_goals DROP CONSTRAINT IF EXISTS player_season_goals_goal_type_check;

ALTER TABLE player_season_goals ADD CONSTRAINT player_season_goals_goal_type_check 
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
  'interceptions'::text, 
  'pass_accuracy'::text, 
  'saves_difficult'::text, 
  'dribble_accuracy'::text,
  -- New goalkeeper goal types
  'goals_conceded_max'::text,      -- Maximum goals conceded (limit type)
  'goalkeeper_claims_accuracy'::text, -- Goalkeeper claims accuracy %
  'penalty_save_rate'::text        -- Penalty save rate %
]));