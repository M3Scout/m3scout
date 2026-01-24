-- Drop the old constraint
ALTER TABLE public.player_season_goals 
DROP CONSTRAINT player_season_goals_goal_type_check;

-- Add updated constraint with all supported goal types
ALTER TABLE public.player_season_goals 
ADD CONSTRAINT player_season_goals_goal_type_check 
CHECK (goal_type = ANY (ARRAY[
  'goals'::text, 
  'assists'::text, 
  'matches'::text, 
  'minutes'::text, 
  'clean_sheets'::text, 
  'saves'::text,
  'shots'::text,
  'tackles'::text,
  'yellow_cards_max'::text
]));