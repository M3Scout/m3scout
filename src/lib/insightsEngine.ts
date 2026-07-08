import {
  AlertTriangle, TrendingUp, Target, Crosshair, ShieldAlert,
  Star, Trophy, FileWarning, Clock, Activity,
} from "lucide-react";
import { getPositionGroup, POSITION_GROUP_LABELS, type PositionGroupKey } from "@/lib/positionGroups";
import { ELITE_PHYSICAL_BENCHMARKS } from "@/lib/physicalBenchmarks";

// Shared insight-building engine — used by both the admin "Insights da
// Plataforma" panel (all athletes) and the athlete's own dashboard (single
// athlete), so the rules/thresholds never drift between the two views.

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightCategory = "critical" | "alert" | "positive" | "neutral";

export interface Insight {
  id:          string;
  playerId:    string;
  playerName:  string;
  category:    InsightCategory;
  priority:    number;
  icon:        React.ElementType;
  title:       string;
  description: string;
  tooltip:     string;
  link:        string;
}

// Lower = more urgent. Determines both sort order and which category "wins"
// when a single athlete has insights of different severities.
export const CATEGORY_RANK: Record<InsightCategory, number> = {
  critical: 0, alert: 1, positive: 2, neutral: 3,
};

export interface PlayerInsightGroup {
  playerId:   string;
  playerName: string;
  category:   InsightCategory;
  priority:   number;
  link:       string;
  items:      Insight[];
}

export interface AggregateRow {
  player_id:              string;
  full_name:              string;
  slug:                   string | null;
  total_matches:          number;
  total_minutes:          number;
  total_accurate_passes:  number;
  total_failed_passes:    number;
  total_crosses_success:  number;
  total_crosses_failed:   number;
  total_dribbles_success: number;
  total_dribbles_failed:  number;
  total_ground_duels_won:    number;
  total_ground_duels_failed: number;
  total_aerial_duels_won:    number;
  total_aerial_duels_failed: number;
  total_goals:            number;
  total_assists:          number;
  last_match_date:        string | null;
}

export interface GoalRow {
  id:           string;
  player_id:    string;
  goal_type:    string;
  target_value: number;
  season_year:  number;
  player:       { full_name: string } | null;
}

export interface ContractRow {
  id:            string;
  full_name:     string;
  contract_end:  string | null;
}

export interface PhysicalRow {
  id:                   string;
  full_name:            string;
  position:             string | null;
  body_fat_percentage:  number | null;
}

// ─── Category config ──────────────────────────────────────────────────────────

export const CAT: Record<InsightCategory, { color: string; bg: string; border: string; label: string }> = {
  critical: {
    color:  "#f43f5e",
    bg:     "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.2)",
    label:  "Crítico",
  },
  alert: {
    color:  "#f59e0b",
    bg:     "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    label:  "Atenção",
  },
  positive: {
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    label:  "Positivo",
  },
  neutral: {
    color:  "#62616a",
    bg:     "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.07)",
    label:  "Info",
  },
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  goals:    "Gols", assists: "Assistências", matches: "Partidas",
  minutes:  "Minutos", shots: "Finalizações", tackles: "Desarmes",
  interceptions: "Interceptações", clearances: "Cortes",
  pass_accuracy: "Passe %", dribble_accuracy: "Dribles %",
};

// ─── Position-aware performance thresholds ─────────────────────────────────────
// A zagueiro and a ponta shouldn't be judged by the same passing/dueling bar.
// These start from the old universal thresholds as the default and override
// only the metrics that meaningfully differ per position group.

interface RateThresholds { criticalBelow: number; alertBelow: number; positiveAbove: number; minTotal: number; }

