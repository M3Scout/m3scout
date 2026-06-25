/**
 * PDF de relatório estatístico de temporada — M3Scout.
 * Cada insight exibe: valor atual · referência ideal · variação vs ano anterior.
 */
import React from "react";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import logoM3 from "@/assets/logo-relatorio.png";
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
  return `${sign}${Math.round(d)}% vs ${prevYear}`;
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
  year: number = 0,
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
  const minDelta   = hasPrev ? delta(min, prevT!.minutes) : null;
  const minYoy     = hasPrev ? yoyStr(minDelta, prevYear!) : undefined;
  const minYoyC    = hasPrev ? yoyColor(minDelta) : undefined;
  const prevMinStr = hasPrev ? ` · ${prevYear}: ${n(prevT!.minutes)} min` : "";

  if (min > 4200) {
    out.push({ level: "critico", metric: "Minutagem · Zona de Risco",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Maximo seguro: 4.200 min · Protagonista: 2.500-4.200 min${prevMinStr}`,
      text: "Carga acima do limite de segurança FIFPRO. Alta propensao a fadiga e lesoes. Rotacao imediata e monitoramento fisico intensivo recomendados.",
      yoy: minYoy, yoyColor: minYoyC });
  } else if (min >= 2500) {
    out.push({ level: "bom", metric: "Minutagem · Protagonista",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Protagonista: 2.500-4.200 min · Maximo seguro: 4.200 min${prevMinStr}`,
      text: "Titular absoluto com volume de participação ideal. Dados altamente confiaveis para analise e negociacao de mercado.",
      yoy: minYoy, yoyColor: minYoyC });
  } else if (min >= 1200) {
    out.push({ level: "regular", metric: "Minutagem · Jogador de Elenco",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Protagonista: >=2.500 min · Minimo confiavel: 1.200 min${prevMinStr}`,
      text: "Reserva imediato ou titular que perdeu espaço por opção tecnica ou lesao. Dados confiaveis dentro do contexto, porem amostra parcial da temporada.",
      yoy: minYoy, yoyColor: minYoyC });
  } else {
    out.push({ level: "critico", metric: "Minutagem · Amostragem Baixa",
      ref: `Atual: ${n(min)} min em ${matches} jogos · Minimo recomendado: 1.200 min · Ideal (Protagonista): >=2.500 min${prevMinStr}`,
      text: "Minutagem escassa compromete a confiabilidade estatistica. O atleta precisa de sequencia de minutos para que os numeros sejam representativos de seu real nivel.",
      yoy: minYoy, yoyColor: minYoyC });
  }

  // ─── 1b. Media de minutos por jogo ─────────────────────────────────────────
  if (matches >= 5) {
    const mpg = min / matches;
    if (mpg >= 82) {
      out.push({ level: "bom", metric: "Aproveitamento · Titular Integral",
        ref: `Atual: ${Math.round(mpg)} min/jogo em ${matches} partidas · Titular integral: >=82 min/jogo · Com rotacao: 60-81 · Impacto: <60`,
        text: "Atleta que raramente e substituido — confianca total da comissao tecnica. Perfil de lideranca dentro de campo." });
    } else if (mpg >= 60) {
      out.push({ level: "regular", metric: "Aproveitamento · Titular com Rotacao",
        ref: `Atual: ${Math.round(mpg)} min/jogo em ${matches} partidas · Titular integral: >=82 min/jogo · Com rotacao: 60-81 · Impacto: <60`,
        text: "Atleta que participa como titular mas frequentemente e substituido. Pode indicar questoes fisicas, taticas ou concorrencia interna." });
    } else if (mpg < 40) {
      out.push({ level: "regular", metric: "Aproveitamento · Jogador de Impacto",
        ref: `Atual: ${Math.round(mpg)} min/jogo em ${matches} partidas · Titular integral: >=82 min/jogo · Com rotacao: 60-81 · Impacto: <60`,
        text: "Papel predominantemente de reserva. Media baixa de minutos por jogo sugere perfil substituto ou disputa constante por posicao." });
    }
  }

  // ─── 2. Nivel de competicao ────────────────────────────────────────────────
  if (avgC !== null) {
    const tk = getTierFromCoefficient(avgC) as keyof typeof TIER;
    if (tk === "S" || tk === "A") {
      out.push({ level: "bom", metric: `Nivel de Competicao · Tier ${tk}`,
        ref: `Coef. medio ponderado: ${fd(avgC, 2)} · Tier ${tk} — ${TIER[tk].label} · Referencia S: >=0.94 · A: >=0.85`,
        text: "Estatisticas obtidas contra concorrencia de alto nivel, o que aumenta o valor de mercado dos numeros desta temporada." });
    } else if (tk === "B") {
      out.push({ level: "regular", metric: "Nivel de Competicao · Tier B",
        ref: `Coef. medio ponderado: ${fd(avgC, 2)} · Tier B — Intermediario · Referencia alta: >=0.85 (Tier A)`,
        text: "Nivel de competicao moderado. Os numeros representam bom parametro base, mas exigem ajuste ao comparar com mercados de topo." });
    } else {
      out.push({ level: "critico", metric: `Nivel de Competicao · Tier ${tk}`,
        ref: `Coef. medio ponderado: ${fd(avgC, 2)} · Tier ${tk} — ${TIER[tk].label} · Referencia minima: >=0.74 (Tier B)`,
        text: "Nivel inferior de competicao reduz o peso das estatisticas na avaliacao de mercado. Necessario confirmar desempenho em competicoes de maior coeficiente." });
    }
  }

  if (min < 270) return out;

  // ─── 3. Precisao de passe ─────────────────────────────────────────────────
  if (t.passes_total >= 40) {
    const acc     = pctN(t.passes_completed, t.passes_total)!;
    const vol     = p90(t.passes_total, min);
    const prevAcc = hasPrev && prevT!.passes_total > 0 ? pctN(prevT!.passes_completed, prevT!.passes_total)! : null;
    const pDelta  = prevAcc !== null ? delta(acc, prevAcc) : null;
    const prevAccStr = prevAcc !== null ? ` · ${prevYear}: ${Math.round(prevAcc)}%` : "";

    if (acc >= 78) {
      out.push({ level: "bom", metric: "Passes · Alta Precisao",
        ref: `Atual: ${Math.round(acc)}% (${t.passes_completed}/${t.passes_total}) · ${fd(vol, 1)}/90 · Elite: >=78% · Minimo: 65%${prevAccStr}`,
        text: "Circulacao de bola acima da media de mercado. Aproveitamento de passe que diferencia o atleta no cenario competitivo.",
        yoy: hasPrev ? yoyStr(pDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(pDelta) : undefined });
    } else if (acc >= 65) {
      out.push({ level: "regular", metric: "Passes · Aproveitamento Regular",
        ref: `Atual: ${Math.round(acc)}% (${t.passes_completed}/${t.passes_total}) · ${fd(vol, 1)}/90 · Elite: >=78% · Minimo: 65%${prevAccStr}`,
        text: "Precisao dentro do esperado para a posicao. Margem de evolucao para alcançar o padrao de alto nivel (>=78%).",
        yoy: hasPrev ? yoyStr(pDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(pDelta) : undefined });
    } else {
      out.push({ level: "critico", metric: "Passes · Precisao Critica",
        ref: `Atual: ${Math.round(acc)}% (${t.passes_completed}/${t.passes_total}) · ${fd(vol, 1)}/90 · Minimo: 65% · Elite: >=78%${prevAccStr}`,
        text: "Aproveitamento abaixo do minimo aceitavel. Alta taxa de perda compromete a circulacao e expoe a equipe a transicoes adversas.",
        yoy: hasPrev ? yoyStr(pDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(pDelta) : undefined });
    }
  }

  // ─── 3b. Passes decisivos / chaves ────────────────────────────────────────
  if (t.key_passes >= 3) {
    const kp90    = p90(t.key_passes, min);
    const prevKp  = hasPrev && prevT!.minutes > 0 ? p90(prevT!.key_passes, prevT!.minutes) : null;
    const kpDelta = prevKp !== null ? delta(kp90, prevKp) : null;
    const prevKpStr = prevKp !== null ? ` · ${prevYear}: ${fd(prevKp, 1)}/90` : "";

    if (kp90 >= 2.5) {
      out.push({ level: "bom", metric: "Criacao · Passes Decisivos de Elite",
        ref: `Atual: ${fd(kp90, 1)}/90 (${t.key_passes} total) · Elite: >=2.5/90 · Regular: 1.0-2.4/90${prevKpStr}`,
        text: "Excelente capacidade criativa. Atleta que frequentemente gera chances claras de gol para companheiros.",
        yoy: hasPrev ? yoyStr(kpDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(kpDelta) : undefined });
    } else if (kp90 >= 1.0) {
      out.push({ level: "regular", metric: "Criacao · Passes Decisivos",
        ref: `Atual: ${fd(kp90, 1)}/90 (${t.key_passes} total) · Elite: >=2.5/90 · Regular: 1.0-2.4/90${prevKpStr}`,
        text: "Participacao criativa dentro da media esperada para a posicao.",
        yoy: hasPrev ? yoyStr(kpDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(kpDelta) : undefined });
    } else if (f === "mid" || f === "fwd") {
      out.push({ level: "critico", metric: "Criacao · Baixa Geracao de Chances",
        ref: `Atual: ${fd(kp90, 1)}/90 (${t.key_passes} total) · Minimo para meia/atacante: 1.0/90 · Elite: >=2.5/90${prevKpStr}`,
        text: "Producao de passes decisivos abaixo do esperado para a posicao. Atleta com baixo impacto direto na geracao de chances ofensivas.",
        yoy: hasPrev ? yoyStr(kpDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(kpDelta) : undefined });
    }
  }

  // ─── 4. Finalizacao ──────────────────────────────────────────────────────
  if (f !== "gk" && t.shots >= 5) {
    const acc     = pctN(t.shots_on_target, t.shots)!;
    const vol     = p90(t.shots, min);
    const prevSot = hasPrev && prevT!.shots > 0 ? pctN(prevT!.shots_on_target, prevT!.shots)! : null;
    const sDelta  = prevSot !== null ? delta(acc, prevSot) : null;
    const prevSotStr = prevSot !== null ? ` · ${prevYear}: ${Math.round(prevSot)}%` : "";

    if (acc >= 42) {
      out.push({ level: "bom", metric: "Finalizacao · Alta Conversao",
        ref: `Atual: ${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) · ${fd(vol, 1)} fin./90 · Elite: >=42% · Regular: 28-41%${prevSotStr}`,
        text: "Direcionamento de elite. Atleta com alto aproveitamento das oportunidades de finalizacao.",
        yoy: hasPrev ? yoyStr(sDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(sDelta) : undefined });
    } else if (acc >= 28) {
      out.push({ level: "regular", metric: "Finalizacao · Eficiencia Regular",
        ref: `Atual: ${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) · ${fd(vol, 1)} fin./90 · Elite: >=42% · Regular: 28-41%${prevSotStr}`,
        text: "Taxa de finalizacao dentro da faixa media para a posicao. Evolucao no direcionamento pode gerar impacto ofensivo direto.",
        yoy: hasPrev ? yoyStr(sDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(sDelta) : undefined });
    } else {
      out.push({ level: "critico", metric: "Finalizacao · Baixa Eficiencia",
        ref: `Atual: ${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) · ${fd(vol, 1)} fin./90 · Minimo: 28% · Elite: >=42%${prevSotStr}`,
        text: "Taxa critica de chutes no alvo. Alto volume de finalizacoes sem efetividade ofensiva real.",
        yoy: hasPrev ? yoyStr(sDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(sDelta) : undefined });
    }
  }

  // ─── 5. Gols / 90 ────────────────────────────────────────────────────────
  if (f === "fwd" || f === "mid") {
    const g      = p90(t.goals, min);
    const pg     = hasPrev && prevT!.minutes > 0 ? p90(prevT!.goals, prevT!.minutes) : null;
    const gDelta = pg !== null ? delta(g, pg) : null;
    const prevGStr = pg !== null ? ` · ${prevYear}: ${fd(pg, 2)}/90 (${prevT!.goals} gols)` : "";

    if (f === "fwd") {
      if (g >= 0.50) {
        out.push({ level: "bom", metric: "Gols/90 · Artilheiro de Elite",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols em ${matches} jogos) · Elite: >=0.50/90 · Regular: 0.25-0.49/90 · Abaixo: <0.25/90${prevGStr}`,
          text: "Indice de artilharia de alto nivel. Atacante com conversao dominante nas oportunidades da temporada.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      } else if (g >= 0.25) {
        out.push({ level: "regular", metric: "Gols/90 · Producao Regular",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Regular: 0.25-0.49/90 · Elite: >=0.50/90 · Insuficiente: <0.25/90${prevGStr}`,
          text: "Producao ofensiva dentro da faixa esperada para um atacante. Ha espaco para crescimento em direcao ao patamar de elite (>=0.50/90).",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      } else {
        out.push({ level: "critico", metric: "Gols/90 · Producao Insuficiente",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Minimo regular: 0.25/90 · Elite: >=0.50/90${prevGStr}`,
          text: "Producao de gols abaixo do esperado para a posicao de atacante. Eficiencia ofensiva precisa de revisao tatica e individual.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      }
    } else {
      if (g >= 0.20) {
        out.push({ level: "bom", metric: "Gols/90 · Meio-campo Decisivo",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Destaque meia: >=0.20/90 · Regular: 0.10-0.19/90${prevGStr}`,
          text: "Contribuicao ofensiva direta acima do esperado para a posicao de meio-campo.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      } else if (g >= 0.10) {
        out.push({ level: "regular", metric: "Gols/90 · Participacao Ofensiva",
          ref: `Atual: ${fd(g, 2)}/90 (${t.goals} gols) · Destaque meia: >=0.20/90 · Regular: 0.10-0.19/90${prevGStr}`,
          text: "Contribuicao ofensiva dentro da media esperada para meia.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      } else if (t.goals === 0 && matches >= 10) {
        out.push({ level: "critico", metric: "Gols/90 · Sem Contribuicao Ofensiva Direta",
          ref: `Atual: 0 gols em ${matches} jogos · Referencia meia: >=0.10/90 · Destaque: >=0.20/90${prevGStr}`,
          text: "Meio-campo sem nenhum gol na temporada. Contribuicao ofensiva direta inexistente.",
          yoy: hasPrev ? yoyStr(gDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gDelta) : undefined });
      }
    }
  }

  // ─── 5b. Gols de defensor (bonus ofensivo) ────────────────────────────────
  if (f === "def" && t.goals >= 2) {
    const g90 = p90(t.goals, min);
    out.push({ level: "bom", metric: "Contribuicao Ofensiva · Defensor Decisivo",
      ref: `Atual: ${t.goals} gols · ${fd(g90, 2)}/90 · Destaque para defensor: >=2 gols na temporada`,
      text: "Defensor com participacao ofensiva acima da media, especialmente em bolas paradas. Agrega valor duplo ao perfil do atleta." });
  }

  // ─── 6. Assistencias ─────────────────────────────────────────────────────
  if (f === "fwd" || f === "mid") {
    const a      = p90(t.assists, min);
    const pa     = hasPrev && prevT!.minutes > 0 ? p90(prevT!.assists, prevT!.minutes) : null;
    const aDelta = pa !== null ? delta(a, pa) : null;
    const prevAStr = pa !== null ? ` · ${prevYear}: ${prevT!.assists} assist. (${fd(pa, 2)}/90)` : "";

    if (a >= 0.30) {
      out.push({ level: "bom", metric: "Assistencias · Alto Nivel",
        ref: `Atual: ${fd(a, 2)}/90 (${t.assists} total) · Alto nivel: >=0.30/90 · Regular: 0.12-0.29/90${prevAStr}`,
        text: "Criacao coletiva de elite. Assistente prolifico com alto impacto no jogo ofensivo da equipe.",
        yoy: hasPrev ? yoyStr(aDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aDelta) : undefined });
    } else if (a >= 0.12) {
      out.push({ level: "regular", metric: "Assistencias · Contribuicao Regular",
        ref: `Atual: ${fd(a, 2)}/90 (${t.assists} total) · Alto nivel: >=0.30/90 · Minimo: 0.12/90${prevAStr}`,
        text: "Participacao ofensiva coletiva dentro do padrao esperado para a posicao.",
        yoy: hasPrev ? yoyStr(aDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aDelta) : undefined });
    } else if (matches >= 8 && t.assists === 0) {
      out.push({ level: "critico", metric: "Assistencias · Ausencia Total",
        ref: `Atual: 0 assist. em ${matches} jogos · Minimo regular: 0.12/90 · Alto nivel: >=0.30/90${prevAStr}`,
        text: "Participacao na criacao coletiva precisa evoluir. Nenhuma assistencia ao longo da temporada.",
        yoy: hasPrev ? yoyStr(aDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aDelta) : undefined });
    }
  }

  // ─── 6b. G+A combinado por 90 ─────────────────────────────────────────────
  if (f !== "gk" && min >= 450) {
    const ga      = t.goals + t.assists;
    const ga90    = p90(ga, min);
    const prevGa  = hasPrev && prevT!.minutes >= 270 ? prevT!.goals + prevT!.assists : null;
    const prevGa90 = prevGa !== null ? p90(prevGa, prevT!.minutes) : null;
    const gaDelta  = prevGa90 !== null ? delta(ga90, prevGa90) : null;
    const prevGaStr = prevGa90 !== null ? ` · ${prevYear}: ${fd(prevGa90, 2)}/90` : "";

    if (f === "fwd") {
      if (ga90 >= 0.70) {
        out.push({ level: "bom", metric: "G+A/90 · Atacante de Alta Producao",
          ref: `Atual: ${fd(ga90, 2)}/90 (${t.goals}G + ${t.assists}A) · Elite atacante: >=0.70/90 · Regular: 0.35-0.69/90${prevGaStr}`,
          text: "Combinacao de gols e assistencias de alto nivel. Atacante determinante no resultado das partidas.",
          yoy: hasPrev ? yoyStr(gaDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gaDelta) : undefined });
      } else if (ga90 < 0.35) {
        out.push({ level: "critico", metric: "G+A/90 · Contribuicao Ofensiva Baixa",
          ref: `Atual: ${fd(ga90, 2)}/90 (${t.goals}G + ${t.assists}A) · Minimo para atacante: 0.35/90 · Elite: >=0.70/90${prevGaStr}`,
          text: "Producao combinada de gols e assistencias abaixo do esperado para a posicao de atacante.",
          yoy: hasPrev ? yoyStr(gaDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gaDelta) : undefined });
      }
    } else if (f === "mid") {
      if (ga90 >= 0.45) {
        out.push({ level: "bom", metric: "G+A/90 · Meia Criativo",
          ref: `Atual: ${fd(ga90, 2)}/90 (${t.goals}G + ${t.assists}A) · Elite meia: >=0.45/90 · Regular: 0.18-0.44/90${prevGaStr}`,
          text: "Contribuicao ofensiva direta de alto nivel para um meia. Atleta que influencia diretamente o marcador.",
          yoy: hasPrev ? yoyStr(gaDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gaDelta) : undefined });
      } else if (ga90 < 0.18 && matches >= 8) {
        out.push({ level: "regular", metric: "G+A/90 · Baixa Participacao Ofensiva",
          ref: `Atual: ${fd(ga90, 2)}/90 (${t.goals}G + ${t.assists}A) · Referencia: >=0.18/90 · Elite meia: >=0.45/90${prevGaStr}`,
          text: "Participacao ofensiva direta abaixo da media. Perfil predominantemente de construcao e marcacao.",
          yoy: hasPrev ? yoyStr(gaDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gaDelta) : undefined });
      }
    } else if (f === "def" && ga90 >= 0.15) {
      out.push({ level: "bom", metric: "G+A/90 · Defensor com Producao Ofensiva",
        ref: `Atual: ${fd(ga90, 2)}/90 (${t.goals}G + ${t.assists}A) · Destaque para defensor: >=0.15/90${prevGaStr}`,
        text: "Defensor com contribuicao ofensiva relevante na temporada. Perfil versatil de alto valor no mercado.",
        yoy: hasPrev ? yoyStr(gaDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(gaDelta) : undefined });
    }
  }

  // ─── 7. Dribles ──────────────────────────────────────────────────────────
  if (t.dribbles_total >= 6) {
    const acc      = pctN(t.dribbles_success, t.dribbles_total)!;
    const vol      = p90(t.dribbles_success, min);
    const prevDrib = hasPrev && prevT!.dribbles_total > 0 ? pctN(prevT!.dribbles_success, prevT!.dribbles_total)! : null;
    const dribDelta = prevDrib !== null ? delta(acc, prevDrib) : null;
    const prevDribStr = prevDrib !== null ? ` · ${prevYear}: ${Math.round(prevDrib)}%` : "";

    if (acc >= 65 && vol >= 1.5) {
      out.push({ level: "bom", metric: "Dribles · Dominancia Individual",
        ref: `Atual: ${Math.round(acc)}% de exito (${t.dribbles_success}/${t.dribbles_total}) · ${fd(vol, 1)}/90 · Elite: >=65% com >=1.5/90${prevDribStr}`,
        text: "Diferencial tecnico individual notavel. Atleta dominante em situacoes de 1x1.",
        yoy: hasPrev ? yoyStr(dribDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(dribDelta) : undefined });
    } else if (acc >= 50) {
      out.push({ level: "regular", metric: "Dribles · Eficiencia Moderada",
        ref: `Atual: ${Math.round(acc)}% de exito (${t.dribbles_success}/${t.dribbles_total}) · ${fd(vol, 1)}/90 · Elite: >=65% · Regular: 50-64%${prevDribStr}`,
        text: "Taxa de drible dentro da faixa aceitavel. Ha espaco para maior assertividade em situacoes de 1x1.",
        yoy: hasPrev ? yoyStr(dribDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(dribDelta) : undefined });
    } else if (acc < 40 && t.dribbles_total >= 10) {
      out.push({ level: "critico", metric: "Dribles · Baixa Eficiencia",
        ref: `Atual: ${Math.round(acc)}% de exito (${t.dribbles_success}/${t.dribbles_total}) · ${fd(vol, 1)}/90 · Minimo: 40% · Elite: >=65%${prevDribStr}`,
        text: "Perda de bola frequente em situacoes de 1x1. Alta taxa de dribles frustrados expoe a equipe em transicoes.",
        yoy: hasPrev ? yoyStr(dribDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(dribDelta) : undefined });
    }
  }

  // ─── 8. Duelos terrestres ────────────────────────────────────────────────
  if (t.ground_duels_total >= 10) {
    const w      = pctN(t.ground_duels_won, t.ground_duels_total)!;
    const prevW  = hasPrev && prevT!.ground_duels_total > 0 ? pctN(prevT!.ground_duels_won, prevT!.ground_duels_total)! : null;
    const dDelta = prevW !== null ? delta(w, prevW) : null;
    const prevDStr = prevW !== null ? ` · ${prevYear}: ${Math.round(prevW)}%` : "";
    const dYoy  = hasPrev ? yoyStr(dDelta, prevYear!) : undefined;
    const dYoyC = hasPrev ? yoyColor(dDelta) : undefined;
    if (w >= 55) {
      out.push({ level: "bom", metric: "Duelos Terrestres · Dominante",
        ref: `Atual: ${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) · Dominante: >=55% · Regular: 44-54% · Deficitario: <44%${prevDStr}`,
        text: "Superioridade fisica e tatica clara em confrontos diretos.",
        yoy: dYoy, yoyColor: dYoyC });
    } else if (w < 44) {
      out.push({ level: "critico", metric: "Duelos Terrestres · Deficitario",
        ref: `Atual: ${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) · Minimo: 44% · Dominante: >=55%${prevDStr}`,
        text: "Fragilidade em confrontos diretos. Deficit fisico ou tatico que compromete o desempenho coletivo.",
        yoy: dYoy, yoyColor: dYoyC });
    } else {
      out.push({ level: "regular", metric: "Duelos Terrestres · Regular",
        ref: `Atual: ${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) · Dominante: >=55% · Regular: 44-54%${prevDStr}`,
        text: "Desempenho dentro da media para a posicao em confrontos diretos.",
        yoy: dYoy, yoyColor: dYoyC });
    }
  }

  // ─── 9. Duelos aereos ────────────────────────────────────────────────────
  if (t.aerial_duels_total >= 6) {
    const w       = pctN(t.aerial_duels_won, t.aerial_duels_total)!;
    const prevAer = hasPrev && prevT!.aerial_duels_total > 0 ? pctN(prevT!.aerial_duels_won, prevT!.aerial_duels_total)! : null;
    const aerDelta = prevAer !== null ? delta(w, prevAer) : null;
    const prevAerStr = prevAer !== null ? ` · ${prevYear}: ${Math.round(prevAer)}%` : "";

    if (w >= 60) {
      out.push({ level: "bom", metric: "Jogo Aereo · Dominante",
        ref: `Atual: ${Math.round(w)}% ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) · Dominante: >=60% · Regular: 38-59%${prevAerStr}`,
        text: "Forte presenca fisica em bolas aereas, escanteios e cruzamentos.",
        yoy: hasPrev ? yoyStr(aerDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aerDelta) : undefined });
    } else if (w >= 38) {
      out.push({ level: "regular", metric: "Jogo Aereo · Regular",
        ref: `Atual: ${Math.round(w)}% ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) · Dominante: >=60% · Regular: 38-59%${prevAerStr}`,
        text: "Desempenho dentro da media em duelos aereos para a posicao.",
        yoy: hasPrev ? yoyStr(aerDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aerDelta) : undefined });
    } else if (t.aerial_duels_total >= 10) {
      out.push({ level: "critico", metric: "Jogo Aereo · Deficitario",
        ref: `Atual: ${Math.round(w)}% ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) · Minimo: 38% · Dominante: >=60%${prevAerStr}`,
        text: "Deficit significativo no jogo aereo. Fragiliza a marcacao em bolas cruzadas e bolas paradas.",
        yoy: hasPrev ? yoyStr(aerDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(aerDelta) : undefined });
    }
  }

  // ─── 10. Acoes defensivas ────────────────────────────────────────────────
  if (f === "def" || f === "mid") {
    const tk90  = p90(t.tackles, min);
    const ic90  = p90(t.interceptions, min);
    const rc90  = p90(t.recoveries, min);
    const cl90  = p90(t.clearances, min);
    const prevRc   = hasPrev && prevT!.minutes > 0 ? p90(prevT!.recoveries, prevT!.minutes) : null;
    const rcDelta  = prevRc !== null ? delta(rc90, prevRc) : null;
    const prevRcStr = prevRc !== null ? ` · ${prevYear}: ${fd(prevRc, 1)}/90` : "";

    if (f === "def") {
      if (tk90 >= 3.5)          out.push({ level: "bom",     metric: "Desarmes · Alta Intensidade", ref: `Atual: ${fd(tk90, 1)}/90 (${t.tackles} total) · Alta: >=3.5/90 · Regular: 1.5-3.4/90`, text: "Defensor com marcacao intensa, agressiva e dentro dos limites tecnicos." });
      else if (tk90 >= 1.5)     out.push({ level: "regular", metric: "Desarmes · Volume Regular",   ref: `Atual: ${fd(tk90, 1)}/90 (${t.tackles} total) · Alta: >=3.5/90 · Regular: 1.5-3.4/90`, text: "Volume de desarmes dentro do esperado para a posicao defensiva." });
      else if (matches >= 7)    out.push({ level: "critico", metric: "Desarmes · Volume Baixo",     ref: `Atual: ${fd(tk90, 1)}/90 (${t.tackles} total) · Minimo: 1.5/90 · Alta: >=3.5/90`, text: "Volume de desarmes abaixo do minimo esperado para um defensor. Baixa presenca defensiva ativa." });
      if (ic90 >= 2.5)          out.push({ level: "bom",     metric: "Interceptacoes · Leitura de Jogo",  ref: `Atual: ${fd(ic90, 1)}/90 (${t.interceptions} total) · Alta: >=2.5/90 · Regular: 1.0-2.4/90`, text: "Excelente antecipacao e leitura de jogo defensiva." });
      else if (ic90 >= 1.0)     out.push({ level: "regular", metric: "Interceptacoes · Volume Regular",   ref: `Atual: ${fd(ic90, 1)}/90 (${t.interceptions} total) · Alta: >=2.5/90 · Regular: 1.0-2.4/90`, text: "Volume de interceptacoes dentro da media para defensores." });
      if (cl90 >= 4.0)          out.push({ level: "bom",     metric: "Cortes · Protecao da Area",         ref: `Atual: ${fd(cl90, 1)}/90 (${t.clearances} total) · Alta: >=4.0/90 · Regular: 2.0-3.9/90`, text: "Forte presenca de limpeza na area defensiva." });
      else if (cl90 >= 2.0)     out.push({ level: "regular", metric: "Cortes · Volume Regular",           ref: `Atual: ${fd(cl90, 1)}/90 (${t.clearances} total) · Alta: >=4.0/90 · Regular: 2.0-3.9/90`, text: "Volume de cortes dentro do esperado para a posicao." });

      // Recuperacoes para defensores
      if (rc90 >= 7.0)          out.push({ level: "bom",     metric: "Recuperacoes · Defensor Combativo", ref: `Atual: ${fd(rc90, 1)}/90 (${t.recoveries} total) · Elite: >=7.0/90 · Regular: 3.0-6.9/90${prevRcStr}`, text: "Alto indice de recuperacoes de bola — defensor combativo e ativo na reconquista da posse.", yoy: hasPrev ? yoyStr(rcDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(rcDelta) : undefined });
      else if (rc90 >= 3.0)     out.push({ level: "regular", metric: "Recuperacoes · Volume Regular",     ref: `Atual: ${fd(rc90, 1)}/90 (${t.recoveries} total) · Elite: >=7.0/90 · Regular: 3.0-6.9/90${prevRcStr}`, text: "Volume de recuperacoes dentro do padrao esperado para defensores.", yoy: hasPrev ? yoyStr(rcDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(rcDelta) : undefined });
      else if (matches >= 8)    out.push({ level: "critico", metric: "Recuperacoes · Volume Abaixo",      ref: `Atual: ${fd(rc90, 1)}/90 (${t.recoveries} total) · Minimo: 3.0/90 · Elite: >=7.0/90${prevRcStr}`, text: "Baixo numero de recuperacoes para um defensor. Pode indicar posicionamento passivo ou sistema tatico especifico.", yoy: hasPrev ? yoyStr(rcDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(rcDelta) : undefined });
    }

    if (f === "mid") {
      if (rc90 >= 5.0)          out.push({ level: "bom",     metric: "Recuperacoes · Volante Combativo", ref: `Atual: ${fd(rc90, 1)}/90 (${t.recoveries} total) · Elite meia: >=5.0/90 · Regular: 2.5-4.9/90${prevRcStr}`, text: "Perfil combativo com alta intensidade no setor intermediario.", yoy: hasPrev ? yoyStr(rcDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(rcDelta) : undefined });
      else if (rc90 >= 2.5)     out.push({ level: "regular", metric: "Recuperacoes · Meia com Cobertura", ref: `Atual: ${fd(rc90, 1)}/90 (${t.recoveries} total) · Elite: >=5.0/90 · Regular: 2.5-4.9/90${prevRcStr}`, text: "Meia com boa participacao defensiva e reconquista de bola no setor intermediario.", yoy: hasPrev ? yoyStr(rcDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(rcDelta) : undefined });
      else if (matches >= 7)    out.push({ level: "critico", metric: "Recuperacoes · Baixo Volume", ref: `Atual: ${fd(rc90, 1)}/90 (${t.recoveries} total) · Minimo meia: 2.5/90 · Elite: >=5.0/90${prevRcStr}`, text: "Meia com baixo volume de reconquista de bola — contribuicao defensiva abaixo do esperado.", yoy: hasPrev ? yoyStr(rcDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(rcDelta) : undefined });
    }
  }

  // ─── 10b. Pressing / Recuperacoes para atacantes ─────────────────────────
  if (f === "fwd" && t.recoveries > 0) {
    const rc90 = p90(t.recoveries, min);
    if (rc90 >= 3.5) {
      out.push({ level: "bom", metric: "Pressing · Atacante Combativo",
        ref: `Atual: ${fd(rc90, 1)} recuperacoes/90 (${t.recoveries} total) · Referencia para atacante: >=3.5/90`,
        text: "Atacante com alto volume de pressing e reconquista de bola no campo adversario. Perfil de alta intensidade defensiva." });
    }
  }

  // ─── 11. Goleiro ─────────────────────────────────────────────────────────
  if (f === "gk") {
    const tot   = t.saves + t.goals_conceded;
    const sp    = pctN(t.saves, tot);
    const cs    = pctN(t.clean_sheets, matches);
    const gc    = matches > 0 ? t.goals_conceded / matches : null;
    const prevSp = hasPrev && (prevT!.saves + prevT!.goals_conceded) > 0
      ? pctN(prevT!.saves, prevT!.saves + prevT!.goals_conceded)! : null;
    const spDelta  = prevSp !== null && sp !== null ? delta(sp, prevSp) : null;
    const prevSpStr = prevSp !== null ? ` · ${prevYear}: ${Math.round(prevSp)}%` : "";

    if (sp !== null && tot >= 10) {
      if      (sp >= 72) out.push({ level: "bom",     metric: "Defesas · Goleiro de Elite",       ref: `Atual: ${Math.round(sp)}% (${t.saves}/${tot}) · Elite: >=72% · Regular: 58-71%${prevSpStr}`, text: "Indice de aproveitamento de elite. Goleiro com alto impacto na solidez defensiva.", yoy: hasPrev ? yoyStr(spDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(spDelta) : undefined });
      else if (sp <  58) out.push({ level: "critico", metric: "Defesas · Taxa Abaixo do Padrao",  ref: `Atual: ${Math.round(sp)}% (${t.saves}/${tot}) · Minimo: 58% · Elite: >=72%${prevSpStr}`, text: `${t.goals_conceded} gols sofridos em ${matches} jogos. Taxa abaixo do minimo esperado.`, yoy: hasPrev ? yoyStr(spDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(spDelta) : undefined });
      else               out.push({ level: "regular", metric: "Defesas · Aproveitamento Regular", ref: `Atual: ${Math.round(sp)}% (${t.saves}/${tot}) · Elite: >=72% · Regular: 58-71%${prevSpStr}`, text: "Aproveitamento dentro do padrao esperado para a posicao.", yoy: hasPrev ? yoyStr(spDelta, prevYear!) : undefined, yoyColor: hasPrev ? yoyColor(spDelta) : undefined });
    }
    if (cs !== null && matches >= 5) {
      if      (cs >= 36) out.push({ level: "bom",     metric: "Clean Sheets · Alta Confiabilidade", ref: `Atual: ${t.clean_sheets}/${matches} jogos (${Math.round(cs)}%) · Alta: >=36% · Regular: 16-35% · Baixa: <16%`, text: "Goleiro com alta frequencia de jogos sem sofrer gols — solidez defensiva de alto nivel." });
      else if (cs >= 16) out.push({ level: "regular", metric: "Clean Sheets · Frequencia Regular",   ref: `Atual: ${t.clean_sheets}/${matches} jogos (${Math.round(cs)}%) · Alta: >=36% · Regular: 16-35% · Baixa: <16%`, text: "Frequencia de jogos sem sofrer gols dentro da media para a posicao." });
      else               out.push({ level: "critico", metric: "Clean Sheets · Frequencia Baixa",     ref: `Atual: ${t.clean_sheets}/${matches} jogos (${Math.round(cs)}%) · Minimo: 16% · Alta: >=36%`, text: "Baixa frequencia de partidas sem sofrer gols ao longo da temporada." });
    }
    if (gc !== null && matches >= 5) {
      if      (gc < 0.95) out.push({ level: "bom",     metric: "Gols Sofridos · Solidez de Elite", ref: `Atual: ${fd(gc, 2)} gols/jogo · Excelente: <0.95 · Regular: 0.95-1.60 · Preocupante: >1.60`, text: "Media de gols sofridos de elite. Goleiro decisivo na manutencao do resultado." });
      else if (gc <= 1.60) out.push({ level: "regular", metric: "Gols Sofridos · Media Regular",    ref: `Atual: ${fd(gc, 2)} gols/jogo · Excelente: <0.95 · Regular: 0.95-1.60 · Preocupante: >1.60`, text: "Media de gols sofridos dentro do padrao para a posicao." });
      else                 out.push({ level: "critico", metric: "Gols Sofridos · Indice Alto",      ref: `Atual: ${fd(gc, 2)} gols/jogo · Excelente: <0.95 · Preocupante: >1.60`, text: "Alta media de gols sofridos por partida — sistema defensivo fragilizado ou dificuldades tecnicas." });
    }
  }

  // ─── 12. Cruzamentos ─────────────────────────────────────────────────────
  const ct = t.crosses_success + t.crosses_failed;
  if (ct >= 8) {
    const ca   = pctN(t.crosses_success, ct)!;
    const cvol = p90(ct, min);
    if      (ca >= 40) out.push({ level: "bom",     metric: "Cruzamentos · Alta Precisao",     ref: `Atual: ${Math.round(ca)}% (${t.crosses_success}/${ct}) · ${fd(cvol, 1)}/90 · Alta: >=40% · Regular: 25-39%`, text: "Qualidade acima da media no jogo pelas laterais. Cruzamentos efetivos e de boa conversao." });
    else if (ca >= 25) out.push({ level: "regular", metric: "Cruzamentos · Eficiencia Regular", ref: `Atual: ${Math.round(ca)}% (${t.crosses_success}/${ct}) · ${fd(cvol, 1)}/90 · Alta: >=40% · Regular: 25-39%`, text: "Taxa de cruzamentos dentro da media. Ha espaco para maior precisao no jogo pelas laterais." });
    else               out.push({ level: "critico", metric: "Cruzamentos · Baixa Eficiencia",   ref: `Atual: ${Math.round(ca)}% (${t.crosses_success}/${ct}) · ${fd(cvol, 1)}/90 · Minimo: 25% · Alta: >=40%`, text: "Baixa efetividade nos cruzamentos. Contribuicao pelas laterais com pouco aproveitamento real." });
  }

  // ─── 13. Disciplina ─────────────────────────────────────────────────────
  if (t.red_cards > 0) {
    out.push({ level: "critico", metric: "Disciplina · Expulsoes",
      ref: `Atual: ${t.red_cards} expulsao${t.red_cards > 1 ? "es" : ""} em ${matches} jogos · Referencia ideal: 0 vermelhos/temporada`,
      text: "Expulsoes tem impacto direto na disponibilidade do atleta e no risco disciplinar percebido pelo mercado." });
  }
  if (matches > 0) {
    const yp10 = (t.yellow_cards / matches) * 10;
    if (yp10 >= 3.5) {
      out.push({ level: "critico", metric: "Disciplina · Alta Taxa de Amarelos",
        ref: `Atual: ${t.yellow_cards} amarelos em ${matches} jogos (${fd(yp10, 1)}/10 jogos) · Referencia segura: <=1.2/10 jogos`,
        text: "Taxa de cartoes acima do limiar de risco. Suspensoes frequentes comprometem a disponibilidade." });
    } else if (yp10 <= 1.2 && matches >= 8) {
      out.push({ level: "bom", metric: "Disciplina · Perfil Equilibrado",
        ref: `Atual: ${t.yellow_cards} amarelos em ${matches} jogos (${fd(yp10, 1)}/10 jogos) · Referencia segura: <=1.2/10 jogos`,
        text: "Atleta com perfil disciplinado ao longo da temporada. Baixo risco de suspensoes e impacto negativo de imagem." });
    }
  }

  // ─── 14. Posse de bola ───────────────────────────────────────────────────
  if (t.possession_lost > 0 && min >= 450) {
    const bp = p90(t.possession_lost, min);
    if (bp >= 8.0) {
      out.push({ level: "critico", metric: "Posse · Alta Perda de Bola",
        ref: `Atual: ${fd(bp, 1)}/90 (${t.possession_lost} total) · Preocupante: >=8.0/90 · Regular: 4.0-7.9/90`,
        text: "Frequencia elevada de perdas de posse expoe a equipe a transicoes adversas recorrentes." });
    } else if (bp <= 3.5 && t.passes_total >= 50) {
      out.push({ level: "bom", metric: "Posse · Seguranca com a Bola",
        ref: `Atual: ${fd(bp, 1)}/90 (${t.possession_lost} total) · Seguro: <=3.5/90 · Regular: 4.0-7.9/90`,
        text: "Baixa taxa de perda de posse em atleta com alto volume de passes. Excelente controle e decisao com a bola." });
    }
  }

  // ─── 15. Comparacoes YoY exclusivas (mudancas >=10%) ─────────────────────
  if (hasPrev && prevT && prevYear) {
    const curYearLabel = year > 0 ? `${year}` : "Atual";
    const checks: { label: string; curr: number; prev: number; unit: string; invertBad?: boolean }[] = [
      { label: "Minutagem",    curr: min,        prev: prevT.minutes, unit: "min"     },
      { label: "Gols",         curr: t.goals,    prev: prevT.goals,   unit: "gols"    },
      { label: "Assistencias", curr: t.assists,  prev: prevT.assists, unit: "assist." },
    ];
    if (min >= 450 && prevT.minutes >= 450) {
      if (f === "fwd" || f === "mid")
        checks.push({ label: "Gols/90", curr: p90(t.goals, min), prev: p90(prevT.goals, prevT.minutes), unit: "/90" });
      if (t.tackles > 0 && prevT.tackles > 0 && (f === "def" || f === "mid"))
        checks.push({ label: "Desarmes/90", curr: p90(t.tackles, min), prev: p90(prevT.tackles, prevT.minutes), unit: "/90" });
      if (t.recoveries > 0 && prevT.recoveries > 0)
        checks.push({ label: "Recuperacoes/90", curr: p90(t.recoveries, min), prev: p90(prevT.recoveries, prevT.minutes), unit: "/90" });
      if (t.key_passes > 0 && prevT.key_passes > 0)
        checks.push({ label: "Passes decisivos/90", curr: p90(t.key_passes, min), prev: p90(prevT.key_passes, prevT.minutes), unit: "/90" });
    }

    checks.forEach(({ label, curr, prev, unit, invertBad }) => {
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
        metric: improved ? `Evolucao vs ${prevYear} · ${label}` : `Regressao vs ${prevYear} · ${label}`,
        ref: `${curYearLabel}: ${fmt} ${unit} · ${prevYear}: ${pfmt} ${unit} · Variacao: ${sign}${Math.round(d)}%`,
        text: improved
          ? `Crescimento de ${sign}${Math.round(d)}% em ${label.toLowerCase()} em relacao a temporada ${prevYear}. Tendencia positiva relevante para avaliacao de desenvolvimento.`
          : `Queda de ${Math.round(Math.abs(d))}% em ${label.toLowerCase()} em relacao a temporada ${prevYear}. Inversao de tendencia que requer acompanhamento e analise contextual.`,
        yoy: `${sign}${Math.round(d)}% vs ${prevYear}`,
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
  hR:    { alignItems: "flex-end", justifyContent: "center" },
  hLogo: { width: 110, height: 36, objectFit: "contain" },
  hName: { fontSize: 22, fontWeight: 800, color: C.black, letterSpacing: -0.5, marginBottom: 3 },
  hSub:  { fontSize: 9, color: C.g500 },
  hTag:  { fontSize: 8, fontWeight: 700, color: C.red, letterSpacing: 0.5, marginBottom: 4 },
  hMeta: { fontSize: 8, color: C.g600, marginBottom: 2 },
  hBrand:{ fontSize: 7, color: C.g400 },

  secWrap: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 10 },
  secNum:  { fontSize: 7, fontWeight: 700, color: C.white, backgroundColor: C.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 8, letterSpacing: 0.5 },
  secTxt:  { fontSize: 9, fontWeight: 700, color: C.g600, letterSpacing: 1.2, textTransform: "uppercase" },
  secLine: { height: 1, backgroundColor: C.g200, flex: 1, marginLeft: 8 },

  // Competition list
  compList:    { borderRadius: 6, borderWidth: 1, borderColor: C.g200, marginBottom: 14, overflow: "hidden" },
  compHdr:     { flexDirection: "row", alignItems: "center", backgroundColor: C.g100, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.g200 },
  compHdrTxt:  { fontSize: 6.5, fontWeight: 700, color: C.g500, textTransform: "uppercase", letterSpacing: 0.8 },
  compRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.g100 },
  compRowLast: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9 },
  // col widths — must match between header and data rows exactly
  cName:  { flex: 1, fontSize: 9.5, fontWeight: 600, color: C.g900 },
  cTier:  { width: 24, fontSize: 7.5, fontWeight: 800, textAlign: "center", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, marginRight: 4 },
  cCoef:  { width: 42, fontSize: 8, color: C.g500, textAlign: "right" },
  cNum:   { width: 34, fontSize: 8, color: C.g700, textAlign: "right" },
  cNumB:  { width: 34, fontSize: 8, fontWeight: 700, color: C.g700, textAlign: "right" },

  // Total card — light background, red accent border
  tc:     { borderRadius: 6, borderWidth: 1, borderColor: C.g200, marginBottom: 12, overflow: "hidden", borderTopWidth: 3, borderTopColor: C.red },
  tcHdr:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.g200, backgroundColor: C.g50 },
  tcTit:  { fontSize: 11, fontWeight: 800, color: C.black, flex: 1 },
  tcSub:  { fontSize: 8, color: C.g500 },

  // Cat rows — left border carries the category color for P&B legibility
  catW:   { paddingLeft: 10, paddingRight: 12, paddingTop: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.g100, borderLeftWidth: 3 },
  catL:   { paddingLeft: 10, paddingRight: 12, paddingTop: 8, paddingBottom: 10, borderLeftWidth: 3 },
  catHdr: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  catDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 5 },
  catTxt: { fontSize: 6.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.g700 },
  grid:   { flexDirection: "row", flexWrap: "wrap" },

  // Stat boxes — value always black so P&B printing stays readable
  box:  { width: "25%", paddingRight: 5, paddingBottom: 5 },
  bIn:  { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: C.g50, borderWidth: 1, borderColor: C.g100 },
  bTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  bLbl: { fontSize: 6, color: C.g500, textTransform: "uppercase", letterSpacing: 0.3 },
  bPct: { fontSize: 6, fontWeight: 700, paddingHorizontal: 2.5, paddingVertical: 1, borderRadius: 2 },
  bVal: { fontSize: 14, fontWeight: 800, color: C.black, lineHeight: 1 },

  tcCatW: { paddingLeft: 10, paddingRight: 12, paddingTop: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.g100, borderLeftWidth: 3 },
  tcCatL: { paddingLeft: 10, paddingRight: 12, paddingTop: 8, paddingBottom: 10, borderLeftWidth: 3 },

  // Insight section
  iSec:    { marginBottom: 10 },
  iHdr:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  iHdrTx:  { fontSize: 9, fontWeight: 700 },
  iHdrCt:  { fontSize: 8, fontWeight: 400, marginLeft: 4 },
  iBody:   { borderLeftWidth: 3, borderRightWidth: 1, borderBottomWidth: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 4 },

  // Each insight item — wrap={false} prevents splitting across pages
  iItem:   { paddingTop: 8, paddingBottom: 8 },
  iSep:    { height: 1 },
  iTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  iDotW:   { width: 14, flexShrink: 0 },
  iDot:    { width: 7, height: 7, borderRadius: 3.5, marginTop: 1 },
  iMetric: { fontSize: 8, fontWeight: 700, letterSpacing: 0.1, flex: 1 },
  iYoy:    { fontSize: 6.5, fontWeight: 700, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3, flexShrink: 0, marginLeft: 6 },
  // Ref block: two lines inside a blue box
  iRefWrap:  { backgroundColor: C.infoBlueBg, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 4, marginBottom: 4, marginLeft: 14 },
  iRefCurr:  { fontSize: 7.5, fontWeight: 700, color: "#1D4ED8", marginBottom: 2 },
  iRefBench: { fontSize: 7, color: C.infoBlue },
  // Analysis text
  iTxt:    { fontSize: 8, color: C.g600, lineHeight: 1.5, marginLeft: 14 },

  footer: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.g200, paddingTop: 8 },
  ftxt:   { fontSize: 7, color: C.g400 },
});

// ─── Helpers de cor ───────────────────────────────────────────────────────────

function pctBadgeColor(p: number | null) {
  if (p === null) return C.g400;
  return p >= 60 ? C.green : p >= 50 ? "#CA8A04" : C.red;
}

function valColor(v: number, positive?: boolean, negative?: boolean) {
  if (positive && v > 0) return C.green;
  if (negative && v > 0) return C.red;
  return C.g900;
}

// ─── StatBox ─────────────────────────────────────────────────────────────────

interface StatItem { label: string; value: number; positive?: boolean; negative?: boolean; pct?: number | null }

function StatBox({ item }: { item: StatItem }) {
  const pc = item.pct !== undefined ? pctBadgeColor(item.pct ?? null) : null;
  return (
    <View style={s.box}>
      <View style={s.bIn}>
        <View style={s.bTop}>
          <Text style={s.bLbl}>{item.label}</Text>
          {item.pct !== undefined && pc !== null && (
            <Text style={[s.bPct, { color: C.g600, borderColor: C.g300, borderWidth: 0.5 }]}>
              {item.pct === null ? "0%" : `${Math.round(item.pct)}%`}
            </Text>
          )}
        </View>
        <Text style={s.bVal}>{fv(item.value)}</Text>
      </View>
    </View>
  );
}

// ─── CatBlock ────────────────────────────────────────────────────────────────

function CatBlock({ title, color, items, isLast = false, useTcStyle = false }: {
  title: string; color: string; items: StatItem[]; isLast?: boolean; useTcStyle?: boolean;
}) {
  const wrap = useTcStyle ? (isLast ? s.tcCatL : s.tcCatW) : (isLast ? s.catL : s.catW);
  return (
    <View style={[wrap, { borderLeftColor: color }]} wrap={false}>
      <View style={s.catHdr}>
        <View style={[s.catDot, { backgroundColor: color }]} />
        <Text style={s.catTxt}>{title}</Text>
      </View>
      <View style={s.grid}>
        {items.map((item, i) => <StatBox key={i} item={item} />)}
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

// ─── CompList — resumo de competições (sem stat boxes) ───────────────────────

function CompList({ rows, meta }: { rows: PublicSeasonRow[]; meta: Record<string, CompetitionMeta> }) {
  return (
    <View style={s.compList} wrap={false}>
      {/* Header */}
      <View style={s.compHdr}>
        <Text style={[s.compHdrTxt, { flex: 1 }]}>Competição</Text>
        <Text style={[s.compHdrTxt, { width: 24, textAlign: "center", marginRight: 4 }]}>Tier</Text>
        <Text style={[s.compHdrTxt, { width: 42, textAlign: "right" }]}>Coef.</Text>
        <Text style={[s.compHdrTxt, { width: 34, textAlign: "right" }]}>Jogos</Text>
        <Text style={[s.compHdrTxt, { width: 34, textAlign: "right" }]}>Min.</Text>
        <Text style={[s.compHdrTxt, { width: 34, textAlign: "right" }]}>Gols</Text>
        <Text style={[s.compHdrTxt, { width: 34, textAlign: "right" }]}>Ass.</Text>
      </View>
      {/* Rows */}
      {rows.map((row, i) => {
        const t      = toAgg(row.stats);
        const name   = row.competition_name ?? (row.competition_id ? meta[row.competition_id]?.name : undefined) ?? "—";
        const coeff  = row.competition_id ? (meta[row.competition_id]?.final_coefficient ?? 0) : 0;
        const tk     = tierK(coeff);
        const tier   = TIER[tk];
        const isLast = i === rows.length - 1;
        return (
          <View key={row.id} style={isLast ? s.compRowLast : s.compRow}>
            <Text style={s.cName}>{name}</Text>
            {/* Tier: only the letter to keep column narrow */}
            <Text style={[s.cTier, { backgroundColor: tier.bg, color: tier.fg }]}>{tk}</Text>
            <Text style={s.cCoef}>{coeff > 0 ? fd(coeff, 2) : "—"}</Text>
            <Text style={s.cNum}>{t.matches}</Text>
            <Text style={s.cNumB}>{t.minutes}</Text>
            <Text style={[s.cNumB, { color: t.goals   > 0 ? C.green : C.g600 }]}>{t.goals}</Text>
            <Text style={[s.cNumB, { color: t.assists > 0 ? C.green : C.g600 }]}>{t.assists}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── TotalCard — fundo claro com borda vermelha ───────────────────────────────

function TotalCard({ t, year, isGK }: { t: Agg; year: number; isGK: boolean }) {
  const blks = statBlocks(t, isGK);
  return (
    <View style={s.tc}>
      <View style={s.tcHdr}>
        <Text style={s.tcTit}>Total Geral · Temporada {year}</Text>
        <Text style={s.tcSub}>{t.matches} jogos · {n(t.minutes)} minutos disputados</Text>
      </View>
      <CatBlock title="Ataque"          color={C.red}   items={blks.ataque}  />
      <CatBlock title="Passes"          color={C.amber} items={blks.passes}  />
      <CatBlock title="Dribles / Posse" color={C.cyan}  items={blks.dribles} />
      <CatBlock title="Defesa"          color={C.blue}  items={blks.defesa}  isLast />
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
              {/* Ref: 3 linhas — atual (bold) · benchmarks · ano anterior */}
              {(() => {
                const parts      = ins.ref.split(" · ");
                const curr       = parts[0] ?? "";
                const rest       = parts.slice(1);
                // Segmentos que começam com um ano (4 dígitos): "2025: ..."
                const yearParts  = rest.filter(p => /^\d{4}:/.test(p.trim()));
                const benchParts = rest.filter(p => !/^\d{4}:/.test(p.trim()));
                const bench      = benchParts.join("  ·  ");
                const yearLine   = yearParts.join("  ·  ");
                return (
                  <View style={s.iRefWrap}>
                    <Text style={s.iRefCurr}>{curr}</Text>
                    {bench    ? <Text style={[s.iRefBench, { marginTop: 2 }]}>{bench}</Text>   : null}
                    {yearLine ? <Text style={[s.iRefBench, { marginTop: 2, color: C.g400 }]}>{yearLine}</Text> : null}
                  </View>
                );
              })()}
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

  const ins   = buildInsights(total, playerPosition, competitionMeta, rows, prevT, prevYear, year);
  const crits = ins.filter(i => i.level === "critico");
  const regs  = ins.filter(i => i.level === "regular");
  const goods = ins.filter(i => i.level === "bom");

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
            <Image src={logoM3} style={s.hLogo} />
          </View>
        </View>
        <View style={s.hLine} fixed />

        {/* 01 */}
        <SectionHead num="01" label="Competições da Temporada" />
        <CompList rows={rows} meta={competitionMeta} />

        {/* 02 */}
        <SectionHead num="02" label="Total Consolidado" />
        <TotalCard t={total} year={year} isGK={isGK} />

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
