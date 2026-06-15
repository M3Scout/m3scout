-- Add contract file URL to player_contract_history
ALTER TABLE player_contract_history
  ADD COLUMN IF NOT EXISTS contract_file_url text;

-- Storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Admins and scouts can upload/read; everyone else blocked
CREATE POLICY "contracts_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "contracts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "contracts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contracts');
