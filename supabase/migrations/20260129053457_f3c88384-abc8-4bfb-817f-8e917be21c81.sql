-- Rebuild ball_actions for all match_player_stats records
-- ball_actions is a DERIVED statistic that sums all possession-related events
-- See src/lib/derivedBallActions.ts for the canonical list of events

UPDATE match_player_stats mps
SET ball_actions = (
  COALESCE(mps.goals, 0) + 
  COALESCE(mps.shots_on_target, 0) + 
  GREATEST(0, COALESCE(mps.shots, 0) - COALESCE(mps.shots_on_target, 0)) + 
  COALESCE(mps.shots_blocked, 0) +
  COALESCE(mps.assists, 0) + 
  COALESCE(mps.key_passes, 0) + 
  COALESCE(mps.chances_created, 0) +
  COALESCE(mps.passes_completed, 0) + 
  COALESCE(mps.passes_total, 0) +
  COALESCE(mps.crosses_success, 0) + 
  COALESCE(mps.crosses_failed, 0) +
  COALESCE(mps.dribbles_success, 0) + 
  COALESCE(mps.dribbles_total, 0) +
  COALESCE(mps.possession_lost, 0) + 
  COALESCE(mps.recoveries, 0)
)
WHERE ball_actions = 0 
  OR ball_actions IS NULL
  OR ball_actions < (
    COALESCE(mps.goals, 0) + 
    COALESCE(mps.shots_on_target, 0) + 
    GREATEST(0, COALESCE(mps.shots, 0) - COALESCE(mps.shots_on_target, 0)) + 
    COALESCE(mps.shots_blocked, 0) +
    COALESCE(mps.assists, 0) + 
    COALESCE(mps.key_passes, 0) + 
    COALESCE(mps.chances_created, 0) +
    COALESCE(mps.passes_completed, 0) + 
    COALESCE(mps.passes_total, 0) +
    COALESCE(mps.crosses_success, 0) + 
    COALESCE(mps.crosses_failed, 0) +
    COALESCE(mps.dribbles_success, 0) + 
    COALESCE(mps.dribbles_total, 0) +
    COALESCE(mps.possession_lost, 0) + 
    COALESCE(mps.recoveries, 0)
  );