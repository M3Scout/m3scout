/**
 * PDF de relatório estatístico de temporada — M3Scout.
 * Cada insight exibe: valor atual · referência ideal · variação vs ano anterior.
 */
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { getTierFromCoefficient } from "@/lib/tierClassification";
import type { PublicSeasonRow } from "@/lib/mergeSeasonStats";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface CompetitionMeta {
  id: string;
  name: string;
  final_coefficient: number;
  tier: string;
}

export interface PlayerSeasonPdfProps {
  playerName: string;
  playerPosition?: string;
  year: number;
  rows: PublicSeasonRow[];
  competitionMeta: Record<string, CompetitionMeta>;
  generatedAt: string;
  prevRows?: PublicSeasonRow[];
  prevYear?: number;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  red: "#E5173F", amber: "#F59E0B", cyan: "#06B6D4", blue: "#6B9EE5",
  green: "#16A34A", greenL: "#22C55E", white: "#FFFFFF", black: "#111111",
  g950: "#09090B", g900: "#18181B", g700: "#3F3F46", g600: "#52525B",
  g500: "#71717A", g400: "#A1A1AA", g300: "#D4D4D8", g200: "#E4E4E7",
  g100: "#F4F4F5", g50: "#FAFAFA", infoBlue: "#0284C7", infoBlueBg: "#EFF6FF",
} as const;

