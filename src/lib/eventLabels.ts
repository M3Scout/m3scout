/**
 * Event Labels - Portuguese translations for match event types
 * 
 * SINGLE SOURCE OF TRUTH for all event labels used in:
 * - Live Match UI (chips, toasts)
 * - Match Review page
 * - PDF exports
 * 
 * @author M3 Scouting Technical Team
 */

import type { MatchEventType } from "@/hooks/useLiveMatch";

/**
 * Human-readable Portuguese labels for all event types
 * 
 * IMPORTANT: These labels are used directly in the UI.
 * The "_total" suffix events (pass_total, dribble_attempt, etc.) represent FAILED actions
 * in our database schema, so their labels reflect that ("Passes Errados", not "Passes Totais").
 */
export const EVENT_LABELS_PTBR: Record<string, string> = {
  // Attack
  goal: "Gols",
  assist: "Assistências",
  shot: "Finalizações Fora",
  shot_on_target: "Finalizações no Gol",
  shot_blocked: "Finalização Bloqueada",
  offside: "Impedimento",
  
  // Passing
  key_pass: "Passes Decisivos",
  chance_created: "Chances Criadas",
  pass_success: "Passes Certos",
  pass_total: "Passes Errados", // CRITICAL: In DB schema, pass_total stores FAILED passes
  cross_success: "Cruzamentos Certos",
  cross_failed: "Cruzamentos Errados",
  
  // Dribbles / Possession
  dribble_success: "Dribles Certos",
  dribble_attempt: "Dribles Errados", // CRITICAL: In DB schema, this represents failed dribbles
  ball_action: "Ações com a Bola",
  foul_suffered: "Faltas Sofridas",
  possession_lost: "Perdas de Posse",
  
  // Defense
  tackle: "Desarmes",
  interception: "Interceptações",
  recovery: "Recuperações",
  clearance: "Cortes",
  blocked_shot: "Chute Bloqueado",
  was_dribbled: "Driblado",
  
  // Duels
  duel_won: "Duelos Ganhos",
  duel_total: "Duelos Perdidos", // CRITICAL: Represents lost duels in our schema
  ground_duel_won: "Duelo Chão ✓",
  ground_duel_total: "Duelo Chão ✗",
  aerial_duel_won: "Duelo Aéreo ✓",
  aerial_duel_total: "Duelo Aéreo ✗",
  
  // Discipline
  yellow: "Cartão Amarelo",
  red: "Cartão Vermelho",
  foul_committed: "Faltas Cometidas",
  
  // Goalkeeper
  save: "Defesas",
  goal_conceded: "Gols Sofridos",
  clean_sheet: "Jogo sem Gols",
  penalty_saved: "Pênaltis Defendidos",
  error_led_to_goal: "Erros para Gol",
  box_save: "Defesas na Área",
  punch: "Socos",
  high_claim: "Bolas Altas",
  sweeper_action: "Saídas do Gol",
  long_pass_success: "Lançamentos Certos",
  long_pass_total: "Lançamentos Errados",
  
  // Player presence (usually not displayed as chips)
  player_on: "Entrou",
  player_off: "Saiu",
  substitution: "Substituição",
};

/**
 * Get the human-readable label for an event type
 * @param eventType - The event type from the database
 * @returns Portuguese label or the original type if not found
 */
export function getEventLabel(eventType: string): string {
  return EVENT_LABELS_PTBR[eventType] || eventType;
}

/**
 * Get short label for compact display (e.g., chips, badges)
 * Some labels are shortened for space constraints
 */
export const EVENT_LABELS_SHORT: Record<string, string> = {
  ...EVENT_LABELS_PTBR,
  shot_on_target: "No Gol",
  shot_blocked: "Final. Bloq.",
  key_pass: "P. Decisivos",
  chance_created: "Chances",
  pass_success: "Passes ✓",
  pass_total: "Passes ✗",
  cross_success: "Cruz. ✓",
  cross_failed: "Cruz. ✗",
  dribble_success: "Dribles ✓",
  dribble_attempt: "Dribles ✗",
  foul_suffered: "Faltas Sof.",
  possession_lost: "Perdas",
  interception: "Interc.",
  recovery: "Recup.",
  blocked_shot: "Bloqueou",
  goal_conceded: "Gols Sof.",
  penalty_saved: "Pên. Def.",
  error_led_to_goal: "Erro→Gol",
  sweeper_action: "Saída Gol",
  long_pass_success: "Lanç. ✓",
  long_pass_total: "Lanç. ✗",
};

/**
 * Get short label for an event type
 */
export function getEventLabelShort(eventType: string): string {
  return EVENT_LABELS_SHORT[eventType] || getEventLabel(eventType);
}
