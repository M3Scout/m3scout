-- Add long pass event types for goalkeeper distribution tracking
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'long_pass_success';
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'long_pass_total';