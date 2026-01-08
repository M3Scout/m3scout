-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public) VALUES ('player-photos', 'player-photos', true);

-- Storage policies for player photos
CREATE POLICY "Player photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'player-photos');

CREATE POLICY "Scouts and admins can upload player photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'player-photos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'scout')
  )
);

CREATE POLICY "Scouts and admins can update player photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'player-photos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'scout')
  )
);

CREATE POLICY "Admins can delete player photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));

-- Function to assign default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for the user
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  
  -- Assign default 'member' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();