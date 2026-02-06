
-- Drop the OLD function (without client_event_id) to eliminate RPC ambiguity
-- Keeping the newer version that includes p_client_event_id for idempotency
DROP FUNCTION IF EXISTS public.create_live_event_v2(
  p_game_id uuid, 
  p_player_id uuid, 
  p_type text, 
  p_half integer, 
  p_force_time_seconds integer, 
  p_notes text, 
  p_display_minute text
);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
