-- Add UPDATE policy for upsert support in contracts storage bucket
DROP POLICY IF EXISTS "contracts_update" ON storage.objects;

CREATE POLICY "contracts_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts');
