ALTER TABLE player_contract_history
  ADD COLUMN IF NOT EXISTS club_logo_url text;
