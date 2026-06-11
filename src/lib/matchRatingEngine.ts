/**
 * Match Rating Engine v3.0 - Professional Scouting Model (SofaScore Standard)
 *
 * BASE: 6.5 (todos os jogadores)
 *
 * LÓGICA DE MINUTOS (binária):
 * - < 15 min E sem ação de alto impacto → sem nota (null)
 * - ≥ 15 min OU ação de alto impacto → cálculo completo sem multiplicadores
 *
 * RESULTADO FINAL: Math.max(3.0, Math.min(10.0, 6.5 + soma)) com 1 decimal
 *
 * Sem cap ofensivo de +1.0.
 * Sem teto de 6.9 para jogadores sem gols/assistências.
 */

import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import type { MatchPlayerMinutesInput } from "./minutesPlayed";
import { calculateMinutesPlayed } from "./minutesPlayed";

// ─── Backward-compat exports (used by ratingBreakdownGenerator) ───────────────
export interface GoalWeightContext {
  minutesPlayed: number;
  actionsWithBall: number;
  totalPassesAttempted: number;
}
/** @deprecated Peso de gol agora é fixo em 1.20 (v3.0). Mantido para compatibilidade. */
export function computeGoalWeight(_ctx: GoalWeightContext): number {
  return 1.20;
}

// ─── Weights v3.0 ─────────────────────────────────────────────────────────────
export const WEIGHTS = {
  // AÇÕES DE ALTO IMPACTO (MACRO)
  goal:              { weight:  1.20, label: "Gol",                   category: "attack"     as const },
  assist:            { weight:  0.80, label: "Assistência",            category: "creation"   as const },
  penalty_won:       { weight:  0.50, label: "Pênalti Sofrido",        category: "attack"     as const },
  chance_created:    { weight:  0.50, label: "Chance Criada",          category: "creation"   as const },
  shot_on_post:      { weight:  0.20, label: "Finalização na Trave",   category: "attack"     as const },

  // AÇÕES DE CRIAÇÃO E FINALIZAÇÃO (MICRO)
  key_pass:          { weight:  0.15, label: "Passe Decisivo",         category: "creation"   as const },
  shot_on_target:    { weight:  0.10, label: "Finalização no Alvo",    category: "attack"     as const },
  dribble_success:   { weight:  0.10, label: "Drible Certo",           category: "creation"   as const },
  foul_suffered:     { weight:  0.05, label: "Falta Sofrida",          category: "creation"   as const },
  progressive_pass:  { weight:  0.05, label: "Passe Progressivo",      category: "passing"    as const },
  long_pass_success: { weight:  0.04, label: "Passe Longo Certo",      category: "passing"    as const },
  pass_completed:    { weight:  0.02, label: "Passe Certo",            category: "passing"    as const },
  cross_success:     { weight:  0.02, label: "Cruzamento Certo",       category: "creation"   as const },

  // AÇÕES DEFENSIVAS
  tackle:            { weight:  0.08, label: "Desarme",                category: "defense"    as const },
  interception:      { weight:  0.08, label: "Interceptação",          category: "defense"    as const },
  clearance:         { weight:  0.08, label: "Corte",                  category: "defense"    as const },
  shot_blocked:      { weight:  0.08, label: "Chute Bloqueado",        category: "defense"    as const },
  steal:             { weight:  0.08, label: "Roubada de Bola",        category: "defense"    as const },
  ground_duel_won:   { weight:  0.05, label: "Duelo no Chão Ganho",    category: "defense"    as const },
  aerial_duel_won:   { weight:  0.05, label: "Duelo Aéreo Ganho",      category: "defense"    as const },

  // AÇÕES NEGATIVAS (PUNIÇÕES)
  red_card:          { weight: -1.50, label: "Cartão Vermelho",        category: "discipline" as const },
  penalty_committed: { weight: -0.80, label: "Pênalti Cometido",       category: "discipline" as const },
  yellow_card:       { weight: -0.40, label: "Cartão Amarelo",         category: "discipline" as const },
  dribbled_past:     { weight: -0.15, label: "Dribles Sofridos",       category: "defense"    as const },
  possession_lost:   { weight: -0.05, label: "Perda de Posse",         category: "creation"   as const },
  shot_off_target:   { weight: -0.05, label: "Finalização para Fora",  category: "attack"     as const },
  dribble_failed:    { weight: -0.05, label: "Drible Errado",          category: "creation"   as const },
  ground_duel_lost:  { weight: -0.05, label: "Duelo no Chão Perdido",  category: "defense"    as const },
  aerial_duel_lost:  { weight: -0.05, label: "Duelo Aéreo Perdido",    category: "defense"    as const },
  foul_committed:    { weight: -0.05, label: "Falta Cometida",         category: "defense"    as const },
  long_pass_failed:  { weight: -0.03, label: "Passe Longo Errado",     category: "passing"    as const },
  pass_failed:       { weight: -0.02, label: "Passe Errado",           category: "passing"    as const },
  cross_failed:      { weight: -0.02, label: "Cruzamento Errado",      category: "creation"   as const },
} as const;