const DEFAULT_RATE_THRESHOLDS: Record<string, RateThresholds> = {
  "Passes":      { criticalBelow: 50, alertBelow: 65, positiveAbove: 82, minTotal: 50 },
  "Dribles":     { criticalBelow: 50, alertBelow: 65, positiveAbove: 70, minTotal: 15 },
  "Cruzamentos": { criticalBelow: 50, alertBelow: 65, positiveAbove: 75, minTotal: 10 },
  "Duelo Chão":  { criticalBelow: 50, alertBelow: 65, positiveAbove: 65, minTotal: 15 },
  "Duelo Aéreo": { criticalBelow: 50, alertBelow: 65, positiveAbove: 65, minTotal: 10 },
};

const POSITION_RATE_OVERRIDES: Partial<Record<PositionGroupKey, Partial<Record<string, Partial<RateThresholds>>>>> = {
  goleiro: {
    "Passes": { criticalBelow: 42, alertBelow: 58, positiveAbove: 78 }, // frequent long balls under pressure
  },
  zagueiro: {
    "Passes":      { criticalBelow: 58, alertBelow: 73, positiveAbove: 88 },
    "Duelo Aéreo": { criticalBelow: 45, alertBelow: 58, positiveAbove: 70 },
    "Duelo Chão":  { criticalBelow: 45, alertBelow: 58, positiveAbove: 70 },
  },
  lateral: {
    "Cruzamentos": { criticalBelow: 40, alertBelow: 55, positiveAbove: 70 },
  },
  volante_meia: {
    "Passes": { criticalBelow: 56, alertBelow: 71, positiveAbove: 87 },
  },
  ponta_meia_atacante: {
    "Dribles":     { criticalBelow: 55, alertBelow: 68, positiveAbove: 78 },
    "Duelo Aéreo": { criticalBelow: 20, alertBelow: 35, positiveAbove: 50 },
  },
  centroavante: {
    "Passes":      { criticalBelow: 38, alertBelow: 53, positiveAbove: 75 },
    "Duelo Aéreo": { criticalBelow: 45, alertBelow: 58, positiveAbove: 68 },
  },
};

function getRateThresholds(group: PositionGroupKey, metric: string): RateThresholds {
  const base = DEFAULT_RATE_THRESHOLDS[metric];
  const override = POSITION_RATE_OVERRIDES[group]?.[metric];
  return override ? { ...base, ...override } : base;
}

// ─── Insight engine ───────────────────────────────────────────────────────────

