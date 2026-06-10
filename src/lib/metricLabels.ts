/**
 * Central dictionary for metric translations to PT-BR
 * Used across the application to display human-readable metric names
 * 
 * @example
 * import { getMetricLabel, METRIC_LABELS_PT } from "@/lib/metricLabels";
 * 
 * // Using the function (recommended - handles fallback)
 * getMetricLabel("goals_per_90") // → "Gols/90"
 * getMetricLabel("unknown_metric") // → "Unknown Metric" (fallback)
 * 
 * // Direct access (no fallback)
 * METRIC_LABELS_PT["goals_per_90"] // → "Gols/90"
 */

export const METRIC_LABELS_PT: Record<string, string> = {
  // === REGULARIDADE / TEMPO DE JOGO ===
  minutes_games: "Minutos/Jogos",
  matches: "Jogos",
  minutes: "Minutos",
  minutes_played: "Minutos Jogados",
  games_played: "Jogos Disputados",
  
  // === PARTICIPAÇÃO EM GOL ===
  goal_contributions: "Participações em Gol",
  goals: "Gols",
  goals_per_90: "Gols/90",
  assists: "Assistências",
  assists_per_90: "Assistências/90",
  ga_per_90: "G+A/90",
  g_a: "G+A",
  goals_assists: "Gols + Assistências",
  expected_goals: "xG",
  expected_assists: "xA",
  xg: "xG",
  xa: "xA",
  xg_per_90: "xG/90",
  xa_per_90: "xA/90",
  
  // === FINALIZAÇÕES ===
  shots: "Finalizações",
  shots_90: "Finalizações/90",
  shots_per_90: "Finalizações/90",
  shots_on_target: "Finalizações no Alvo",
  shots_on_target_90: "Finalizações no Alvo/90",
  shots_on_target_per_90: "Finalizações no Alvo/90",
  shots_blocked: "Chutes Bloqueados",
  shots_off_target: "Finalizações para Fora",
  shot_accuracy: "Precisão de Chute",
  shooting_accuracy: "Precisão de Chute",
  conversion_rate: "Taxa de Conversão",
  
  // === CRIATIVIDADE / PASSES DECISIVOS ===
  chances_created: "Chances Criadas",
  chances_created_90: "Chances Criadas/90",
  chances_created_per_90: "Chances Criadas/90",
  key_passes: "Passes Decisivos",
  key_passes_90: "Passes Decisivos/90",
  key_passes_per_90: "Passes Decisivos/90",
  key_pass_accuracy: "Precisão Passes Decisivos",
  offensive_involvement: "Envolvimento Ofensivo",
  through_balls: "Bolas em Profundidade",
  through_balls_accuracy: "Precisão Bolas em Profundidade",
  big_chances_created: "Grandes Chances Criadas",
  
  // === PASSES ===
  accurate_passes: "Passes Certos",
  accurate_passes_90: "Passes Certos/90",
  accurate_passes_per_90: "Passes Certos/90",
  total_passes: "Total de Passes",
  passes_total: "Total de Passes",
  pass_accuracy: "Precisão de Passes",
  pass_completion: "Conclusão de Passes",
  long_passes_accurate: "Lançamentos Certos",
  long_passes_total: "Total de Lançamentos",
  long_ball_accuracy: "Precisão de Lançamentos",
  crosses_success: "Cruzamentos Certos",
  crosses_total: "Total de Cruzamentos",
  crosses_accuracy: "Precisão de Cruzamentos",
  crosses_failed: "Cruzamentos Errados",
  
  // === DEFESA ===
  tackles: "Desarmes",
  tackles_90: "Desarmes/90",
  tackles_per_90: "Desarmes/90",
  tackles_won: "Desarmes Vencidos",
  interceptions: "Interceptações",
  interceptions_90: "Interceptações/90",
  interceptions_per_90: "Interceptações/90",
  recoveries: "Recuperações",
  recoveries_90: "Recuperações/90",
  recoveries_per_90: "Recuperações/90",
  reco: "Recuperações/90", // Alias usado em algumas saídas do DB
  clearances: "Afastamentos",
  clearances_90: "Afastamentos/90",
  blocked_shots: "Chutes Bloqueados",
  blocks: "Bloqueios",
  
  // === DUELOS ===
  duels_won: "Duelos Vencidos",
  duels_won_pct: "Duelos Vencidos (%)",
  duels_success_rate: "Taxa de Sucesso em Duelos",
  total_duels: "Total de Duelos",
  duels_total: "Total de Duelos",
  ground_duels_won: "Duelos no Chão Vencidos",
  ground_duels_total: "Total de Duelos no Chão",
  ground_duels_success: "Taxa Duelos no Chão",
  aerial_duels: "Duelos Aéreos",
  aerial_duels_90: "Duelos Aéreos/90",
  aerial_duels_per_90: "Duelos Aéreos/90",
  aerial_duels_won: "Duelos Aéreos Vencidos",
  aerial_duels_total: "Total de Duelos Aéreos",
  aerial_success_rate: "Taxa Duelos Aéreos",
  
  // === DRIBLES ===
  successful_dribbles: "Dribles Bem-sucedidos",
  dribbles_success: "Dribles Bem-sucedidos",
  total_dribbles: "Total de Dribles",
  dribbles_total: "Total de Dribles",
  dribbles_per_90: "Dribles/90",
  dribble_success_rate: "Taxa de Dribles",
  times_dribbled_past: "Vezes Driblado",
  was_dribbled: "Vezes Driblado",
  
  // === DISCIPLINA ===
  discipline: "Disciplina",
  cards: "Cartões",
  yellow_cards: "Cartões Amarelos",
  red_cards: "Cartões Vermelhos",
  fouls_committed: "Faltas Cometidas",
  fouls_drawn: "Faltas Sofridas",
  fouls_suffered: "Faltas Sofridas",
  cards_90: "Cartões/90",
  cards_per_90: "Cartões/90",
  
  // === POSSE ===
  possession_lost: "Posses Perdidas",
  ball_lost: "Bola Perdida",
  offsides: "Impedimentos",
  ball_actions: "Ações com Bola",
  touches: "Toques na Bola",
  touches_in_box: "Toques na Área",
  
  // === GOLEIRO ===
  gk_saves: "Defesas",
  gk_goals_conceded: "Gols Sofridos",
  gk_penalties_saved: "Pênaltis Defendidos",
  gk_errors_led_to_goal: "Erros que Resultam em Gol",
  saves: "Defesas",
  saves_90: "Defesas/90",
  saves_per_90: "Defesas/90",
  saves_inside_box: "Defesas na Área",
  goals_conceded: "Gols Sofridos",
  goals_conceded_90: "Gols Sofridos/90",
  goals_conceded_per_90: "Gols Sofridos/90",
  goals_conceded_inv: "Gols Sofridos (inv)",
  clean_sheets: "Clean Sheets",
  penalties_saved: "Pênaltis Defendidos",
  penalties_faced: "Pênaltis Enfrentados",
  penalty_faced: "Pênaltis Enfrentados",
  errors: "Erros Graves",
  errors_inv: "Erros (inv)",
  errors_leading_to_goal: "Erros que Resultam em Gol",
  errors_leading_to_shot: "Erros que Resultam em Finalização",
  punches: "Socos",
  high_claims: "Cruzamentos Dominados",
  claims: "Bolas Dominadas",
  successful_runs_out: "Saídas do Gol",
  total_runs_out: "Total de Saídas do Gol",
  save_percentage: "Percentual de Defesas",
  crosses_faced: "Cruzamentos Enfrentados",
  crosses_stopped: "Cruzamentos Parados",
  shots_on_target_against: "Finalizações no Alvo Contra",
  
  // === RATING ===
  rating: "Nota",

  auto_rating: "Nota Automática",
  average_rating: "Nota Média",
  form_rating: "Nota de Forma",
  
  // === PER-90 GENÉRICOS ===
  per_90: "/90",
  per_game: "/jogo",
  
  // === OUTROS ===
  penalty_scored: "Pênaltis Convertidos",
  penalty_missed: "Pênaltis Perdidos",
  own_goals: "Gols Contra",
  headed_goals: "Gols de Cabeça",
  left_foot_goals: "Gols com Pé Esquerdo",
  right_foot_goals: "Gols com Pé Direito",
  winning_goal: "Gols da Vitória",
  equalizing_goal: "Gols de Empate",
};