// ─── Goalkeeper weights (mantidos do v2, base atualizada) ─────────────────────
export const GK_WEIGHTS = {
  save:              { weight:  0.18, label: "Defesa",                    category: "goalkeeper" as const },
  save_inside_box:   { weight:  0.25, label: "Defesa dentro da área",     category: "goalkeeper" as const },
  penalty_saved:     { weight:  0.80, label: "Pênalti defendido",         category: "goalkeeper" as const },
  clean_sheet:       { weight:  0.40, label: "Gol não sofrido",           category: "goalkeeper" as const },
  high_claim:        { weight:  0.15, label: "Saída alta",                category: "goalkeeper" as const },
  punch:             { weight:  0.08, label: "Soco",                      category: "goalkeeper" as const },
  sweeper_action:    { weight:  0.12, label: "Ação de líbero",            category: "goalkeeper" as const },
  goal_conceded:     { weight: -0.35, label: "Gol sofrido",               category: "goalkeeper" as const },
  error_led_to_goal: { weight: -0.60, label: "Erro que gerou gol",        category: "goalkeeper" as const },
  pass_completed:    { weight:  0.02, label: "Passe certo",               category: "passing"    as const },
  pass_failed:       { weight: -0.02, label: "Passe errado",              category: "passing"    as const },
  yellow_card:       { weight: -0.40, label: "Cartão Amarelo",            category: "discipline" as const },
  red_card:          { weight: -1.50, label: "Cartão Vermelho",           category: "discipline" as const },
} as const;

const GK_SAVES_CAP = 1.50;
const BASE_RATING   = 6.5;
const MIN_RATING    = 3.0;
const MAX_RATING    = 10.0;
const MIN_MINUTES_THRESHOLD = 15;

// ─── Types ────────────────────────────────────────────────────────────────────
export type CategoryKey = "attack" | "creation" | "passing" | "defense" | "discipline" | "goalkeeper";

export interface BreakdownItem {
  stat: string;
  label: string;
  count: number;
  weight: number;
  rawDelta: number;
  afterMinutes: number;
  capped?: boolean;
  originalDelta?: number;
}

export interface CategoryBreakdown {
  key: CategoryKey;
  label: string;
  raw: number;
  afterMinutes: number;
  items: BreakdownItem[];
}

export interface CapApplied {
  key: string;
  label: string;
  before: number;
  after: number;
}

export interface DetailedBreakdown {
  categories: CategoryBreakdown[];
  items: BreakdownItem[];
  capsApplied: CapApplied[];
  antiInflationApplied: boolean;
  hasImpactfulAction: boolean;
  isPersistedBreakdown?: boolean;
}

export interface RatingBreakdown {
  attack: number;
  creation: number;
  passing: number;
  defense: number;
  discipline: number;
  goalkeeper: number;
}

export interface MatchRatingResult {
  hasRating: boolean;
  rating: number | null;
  baseRating: number;
  rawImpact: number;
  impactAfterMinutes: number;
  minutesFactor: number;
  minutesPlayed: number;
  breakdown: RatingBreakdown | null;
  detailedBreakdown: DetailedBreakdown | null;
  color: string;
  bgColor: string;
  label: string;
}