const TIER = {
  S: { bg: "#F5C451", fg: "#1A1A1A", label: "Elite Mundial"  },
  A: { bg: "#2ECC71", fg: "#FFFFFF", label: "Alta Qualidade" },
  B: { bg: "#3498DB", fg: "#FFFFFF", label: "Intermediário"  },
  C: { bg: "#7F8C8D", fg: "#FFFFFF", label: "Regional"       },
  D: { bg: "#E74C3C", fg: "#FFFFFF", label: "Base/Local"     },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pctN  = (a: number, b: number): number | null => b > 0 ? (a / b) * 100 : null;
const pctS  = (a: number, b: number): string => { const p = pctN(a, b); return p === null ? "—" : `${Math.round(p)}%`; };
const p90   = (v: number, m: number): number => m > 0 ? (v / m) * 90 : 0;
const fd    = (v: number, d = 2): string => v.toFixed(d);
const fv    = (v: number): string => String(v);
const n     = (v: number): string => v.toLocaleString("pt-BR");
const tierK = (c: number) => getTierFromCoefficient(c) as keyof typeof TIER;
const tierV = (c: number) => TIER[tierK(c)] ?? TIER.D;

function delta(curr: number, prev: number): number | null {
  return prev > 0 ? ((curr - prev) / prev) * 100 : null;
}
function yoyStr(d: number | null, prevYear: number): string {
  if (d === null) return "";
  const sign = d >= 0 ? "+" : "";
  const arrow = d >= 5 ? " ↑" : d <= -5 ? " ↓" : " →";
  return `${sign}${Math.round(d)}% vs ${prevYear}${arrow}`;
}
function yoyColor(d: number | null, invertBad = false): string {
  if (d === null) return C.g400;
  const good = invertBad ? d < 0 : d > 0;
  if (Math.abs(d) < 5) return C.g500;
  return good ? C.green : C.red;
}

// ─── Tipo de stats agregadas ──────────────────────────────────────────────────

type Agg = {
  matches: number; minutes: number; goals: number; assists: number;
  shots: number; shots_on_target: number; shots_off_target: number; shots_blocked: number; shots_on_post: number; offsides: number; penalties_won: number;
  passes_completed: number; passes_failed: number; passes_total: number;
  key_passes: number; chances_created: number; progressive_passes: number;
  crosses_success: number; crosses_failed: number;
  long_passes_accurate: number; long_passes_failed: number; long_passes_total: number;
  dribbles_success: number; dribbles_failed: number; dribbles_total: number;
  fouls_suffered: number; possession_lost: number;
  steals: number; tackles: number; interceptions: number; clearances: number;
  recoveries: number; blocked_shots: number; was_dribbled: number;
  ground_duels_won: number; ground_duels_total: number;
  aerial_duels_won: number; aerial_duels_total: number;
  yellow_cards: number; red_cards: number; fouls_committed: number;
  saves: number; goals_conceded: number; clean_sheets: number; penalties_saved: number;
};

function toAgg(r: PublicSeasonRow["stats"]): Agg {
  const s = r as any;
  return {
    matches: r.matches, minutes: r.minutes, goals: r.goals, assists: r.assists,
    shots: r.shots, shots_on_target: r.shots_on_target, shots_off_target: r.shots_off_target,
    shots_blocked: r.shots_blocked, shots_on_post: s.shots_on_post ?? 0,
    offsides: s.offsides ?? 0, penalties_won: s.penalties_won ?? 0,
    passes_completed: r.passes_completed, passes_failed: r.passes_failed, passes_total: r.passes_total,
    key_passes: r.key_passes, chances_created: r.chances_created, progressive_passes: s.progressive_passes ?? 0,
    crosses_success: r.crosses_success, crosses_failed: r.crosses_failed,
    long_passes_accurate: r.long_passes_accurate, long_passes_failed: r.long_passes_failed, long_passes_total: r.long_passes_total,
    dribbles_success: r.dribbles_success, dribbles_failed: r.dribbles_failed, dribbles_total: r.dribbles_total,
    fouls_suffered: r.fouls_suffered, possession_lost: r.possession_lost,
    steals: r.steals, tackles: r.tackles, interceptions: r.interceptions, clearances: r.clearances,
    recoveries: r.recoveries, blocked_shots: r.blocked_shots, was_dribbled: r.was_dribbled,
    ground_duels_won: r.ground_duels_won, ground_duels_total: r.ground_duels_total,
    aerial_duels_won: r.aerial_duels_won, aerial_duels_total: r.aerial_duels_total,
    yellow_cards: r.yellow_cards, red_cards: r.red_cards, fouls_committed: r.fouls_committed,
    saves: r.saves, goals_conceded: r.goals_conceded, clean_sheets: r.clean_sheets, penalties_saved: r.penalties_saved,
  };
}

function sumAgg(a: Agg, b: Agg): Agg {
  return Object.fromEntries(Object.keys(a).map(k => [k, (a as any)[k] + (b as any)[k]])) as Agg;
}

function computeTotals(rows: PublicSeasonRow[]): Agg {
  return rows.map(r => toAgg(r.stats)).reduce(sumAgg);
}

// ─── Família de posição ───────────────────────────────────────────────────────

type Fam = "gk" | "def" | "mid" | "fwd";
function fam(pos?: string): Fam {
  if (!pos) return "mid";
  const p = pos.toLowerCase();
  if (p.includes("goleiro") || p === "gk") return "gk";
  if (p.includes("zagueiro") || p.includes("lateral") || p.includes("beque")) return "def";
  if (p.includes("atacante") || p.includes("ponta") || p.includes("centroavante")) return "fwd";
  return "mid";
}

// ─── Motor de insights ────────────────────────────────────────────────────────

type Level = "critico" | "regular" | "bom";

interface Ins {
  level: Level;
  metric: string;
  ref: string;       // linha de benchmark: "Atual: X · Referência: Y"
  text: string;      // análise contextual
  yoy?: string;      // "+15% vs 2025 ↑"
  yoyColor?: string;
}

function buildInsights(
  t: Agg,
  position?: string,
  meta: Record<string, CompetitionMeta> = {},
  rows: PublicSeasonRow[] = [],
  prevT?: Agg,
  prevYear?: number,
): Ins[] {
  const out: Ins[] = [];
  const f = fam(position);
  const { minutes: min, matches } = t;
  const hasPrev = !!prevT && !!prevYear;

  // Coef. médio ponderado por minutos
  let cSum = 0, cMin = 0;
  rows.forEach(r => {
    if (r.competition_id && meta[r.competition_id]) {
      cSum += meta[r.competition_id].final_coefficient * r.stats.minutes;
      cMin += r.stats.minutes;
    }
  });
  const avgC = cMin > 0 ? cSum / cMin : null;

  // ─── 1. Minutagem ──────────────────────────────────────────────────────────
  const minDelta = hasPrev ? delta(min, prevT!.minutes) : null;
  const minYoy   = hasPrev ? yoyStr(minDelta, prevYear!) : undefined;
  const minYoyC  = hasPrev ? yoyColor(minDelta) : undefined;
  const prevMinStr = hasPrev ? ` · ${prevYear}: ${n(prevT!.minutes)} min` : "";

  if (min > 4200) {
    out.push({ level: "critico", metric: "Minutagem · Zona de Risco",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Máximo seguro: 4.200 min · Protagonista: 2.500–4.200 min${prevMinStr}`,
      text: "Carga acima do limite de segurança FIFPRO. Alta propensão a fadiga e lesões. Rotação imediata e monitoramento físico intensivo recomendados.",
      yoy: minYoy, yoyColor: minYoyC });
  } else if (min >= 2500) {
    out.push({ level: "bom", metric: "Minutagem · Protagonista",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Protagonista: 2.500–4.200 min · Máximo seguro: 4.200 min${prevMinStr}`,
      text: "Titular absoluto com volume de participação ideal. Dados altamente confiáveis para análise e negociação de mercado.",
      yoy: minYoy, yoyColor: minYoyC });
  } else if (min >= 1200) {
    out.push({ level: "regular", metric: "Minutagem · Jogador de Elenco",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Protagonista: ≥2.500 min · Mínimo confiável: 1.200 min${prevMinStr}`,
      text: "Reserva imediato ou titular que perdeu espaço por opção técnica ou lesão. Dados confiáveis dentro do contexto, porém amostra parcial da temporada.",
      yoy: minYoy, yoyColor: minYoyC });
  } else {
    out.push({ level: "critico", metric: "Minutagem · Amostragem Baixa",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Mínimo recomendado: 1.200 min · Ideal (Protagonista): ≥2.500 min${prevMinStr}`,
      text: "Minutagem escassa compromete a confiabilidade estatística. O atleta precisa de sequência de minutos para que os números sejam representativos de seu real nível.",
      yoy: minYoy, yoyColor: minYoyC });
  }

  // ─── 2. Nível de competição ────────────────────────────────────────────────
  if (avgC !== null) {
    const tk = getTierFromCoefficient(avgC) as keyof typeof TIER;
    if (tk === "S" || tk === "A") {
      out.push({ level: "bom", metric: `Nível de Competição · Tier ${tk}`,
        ref: `Coef. médio ponderado: ${fd(avgC, 2)} · Tier ${tk} — ${TIER[tk].label} · Referência S: ≥0.94 · A: ≥0.85`,
        text: "Estatísticas obtidas contra concorrência de alto nível, o que aumenta o valor de mercado dos números desta temporada." });
    } else if (tk === "B") {
      out.push({ level: "regular", metric: "Nível de Competição · Tier B",
        ref: `Coef. médio ponderado: ${fd(avgC, 2)} · Tier B — Intermediário · Referência alta: ≥0.85 (Tier A)`,
        text: "Nível de competição moderado. Os números representam bom parâmetro base, mas exigem ajuste ao comparar com mercados de topo." });
    } else {
      out.push({ level: "critico", metric: `Nível de Competição · Tier ${tk}`,
        ref: `Coef. médio ponderado: ${fd(avgC, 2)} · Tier ${tk} — ${TIER[tk].label} · Referência mínima: ≥0.74 (Tier B)`,
        text: "Nível inferior de competição reduz o peso das estatísticas na avaliação de mercado. Necessário confirmar desempenho em competições de maior coeficiente." });
    }
  }

  if (min < 270) return out;

  // ─── 3. Precisão de passe ─────────────────────────────────────────────────
  if (t.passes_total >= 40) {
    const acc = pctN(t.passes_completed, t.passes_total)!;
    const vol = p90(t.passes_total, min);
    const kp  = p90(t.key_passes, min);
    const prevAcc = hasPrev && prevT!.passes_total > 0 ? pctN(prevT!.passes_completed, prevT!.passes_total)! : null;
    const pDelta  = prevAcc !== null ? delta(acc, prevAcc) : null;
    const prevAccStr = prevAcc !== null ? ` · ${prevYear}: ${Math.round(prevAcc)}%` : "";

    if (acc >= 78) {
      out.push({ level: "bom", metric: "Passes · Alta Precisão",
        ref: `Atual: ${Math.round(acc)}% (${t.passes_completed}/${t.passes_total}) · ${fd(vol, 1)}/90 min · ${fd(kp, 1)} decisivos/90 · Elite: ≥78% · Mínimo: 65%${prevAccStr}`,
        text: "Circulação de bola acima da média de mercado. Aproveitamento de passe que diferencia o atleta no cenário competitivo.",
        yoy: hasPrev ? yoyStr(pDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(pDelta) : undefined });
    } else if (acc >= 65) {
      out.push({ level: "regular", metric: "Passes · Aproveitamento Regular",
        ref: `Atual: ${Math.round(acc)}% (${t.passes_completed}/${t.passes_total}) · ${fd(vol, 1)}/90 min · Referência alta: ≥78% · Mínimo aceitável: 65%${prevAccStr}`,
        text: "Precisão dentro do esperado para a posição. Margem de evolução para alcançar o padrão de alto nível (≥78%).",
        yoy: hasPrev ? yoyStr(pDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(pDelta) : undefined });
    } else {
      out.push({ level: "critico", metric: "Passes · Precisão Crítica",
        ref: `Atual: ${Math.round(acc)}% (${t.passes_completed}/${t.passes_total}) · ${fd(vol, 1)}/90 min · Mínimo aceitável: 65% · Elite: ≥78%${prevAccStr}`,
        text: "Aproveitamento abaixo do mínimo aceitável. Alta taxa de perda compromete a circulação e expõe a equipe a transições adversas.",
        yoy: hasPrev ? yoyStr(pDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(pDelta) : undefined });
    }
  }

  // ─── 4. Finalização ──────────────────────────────────────────────────────
  if (f !== "gk" && t.shots >= 8) {
    const acc = pctN(t.shots_on_target, t.shots)!;
    const vol = p90(t.shots, min);
    if (acc >= 42) {
      out.push({ level: "bom", metric: "Finalização · Alta Conversão",
        ref: `Atual: ${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) · ${fd(vol, 1)} fin./90 min · Elite: ≥42% · Regular: 28–41% · Crítico: <28%`,
        text: "Direcionamento de elite. Atleta com alto aproveitamento das oportunidades de finalização." });
    } else if (acc >= 28) {
      out.push({ level: "regular", metric: "Finalização · Eficiência Regular",
        ref: `Atual: ${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) · ${fd(vol, 1)} fin./90 min · Elite: ≥42% · Regular: 28–41% · Crítico: <28%`,
        text: "Taxa de finalização dentro da faixa média para a posição. Evolução no direcionamento pode gerar impacto ofensivo direto." });
    } else {
      out.push({ level: "critico", metric: "Finalização · Baixa Eficiência",
        ref: `Atual: ${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) · ${fd(vol, 1)} fin./90 min · Mínimo: 28% · Elite: ≥42%`,
        text: "Taxa crítica de chutes no alvo. Alto volume de finalizações sem efetividade ofensiva real." });
    }
  }

  // ─── 5. Gols / 90 ────────────────────────────────────────────────────────
  if (f === "fwd" || f === "mid") {
    const g  = p90(t.goals, min);
    const pg = hasPrev && prevT!.minutes > 0 ? p90(prevT!.goals, prevT!.minutes) : null;
    const gDelta   = pg !== null ? delta(g, pg) : null;
    const prevGStr = pg !== null ? ` · ${prevYear}: ${fd(pg, 2)}/90 (${prevT!.goals} gols)` : "";

    if (f === "fwd") {
      if (g >= 0.50) {
        out.push({ level: "bom", metric: "Gols/90 · Artilheiro de Elite",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols em ${matches} jogos) · Elite: ≥0.50/90 · Regular: 0.25–0.49/90 · Abaixo: <0.25/90${prevGStr}`,
          text: "Índice de artilharia de alto nível. Atacante com conversão dominante nas oportunidades da temporada.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      } else if (g >= 0.25) {
        out.push({ level: "regular", metric: "Gols/90 · Produção Regular",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Regular: 0.25–0.49/90 · Elite: ≥0.50/90 · Insuficiente: <0.25/90${prevGStr}`,
          text: "Produção ofensiva dentro da faixa esperada para um atacante. Há espaço para crescimento em direção ao patamar de elite (≥0.50/90).",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      } else {
        out.push({ level: "critico", metric: "Gols/90 · Produção Insuficiente",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Mínimo regular: 0.25/90 · Elite: ≥0.50/90${prevGStr}`,
          text: "Produção de gols abaixo do esperado para a posição de atacante. Eficiência ofensiva precisa de revisão tática e individual.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      }
    } else if (g >= 0.20) {
      out.push({ level: "bom", metric: "Gols/90 · Meio-campo Decisivo",
        ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Referência destaque para meia: ≥0.20/90${prevGStr}`,
        text: "Contribuição ofensiva acima do esperado para a posição de meio-campo.",
        yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
    }
  }

  // ─── 6. Assistências ─────────────────────────────────────────────────────
  if (f === "fwd" || f === "mid") {
    const a  = p90(t.assists, min);
    const pa = hasPrev && prevT!.minutes > 0 ? p90(prevT!.assists, prevT!.minutes) : null;
    const aDelta   = pa !== null ? delta(a, pa) : null;
    const prevAStr = pa !== null ? ` · ${prevYear}: ${prevT!.assists} assist. (${fd(pa, 2)}/90)` : "";

    if (a >= 0.30) {
      out.push({ level: "bom", metric: "Assistências · Alto Nível",
        ref: `Atual: ${fd(a, 2)}/90 (${t.assists} total) · Alto nível: ≥0.30/90 · Regular: 0.12–0.29/90${prevAStr}`,
        text: "Criação coletiva de elite. Assistente prolífico com alto impacto no jogo ofensivo da equipe.",
        yoy: hasPrev ? yoyStr(aDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aDelta) : undefined });
    } else if (a >= 0.12) {
      out.push({ level: "regular", metric: "Assistências · Contribuição Regular",
        ref: `Atual: ${fd(a, 2)}/90 (${t.assists} total) · Alto nível: ≥0.30/90 · Mínimo regular: 0.12/90${prevAStr}`,
        text: "Participação ofensiva coletiva dentro do padrão esperado para a posição.",
        yoy: hasPrev ? yoyStr(aDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aDelta) : undefined });
    } else if (matches >= 10 && t.assists === 0) {
      out.push({ level: "critico", metric: "Assistências · Ausência Total",
        ref: `Atual: 0 assist. em ${matches} jogos · Mínimo regular: 0.12/90 · Alto nível: ≥0.30/90${prevAStr}`,
        text: "Participação na criação coletiva precisa evoluir significativamente. Nenhuma assistência ao longo da temporada.",
        yoy: hasPrev ? yoyStr(aDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aDelta) : undefined });
    }
  }

  // ─── 7. Dribles ──────────────────────────────────────────────────────────
  if (t.dribbles_total >= 10) {
    const acc = pctN(t.dribbles_success, t.dribbles_total)!;
    const vol = p90(t.dribbles_success, min);
    if (acc >= 65 && vol >= 2.0) {
      out.push({ level: "bom", metric: "Dribles · Dominância Individual",
        ref: `Atual: ${Math.round(acc)}% de êxito (${t.dribbles_success}/${t.dribbles_total}) · ${fd(vol, 1)} dribles/90 · Elite: ≥65% com ≥2.0/90`,
        text: "Diferencial técnico individual notável. Atleta dominante em situações de 1×1." });
    } else if (acc < 40 && t.dribbles_total >= 15) {
      out.push({ level: "critico", metric: "Dribles · Baixa Eficiência",
        ref: `Atual: ${Math.round(acc)}% de êxito (${t.dribbles_success}/${t.dribbles_total}) · Mínimo aceitável: 40% · Elite: ≥65%`,
        text: "Perda de bola frequente em situações de 1×1. Alta taxa de dribles frustrados expõe a equipe em transições." });
    }
  }

  // ─── 8. Duelos terrestres ────────────────────────────────────────────────
  if (t.ground_duels_total >= 15) {
    const w      = pctN(t.ground_duels_won, t.ground_duels_total)!;
    const prevW  = hasPrev && prevT!.ground_duels_total > 0 ? pctN(prevT!.ground_duels_won, prevT!.ground_duels_total)! : null;
    const dDelta = prevW !== null ? delta(w, prevW) : null;
    const prevDStr = prevW !== null ? ` · ${prevYear}: ${Math.round(prevW)}%` : "";
    const dYoy  = hasPrev ? yoyStr(dDelta, prevYear!) : undefined;
    const dYoyC = hasPrev ? yoyColor(dDelta) : undefined;
    if (w >= 55) {
      out.push({ level: "bom", metric: "Duelos Terrestres · Dominante",
        ref: `Atual: ${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) · Dominante: ≥55% · Regular: 44–54% · Deficitário: <44%${prevDStr}`,
        text: "Superioridade física e tática clara em confrontos diretos.",
        yoy: dYoy, yoyColor: dYoyC });
    } else if (w < 44) {
      out.push({ level: "critico", metric: "Duelos Terrestres · Deficitário",
        ref: `Atual: ${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) · Mínimo: 44% · Dominante: ≥55%${prevDStr}`,
        text: "Fragilidade em confrontos diretos. Déficit físico ou tático que compromete o desempenho coletivo.",
        yoy: dYoy, yoyColor: dYoyC });
    } else {
      out.push({ level: "regular", metric: "Duelos Terrestres · Regular",
        ref: `Atual: ${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) · Dominante: ≥55% · Regular: 44–54% · Mínimo: 44%${prevDStr}`,
        text: "Desempenho dentro da média para a posição em confrontos diretos.",
        yoy: dYoy, yoyColor: dYoyC });
    }
  }

  // ─── 9. Duelos aéreos ────────────────────────────────────────────────────
  if (t.aerial_duels_total >= 10 && (f === "def" || f === "fwd")) {
    const w = pctN(t.aerial_duels_won, t.aerial_duels_total)!;
    if (w >= 60) {
      out.push({ level: "bom", metric: "Jogo Aéreo · Dominante",
        ref: `Atual: ${Math.round(w)}% ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) · Dominante: ≥60% · Mínimo: 38%`,
        text: "Forte presença física em bolas aéreas, escanteios e cruzamentos." });
    } else if (w < 38) {
      out.push({ level: "critico", metric: "Jogo Aéreo · Deficitário",
        ref: `Atual: ${Math.round(w)}% ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) · Mínimo: 38% · Dominante: ≥60%`,
        text: "Déficit significativo no jogo aéreo. Fragiliza a marcação em bolas cruzadas e bolas paradas." });
    }
  }

  // ─── 10. Ações defensivas ────────────────────────────────────────────────
  if (f === "def" || f === "mid") {
    const tk = p90(t.tackles, min);
    const ic = p90(t.interceptions, min);
    const rc = p90(t.recoveries, min);
    const cl = p90(t.clearances, min);
    if (f === "def") {
      if (tk >= 3.5)               out.push({ level: "bom",     metric: "Desarmes · Alta Intensidade", ref: `Atual: ${fd(tk, 1)}/90 (${t.tackles} total) · Alta intensidade: ≥3.5/90 · Mínimo esperado: 1.5/90`, text: "Defensor com marcação intensa, agressiva e dentro dos limites técnicos." });
      else if (tk < 1.5 && matches >= 8) out.push({ level: "critico", metric: "Desarmes · Volume Baixo",   ref: `Atual: ${fd(tk, 1)}/90 (${t.tackles} total) · Mínimo esperado: 1.5/90 · Alta intensidade: ≥3.5/90`, text: "Volume de desarmes abaixo do mínimo esperado para um defensor. Baixa presença defensiva ativa." });
      if (ic >= 2.5) out.push({ level: "bom", metric: "Interceptações · Leitura de Jogo", ref: `Atual: ${fd(ic, 1)}/90 (${t.interceptions} total) · Referência alta: ≥2.5/90`, text: "Excelente antecipação e leitura de jogo defensiva." });
      if (cl >= 4.0) out.push({ level: "bom", metric: "Cortes · Proteção da Área",       ref: `Atual: ${fd(cl, 1)}/90 (${t.clearances} total) · Referência alta: ≥4.0/90`, text: "Forte presença de limpeza na área defensiva." });
    }
    if (f === "mid" && rc >= 5.0) out.push({ level: "bom", metric: "Recuperações · Volante Combativo", ref: `Atual: ${fd(rc, 1)}/90 (${t.recoveries} total) · Referência alta: ≥5.0/90`, text: "Perfil combativo com alta intensidade no setor intermediário." });
  }

  // ─── 11. Goleiro ─────────────────────────────────────────────────────────
  if (f === "gk") {
    const tot = t.saves + t.goals_conceded;
    const sp  = pctN(t.saves, tot);
    const cs  = pctN(t.clean_sheets, matches);
    const gc  = matches > 0 ? t.goals_conceded / matches : null;
    if (sp !== null && tot >= 10) {
      if      (sp >= 72) out.push({ level: "bom",     metric: "Defesas · Goleiro de Elite",       ref: `Atual: ${Math.round(sp)}% (${t.saves}/${tot}) · Elite: ≥72% · Regular: 58–71% · Crítico: <58%`, text: "Índice de aproveitamento de elite. Goleiro com alto impacto na solidez defensiva." });
      else if (sp <  58) out.push({ level: "critico", metric: "Defesas · Taxa Abaixo do Padrão",  ref: `Atual: ${Math.round(sp)}% (${t.saves}/${tot}) · Mínimo: 58% · Elite: ≥72%`, text: `${t.goals_conceded} gols sofridos em ${matches} jogos. Taxa abaixo do mínimo esperado para a posição.` });
      else               out.push({ level: "regular", metric: "Defesas · Aproveitamento Regular", ref: `Atual: ${Math.round(sp)}% (${t.saves}/${tot}) · Elite: ≥72% · Regular: 58–71% · Mínimo: 58%`, text: "Aproveitamento dentro do padrão esperado para a posição." });
    }
    if (cs !== null && matches >= 5) {
      if      (cs >= 36) out.push({ level: "bom",     metric: "Clean Sheets · Alta Confiabilidade", ref: `Atual: ${t.clean_sheets}/${matches} jogos (${Math.round(cs)}%) · Alta: ≥36% · Baixa: <16%`, text: "Goleiro com alta frequência de jogos sem sofrer gols — solidez defensiva de alto nível." });
      else if (cs <  16) out.push({ level: "critico", metric: "Clean Sheets · Frequência Baixa",    ref: `Atual: ${t.clean_sheets}/${matches} jogos (${Math.round(cs)}%) · Mínimo: 16% · Alta confiabilidade: ≥36%`, text: "Baixa frequência de partidas sem sofrer gols ao longo da temporada." });
    }
    if (gc !== null && matches >= 5) {
      if      (gc < 0.95) out.push({ level: "bom",     metric: "Gols Sofridos · Solidez de Elite", ref: `Atual: ${fd(gc, 2)} gols/jogo · Excelente: <0.95/jogo · Preocupante: >1.60/jogo`, text: "Média de gols sofridos de elite. Goleiro decisivo na manutenção do resultado." });
      else if (gc > 1.60) out.push({ level: "critico", metric: "Gols Sofridos · Índice Alto",      ref: `Atual: ${fd(gc, 2)} gols/jogo · Excelente: <0.95/jogo · Preocupante: >1.60/jogo`, text: "Alta média de gols sofridos por partida — sistema defensivo fragilizado ou dificuldades técnicas." });
    }
  }

  // ─── 12. Cruzamentos ─────────────────────────────────────────────────────
  const ct = t.crosses_success + t.crosses_failed;
  if (ct >= 15) {
    const ca = pctN(t.crosses_success, ct)!;
    if      (ca >= 40) out.push({ level: "bom",     metric: "Cruzamentos · Alta Precisão",    ref: `Atual: ${Math.round(ca)}% (${t.crosses_success}/${ct}) · Alta precisão: ≥40% · Mínimo: 25%`, text: "Qualidade acima da média no jogo pelas laterais. Cruzamentos efetivos e de boa conversão." });
    else if (ca <  25) out.push({ level: "critico", metric: "Cruzamentos · Baixa Eficiência", ref: `Atual: ${Math.round(ca)}% (${t.crosses_success}/${ct}) · Mínimo: 25% · Alta precisão: ≥40%`, text: "Baixa efetividade nos cruzamentos. Contribuição pelas laterais com pouco aproveitamento real." });
  }

  // ─── 13. Disciplina ─────────────────────────────────────────────────────
  if (t.red_cards > 0) {
    out.push({ level: "critico", metric: "Disciplina · Expulsões",
      ref: `Atual: ${t.red_cards} expulsão${t.red_cards > 1 ? "ões" : ""} em ${matches} jogos · Referência ideal: 0 vermelhos/temporada`,
      text: "Expulsões têm impacto direto na disponibilidade do atleta e no risco disciplinar percebido pelo mercado." });
  }
  if (matches > 0) {
    const yp10 = (t.yellow_cards / matches) * 10;
    if (yp10 >= 3.5) {
      out.push({ level: "critico", metric: "Disciplina · Alta Taxa de Amarelos",
        ref: `Atual: ${t.yellow_cards} amarelos em ${matches} jogos (${fd(yp10, 1)}/10 partidas) · Referência segura: ≤1.2/10 jogos`,
        text: "Taxa de cartões acima do limiar de risco. Suspensões frequentes comprometem a disponibilidade." });
    } else if (yp10 <= 1.2 && matches >= 10) {
      out.push({ level: "bom", metric: "Disciplina · Perfil Equilibrado",
        ref: `Atual: ${t.yellow_cards} amarelos em ${matches} jogos (${fd(yp10, 1)}/10 partidas) · Referência segura: ≤1.2/10 jogos`,
        text: "Atleta com perfil disciplinado ao longo da temporada. Baixo risco de suspensões e impacto negativo de imagem." });
    }
  }

  // ─── 14. Bolas perdidas ──────────────────────────────────────────────────
  if (t.possession_lost > 0 && min >= 450) {
    const bp = p90(t.possession_lost, min);
    if (bp >= 8.0) {
      out.push({ level: "critico", metric: "Posse · Alta Perda de Bola",
        ref: `Atual: ${fd(bp, 1)}/90 (${t.possession_lost} total) · Preocupante: ≥8.0/90`,
        text: "Frequência elevada de perdas de posse expõe a equipe a transições adversas recorrentes." });
    }
  }

  // ─── 15. Comparações YoY exclusivas (mudanças ≥10%) ─────────────────────
  if (hasPrev && prevT && prevYear) {
    const checks: { label: string; curr: number; prev: number; unit: string; invertBad?: boolean }[] = [
      { label: "Minutagem total",  curr: min,        prev: prevT.minutes, unit: "min"     },
      { label: "Gols totais",      curr: t.goals,    prev: prevT.goals,   unit: "gols"    },
      { label: "Assistências",     curr: t.assists,  prev: prevT.assists, unit: "assist." },
    ];
    if (min >= 450 && prevT.minutes >= 450 && (f === "fwd" || f === "mid")) {
      checks.push({ label: "Gols/90 min", curr: p90(t.goals, min), prev: p90(prevT.goals, prevT.minutes), unit: "/90" });
    }

    checks.forEach(({ label, curr, prev, unit, invertBad }) => {
      // Evita duplicar insights que já foram gerados acima
      const alreadyCovered = out.some(i =>
        i.metric.toLowerCase().includes(label.toLowerCase().split(" ")[0])
        && i.yoy !== undefined
      );
      if (alreadyCovered) return;

      const d = delta(curr, prev);
      if (d === null || Math.abs(d) < 10) return;
      const improved = invertBad ? d < 0 : d > 0;
      const sign     = d > 0 ? "+" : "";
      const fmt      = unit === "/90" ? fd(curr, 2) : n(Math.round(curr));
      const pfmt     = unit === "/90" ? fd(prev, 2) : n(Math.round(prev));
      out.push({
        level: improved ? "bom" : "critico",
        metric: improved ? `Evolução vs ${prevYear} · ${label}` : `Regressão vs ${prevYear} · ${label}`,
        ref: `${year}: ${fmt} ${unit} · ${prevYear}: ${pfmt} ${unit} · Variação: ${sign}${Math.round(d)}%`,
        text: improved
          ? `Crescimento de ${sign}${Math.round(d)}% em ${label.toLowerCase()} em relação à temporada ${prevYear}. Tendência positiva relevante para avaliação de desenvolvimento.`
          : `Queda de ${Math.round(Math.abs(d))}% em ${label.toLowerCase()} em relação à temporada ${prevYear}. Inversão de tendência que requer acompanhamento e análise contextual.`,
        yoy: `${sign}${Math.round(d)}% vs ${prevYear}${improved ? " ↑" : " ↓"}`,
        yoyColor: improved ? C.green : C.red,
      });
    });
  }

  return out;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 50, paddingHorizontal: 36, fontFamily: "Helvetica", color: C.g900, backgroundColor: C.white },

  hdr:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  hLine: { height: 3, backgroundColor: C.red, marginBottom: 20 },
  hL:    { flex: 1 },
  hR:    { backgroundColor: C.g50, borderWidth: 1, borderColor: C.g200, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, alignItems: "flex-end", minWidth: 140 },
  hName: { fontSize: 22, fontWeight: 800, color: C.black, letterSpacing: -0.5, marginBottom: 3 },
  hSub:  { fontSize: 9, color: C.g500 },
  hTag:  { fontSize: 8, fontWeight: 700, color: C.red, letterSpacing: 0.5, marginBottom: 4 },
  hMeta: { fontSize: 8, color: C.g600, marginBottom: 2 },
  hBrand:{ fontSize: 7, color: C.g400 },

  secWrap: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 10 },
  secNum:  { fontSize: 7, fontWeight: 700, color: C.white, backgroundColor: C.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 8, letterSpacing: 0.5 },
  secTxt:  { fontSize: 9, fontWeight: 700, color: C.g600, letterSpacing: 1.2, textTransform: "uppercase" },
  secLine: { height: 1, backgroundColor: C.g200, flex: 1, marginLeft: 8 },

  cc:     { borderRadius: 6, borderWidth: 1, borderColor: C.g200, marginBottom: 12, overflow: "hidden" },
  ccHdr:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.g200, backgroundColor: C.g50 },
  ccName: { fontSize: 10, fontWeight: 700, color: C.black, flex: 1 },
  ccR:    { flexDirection: "row", alignItems: "center", gap: 6 },
  ccCoef: { fontSize: 8, color: C.g500 },
  ccTier: { fontSize: 7.5, fontWeight: 800, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  ccGms:  { fontSize: 8, color: C.g500 },

  catW:   { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.g100 },
  catL:   { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  catHdr: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  catDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  catTxt: { fontSize: 6.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" },
  grid:   { flexDirection: "row", flexWrap: "wrap" },

  box:  { width: "25%", paddingRight: 5, paddingBottom: 5 },
  bIn:  { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: C.g50, borderWidth: 1, borderColor: C.g100 },
  bTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  bLbl: { fontSize: 6, color: C.g400, textTransform: "uppercase", letterSpacing: 0.3 },
  bPct: { fontSize: 6, fontWeight: 700, paddingHorizontal: 2.5, paddingVertical: 1, borderRadius: 2 },
  bVal: { fontSize: 14, fontWeight: 800, color: C.g900, lineHeight: 1 },

  tc:     { borderRadius: 6, backgroundColor: C.g950, marginBottom: 12, overflow: "hidden" },
  tcHdr:  { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  tcTit:  { fontSize: 10, fontWeight: 700, color: C.white },
  tcSub:  { fontSize: 8, color: C.g500, marginTop: 2 },
  tcCatW: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  tcCatL: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  dbIn:   { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  dbVal:  { fontSize: 14, fontWeight: 800, color: C.white, lineHeight: 1 },
  dbLbl:  { fontSize: 6, color: C.g500, textTransform: "uppercase", letterSpacing: 0.3 },

  wCard:  { borderRadius: 6, backgroundColor: C.g950, marginBottom: 14, paddingHorizontal: 16, paddingVertical: 14 },
  wTitle: { fontSize: 9, fontWeight: 700, color: C.white, marginBottom: 2 },
  wSub:   { fontSize: 7.5, color: C.g500, marginBottom: 14 },
  wGrid:  { flexDirection: "row" },
  wItem:  { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.07)", paddingHorizontal: 4 },
  wItemL: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  wVal:   { fontSize: 18, fontWeight: 800, color: C.white, marginBottom: 3 },
  wLbl:   { fontSize: 6, color: C.g500, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 2 },
  wBrt:   { fontSize: 7, color: C.amber, textAlign: "center" },

  // Insight section
  iSec:   { marginBottom: 12 },
  iHdr:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  iHdrTx: { fontSize: 9, fontWeight: 700 },
  iHdrCt: { fontSize: 8, fontWeight: 400, marginLeft: 4 },
  iBody:  { borderLeftWidth: 3, borderRightWidth: 1, borderBottomWidth: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 },

  // Each insight item — wrap={false} prevents splitting across pages
  iItem:   { paddingTop: 10, paddingBottom: 10 },
  iSep:    { height: 1 },
  iTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  iDotW:   { width: 16, flexShrink: 0 },
  iDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 1 },
  iMetric: { fontSize: 8, fontWeight: 700, letterSpacing: 0.2, flex: 1 },
  iYoy:    { fontSize: 7, fontWeight: 700, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, flexShrink: 0, marginLeft: 8 },
  // Reference line with blue background
  iRef:    { fontSize: 7.5, color: C.infoBlue, backgroundColor: C.infoBlueBg, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 3, marginBottom: 5, marginLeft: 16 },
  // Analysis text
  iTxt:    { fontSize: 8.5, color: C.g600, lineHeight: 1.55, marginLeft: 16 },

  footer: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.g200, paddingTop: 8 },
  ftxt:   { fontSize: 7, color: C.g400 },
});

// ─── Helpers de cor ───────────────────────────────────────────────────────────

function pctBadgeColor(p: number | null) {
  if (p === null) return C.g400;
  return p >= 60 ? C.green : p >= 50 ? "#CA8A04" : C.red;
}

function valColor(v: number, positive?: boolean, negative?: boolean, dark = false) {
  if (positive && v > 0) return dark ? "#4ADE80" : C.green;
  if (negative && v > 0) return dark ? "#FB7185" : C.red;
  return dark ? C.white : C.g900;
}

// ─── StatBox ─────────────────────────────────────────────────────────────────

interface StatItem { label: string; value: number; positive?: boolean; negative?: boolean; pct?: number | null }

function StatBox({ item, dark = false }: { item: StatItem; dark?: boolean }) {
  const vc = valColor(item.value, item.positive, item.negative, dark);
  const pc = item.pct !== undefined ? pctBadgeColor(item.pct ?? null) : null;
  return (
    <View style={s.box}>
      <View style={dark ? s.dbIn : s.bIn}>
        <View style={s.bTop}>
          <Text style={dark ? s.dbLbl : s.bLbl}>{item.label}</Text>
          {item.pct !== undefined && pc !== null && (
            <Text style={[s.bPct, { color: pc, borderColor: pc, borderWidth: 0.5 }]}>
              {item.pct === null ? "0%" : `${Math.round(item.pct)}%`}
            </Text>
          )}
        </View>
        <Text style={[dark ? s.dbVal : s.bVal, { color: vc }]}>{fv(item.value)}</Text>
      </View>
    </View>
  );
}

// ─── CatBlock ────────────────────────────────────────────────────────────────

function CatBlock({ title, color, items, isLast = false, dark = false }: {
  title: string; color: string; items: StatItem[]; isLast?: boolean; dark?: boolean;
}) {
  const wrap = dark ? (isLast ? s.tcCatL : s.tcCatW) : (isLast ? s.catL : s.catW);
  return (
    <View style={wrap} wrap={false}>
      <View style={s.catHdr}>
        <View style={[s.catDot, { backgroundColor: color }]} />
        <Text style={[s.catTxt, { color }]}>{title}</Text>
      </View>
      <View style={s.grid}>
        {items.map((item, i) => <StatBox key={i} item={item} dark={dark} />)}
      </View>
    </View>
  );
}

// ─── Stat arrays ─────────────────────────────────────────────────────────────

function statBlocks(t: Agg, isGK: boolean) {
  const ataque: StatItem[] = [
    { label: "Gols",          value: t.goals,            positive: true },
    { label: "Final. Gol",    value: t.shots_on_target,  positive: true },
    { label: "Final. Fora",   value: t.shots_off_target  },
    { label: "Final. Bloq.",  value: t.shots_blocked     },
    { label: "Na Trave",      value: t.shots_on_post,    positive: true },
    { label: "Final. Total",  value: t.shots             },
    { label: "Impedim.",      value: t.offsides,         negative: true },
    { label: "Pên. Sofrido",  value: t.penalties_won,    positive: true },
  ];
  const passes: StatItem[] = [
    { label: "Assist.",          value: t.assists,             positive: true },
    { label: "Passes Dec.",      value: t.key_passes,          positive: true },
    { label: "Chances",          value: t.chances_created,     positive: true },
    { label: "Passes ✓",         value: t.passes_completed,    positive: true, pct: pctN(t.passes_completed, t.passes_total) },
    { label: "Passes ✗",         value: t.passes_failed,       negative: true },
    { label: "Pass. Prog.",      value: t.progressive_passes,  positive: true },
    { label: "Passes Tot.",      value: t.passes_total         },
    { label: "Cruzam. ✓",        value: t.crosses_success,     positive: true, pct: pctN(t.crosses_success, t.crosses_success + t.crosses_failed) },
    { label: "Cruzam. ✗",        value: t.crosses_failed,      negative: true },
    { label: "Passe Longo ✓",    value: t.long_passes_accurate, positive: true, pct: pctN(t.long_passes_accurate, t.long_passes_total) },
    { label: "Passe Longo ✗",    value: t.long_passes_failed,  negative: true },
    { label: "Passe Longo Tot.", value: t.long_passes_total    },
  ];
  const dribles: StatItem[] = [
    { label: "Dribles ✓",    value: t.dribbles_success, positive: true, pct: pctN(t.dribbles_success, t.dribbles_total) },
    { label: "Dribles ✗",    value: t.dribbles_failed,  negative: true },
    { label: "Dribles Tot.", value: t.dribbles_total    },
    { label: "Faltas Sof.",  value: t.fouls_suffered    },
    { label: "Bolas Perd.",  value: t.possession_lost,  negative: true },
  ];
  const defesa: StatItem[] = [
    { label: "Roubada de Bola",  value: t.steals,           positive: true },
    { label: "Desarmes",         value: t.tackles,           positive: true },
    { label: "Interc.",          value: t.interceptions,     positive: true },
    { label: "Cortes",           value: t.clearances,        positive: true },
    { label: "Recup.",           value: t.recoveries,        positive: true },
    { label: "Chute Bloq.",      value: t.blocked_shots,     positive: true },
    { label: "Dribles Sofridos", value: t.was_dribbled,      negative: true },
    { label: "Duelo Chão ✓",     value: t.ground_duels_won,  positive: true, pct: pctN(t.ground_duels_won, t.ground_duels_total) },
    { label: "Duelo Chão ✗",     value: Math.max(0, t.ground_duels_total - t.ground_duels_won), negative: true },
    { label: "Duelo Chão Tot.",  value: t.ground_duels_total },
    { label: "Duelo Aéreo ✓",    value: t.aerial_duels_won,  positive: true, pct: pctN(t.aerial_duels_won, t.aerial_duels_total) },
    { label: "Duelo Aéreo ✗",    value: Math.max(0, t.aerial_duels_total - t.aerial_duels_won), negative: true },
    { label: "Duelo Aéreo Tot.", value: t.aerial_duels_total },
    { label: "Faltas Com.",      value: t.fouls_committed,   negative: true },
    { label: "Amarelos",         value: t.yellow_cards,      negative: true },
    { label: "Vermelhos",        value: t.red_cards,         negative: true },
    ...(isGK ? [
      { label: "Defesas",     value: t.saves,           positive: true } as StatItem,
      { label: "Gols Sof.",   value: t.goals_conceded,  negative: true } as StatItem,
      { label: "Clean Sheet", value: t.clean_sheets,    positive: true } as StatItem,
      { label: "Pên. Salvos", value: t.penalties_saved, positive: true } as StatItem,
    ] : []),
  ];
  return { ataque, passes, dribles, defesa };
}

// ─── CompCard ────────────────────────────────────────────────────────────────

function CompCard({ row, meta, isGK }: { row: PublicSeasonRow; meta?: CompetitionMeta; isGK: boolean }) {
  const t     = toAgg(row.stats);
  const name  = row.competition_name ?? meta?.name ?? "—";
  const coeff = meta?.final_coefficient ?? 0;
  const tk    = tierK(coeff);
  const tier  = TIER[tk];
  const blks  = statBlocks(t, isGK);
  return (
    <View style={[s.cc, { borderTopWidth: 3, borderTopColor: tier.bg }]} wrap={false}>
      <View style={s.ccHdr}>
        <Text style={s.ccName}>{name}</Text>
        <View style={s.ccR}>
          {coeff > 0 && <Text style={s.ccCoef}>Coef. {fd(coeff, 2)}</Text>}
          <Text style={[s.ccTier, { backgroundColor: tier.bg, color: tier.fg }]}>{tk} · {tier.label}</Text>
          <Text style={s.ccGms}>{t.matches} J · {t.minutes} min</Text>
        </View>
      </View>
      <CatBlock title="Ataque"          color={C.red}   items={blks.ataque}  />
      <CatBlock title="Passes"          color={C.amber} items={blks.passes}  />
      <CatBlock title="Dribles / Posse" color={C.cyan}  items={blks.dribles} />
      <CatBlock title="Defesa"          color={C.blue}  items={blks.defesa}  isLast />
    </View>
  );
}

// ─── TotalCard ───────────────────────────────────────────────────────────────

function TotalCard({ t, year, isGK }: { t: Agg; year: number; isGK: boolean }) {
  const blks = statBlocks(t, isGK);
  return (
    <View style={s.tc}>
      <View style={s.tcHdr}>
        <Text style={s.tcTit}>Total Geral · Temporada {year}</Text>
        <Text style={s.tcSub}>{t.matches} jogos · {t.minutes} minutos disputados</Text>
      </View>
      <CatBlock title="Ataque"          color={C.red}   items={blks.ataque}  dark />
      <CatBlock title="Passes"          color={C.amber} items={blks.passes}  dark />
      <CatBlock title="Dribles / Posse" color={C.cyan}  items={blks.dribles} dark />
      <CatBlock title="Defesa"          color={C.blue}  items={blks.defesa}  dark isLast />
    </View>
  );
}

// ─── InsightSection ──────────────────────────────────────────────────────────

function InsightSection({ title, count, items, color, bgHdr, dotColor, metricColor, borderColor, sepColor }: {
  title: string; count: string; items: Ins[];
  color: string; bgHdr: string; dotColor: string; metricColor: string;
  borderColor: string; sepColor: string;
}) {
  if (!items.length) return null;
  return (
    <View style={s.iSec}>
      <View style={[s.iHdr, { backgroundColor: bgHdr }]}>
        <Text style={[s.iHdrTx, { color }]}>{title}</Text>
        <Text style={[s.iHdrCt, { color }]}>— {count}</Text>
      </View>
      <View style={[s.iBody, { borderLeftColor: color, borderRightColor: borderColor, borderBottomColor: borderColor }]}>
        {items.map((ins, i) => (
          <View key={i}>
            {/* wrap={false}: este item nunca é dividido entre páginas */}
            <View style={s.iItem} wrap={false}>
              {/* Linha de topo: dot + métrica + badge YoY */}
              <View style={s.iTopRow}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={s.iDotW}><View style={[s.iDot, { backgroundColor: dotColor }]} /></View>
                  <Text style={[s.iMetric, { color: metricColor }]}>{ins.metric}</Text>
                </View>
                {ins.yoy && (
                  <Text style={[s.iYoy, { color: ins.yoyColor ?? C.g500, backgroundColor: `${ins.yoyColor ?? C.g500}20` }]}>
                    {ins.yoy}
                  </Text>
                )}
              </View>
              {/* Linha de referência (benchmark azul) */}
              <Text style={s.iRef}>{ins.ref}</Text>
              {/* Texto de análise */}
              <Text style={s.iTxt}>{ins.text}</Text>
            </View>
            {i < items.length - 1 && <View style={[s.iSep, { backgroundColor: sepColor }]} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── SectionHead ─────────────────────────────────────────────────────────────

function SectionHead({ num, label }: { num: string; label: string }) {
  return (
    <View style={s.secWrap}>
      <Text style={s.secNum}>{num}</Text>
      <Text style={s.secTxt}>{label}</Text>
      <View style={s.secLine} />
    </View>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ name, year, date }: { name: string; year: number; date: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.ftxt}>{name} · Temporada {year} · M3Scout Intelligence Platform</Text>
      <Text style={s.ftxt}>{date}</Text>
      <Text style={s.ftxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ─── Documento principal ──────────────────────────────────────────────────────

export function PlayerSeasonPdfDocument({
  playerName, playerPosition, year, rows, competitionMeta, generatedAt, prevRows, prevYear,
}: PlayerSeasonPdfProps) {
  const isGK  = fam(playerPosition) === "gk";
  const total = computeTotals(rows);
  const prevT = prevRows && prevRows.length > 0 ? computeTotals(prevRows) : undefined;

  const ins   = buildInsights(total, playerPosition, competitionMeta, rows, prevT, prevYear);
  const crits = ins.filter(i => i.level === "critico");
  const regs  = ins.filter(i => i.level === "regular");
  const goods = ins.filter(i => i.level === "bom");

  // Números ponderados por coeficiente × minutos
  let wG = 0, wA = 0, wPa = 0, wPd = 0, wDa = 0, wDd = 0, cSum = 0, cN = 0;
  rows.forEach(r => {
    const c = r.competition_id ? (competitionMeta[r.competition_id]?.final_coefficient ?? 1) : 1;
    const m = r.stats.minutes;
    if (!m) return;
    wG += p90(r.stats.goals, m) * c;
    wA += p90(r.stats.assists, m) * c;
    if (r.stats.passes_total > 0)       { wPa += pctN(r.stats.passes_completed, r.stats.passes_total)! * c; wPd += c; }
    if (r.stats.ground_duels_total > 0) { wDa += pctN(r.stats.ground_duels_won, r.stats.ground_duels_total)! * c; wDd += c; }
    cSum += c; cN++;
  });
  const avgC     = cN ? cSum / cN : 1;
  const wGoals   = cN ? wG / cN : 0;
  const wAssists = cN ? wA / cN : 0;
  const wPass    = wPd ? wPa / wPd : null;
  const wDuel    = wDd ? wDa / wDd : null;

  return (
    <Document title={`Relatório · ${playerName} · ${year}`} author="M3Scout" subject="Relatório de Temporada">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.hdr} fixed>
          <View style={s.hL}>
            <Text style={s.hName}>{playerName}</Text>
            <Text style={s.hSub}>{playerPosition ?? "—"} · Temporada {year}{prevYear ? ` · comparado com ${prevYear}` : ""}</Text>
          </View>
          <View style={s.hR}>
            <Text style={s.hTag}>RELATÓRIO GERAL</Text>
            <Text style={s.hMeta}>Temporada {year}</Text>
            <Text style={s.hBrand}>M3Scout · Intelligence Platform</Text>
          </View>
        </View>
        <View style={s.hLine} fixed />

        {/* 01 */}
        <SectionHead num="01" label="Estatísticas por Competição" />
        {rows.map(row => (
          <CompCard
            key={row.id}
            row={row}
            meta={row.competition_id ? competitionMeta[row.competition_id] : undefined}
            isGK={isGK}
          />
        ))}

        {/* 02 */}
        <SectionHead num="02" label="Total Consolidado" />
        <TotalCard t={total} year={year} isGK={isGK} />

        {/* Ponderados */}
        <View style={s.wCard} wrap={false}>
          <Text style={s.wTitle}>Números Ponderados por Coeficiente de Competição</Text>
          <Text style={s.wSub}>Eficiência real de mercado — peso proporcional ao final_coefficient · Coef. médio: {fd(avgC, 2)}</Text>
          <View style={s.wGrid}>
            {[
              { label: "Gols / 90\nPonderado",    value: fd(wGoals, 2),                              bruto: `bruto: ${fd(p90(total.goals, total.minutes), 2)} / 90`   },
              { label: "Assist. / 90\nPonderado", value: fd(wAssists, 2),                            bruto: `bruto: ${fd(p90(total.assists, total.minutes), 2)} / 90` },
              { label: "Passe %\nPonderado",      value: wPass !== null ? `${Math.round(wPass)}%` : "—", bruto: `bruto: ${pctS(total.passes_completed, total.passes_total)}` },
              { label: "Duelo %\nPonderado",      value: wDuel !== null ? `${Math.round(wDuel)}%` : "—", bruto: `bruto: ${pctS(total.ground_duels_won, total.ground_duels_total)}` },
            ].map((w, i, arr) => (
              <View key={i} style={i < arr.length - 1 ? s.wItem : s.wItemL}>
                <Text style={s.wVal}>{w.value}</Text>
                <Text style={s.wLbl}>{w.label}</Text>
                <Text style={s.wBrt}>{w.bruto}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 03 */}
        <SectionHead num="03" label="Inteligência de Scout · Análise Tática" />

        <InsightSection
          title="Pontos Críticos" count={`${crits.length} alerta${crits.length !== 1 ? "s" : ""}`}
          items={crits} color={C.red} bgHdr="rgba(229,23,63,0.07)"
          dotColor={C.red} metricColor={C.red}
          borderColor="rgba(229,23,63,0.2)" sepColor="rgba(229,23,63,0.08)"
        />
        <InsightSection
          title="Desempenho Regular" count={`${regs.length} ponto${regs.length !== 1 ? "s" : ""} estável${regs.length !== 1 ? "is" : ""}`}
          items={regs} color="#92400E" bgHdr="rgba(245,158,11,0.07)"
          dotColor={C.amber} metricColor="#78350F"
          borderColor="rgba(245,158,11,0.2)" sepColor="rgba(245,158,11,0.08)"
        />
        <InsightSection
          title="Pontos de Destaque" count={`${goods.length} diferencial${goods.length !== 1 ? "ais" : ""}`}
          items={goods} color={C.green} bgHdr="rgba(22,163,74,0.07)"
          dotColor={C.greenL} metricColor="#14532D"
          borderColor="rgba(22,163,74,0.2)" sepColor="rgba(22,163,74,0.08)"
        />

        <Footer name={playerName} year={year} date={generatedAt} />
      </Page>
    </Document>
  );
}
