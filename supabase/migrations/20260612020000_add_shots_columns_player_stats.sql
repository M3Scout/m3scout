-- Adiciona colunas de finalização faltantes em player_stats
-- shots_off_target: finalizações que foram para fora
-- shots_blocked_att: finalizações bloqueadas pelo adversário (stat de ataque)
-- Nota: shots_blocked já existente é stat defensiva (você bloqueou o chute de alguém)

ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS shots_off_target  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shots_blocked_att integer NOT NULL DEFAULT 0;
