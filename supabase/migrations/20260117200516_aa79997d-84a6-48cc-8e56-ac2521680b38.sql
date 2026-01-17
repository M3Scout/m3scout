-- Function to recalculate display_minute for all existing events using football rounding
CREATE OR REPLACE FUNCTION public.recalculate_all_event_display_minutes()
RETURNS TABLE (
  event_id uuid,
  old_display_minute text,
  new_display_minute text,
  game_time_seconds integer,
  period integer
) AS $$
DECLARE
  rec RECORD;
  v_minutes integer;
  v_seconds integer;
  v_football_minute integer;
  v_base_minute integer;
  v_added_time integer;
  v_new_display text;
BEGIN
  FOR rec IN 
    SELECT id, display_minute, game_time_seconds as gts, COALESCE(period, half, 1) as p
    FROM match_events 
    WHERE game_time_seconds IS NOT NULL
  LOOP
    -- Calculate minutes and seconds
    v_minutes := floor(rec.gts / 60)::integer;
    v_seconds := rec.gts % 60;
    
    -- Apply football rounding: if seconds >= 31, round up
    IF v_seconds >= 31 THEN
      v_football_minute := v_minutes + 1;
    ELSE
      v_football_minute := v_minutes;
    END IF;
    
    -- Determine base minute based on period
    IF rec.p = 1 THEN
      v_base_minute := 45;
    ELSE
      v_base_minute := 90;
    END IF;
    
    -- Calculate added time offset based on period
    IF rec.p = 2 THEN
      v_football_minute := v_football_minute + 45;
    END IF;
    
    -- Format display minute with added time notation if needed
    IF v_football_minute > v_base_minute THEN
      v_added_time := v_football_minute - v_base_minute;
      v_new_display := v_base_minute::text || '+' || v_added_time::text || '''';
    ELSE
      v_new_display := v_football_minute::text || '''';
    END IF;
    
    -- Update the event
    UPDATE match_events 
    SET display_minute = v_new_display 
    WHERE id = rec.id;
    
    -- Return the change info
    event_id := rec.id;
    old_display_minute := rec.display_minute;
    new_display_minute := v_new_display;
    game_time_seconds := rec.gts;
    period := rec.p;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;