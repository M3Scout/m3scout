/**
 * statLimits — limites razoáveis (min/max) por estatística de temporada.
 *
 * Regras gerais:
 *  - Mínimo sempre 0 (estatísticas nunca negativas).
 *  - Máximos baseados em ordens de grandeza realistas para uma temporada
 *    completa (até ~70 jogos × valores extremos plausíveis por jogo),
 *    com margem de segurança. Servem para pegar erros de digitação
 *    grosseiros (ex: usuário digitou 9999 em "gols").
 *  - `matches` e `minutes` têm tetos rígidos (uma temporada não pode ter
 *    150 partidas nem 20 000 minutos).
 */

export interface StatLimit {
  min: number;
  max: number;
  /** rótulo amigável para mensagens de erro */
  label?: string;
}

const COUNT_DEFAULT = 9999;

export const SEASON_STAT_LIMITS: Record<string, StatLimit> = {
  // Jogos / minutos — tetos rígidos
  matches: { min: 0, max: 120, label: "Jogos" },
  minutes: { min: 0, max: 12000, label: "Minutos" },

  // Disciplina
  yellow_cards: { min: 0, max: 200, label: "Amarelos" },
  red_cards: { min: 0, max: 30, label: "Vermelhos" },
  fouls_committed: { min: 0, max: 500, label: "Faltas Cometidas" },
  fouls_drawn: { min: 0, max: 500, label: "Faltas Sofridas" },

  // Ataque
  goals: { min: 0, max: 200, label: "Gols" },
  assists: { min: 0, max: 200, label: "Assistências" },
  shots: { min: 0, max: 1000, label: "Finalizações" },
  shots_on_target: { min: 0, max: 1000, label: "Finalizações no Gol" },
  shots_blocked: { min: 0, max: 500, label: "Finalizações Bloqueadas" },
  offsides: { min: 0, max: 300, label: "Impedimentos" },
  chances_created: { min: 0, max: 1000, label: "Chances Criadas" },
  key_passes: { min: 0, max: 1000, label: "Passes Decisivos" },

  // Passes
  accurate_passes: { min: 0, max: COUNT_DEFAULT, label: "Passes Certos" },
  total_passes: { min: 0, max: COUNT_DEFAULT, label: "Passes Totais" },
  long_passes_accurate: { min: 0, max: 5000, label: "Lançamentos Certos" },
  long_passes_total: { min: 0, max: 5000, label: "Lançamentos Totais" },

  // Dribles
  successful_dribbles: { min: 0, max: 1000, label: "Dribles Certos" },
  total_dribbles: { min: 0, max: 1000, label: "Dribles Totais" },
  possession_lost: { min: 0, max: 2000, label: "Bolas Perdidas" },
  crosses_success: { min: 0, max: 1000, label: "Cruzamentos Certos" },
  crosses_failed: { min: 0, max: 1000, label: "Cruzamentos Errados" },

  // Defesa
  tackles: { min: 0, max: 1000, label: "Desarmes" },
  interceptions: { min: 0, max: 1000, label: "Interceptações" },
  recoveries: { min: 0, max: 2000, label: "Recuperações" },
  clearances: { min: 0, max: 1000, label: "Cortes" },
  duels_won: { min: 0, max: 2000, label: "Duelos Ganhos" },
  total_duels: { min: 0, max: 2000, label: "Duelos Totais" },
  ground_duels_won: { min: 0, max: 2000, label: "Duelos Solo Ganhos" },
  ground_duels_total: { min: 0, max: 2000, label: "Duelos Solo Totais" },
  aerial_duels_won: { min: 0, max: 1000, label: "Duelos Aéreos Ganhos" },
  aerial_duels_total: { min: 0, max: 1000, label: "Duelos Aéreos Totais" },
  times_dribbled_past: { min: 0, max: 500, label: "Driblado" },

  // Goleiro
  saves: { min: 0, max: 1000, label: "Defesas" },
  goals_conceded: { min: 0, max: 500, label: "Gols Sofridos" },
  clean_sheets: { min: 0, max: 120, label: "Clean Sheets" },
  penalties_saved: { min: 0, max: 50, label: "Pênaltis Defendidos" },
  errors_leading_to_goal: { min: 0, max: 100, label: "Erros que viraram Gol" },
  saves_inside_box: { min: 0, max: 1000, label: "Defesas na Área" },
  punches: { min: 0, max: 500, label: "Socos" },
  high_claims: { min: 0, max: 500, label: "Bolas Altas" },
  successful_runs_out: { min: 0, max: 500, label: "Saídas Certas" },
  total_runs_out: { min: 0, max: 500, label: "Saídas Totais" },
};

const DEFAULT_LIMIT: StatLimit = { min: 0, max: COUNT_DEFAULT };

export function getStatLimit(key: string): StatLimit {
  return SEASON_STAT_LIMITS[key] ?? DEFAULT_LIMIT;
}

/**
 * Aplica clamp [min, max] sobre um valor numérico para uma stat conhecida.
 * Trata NaN/negativos como 0.
 */
export function clampStatValue(key: string, value: number): number {
  const { min, max } = getStatLimit(key);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export interface StatValidationIssue {
  key: string;
  label: string;
  message: string;
}

/**
 * Valida um conjunto de stats:
 *  - rejeita negativos (não devem ocorrer pois clamp é aplicado, mas dupla checagem)
 *  - rejeita valores acima do máximo razoável
 *  - rejeita pares "sucesso > total" (ex.: passes_completed > total_passes)
 */
export function validateSeasonStats(
  values: Record<string, number>,
  successPairs: Array<[successKey: string, totalKey: string]> = DEFAULT_SUCCESS_PAIRS,
): StatValidationIssue[] {
  const issues: StatValidationIssue[] = [];

  for (const [key, raw] of Object.entries(values)) {
    if (!(key in SEASON_STAT_LIMITS)) continue;
    const limit = SEASON_STAT_LIMITS[key];
    const label = limit.label ?? key;
    if (!Number.isFinite(raw)) {
      issues.push({ key, label, message: `${label}: valor inválido` });
      continue;
    }
    if (raw < limit.min) {
      issues.push({ key, label, message: `${label} não pode ser negativo` });
    } else if (raw > limit.max) {
      issues.push({
        key,
        label,
        message: `${label} acima do limite razoável (máx. ${limit.max})`,
      });
    }
  }

  for (const [successKey, totalKey] of successPairs) {
    const success = Number(values[successKey] ?? 0);
    const total = Number(values[totalKey] ?? 0);
    if (Number.isFinite(success) && Number.isFinite(total) && success > total && total > 0) {
      const label = SEASON_STAT_LIMITS[successKey]?.label ?? successKey;
      issues.push({
        key: successKey,
        label,
        message: `${label} não pode ser maior que o total`,
      });
    }
  }

  return issues;
}

export const DEFAULT_SUCCESS_PAIRS: Array<[string, string]> = [
  ["accurate_passes", "total_passes"],
  ["long_passes_accurate", "long_passes_total"],
  ["successful_dribbles", "total_dribbles"],
  ["aerial_duels_won", "aerial_duels_total"],
  ["ground_duels_won", "ground_duels_total"],
  ["duels_won", "total_duels"],
  ["successful_runs_out", "total_runs_out"],
  ["shots_on_target", "shots"],
];
