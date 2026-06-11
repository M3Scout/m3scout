/**
 * Match Stats Definitions - SINGLE SOURCE OF TRUTH
 * 
 * This file contains all statistics definitions used throughout the live match system.
 * Both player cards (ATA/CRI/DEF/DIS) and the post-game summary use these definitions.
 */

import type { Database } from "@/integrations/supabase/types";

export type MatchEventType = Database["public"]["Enums"]["match_event_type"];

// ============================================
// STAT DEFINITIONS FOR PLAYER CARDS
// ============================================

export interface StatDefinition {
  type: MatchEventType;
  label: string;
}

export interface StatCategory {
  category: string;
  categoryKey: string;
  color: string;
  bgColor: string;
  stats: StatDefinition[];
}

export const OUTFIELD_STATS: StatCategory[] = [
  // ATAQUE - Finalizações, gols e impedimento
  {
    category: "ATAQUE",
    categoryKey: "attack",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    stats: [
      { type: "goal", label: "Gols" },
      { type: "shot_on_target", label: "Finalizações no Gol" },
      { type: "shot", label: "Finalizações Fora" },
      { type: "shot_blocked", label: "Finalização Bloqueada" },
      { type: "offside", label: "Impedimento" },
      { type: "penalty_won", label: "Pênalti Sofrido" },
    ],
  },
  // PASSES - Passes, assistências, criação e cruzamentos
  {
    category: "PASSES",
    categoryKey: "passing",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { type: "assist", label: "Assistências" },
      { type: "key_pass", label: "Passes Decisivos" },
      { type: "chance_created", label: "Chances Criadas" },
      { type: "pass_success", label: "Passes Certos" },
      { type: "pass_total", label: "Passes Errados" },
      { type: "cross_success", label: "Cruzamentos Certos" },
      { type: "cross_failed", label: "Cruzamentos Errados" },
    ],
  },
  // DRIBLES / POSSE - Controle de bola e manutenção
  // NOTE: ball_action is a DERIVED stat (auto-calculated from sum of eligible events)
  // It should NOT be in this list as it has no direct event recording
  {
    category: "DRIBLES",
    categoryKey: "dribbles",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      // ball_action is NOT here - it's derived/display-only
      { type: "dribble_success", label: "Dribles Certos" },
      { type: "dribble_attempt", label: "Dribles Errados" },
      { type: "foul_suffered", label: "Faltas Sofridas" },
      { type: "possession_lost", label: "Perdas de Posse" },
    ],
  },
  // DEFESA - Ações defensivas e duelos (inclui disciplina)
  {
    category: "DEFESA",
    categoryKey: "defense",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interceptações" },
      { type: "clearance", label: "Cortes" },
      { type: "recovery", label: "Recuperações" },
      { type: "blocked_shot", label: "Chute Bloqueado" },
      { type: "was_dribbled", label: "Driblado" },
      { type: "ground_duel_won", label: "Duelo Chão ✓" },
      { type: "ground_duel_total", label: "Duelo Chão ✗" },
      { type: "aerial_duel_won", label: "Duelo Aéreo ✓" },
      { type: "aerial_duel_total", label: "Duelo Aéreo ✗" },
      { type: "foul_committed", label: "Faltas Cometidas" },
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
    ],
  },
];

export const GOALKEEPER_STATS: StatCategory[] = [
  {
    category: "GK",
    categoryKey: "goalkeeper",
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    stats: [
      { type: "save", label: "Defesas" },
      { type: "goal_conceded", label: "Gols Sofridos" },
      { type: "penalty_saved", label: "Pênaltis Defendidos" },
      { type: "error_led_to_goal", label: "Erros para Gol" },
    ],
  },
  {
    category: "GK+",
    categoryKey: "goalkeeper_advanced",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { type: "box_save", label: "Defesas na Área" },
      { type: "punch", label: "Socos" },
      { type: "high_claim", label: "Bolas Altas" },
      { type: "sweeper_action", label: "Saídas do Gol" },
    ],
  },
  {
    category: "DIS",
    categoryKey: "discipline",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    stats: [
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
      { type: "foul_committed", label: "Faltas Cometidas" },
    ],
  },
];