export interface PlayerStatsInput {
  // Attack
  goals: number;
  assists: number;
  shots_on_target: number;
  shots: number;
  shot_on_post?: number;
  penalty_won?: number;

  // Creation
  dribbles_success: number;
  dribbles_total: number;
  key_passes: number;
  chances_created: number;
  crosses_success: number;
  crosses_failed: number;
  foul_suffered?: number;
  fouls_suffered: number;
  possession_lost: number;

  // Passing
  passes_completed: number;
  passes_total: number;
  progressive_passes?: number;
  long_pass_success?: number;
  long_pass_failed?: number;

  // Defense
  interceptions: number;
  recoveries: number;
  clearances: number;
  tackles: number;
  steals?: number;
  duels_won: number;
  duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  fouls_committed: number;
  shots_blocked?: number;
  times_dribbled_past?: number;

  // Discipline
  yellow_cards: number;
  red_cards: number;
  penalty_committed?: number;

  // Goalkeeper-specific
  saves?: number;
  saves_inside_box?: number;
  penalty_saved?: number;
  goals_conceded?: number;
  clean_sheets?: number;
  high_claims?: number;
  punches?: number;
  sweeper_actions?: number;
  errors_led_to_goal?: number;

  isGoalkeeper?: boolean;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export function getRatingColor(rating: number): string {
  if (rating < 6.0) return "text-red-500";
  if (rating < 6.5) return "text-orange-500";
  if (rating < 7.0) return "text-amber-500";
  if (rating < 8.0) return "text-green-500";
  if (rating < 9.0) return "text-cyan-500";
  return "text-blue-500";
}

export function getRatingBgColor(rating: number): string {
  if (rating < 6.0) return "bg-red-500";
  if (rating < 6.5) return "bg-orange-500";
  if (rating < 7.0) return "bg-amber-500";
  if (rating < 8.0) return "bg-green-500";
  if (rating < 9.0) return "bg-cyan-500";
  return "bg-blue-500";
}

export function getRatingHexColor(rating: number): string {
  if (rating < 6.0) return "#ef4444";
  if (rating < 6.5) return "#f97316";
  if (rating < 7.0) return "#f59e0b";
  if (rating < 8.0) return "#22c55e";
  if (rating < 9.0) return "#06b6d4";
  return "#3b82f6";
}

function getRatingLabel(rating: number): string {
  if (rating >= 9.0) return "Excepcional";
  if (rating >= 8.0) return "Excelente";
  if (rating >= 7.0) return "Muito Bom";
  if (rating >= 6.5) return "Bom";
  if (rating >= 6.0) return "Regular";
  if (rating >= 5.0) return "Fraco";
  return "Muito Fraco";
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  attack:     "Ataque",
  creation:   "Criação/Dribles",
  passing:    "Passes",
  defense:    "Defesa",
  discipline: "Disciplina",
  goalkeeper: "Goleiro",
};

function noRatingBase(minutesPlayed: number): MatchRatingResult {
  return {
    hasRating: false,
    rating: null,
    baseRating: BASE_RATING,
    rawImpact: 0,
    impactAfterMinutes: 0,
    minutesFactor: 1.0,
    minutesPlayed,
    breakdown: null,
    detailedBreakdown: null,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Sem nota",
  };
}

// ─── Main calculation ─────────────────────────────────────────────────────────
export function calculateMatchRating(
  stats: PlayerStatsInput,
  minutesPlayed: number
): MatchRatingResult {
  if (minutesPlayed <= 0) return noRatingBase(0);

  const isGK = stats.isGoalkeeper ?? false;

  // ── Binary minute threshold ──
  const hasHighImpact =
    stats.goals > 0 ||
    stats.assists > 0 ||
    stats.red_cards > 0 ||
    (stats.penalty_won ?? 0) > 0 ||
    (stats.penalty_committed ?? 0) > 0;

  if (minutesPlayed < MIN_MINUTES_THRESHOLD && !hasHighImpact) {
    return noRatingBase(minutesPlayed);
  }

  const allItems: BreakdownItem[] = [];
  const capsApplied: CapApplied[] = [];

  const addItem = (
    stat: string,
    count: number,
    isGkStat = false,
  ): BreakdownItem => {
    const src = isGkStat ? GK_WEIGHTS : WEIGHTS;
    const info = src[stat as keyof typeof src];
    const weight = info?.weight ?? 0;
    const label  = info?.label  ?? stat;
    const rawDelta = r3(count * weight);
    const item: BreakdownItem = {
      stat, label, count, weight,
      rawDelta,
      afterMinutes: rawDelta, // v3: no minutes multiplier
      capped: false,
    };
    if (count !== 0) allItems.push(item);
    return item;
  };

  // ── GOALKEEPER ────────────────────────────────────────────────────────────
  if (isGK) {
    const saveItem        = addItem("save",              Math.max(0, stats.saves ?? 0), true);
    const saveBoxItem     = addItem("save_inside_box",   Math.max(0, stats.saves_inside_box ?? 0), true);
    const penSavedItem    = addItem("penalty_saved",     Math.max(0, stats.penalty_saved ?? 0), true);
    const csItem          = addItem("clean_sheet",       Math.max(0, stats.clean_sheets ?? 0), true);
    const highClaimItem   = addItem("high_claim",        Math.max(0, stats.high_claims ?? 0), true);
    const punchItem       = addItem("punch",             Math.max(0, stats.punches ?? 0), true);
    const sweeperItem     = addItem("sweeper_action",    Math.max(0, stats.sweeper_actions ?? 0), true);
    const goalConcItem    = addItem("goal_conceded",     Math.max(0, stats.goals_conceded ?? 0), true);
    const errorItem       = addItem("error_led_to_goal", Math.max(0, stats.errors_led_to_goal ?? 0), true);

    let gkPositiveRaw =
      saveItem.rawDelta + saveBoxItem.rawDelta + penSavedItem.rawDelta +
      csItem.rawDelta + highClaimItem.rawDelta + punchItem.rawDelta + sweeperItem.rawDelta;

    if (gkPositiveRaw > GK_SAVES_CAP) {
      capsApplied.push({ key: "gkSavesCap", label: "Limite de defesas", before: r2(gkPositiveRaw), after: GK_SAVES_CAP });
      gkPositiveRaw = GK_SAVES_CAP;
    }

    const gkRaw = gkPositiveRaw + goalConcItem.rawDelta + errorItem.rawDelta;

    const passCompItem = addItem("pass_completed", Math.max(0, stats.passes_completed), true);
    const passFailItem = addItem("pass_failed",    Math.max(0, stats.passes_total), true);
    const passingRaw   = passCompItem.rawDelta + passFailItem.rawDelta;

    const yellowItem    = addItem("yellow_card", Math.max(0, stats.yellow_cards), true);
    const redItem       = addItem("red_card",    Math.max(0, stats.red_cards), true);
    const disciplineRaw = yellowItem.rawDelta + redItem.rawDelta;

    const rawImpact = gkRaw + passingRaw + disciplineRaw;
    const rating    = Math.round(Math.max(MIN_RATING, Math.min(MAX_RATING, BASE_RATING + rawImpact)) * 10) / 10;

    const categories: CategoryBreakdown[] = [
      { key: "goalkeeper", label: CATEGORY_LABELS.goalkeeper, raw: r2(gkRaw),      afterMinutes: r2(gkRaw),      items: allItems.filter(i => GK_WEIGHTS[i.stat as keyof typeof GK_WEIGHTS]?.category === "goalkeeper") },
      { key: "passing",    label: CATEGORY_LABELS.passing,    raw: r2(passingRaw), afterMinutes: r2(passingRaw), items: allItems.filter(i => GK_WEIGHTS[i.stat as keyof typeof GK_WEIGHTS]?.category === "passing") },
      { key: "discipline", label: CATEGORY_LABELS.discipline, raw: r2(disciplineRaw), afterMinutes: r2(disciplineRaw), items: allItems.filter(i => GK_WEIGHTS[i.stat as keyof typeof GK_WEIGHTS]?.category === "discipline") },
    ];

    return {
      hasRating: true, rating,
      baseRating: BASE_RATING,
      rawImpact: r2(rawImpact), impactAfterMinutes: r2(rawImpact),
      minutesFactor: 1.0, minutesPlayed,
      breakdown: { attack: 0, creation: 0, passing: r2(passingRaw), defense: 0, discipline: r2(disciplineRaw), goalkeeper: r2(gkRaw) },
      detailedBreakdown: { categories, items: [...allItems].sort((a, b) => Math.abs(b.rawDelta) - Math.abs(a.rawDelta)), capsApplied, antiInflationApplied: false, hasImpactfulAction: true },
      color: getRatingColor(rating), bgColor: getRatingBgColor(rating), label: getRatingLabel(rating),
    };
  }

  // ── OUTFIELD ──────────────────────────────────────────────────────────────

  // Attack
  const goalItem        = addItem("goal",         Math.max(0, stats.goals));
  const assistItem      = addItem("assist",        Math.max(0, stats.assists));
  const penWonItem      = addItem("penalty_won",   Math.max(0, stats.penalty_won ?? 0));
  const chanceItem      = addItem("chance_created",Math.max(0, stats.chances_created));
  const shotPostItem    = addItem("shot_on_post",  Math.max(0, stats.shot_on_post ?? 0));
  const shotOnTgtItem   = addItem("shot_on_target",Math.max(0, stats.shots_on_target));
  // shots stores off-target count in DB schema
  const shotOffItem     = addItem("shot_off_target", Math.max(0, stats.shots));

  const attackRaw =
    goalItem.rawDelta + assistItem.rawDelta + penWonItem.rawDelta +
    chanceItem.rawDelta + shotPostItem.rawDelta + shotOnTgtItem.rawDelta +
    shotOffItem.rawDelta;

  // Creation
  const keyPassItem     = addItem("key_pass",        Math.max(0, stats.key_passes));
  const dribSuccessItem = addItem("dribble_success",  Math.max(0, stats.dribbles_success));
  const foulSufItem     = addItem("foul_suffered",    Math.max(0, stats.fouls_suffered));
  const crossSuccItem   = addItem("cross_success",    Math.max(0, stats.crosses_success));
  const possLostItem    = addItem("possession_lost",  Math.max(0, stats.possession_lost));
  const dribFailItem    = addItem("dribble_failed",   Math.max(0, stats.dribbles_total));
  const crossFailItem   = addItem("cross_failed",     Math.max(0, stats.crosses_failed));

  const creationRaw =
    keyPassItem.rawDelta + dribSuccessItem.rawDelta + foulSufItem.rawDelta +
    crossSuccItem.rawDelta + possLostItem.rawDelta + dribFailItem.rawDelta +
    crossFailItem.rawDelta;

  // Passing
  const passCompItem    = addItem("pass_completed",   Math.max(0, stats.passes_completed));
  const passFailItem    = addItem("pass_failed",      Math.max(0, stats.passes_total));
  const progPassItem    = addItem("progressive_pass", Math.max(0, stats.progressive_passes ?? 0));
  const longPassOkItem  = addItem("long_pass_success",Math.max(0, stats.long_pass_success ?? 0));
  const longPassErrItem = addItem("long_pass_failed", Math.max(0, stats.long_pass_failed ?? 0));

  const passingRaw =
    passCompItem.rawDelta + passFailItem.rawDelta +
    progPassItem.rawDelta + longPassOkItem.rawDelta + longPassErrItem.rawDelta;

  // Defense
  const tackleItem      = addItem("tackle",          Math.max(0, stats.tackles));
  const interceptItem   = addItem("interception",    Math.max(0, stats.interceptions));
  const clearanceItem   = addItem("clearance",       Math.max(0, stats.clearances));
  const shotBlkItem     = addItem("shot_blocked",    Math.max(0, stats.shots_blocked ?? 0));
  const stealItem       = addItem("steal",           Math.max(0, stats.steals ?? 0));

  const groundDuelsWon  = Math.max(0, stats.duels_won - stats.aerial_duels_won);
  const groundDuelsLost = Math.max(0, (stats.duels_total - stats.duels_won) - (stats.aerial_duels_total - stats.aerial_duels_won));
  const aerialDuelsWon  = Math.max(0, stats.aerial_duels_won);
  const aerialDuelsLost = Math.max(0, stats.aerial_duels_total - stats.aerial_duels_won);

  const gDuelWonItem    = addItem("ground_duel_won",  groundDuelsWon);
  const gDuelLostItem   = addItem("ground_duel_lost", groundDuelsLost);
  const aDuelWonItem    = addItem("aerial_duel_won",  aerialDuelsWon);
  const aDuelLostItem   = addItem("aerial_duel_lost", aerialDuelsLost);
  const foulComItem     = addItem("foul_committed",   Math.max(0, stats.fouls_committed));
  const dribbledItem    = addItem("dribbled_past",    Math.max(0, stats.times_dribbled_past ?? 0));

  const defenseRaw =
    tackleItem.rawDelta + interceptItem.rawDelta + clearanceItem.rawDelta +
    shotBlkItem.rawDelta + stealItem.rawDelta +
    gDuelWonItem.rawDelta + gDuelLostItem.rawDelta +
    aDuelWonItem.rawDelta + aDuelLostItem.rawDelta +
    foulComItem.rawDelta + dribbledItem.rawDelta;

  // Discipline
  const yellowItem       = addItem("yellow_card",       Math.max(0, stats.yellow_cards));
  const redItem          = addItem("red_card",           Math.max(0, stats.red_cards));
  const penCommittedItem = addItem("penalty_committed",  Math.max(0, stats.penalty_committed ?? 0));

  const disciplineRaw = yellowItem.rawDelta + redItem.rawDelta + penCommittedItem.rawDelta;

  // Final
  const rawImpact = attackRaw + creationRaw + passingRaw + defenseRaw + disciplineRaw;
  const rating    = Math.round(Math.max(MIN_RATING, Math.min(MAX_RATING, BASE_RATING + rawImpact)) * 10) / 10;

  const categories: CategoryBreakdown[] = [
    { key: "attack",     label: CATEGORY_LABELS.attack,     raw: r2(attackRaw),     afterMinutes: r2(attackRaw),     items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "attack") },
    { key: "creation",   label: CATEGORY_LABELS.creation,   raw: r2(creationRaw),   afterMinutes: r2(creationRaw),   items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "creation") },
    { key: "passing",    label: CATEGORY_LABELS.passing,    raw: r2(passingRaw),    afterMinutes: r2(passingRaw),    items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "passing") },
    { key: "defense",    label: CATEGORY_LABELS.defense,    raw: r2(defenseRaw),    afterMinutes: r2(defenseRaw),    items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "defense") },
    { key: "discipline", label: CATEGORY_LABELS.discipline, raw: r2(disciplineRaw), afterMinutes: r2(disciplineRaw), items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "discipline") },
  ];

  return {
    hasRating: true, rating,
    baseRating: BASE_RATING,
    rawImpact: r2(rawImpact), impactAfterMinutes: r2(rawImpact),
    minutesFactor: 1.0, minutesPlayed,
    breakdown: {
      attack:     r2(attackRaw),
      creation:   r2(creationRaw),
      passing:    r2(passingRaw),
      defense:    r2(defenseRaw),
      discipline: r2(disciplineRaw),
      goalkeeper: 0,
    },
    detailedBreakdown: {
      categories,
      items: [...allItems].sort((a, b) => Math.abs(b.rawDelta) - Math.abs(a.rawDelta)),
      capsApplied,
      antiInflationApplied: false,
      hasImpactfulAction: hasHighImpact,
    },
    color: getRatingColor(rating), bgColor: getRatingBgColor(rating), label: getRatingLabel(rating),
  };
}

