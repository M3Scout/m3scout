-- Add M3 agency contract dates to the players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS m3_contract_start date,
  ADD COLUMN IF NOT EXISTS m3_contract_end   date;

COMMENT ON COLUMN players.m3_contract_start IS 'Data de assinatura do contrato de representação com a M3';
COMMENT ON COLUMN players.m3_contract_end   IS 'Data de vencimento do contrato de representação com a M3';