// ============================================
// SUMMARY CONFIG - COMPLETE EVENT TYPE MAPPING
// ============================================

export interface SummaryEventConfig {
  label: string;
  icon: string;
  category: string;
  order: number;
}

// Complete mapping of all event types to their display labels for summary
// ORDER determines display sequence: attack (1-9), passing (10-19), dribbles (20-29), defense (30-49), goalkeeper (50-59)
export const EVENT_TYPE_CONFIG: Record<MatchEventType, SummaryEventConfig> = {
  // ATAQUE - Finalizações, gols e impedimento
  goal: { label: "Gols", icon: "⚽", category: "attack", order: 1 },
  shot_on_target: { label: "Finalizações no Gol", icon: "🥅", category: "attack", order: 2 },
  shot: { label: "Finalizações Fora", icon: "🎯", category: "attack", order: 3 },
  shot_blocked: { label: "Finalização Bloqueada", icon: "🚫", category: "attack", order: 4 },
  offside: { label: "Impedimento", icon: "🚩", category: "attack", order: 5 },
  penalty_won: { label: "Pênaltis Sofridos", icon: "🅿️", category: "attack", order: 6 },
  
  // PASSES - Assistências, criação e cruzamentos
  assist: { label: "Assistências", icon: "👟", category: "passing", order: 10 },
  key_pass: { label: "Passes Decisivos", icon: "🎯", category: "passing", order: 11 },
  chance_created: { label: "Chances Criadas", icon: "💡", category: "passing", order: 12 },
  pass_success: { label: "Passes Certos", icon: "📤", category: "passing", order: 13 },
  pass_total: { label: "Passes Errados", icon: "❌", category: "passing", order: 14 },
  cross_success: { label: "Cruzamentos Certos", icon: "🎯", category: "passing", order: 15 },
  cross_failed: { label: "Cruzamentos Errados", icon: "❌", category: "passing", order: 16 },
  
  // DRIBLES / POSSE
  // NOTE: ball_action is a DERIVED stat - it exists in the enum but should not be recorded directly
  // It's calculated as the sum of eligible events (passes, dribbles, shots, etc.)
  // Kept here for backwards compatibility with old data, but UI should show as display-only
  ball_action: { label: "Ações com a Bola", icon: "⚽", category: "dribbles", order: 19 },
  dribble_success: { label: "Dribles Certos", icon: "✓", category: "dribbles", order: 20 },
  dribble_attempt: { label: "Dribles Errados", icon: "✗", category: "dribbles", order: 21 },
  foul_suffered: { label: "Faltas Sofridas", icon: "🤕", category: "dribbles", order: 22 },
  possession_lost: { label: "Perdas de Posse", icon: "💨", category: "dribbles", order: 23 },
  
  // DEFESA (inclui duelos e disciplina)
  tackle: { label: "Desarmes", icon: "🦶", category: "defense", order: 30 },
  interception: { label: "Interceptações", icon: "🛡️", category: "defense", order: 31 },
  clearance: { label: "Cortes", icon: "🧹", category: "defense", order: 32 },
  recovery: { label: "Recuperações", icon: "↩️", category: "defense", order: 33 },
  steal: { label: "Roubadas de Bola", icon: "🪝", category: "defense", order: 33.5 },
  blocked_shot: { label: "Chute Bloqueado", icon: "🖐️", category: "defense", order: 34 },
  was_dribbled: { label: "Driblado", icon: "💨", category: "defense", order: 35 },
  ground_duel_won: { label: "Duelos no Chão Ganhos", icon: "🤼", category: "defense", order: 36 },
  ground_duel_total: { label: "Duelos no Chão Perdidos", icon: "🤼", category: "defense", order: 37 },
  aerial_duel_won: { label: "Duelos Aéreos Ganhos", icon: "🦅", category: "defense", order: 38 },
  aerial_duel_total: { label: "Duelos Aéreos Perdidos", icon: "🦅", category: "defense", order: 39 },
  duel_won: { label: "Duelos Ganhos", icon: "💪", category: "defense", order: 40 },
  duel_total: { label: "Duelos Perdidos", icon: "⚔️", category: "defense", order: 41 },
  foul_committed: { label: "Faltas Cometidas", icon: "⚠️", category: "defense", order: 42 },
  yellow: { label: "Cartões Amarelos", icon: "🟨", category: "defense", order: 43 },
  red: { label: "Cartões Vermelhos", icon: "🟥", category: "defense", order: 44 },
  
  // Goalkeeper
  save: { label: "Defesas", icon: "🧤", category: "goalkeeper", order: 50 },
  goal_conceded: { label: "Gols Sofridos", icon: "😢", category: "goalkeeper", order: 51 },
  clean_sheet: { label: "Clean Sheet", icon: "🛡️", category: "goalkeeper", order: 52 },
  penalty_saved: { label: "Pênaltis Defendidos", icon: "🦸", category: "goalkeeper", order: 53 },
  error_led_to_goal: { label: "Erros para Gol", icon: "💥", category: "goalkeeper", order: 54 },
  box_save: { label: "Defesas na Área", icon: "📦", category: "goalkeeper", order: 55 },
  punch: { label: "Socos", icon: "👊", category: "goalkeeper", order: 56 },
  high_claim: { label: "Bolas Altas", icon: "🙌", category: "goalkeeper", order: 57 },
  sweeper_action: { label: "Saídas do Gol", icon: "🏃", category: "goalkeeper", order: 58 },
  long_pass_success: { label: "Lançamentos Certos", icon: "🎯", category: "goalkeeper", order: 59 },
  long_pass_total: { label: "Lançamentos Errados", icon: "📐", category: "goalkeeper", order: 60 },
  
  // Meta events (substitutions - usually not shown directly)
  substitution: { label: "Substituição", icon: "🔄", category: "meta", order: 90 },
  player_on: { label: "Entrou", icon: "➡️", category: "meta", order: 91 },
  player_off: { label: "Saiu", icon: "⬅️", category: "meta", order: 92 },
  progressive_pass: { label: "Passe Progressivo", icon: "➡️", category: "passing", order: 17 },
  shot_on_post: { label: "Finalização na Trave", icon: "🥅", category: "attack", order: 6 },
};

