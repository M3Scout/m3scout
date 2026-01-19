-- Drop the older overload of create_live_event_v2 that returns json (the one without p_display_minute)
-- Keep only the newer version that returns jsonb and has p_display_minute parameter
DROP FUNCTION IF EXISTS public.create_live_event_v2(uuid, uuid, text, integer, text, integer);

-- Verify we still have the correct function
-- The remaining function should be:
-- create_live_event_v2(p_game_id uuid, p_player_id uuid, p_type text, p_half integer, p_force_time_seconds integer, p_notes text, p_display_minute text) returns jsonb