/**
 * Get the human-readable label for a metric key
 * Falls back to title-cased version of the key if not found
 * 
 * @param metricKey - The raw metric key (e.g., "goals_per_90", "key_passes")
 * @returns The translated label or a formatted fallback
 */
export function getMetricLabel(metricKey: string): string {
  if (!metricKey || typeof metricKey !== "string") {
    return "Desconhecido";
  }
  
  // Normalize the key
  const normalizedKey = metricKey.trim().toLowerCase();
  
  // Check exact match first
  if (METRIC_LABELS_PT[normalizedKey]) {
    return METRIC_LABELS_PT[normalizedKey];
  }
  
  // Check original case
  if (METRIC_LABELS_PT[metricKey]) {
    return METRIC_LABELS_PT[metricKey];
  }
  
  // Fallback: Convert snake_case to Title Case
  const titleCase = metricKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
  
  if (import.meta.env.DEV) {
    console.warn(`[getMetricLabel] Missing translation for: "${metricKey}" → using fallback: "${titleCase}"`);
  }
  
  return titleCase;
}

/**
 * Check if a metric has a defined translation
 * 
 * @param metricKey - The raw metric key
 * @returns True if the metric has a translation defined
 */
export function hasMetricTranslation(metricKey: string): boolean {
  if (!metricKey || typeof metricKey !== "string") {
    return false;
  }
  const normalizedKey = metricKey.trim().toLowerCase();
  return normalizedKey in METRIC_LABELS_PT || metricKey in METRIC_LABELS_PT;
}

/**
 * Get multiple metric labels at once
 * 
 * @param metricKeys - Array of metric keys
 * @returns Object mapping keys to their labels
 */
export function getMetricLabels(metricKeys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of metricKeys) {
    result[key] = getMetricLabel(key);
  }
  return result;
}
