-- Adiciona penalties_won e blocked_shots às tabelas de estatísticas.
--
-- penalties_won: número de pênaltis sofridos pelo jogador (ganhou a penalidade)
-- blocked_shots: número de finalizações do adversário que o jogador bloqueou (ação defensiva)
--
-- Ambas as colunas são adicionadas em player_stats (agregado de temporada)
-- e em manual_player_stats (entrada manual de jogos externos), mantendo
-- a consistência arquitetural entre as duas fontes de dados.
--
-- O campo blocked_shots já existia em match_player_stats (evento 'blocked_shot').
-- A partir desta migração, o agregado de temporada também o persiste em player_stats,
-- eliminando a necessidade de subqueries em calculate_player_attribute_scores().

-- ----------------------------------------------------------------
-- player_stats (agregado de temporada — fonte primária do radar)
-- ----------------------------------------------------------------
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS penalties_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_shots  INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------
-- manual_player_stats (dados externos inseridos manualmente por scouts)
-- ----------------------------------------------------------------
ALTER TABLE public.manual_player_stats
  ADD COLUMN IF NOT EXISTS penalties_won INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_shots  INTEGER NOT NULL DEFAULT 0;

-- Comentários descritivos
COMMENT ON COLUMN public.player_stats.penalties_won
  IS 'Número de pênaltis sofridos (ganhos) pelo jogador na temporada';
COMMENT ON COLUMN public.player_stats.blocked_shots
  IS 'Número de finalizações do adversário bloqueadas pelo jogador (ação defensiva)';

COMMENT ON COLUMN public.manual_player_stats.penalties_won
  IS 'Número de pênaltis sofridos (ganhos) — entrada manual de jogos externos';
COMMENT ON COLUMN public.manual_player_stats.blocked_shots
  IS 'Número de chutes bloqueados — entrada manual de jogos externos';
