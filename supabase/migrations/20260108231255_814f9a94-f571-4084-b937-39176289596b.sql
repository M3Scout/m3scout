-- Create RLS policies for user avatar uploads in player-photos bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'player-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'player-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'player-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view player photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'player-photos');