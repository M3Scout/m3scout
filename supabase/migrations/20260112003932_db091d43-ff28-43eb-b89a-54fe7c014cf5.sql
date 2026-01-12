-- Create table to store Instagram tokens with auto-refresh capability
CREATE TABLE public.instagram_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'long_lived',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_tokens ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read tokens (using service role)
-- No user policies needed as this is internal

-- Insert initial placeholder (will be updated by edge function)
INSERT INTO public.instagram_tokens (access_token, expires_at)
VALUES ('pending', now() + interval '60 days');

-- Add trigger for updated_at
CREATE TRIGGER update_instagram_tokens_updated_at
BEFORE UPDATE ON public.instagram_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();