-- Allow all file types in the contracts bucket (PDFs, docs, and images for logos)
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'contracts';
