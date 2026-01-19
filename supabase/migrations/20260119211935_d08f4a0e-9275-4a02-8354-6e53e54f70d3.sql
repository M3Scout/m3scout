-- ONE-TIME FIX: Correct game_time_seconds for 2nd half player_on/player_off events
-- that were incorrectly saved as period-relative instead of absolute match time.
--
-- Rule: game_time_seconds should ALWAYS be absolute (0-90+ minutes * 60 = 0-5400+ seconds)
-- Bug: 2nd half events were saved with period-relative time (e.g., 23 min = 1380 sec)
--      instead of absolute time (e.g., 68 min = 4080 sec)
--
-- Heuristic: If event has half/period = 2 AND game_time_seconds < 2700 (45 min),
--            it was likely saved incorrectly. Add 2700 seconds (45 min) to fix.
--
-- Idempotency: We only fix events where game_time_seconds < 2700, so running twice
--              won't double-add the offset (after first run, values will be >= 2700)

-- Log count before fix
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM match_events
  WHERE event_type IN ('player_on', 'player_off')
    AND (half = 2 OR period = 2)
    AND game_time_seconds IS NOT NULL
    AND game_time_seconds < 2700;
  
  RAISE NOTICE 'Found % second-half player_on/player_off events with potentially incorrect game_time_seconds', affected_count;
END $$;

-- Apply the fix: add 2700 seconds (45 minutes) to 2nd half events with wrong time
UPDATE match_events
SET 
  game_time_seconds = game_time_seconds + 2700,
  -- Also update display_minute to reflect the correct absolute minute
  display_minute = CONCAT(FLOOR((game_time_seconds + 2700) / 60)::INTEGER, ''''),
  -- Update minute field if it was also wrong
  minute = CASE 
    WHEN minute IS NOT NULL AND minute < 45 THEN minute + 45
    ELSE minute
  END
WHERE event_type IN ('player_on', 'player_off')
  AND (half = 2 OR period = 2)
  AND game_time_seconds IS NOT NULL
  AND game_time_seconds < 2700;

-- Log count after fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  -- Count how many were fixed (now have values >= 2700 that didn't before)
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed player_on/player_off events with corrected absolute game_time_seconds';
END $$;