export function buildInsights(
  aggregates: AggregateRow[],
  goals: GoalRow[],
  contracts: ContractRow[],
  physicalRows: PhysicalRow[],
  year: number,
  positionByPlayerId: Map<string, string | null>,
): Insight[] {
  const out: Insight[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Contract alerts ───────────────────────────────────────────────────────
  for (const c of contracts) {
    if (!c.contract_end) continue;
    const end  = new Date(c.contract_end);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    if (days < 0) continue;

    const link = `/dashboard/atletas/${c.id}`;
    if (days <= 30) {
      out.push({
        id: `contract-critical-${c.id}`, playerId: c.id, playerName: c.full_name,
        category: "critical", priority: 1,
        icon: FileWarning,
        title: "Contrato Expirando",
        description: `Vence em ${days} dia${days === 1 ? "" : "s"}. Ação urgente necessária.`,
        tooltip: `${c.full_name} — contrato com o clube expira em ${days} dias (${end.toLocaleDateString("pt-BR")}).`,
        link,
      });
    } else if (days <= 90) {
      out.push({
        id: `contract-alert-${c.id}`, playerId: c.id, playerName: c.full_name,
        category: "alert", priority: 2,
        icon: FileWarning,
        title: "Contrato a Vencer",
        description: `Expira em ${days} dias. Avalie renovação ou transferência.`,
        tooltip: `${c.full_name} — contrato expira em ${days} dias (${end.toLocaleDateString("pt-BR")}).`,
        link,
      });
    }
  }

  // ── Physical composition vs elite benchmark (position-aware) ─────────────
  // Independent of match aggregates — a player's body composition can be
  // flagged even before/without any recorded games this season.
  for (const p of physicalRows) {
    if (p.body_fat_percentage == null) continue;
    const group = getPositionGroup(p.position);
    const elite = ELITE_PHYSICAL_BENCHMARKS[group].gordura;
    const diff  = p.body_fat_percentage - elite;
    const link  = `/dashboard/atletas/${p.id}`;

    if (diff >= 4) {
      out.push({
        id: `physical-bodyfat-critical-${p.id}`, playerId: p.id, playerName: p.full_name,
        category: "critical", priority: 1,
        icon: Activity,
        title: "Composição Física Crítica",
        description: `% Gordura ${diff.toFixed(1)}pp acima da elite (${p.body_fat_percentage.toFixed(1)}% vs ${elite}%).`,
        tooltip: `${p.full_name} (${POSITION_GROUP_LABELS[group]}) — % gordura ${p.body_fat_percentage.toFixed(1)}%, elite da posição é ${elite}%. ${diff.toFixed(1)} pontos acima exige intervenção física.`,
        link,
      });
    } else if (diff >= 2) {
      out.push({
        id: `physical-bodyfat-alert-${p.id}`, playerId: p.id, playerName: p.full_name,
        category: "alert", priority: 3,
        icon: Activity,
        title: "Atenção na Composição Física",
        description: `% Gordura ${diff.toFixed(1)}pp acima da elite da posição.`,
        tooltip: `${p.full_name} (${POSITION_GROUP_LABELS[group]}) — % gordura ${p.body_fat_percentage.toFixed(1)}%, elite da posição é ${elite}%.`,
        link,
      });
    } else if (diff <= -1) {
      out.push({
        id: `physical-bodyfat-positive-${p.id}`, playerId: p.id, playerName: p.full_name,
        category: "positive", priority: 6,
        icon: Activity,
        title: "Composição Física de Elite",
        description: `% Gordura ${Math.abs(diff).toFixed(1)}pp melhor que a elite da posição.`,
        tooltip: `${p.full_name} (${POSITION_GROUP_LABELS[group]}) — % gordura ${p.body_fat_percentage.toFixed(1)}%, abaixo da elite (${elite}%). Excelente condicionamento.`,
        link,
      });
    }
  }

  // ── Per-player stats rules ────────────────────────────────────────────────
  // NOTE: an "atleta parado" (no recent match) rule used to live here, based
  // on last_match_date. That field is only populated for matches tracked via
  // Jogo Ao Vivo — players whose games are logged manually (Estatísticas)
  // always show a stale/null date there, so the rule produced false alerts.
  // Removed until last_match_date can be reliably derived across all sources.
  for (const p of aggregates) {
    const link = `/dashboard/atletas/${p.player_id}`;

    // Rule: Minutagem Baixa
    if (p.total_matches >= 5) {
      const avgMin = p.total_minutes / p.total_matches;
      if (avgMin <= 45) {
        out.push({
          id: `minutes-${p.player_id}`, playerId: p.player_id, playerName: p.full_name,
          category: "alert", priority: 4,
          icon: Clock,
          title: "Minutagem Baixa",
          description: `Média de ${avgMin.toFixed(0)} min/jogo em ${p.total_matches} partidas.`,
          tooltip: `${p.full_name} — ${avgMin.toFixed(0)} min/jogo em ${p.total_matches} jogos na temporada ${year}. Pode indicar falta de regularidade como titular.`,
          link,
        });
      }
    }

    // Rule: Success rates (critical / alert / positive) — thresholds vary by
    // position group (see getRateThresholds above).
    const posGroup = getPositionGroup(positionByPlayerId.get(p.player_id) ?? null);
    type RateRule = { key: string; icon: React.ElementType; success: number; total: number } & RateThresholds;
    const rateRules: RateRule[] = [
      {
        key: "Passes", icon: Target,
        success: p.total_accurate_passes,
        total:   p.total_accurate_passes + p.total_failed_passes,
        ...getRateThresholds(posGroup, "Passes"),
      },
      {
        key: "Dribles", icon: TrendingUp,
        success: p.total_dribbles_success,
        total:   p.total_dribbles_success + p.total_dribbles_failed,
        ...getRateThresholds(posGroup, "Dribles"),
      },
      {
        key: "Cruzamentos", icon: Crosshair,
        success: p.total_crosses_success,
        total:   p.total_crosses_success + p.total_crosses_failed,
        ...getRateThresholds(posGroup, "Cruzamentos"),
      },
      {
        key: "Duelo Chão", icon: ShieldAlert,
        success: p.total_ground_duels_won,
        total:   p.total_ground_duels_won + p.total_ground_duels_failed,
        ...getRateThresholds(posGroup, "Duelo Chão"),
      },
      {
        key: "Duelo Aéreo", icon: ShieldAlert,
        success: p.total_aerial_duels_won,
        total:   p.total_aerial_duels_won + p.total_aerial_duels_failed,
        ...getRateThresholds(posGroup, "Duelo Aéreo"),
      },
    ];

    // Track best positive per player (only emit the top 1 to avoid flooding)
    let bestPositive: { pct: number; r: typeof rateRules[number] } | null = null;

    for (const r of rateRules) {
      if (r.total < r.minTotal) continue;
      const pct = (r.success / r.total) * 100;

      if (pct < r.criticalBelow) {
        out.push({
          id: `critical-${r.key.toLowerCase()}-${p.player_id}`, playerId: p.player_id, playerName: p.full_name,
          category: "critical", priority: 1,
          icon: r.icon,
          title: `Alerta Crítico em ${r.key}`,
          description: `Aproveitamento de apenas ${pct.toFixed(0)}%. Exige intervenção.`,
          tooltip: `${p.full_name} (${POSITION_GROUP_LABELS[posGroup]}) — ${r.key}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Abaixo de ${r.criticalBelow}% é crítico pra posição.`,
          link,
        });
      } else if (pct <= r.alertBelow) {
        out.push({
          id: `alert-${r.key.toLowerCase()}-${p.player_id}`, playerId: p.player_id, playerName: p.full_name,
          category: "alert", priority: 3,
          icon: r.icon,
          title: `Atenção em ${r.key}`,
          description: `Aproveitamento de ${pct.toFixed(0)}%. Monitoramento necessário.`,
          tooltip: `${p.full_name} (${POSITION_GROUP_LABELS[posGroup]}) — ${r.key}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Entre ${r.criticalBelow}–${r.alertBelow}%, requer acompanhamento.`,
          link,
        });
      } else if (pct >= r.positiveAbove) {
        // Keep only the best positive per player
        if (!bestPositive || pct > bestPositive.pct) {
          bestPositive = { pct, r };
        }
      }
    }

    // Emit single best positive for this player
    if (bestPositive) {
      const { pct, r } = bestPositive;
      out.push({
        id: `positive-${r.key.toLowerCase()}-${p.player_id}`, playerId: p.player_id, playerName: p.full_name,
        category: "positive", priority: 6,
        icon: Star,
        title: `Em Alta em ${r.key}`,
        description: `${pct.toFixed(0)}% de aproveitamento. Excelente desempenho.`,
        tooltip: `${p.full_name} — ${r.key}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Melhor stat acima do benchmark.`,
        link,
      });
    }
  }

  // ── Goal meta progress ────────────────────────────────────────────────────
  const aggregateMap = new Map(aggregates.map(a => [a.player_id, a]));

  for (const g of goals) {
    if (g.season_year !== year) continue;
    if (!g.player) continue;
    const agg = aggregateMap.get(g.player_id);
    if (!agg) continue;

    // Compute current value for types we have in the aggregate
    let currentValue: number | null = null;
    if (g.goal_type === "goals")   currentValue = agg.total_goals;
    if (g.goal_type === "assists") currentValue = agg.total_assists;
    if (g.goal_type === "matches") currentValue = agg.total_matches;
    if (g.goal_type === "minutes") currentValue = agg.total_minutes;
    if (currentValue === null || g.target_value <= 0) continue;

    const pct       = (currentValue / g.target_value) * 100;
    const typeLabel = GOAL_TYPE_LABELS[g.goal_type] ?? g.goal_type;
    const link      = `/dashboard/atletas/${g.player_id}`;

    if (pct >= 100) {
      out.push({
        id: `goal-achieved-${g.id}`, playerId: g.player_id, playerName: g.player.full_name,
        category: "positive", priority: 5,
        icon: Trophy,
        title: "Meta Batida! 🎯",
        description: `Meta de ${typeLabel} alcançada (${currentValue}/${g.target_value}).`,
        tooltip: `${g.player.full_name} atingiu a meta de ${typeLabel} na temporada ${year}: ${currentValue} de ${g.target_value} (${pct.toFixed(0)}%).`,
        link,
      });
    } else if (pct >= 80) {
      out.push({
        id: `goal-near-${g.id}`, playerId: g.player_id, playerName: g.player.full_name,
        category: "positive", priority: 6,
        icon: Target,
        title: "Perto da Meta",
        description: `${pct.toFixed(0)}% da meta de ${typeLabel} (${currentValue}/${g.target_value}).`,
        tooltip: `${g.player.full_name} está a ${g.target_value - currentValue} de atingir a meta de ${typeLabel} na temporada ${year}.`,
        link,
      });
    } else if (pct < 30 && agg.total_matches >= 8) {
      out.push({
        id: `goal-behind-${g.id}`, playerId: g.player_id, playerName: g.player.full_name,
        category: "alert", priority: 4,
        icon: AlertTriangle,
        title: "Meta em Risco",
        description: `Apenas ${pct.toFixed(0)}% da meta de ${typeLabel} com ${agg.total_matches} jogos.`,
        tooltip: `${g.player.full_name} — meta de ${typeLabel}: ${currentValue}/${g.target_value} (${pct.toFixed(0)}%). Ritmo abaixo do necessário com ${agg.total_matches} partidas disputadas.`,
        link,
      });
    }
  }

  // Sort: priority ascending (1 = most urgent)
  out.sort((a, b) => a.priority - b.priority);

  return out;
}

// Groups every insight belonging to the same athlete into a single card. The
// card's color is decided by MAJORITY among its items: red only if critical
// items outnumber both alert and positive; green only if positive items
// outnumber both others; everything else (ties, mixed bags, or alert itself
// being the plurality) settles on amber — the middle ground.
export function groupInsightsByPlayer(insights: Insight[]): PlayerInsightGroup[] {
  const byPlayer = new Map<string, Insight[]>();
  for (const insight of insights) {
    const list = byPlayer.get(insight.playerId);
    if (list) list.push(insight);
    else byPlayer.set(insight.playerId, [insight]);
  }

  const groups: PlayerInsightGroup[] = [];
  for (const items of byPlayer.values()) {
    const critCount = items.filter(i => i.category === "critical").length;
    const alertCount = items.filter(i => i.category === "alert").length;
    const posCount = items.filter(i => i.category === "positive").length;

    let category: InsightCategory;
    if (critCount > alertCount && critCount > posCount) category = "critical";
    else if (posCount > critCount && posCount > alertCount) category = "positive";
    else category = "alert";

    const sortedItems = [...items].sort((a, b) => a.priority - b.priority);
    groups.push({
      playerId:   items[0].playerId,
      playerName: items[0].playerName,
      category,
      priority:   Math.min(...items.map(i => i.priority)),
      link:       items[0].link,
      items:      sortedItems,
    });
  }

  return groups.sort((a, b) =>
    CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] || a.priority - b.priority
  );
}
