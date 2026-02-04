-- Create storage bucket for news images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to news images
CREATE POLICY "Public can view news images"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

-- Allow authenticated internal users to upload news images
CREATE POLICY "Internal users can upload news images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'news-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated internal users to update news images
CREATE POLICY "Internal users can update news images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'news-images' AND auth.role() = 'authenticated');

-- Allow authenticated internal users to delete news images
CREATE POLICY "Internal users can delete news images"
ON storage.objects FOR DELETE
USING (bucket_id = 'news-images' AND auth.role() = 'authenticated');