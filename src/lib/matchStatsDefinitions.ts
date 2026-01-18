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
  {
    category: "ATA",
    categoryKey: "attack",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    stats: [
      { type: "goal", label: "Gols" },
      { type: "assist", label: "Assistências" },
      // Note: shots_total is computed (shot + shot_on_target) in summary
      { type: "shot_on_target", label: "Finalizações no Gol" },
      { type: "shot", label: "Finalizações Fora" },
    ],
  },
  {
    category: "CRI",
    categoryKey: "creativity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { type: "key_pass", label: "Passes Decisivos" },
      { type: "chance_created", label: "Chances Criadas" },
      { type: "dribble_success", label: "Dribles Certos" },
      { type: "dribble_attempt", label: "Dribles Errados" },
    ],
  },
  {
    category: "DEF",
    categoryKey: "defense",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interceptações" },
      { type: "recovery", label: "Recuperações" },
      { type: "clearance", label: "Cortes" },
      { type: "duel_won", label: "Duelos Ganhos" },
      { type: "aerial_duel_won", label: "Duelos Aéreos" },
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
      { type: "foul_suffered", label: "Faltas Sofridas" },
      { type: "pass_success", label: "Passes Certos" },
      { type: "pass_total", label: "Passes Errados" },
      { type: "possession_lost", label: "Perdas de Posse" },
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
// ORDER determines display sequence: attack (1-9), creativity (10-19), passing (20-29), defense (30-39), discipline (40-49), goalkeeper (50-59)
export const EVENT_TYPE_CONFIG: Record<MatchEventType, SummaryEventConfig> = {
  // Attack - shots_total computed stat has order 2.5 (between assists and shot_on_target)
  goal: { label: "Gols", icon: "⚽", category: "attack", order: 1 },
  assist: { label: "Assistências", icon: "👟", category: "attack", order: 2 },
  shot_on_target: { label: "Finalizações no Gol", icon: "🥅", category: "attack", order: 4 },
  shot: { label: "Finalizações Fora", icon: "🎯", category: "attack", order: 5 },
  
  // Creativity
  key_pass: { label: "Passes Decisivos", icon: "🎯", category: "creativity", order: 10 },
  chance_created: { label: "Chances Criadas", icon: "💡", category: "creativity", order: 11 },
  dribble_success: { label: "Dribles Certos", icon: "✓", category: "creativity", order: 12 },
  dribble_attempt: { label: "Dribles Errados", icon: "✗", category: "creativity", order: 13 },
  
  // Passing
  pass_success: { label: "Passes Certos", icon: "📤", category: "passing", order: 20 },
  pass_total: { label: "Passes Errados", icon: "❌", category: "passing", order: 21 },
  possession_lost: { label: "Perdas de Posse", icon: "💨", category: "passing", order: 22 },
  
  // Defense
  tackle: { label: "Desarmes", icon: "🦶", category: "defense", order: 30 },
  interception: { label: "Interceptações", icon: "🛡️", category: "defense", order: 31 },
  recovery: { label: "Recuperações", icon: "↩️", category: "defense", order: 32 },
  clearance: { label: "Cortes", icon: "🧹", category: "defense", order: 33 },
  duel_won: { label: "Duelos Ganhos", icon: "💪", category: "defense", order: 34 },
  duel_total: { label: "Duelos Perdidos", icon: "⚔️", category: "defense", order: 35 },
  aerial_duel_won: { label: "Duelos Aéreos Ganhos", icon: "🦅", category: "defense", order: 36 },
  aerial_duel_total: { label: "Duelos Aéreos Perdidos", icon: "🦅", category: "defense", order: 37 },
  
  // Discipline
  yellow: { label: "Cartões Amarelos", icon: "🟨", category: "discipline", order: 40 },
  red: { label: "Cartões Vermelhos", icon: "🟥", category: "discipline", order: 41 },
  foul_committed: { label: "Faltas Cometidas", icon: "⚠️", category: "discipline", order: 42 },
  foul_suffered: { label: "Faltas Sofridas", icon: "🤕", category: "discipline", order: 43 },
  
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
  
  // Meta events (substitutions - usually not shown directly)
  substitution: { label: "Substituição", icon: "🔄", category: "meta", order: 90 },
  player_on: { label: "Entrou", icon: "➡️", category: "meta", order: 91 },
  player_off: { label: "Saiu", icon: "⬅️", category: "meta", order: 92 },
};

// Category colors for visual grouping in summary
export const CATEGORY_COLORS: Record<string, string> = {
  attack: "text-red-400",
  creativity: "text-amber-400",
  passing: "text-cyan-400",
  defense: "text-blue-400",
  discipline: "text-purple-400",
  goalkeeper: "text-green-400",
  meta: "text-muted-foreground",
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
    category: "creativity",
    order: 13.5, // After dribble_attempt
    compute: (counts) => ({
      // Total dribbles = dribble_success + dribble_attempt (failed)
      first: (counts.dribble_success?.first || 0) + (counts.dribble_attempt?.first || 0),
      second: (counts.dribble_success?.second || 0) + (counts.dribble_attempt?.second || 0),
    }),
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
