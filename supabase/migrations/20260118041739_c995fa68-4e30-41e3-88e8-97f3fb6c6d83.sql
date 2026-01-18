-- Security fixes from linter

-- 1) instagram_tokens has RLS enabled but no policies
-- Tokens are sensitive: restrict access to admins only.
ALTER TABLE public.instagram_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='instagram_tokens'
      AND policyname='Admins can manage instagram tokens'
  ) THEN
    CREATE POLICY "Admins can manage instagram tokens"
    ON public.instagram_tokens
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- 2) check_duplicate_event missing fixed search_path
CREATE OR REPLACE FUNCTION public.check_duplicate_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check if an event with the same type, player, and game_time_seconds exists within the last 2 seconds
  IF EXISTS (
    SELECT 1 FROM public.match_events
    WHERE match_id = NEW.match_id
      AND player_id = NEW.player_id
      AND event_type = NEW.event_type
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND ABS(COALESCE(game_time_seconds, 0) - COALESCE(NEW.game_time_seconds, 0)) <= 2
      AND event_status != 'voided'
      AND created_at > NOW() - INTERVAL '5 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate event detected: same player, type, and time within 2 seconds';
  END IF;

  RETURN NEW;
END;
$$;