// Category colors for visual grouping in summary
export const CATEGORY_COLORS: Record<string, string> = {
  attack: "text-red-400",
  passing: "text-amber-400",
  dribbles: "text-cyan-400",
  defense: "text-blue-400",
  goalkeeper: "text-green-400",
  meta: "text-muted-foreground",
};

// Category labels for display
export const CATEGORY_LABELS: Record<string, string> = {
  attack: "Ataque",
  passing: "Passes",
  dribbles: "Dribles / Posse",
  defense: "Defesa",
  goalkeeper: "Goleiro",
  meta: "Meta",
};

// ============================================
// COMPUTED/AGGREGATE STATS FOR SUMMARY
// ============================================

// Type for event counts (partial because not all events may have occurred)
export type EventCountsMap = Partial<Record<MatchEventType, { first: number; second: number }>>;

export interface ComputedStatDefinition {
  id: string;
  label: string;
  icon: string;
  category: string;
  order: number;
  compute: (counts: EventCountsMap) => { first: number; second: number };
}

// Computed stats that are derived from multiple event types
export const COMPUTED_STATS: ComputedStatDefinition[] = [
  {
    id: "shots_total",
    label: "Finalizações (Total)",
    icon: "🎯",
    category: "attack",
    order: 2.5, // Between assists and shots_on_target
    compute: (counts) => ({
      // Total shots = shot_on_target (direct) + shot (off-target) + goal (always on target)
      first: (counts.shot?.first || 0) + (counts.shot_on_target?.first || 0) + (counts.goal?.first || 0),
      second: (counts.shot?.second || 0) + (counts.shot_on_target?.second || 0) + (counts.goal?.second || 0),
    }),
  },
  {
    id: "shots_on_target_computed",
    label: "Finalizações no Gol",
    icon: "🥅",
    category: "attack",
    order: 3.5, // After shots_total, before shot (off-target)
    compute: (counts) => ({
      // Shots on target = shot_on_target (direct) + goal (always on target)
      first: (counts.shot_on_target?.first || 0) + (counts.goal?.first || 0),
      second: (counts.shot_on_target?.second || 0) + (counts.goal?.second || 0),
    }),
  },
  {
    id: "dribbles_total_computed",
    label: "Dribles Tentados",
    icon: "👟",
    category: "dribbles",
    order: 23.5, // After possession_lost in dribbles category
    compute: (counts) => ({
      // Total dribbles = dribble_success + dribble_attempt (failed)
      first: (counts.dribble_success?.first || 0) + (counts.dribble_attempt?.first || 0),
      second: (counts.dribble_success?.second || 0) + (counts.dribble_attempt?.second || 0),
    }),
  },
  {
    id: "ball_actions_derived",
    label: "Ações com a Bola",
    icon: "⚽",
    category: "dribbles",
    order: 99, // Always at the end of the list
    compute: (counts) => {
      /**
       * DERIVED BALL ACTIONS - Sum of all events representing controlled ball possession
       * 
       * Eligible events (same as derivedBallActions.ts):
       * ATTACK: goal, shot_on_target, shot (off-target), shot_blocked (offensive), assist, key_pass, chance_created
       * PASSING: pass_success, pass_total (failed), cross_success, cross_failed
       * DRIBBLES: dribble_success, dribble_attempt (failed), possession_lost
       * DEFENSE WITH POSSESSION: recovery
       * 
       * NOT counted: interception, clearance, blocked_shot (defensive), duels, fouls, was_dribbled, offside, cards, etc.
       */
      const first = 
        // Attack/Creation
        (counts.goal?.first || 0) +
        (counts.shot_on_target?.first || 0) +
        (counts.shot?.first || 0) +
        (counts.shot_blocked?.first || 0) +
        (counts.assist?.first || 0) +
        (counts.key_pass?.first || 0) +
        (counts.chance_created?.first || 0) +
        // Passing
        (counts.pass_success?.first || 0) +
        (counts.pass_total?.first || 0) +
        (counts.cross_success?.first || 0) +
        (counts.cross_failed?.first || 0) +
        // Dribbles
        (counts.dribble_success?.first || 0) +
        (counts.dribble_attempt?.first || 0) +
        (counts.possession_lost?.first || 0) +
        // Defense with possession
        (counts.recovery?.first || 0);
      
      const second = 
        // Attack/Creation
        (counts.goal?.second || 0) +
        (counts.shot_on_target?.second || 0) +
        (counts.shot?.second || 0) +
        (counts.shot_blocked?.second || 0) +
        (counts.assist?.second || 0) +
        (counts.key_pass?.second || 0) +
        (counts.chance_created?.second || 0) +
        // Passing
        (counts.pass_success?.second || 0) +
        (counts.pass_total?.second || 0) +
        (counts.cross_success?.second || 0) +
        (counts.cross_failed?.second || 0) +
        // Dribbles
        (counts.dribble_success?.second || 0) +
        (counts.dribble_attempt?.second || 0) +
        (counts.possession_lost?.second || 0) +
        // Defense with possession
        (counts.recovery?.second || 0);
      
      return { first, second };
    },
  },
];

// Helper to get all event types that should be shown in the summary
// Exclude types that are now computed (to avoid duplicates)
export const SUMMARY_EVENT_TYPES = (Object.keys(EVENT_TYPE_CONFIG) as MatchEventType[])
  .filter((type) => ![
    "player_on", "player_off", "substitution", // Meta events
    "shot_on_target", // Now computed as shots_on_target_computed (includes goals)
    "dribble_attempt", // Now computed as dribbles_total_computed (dribble_attempt is for "failed" dribbles)
  ].includes(type));

// All event types for initialization (including meta events)
export const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as MatchEventType[];
