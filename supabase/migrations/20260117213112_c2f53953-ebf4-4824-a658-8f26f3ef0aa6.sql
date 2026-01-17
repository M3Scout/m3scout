-- Create team_settings table for storing main team configuration
CREATE TABLE public.team_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL DEFAULT 'M3 Scouting',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage team settings
CREATE POLICY "Admins can manage team settings"
  ON public.team_settings
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Internal users can view team settings
CREATE POLICY "Internal users can view team settings"
  ON public.team_settings
  FOR SELECT
  USING (is_internal_user(auth.uid()));

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('team-logos', 'team-logos', true, 5242880); -- 5MB limit

-- Storage policies for team logos
CREATE POLICY "Anyone can view team logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'team-logos');

CREATE POLICY "Admins can upload team logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'team-logos' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update team logos"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'team-logos' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete team logos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'team-logos' AND is_admin(auth.uid()));

-- Insert default team settings
INSERT INTO public.team_settings (team_name, logo_url)
VALUES ('M3 Scouting', NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_team_settings_updated_at
  BEFORE UPDATE ON public.team_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();