// ─── matchPlayerStatsToInput ──────────────────────────────────────────────────
export function matchPlayerStatsToInput(
  stats: MatchPlayerStats | undefined,
  isGoalkeeper = false
): PlayerStatsInput {
  if (!stats) {
    return {
      goals: 0, assists: 0, shots_on_target: 0, shots: 0,
      shot_on_post: 0, penalty_won: 0,
      dribbles_success: 0, dribbles_total: 0,
      key_passes: 0, chances_created: 0,
      crosses_success: 0, crosses_failed: 0,
      fouls_suffered: 0, possession_lost: 0,
      passes_completed: 0, passes_total: 0,
      progressive_passes: 0, long_pass_success: 0, long_pass_failed: 0,
      interceptions: 0, recoveries: 0, clearances: 0, tackles: 0, steals: 0,
      duels_won: 0, duels_total: 0, aerial_duels_won: 0, aerial_duels_total: 0,
      fouls_committed: 0, shots_blocked: 0, times_dribbled_past: 0,
      yellow_cards: 0, red_cards: 0, penalty_committed: 0,
      saves: 0, saves_inside_box: 0, penalty_saved: 0,
      goals_conceded: 0, clean_sheets: 0,
      high_claims: 0, punches: 0, sweeper_actions: 0, errors_led_to_goal: 0,
      isGoalkeeper,
    };
  }

  return {
    goals:              stats.goals              ?? 0,
    assists:            stats.assists             ?? 0,
    shots_on_target:    stats.shots_on_target     ?? 0,
    shots:              stats.shots               ?? 0,
    shot_on_post:       (stats as any).shots_on_post    ?? 0,
    penalty_won:        (stats as any).penalties_won    ?? 0,
    dribbles_success:   stats.dribbles_success    ?? 0,
    dribbles_total:     stats.dribbles_total      ?? 0,
    key_passes:         stats.key_passes          ?? 0,
    chances_created:    stats.chances_created     ?? 0,
    crosses_success:    stats.crosses_success     ?? 0,
    crosses_failed:     stats.crosses_failed      ?? 0,
    fouls_suffered:     stats.fouls_suffered      ?? 0,
    possession_lost:    stats.possession_lost     ?? 0,
    passes_completed:   stats.passes_completed    ?? 0,
    passes_total:       stats.passes_total        ?? 0,
    progressive_passes: (stats as any).progressive_passes ?? 0,
    long_pass_success:  0, // not yet aggregated in match_player_stats
    long_pass_failed:   0,
    interceptions:      stats.interceptions       ?? 0,
    recoveries:         stats.recoveries          ?? 0,
    clearances:         stats.clearances          ?? 0,
    tackles:            stats.tackles             ?? 0,
    steals:             (stats as any).steals     ?? 0,
    duels_won:          stats.duels_won           ?? 0,
    duels_total:        stats.duels_total         ?? 0,
    aerial_duels_won:   stats.aerial_duels_won    ?? 0,
    aerial_duels_total: stats.aerial_duels_total  ?? 0,
    fouls_committed:    stats.fouls_committed     ?? 0,
    shots_blocked:      stats.shots_blocked       ?? 0,
    times_dribbled_past:stats.was_dribbled        ?? 0,
    yellow_cards:       stats.yellow_cards        ?? 0,
    red_cards:          stats.red_cards           ?? 0,
    penalty_committed:  0, // event type not yet tracked
    saves:              stats.saves               ?? 0,
    saves_inside_box:   0,
    penalty_saved:      0,
    goals_conceded:     stats.goals_conceded      ?? 0,
    clean_sheets:       0,
    high_claims:        0,
    punches:            0,
    sweeper_actions:    0,
    errors_led_to_goal: 0,
    isGoalkeeper,
  };
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────
export function calculatePlayerMatchRating(
  stats: MatchPlayerStats | undefined,
  playerMinutesInput: MatchPlayerMinutesInput,
  isGoalkeeper = false
): MatchRatingResult {
  const minutesInfo = calculateMinutesPlayed(playerMinutesInput);
  const statsInput  = matchPlayerStatsToInput(stats, isGoalkeeper);
  return calculateMatchRating(statsInput, minutesInfo.minutesPlayed);
}

export function persistedRatingToResult(
  rating: number,
  minutesPlayed: number,
  minutesFactor: number | null = null
): MatchRatingResult {
  return {
    hasRating: true, rating,
    baseRating: BASE_RATING,
    rawImpact: r2(rating - BASE_RATING),
    impactAfterMinutes: r2(rating - BASE_RATING),
    minutesFactor: minutesFactor ?? 1.0,
    minutesPlayed,
    breakdown: null,
    detailedBreakdown: null,
    color: getRatingColor(rating),
    bgColor: getRatingBgColor(rating),
    label: getRatingLabel(rating),
  };
}

export function noRatingResult(): MatchRatingResult {
  return noRatingBase(0);
}
