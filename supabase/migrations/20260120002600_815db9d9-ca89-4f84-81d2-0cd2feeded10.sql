-- ============================================================
-- ONE-TIME MIGRATION: Fix match_players entered_minute/exited_minute
-- from period-relative to absolute match time
-- 
-- Problem: match_players.entered_minute was stored as "23" (minute in 2nd half)
--          instead of "68" (absolute minute from match start)
-- 
-- Solution: Derive correct values from match_events.game_time_seconds
--           which is already correct (absolute time)
-- ============================================================

-- Fix entered_minute using player_on events
UPDATE match_players mp
SET 
  entered_minute = FLOOR(me.game_time_seconds / 60.0)::integer,
  updated_at = now()
FROM match_events me
WHERE me.match_id = mp.match_id
  AND me.player_id = mp.player_id
  AND me.event_type = 'player_on'
  AND me.event_status = 'confirmed'
  AND me.game_time_seconds IS NOT NULL
  -- Only update if there's a mismatch (event says 68, mp says 23)
  AND mp.entered_minute IS NOT NULL
  AND mp.entered_minute != FLOOR(me.game_time_seconds / 60.0)::integer;

-- Fix exited_minute using player_off events
UPDATE match_players mp
SET 
  exited_minute = FLOOR(me.game_time_seconds / 60.0)::integer,
  updated_at = now()
FROM match_events me
WHERE me.match_id = mp.match_id
  AND me.player_id = mp.player_id
  AND me.event_type = 'player_off'
  AND me.event_status = 'confirmed'
  AND me.game_time_seconds IS NOT NULL
  -- Only update if there's a mismatch
  AND mp.exited_minute IS NOT NULL
  AND mp.exited_minute != FLOOR(me.game_time_seconds / 60.0)::integer;

-- Also cap exited_minute at 90 for any remaining cases (no off event, just marked as 91+)
UPDATE match_players
SET 
  exited_minute = 90,
  updated_at = now()
WHERE exited_minute IS NOT NULL
  AND exited_minute > 90;

-- Recalculate minutes_played based on corrected entered/exited values
-- Formula: minutes_played = COALESCE(exited_minute, 90) - COALESCE(entered_minute, 0) for non-starters
-- For starters: minutes_played = COALESCE(exited_minute, 90) - 0
UPDATE match_players
SET 
  minutes_played = CASE 
    WHEN started = true THEN COALESCE(exited_minute, 90)
    WHEN entered_minute IS NOT NULL THEN COALESCE(exited_minute, 90) - entered_minute
    ELSE 0
  END,
  updated_at = now()
WHERE 
  (entered_minute IS NOT NULL OR started = true)
  AND (
    minutes_played IS NULL 
    OR minutes_played != CASE 
      WHEN started = true THEN COALESCE(exited_minute, 90)
      WHEN entered_minute IS NOT NULL THEN COALESCE(exited_minute, 90) - entered_minute
      ELSE 0
    END
  );