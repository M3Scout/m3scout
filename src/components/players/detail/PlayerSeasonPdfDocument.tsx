/**
 * PDF de relatório estatístico de temporada — M3Scout.
 * Design executivo: tipografia clara, espaçamento generoso, sem overlaps.
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
  tier: string; // ignorado — recalculado via getTierFromCoefficient
}

export interface PlayerSeasonPdfProps {
  playerName: string;
  playerPosition?: string;
  year: number;
  rows: PublicSeasonRow[];
  competitionMeta: Record<string, CompetitionMeta>;
  generatedAt: string;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  red:      "#E5173F",
  amber:    "#F59E0B",
  cyan:     "#06B6D4",
  blue:     "#6B9EE5",
  green:    "#16A34A",
  greenL:   "#22C55E",
  white:    "#FFFFFF",
  black:    "#111111",
  g950:     "#09090B",
  g900:     "#18181B",
  g800:     "#27272A",
  g700:     "#3F3F46",
  g600:     "#52525B",
  g500:     "#71717A",
  g400:     "#A1A1AA",
  g300:     "#D4D4D8",
  g200:     "#E4E4E7",
  g100:     "#F4F4F5",
  g50:      "#FAFAFA",
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
const tierOf = (coeff: number) => TIER[getTierFromCoefficient(coeff) as keyof typeof TIER] ?? TIER.D;
const tierKey = (coeff: number) => getTierFromCoefficient(coeff) as keyof typeof TIER;

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

function sum(a: Agg, b: Agg): Agg {
  return Object.fromEntries(Object.keys(a).map(k => [k, (a as any)[k] + (b as any)[k]])) as Agg;
}

function totals(rows: PublicSeasonRow[]): Agg {
  return rows.map(r => toAgg(r.stats)).reduce(sum);
}

// ─── Posição ──────────────────────────────────────────────────────────────────

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
interface Ins { level: Level; metric: string; text: string }

function insights(t: Agg, position?: string, meta: Record<string, CompetitionMeta> = {}, rows: PublicSeasonRow[] = []): Ins[] {
  const out: Ins[] = [];
  const f = fam(position);
  const { minutes: min, matches } = t;

  // Coef. médio ponderado por minutos
  let cSum = 0, cMin = 0;
  rows.forEach(r => {
    if (r.competition_id && meta[r.competition_id]) { cSum += meta[r.competition_id].final_coefficient * r.stats.minutes; cMin += r.stats.minutes; }
  });
  const avgC = cMin > 0 ? cSum / cMin : null;

  // 1. Minutagem
  if      (min > 4200)  out.push({ level: "critico", metric: "Minutagem · Zona de Risco",    text: `${min} min em ${matches} jogos — acima do limite de segurança (4200 min). Alta propensão a queda de rendimento e lesões por fadiga acumulada. Rotação imediata e monitoramento físico recomendados.` });
  else if (min >= 2500) out.push({ level: "bom",     metric: "Minutagem · Protagonista",     text: `${min} min em ${matches} jogos — titular absoluto. Dados altamente confiáveis para análise de mercado e negociação.` });
  else if (min >= 1200) out.push({ level: "regular", metric: "Minutagem · Jogador de Elenco",text: `${min} min em ${matches} jogos — reserva imediato ou titular que perdeu espaço. Amostra parcial; dados confiáveis dentro do contexto.` });
  else                  out.push({ level: "critico", metric: "Minutagem · Amostragem Baixa", text: `Apenas ${min} min em ${matches} jogos — minutagem escassa compromete confiabilidade estatística. Necessita de sequência para validação real de desempenho.` });

  // 2. Nível de competição
  if (avgC !== null) {
    const tk = getTierFromCoefficient(avgC) as keyof typeof TIER;
    const tl = TIER[tk].label;
    if (tk === "S" || tk === "A") out.push({ level: "bom",     metric: "Nível de Competição · Tier " + tk, text: `Coef. médio ponderado ${fd(avgC, 2)} (${tl}). Estatísticas obtidas contra concorrência de alto nível — maior valor de mercado.` });
    else if (tk === "B")          out.push({ level: "regular", metric: "Nível de Competição · Tier B",       text: `Coef. médio ${fd(avgC, 2)} (Intermediário). Bom parâmetro base, mas exige ajuste ao comparar com mercados de topo.` });
    else                          out.push({ level: "critico", metric: "Nível de Competição · Tier " + tk, text: `Coef. médio ${fd(avgC, 2)} (${tl}). Nível inferior reduz peso das estatísticas na avaliação de mercado. Confirmação em competições de maior coeficiente necessária.` });
  }

  if (min < 270) return out;

  // 3. Passe — precisão + volume
  if (t.passes_total >= 40) {
    const acc = pctN(t.passes_completed, t.passes_total)!;
    const vol = p90(t.passes_total, min);
    if      (acc >= 78) out.push({ level: "bom",     metric: "Passes · Alta Precisão",       text: `${Math.round(acc)}% de aproveitamento (${t.passes_completed}/${t.passes_total}) — ${fd(vol, 1)}/90 min. Circulação de bola acima da média de mercado.` });
    else if (acc >= 65) out.push({ level: "regular", metric: "Passes · Aproveitamento Regular",text: `${Math.round(acc)}% de precisão (${t.passes_completed}/${t.passes_total}) — ${fd(vol, 1)} passes/90 min dentro do esperado.` });
    else                out.push({ level: "critico", metric: "Passes · Precisão Crítica",     text: `${Math.round(acc)}% de aproveitamento (${t.passes_completed}/${t.passes_total}) — abaixo do mínimo aceitável. ${fd(vol, 1)}/90 min com alta taxa de perda compromete a circulação.` });
  }

  // 4. Passes decisivos / criação
  if (t.passes_total >= 40 && min >= 450) {
    const kp = p90(t.key_passes, min);
    if      (kp >= 1.5) out.push({ level: "bom",     metric: "Passes Decisivos · Criação de Elite", text: `${fd(kp, 1)}/90 min (${t.key_passes} total) — perfil criativo de alto impacto ofensivo.` });
    else if (kp >= 0.7) out.push({ level: "regular", metric: "Passes Decisivos · Regular",           text: `${fd(kp, 1)}/90 min — participação ofensiva consistente dentro do esperado.` });
  }

  // 5. Finalização
  if (f !== "gk" && t.shots >= 8) {
    const acc = pctN(t.shots_on_target, t.shots)!;
    const vol = p90(t.shots, min);
    if      (acc >= 42) out.push({ level: "bom",     metric: "Finalização · Alta Conversão",    text: `${Math.round(acc)}% dos chutes no alvo (${t.shots_on_target}/${t.shots}) — ${fd(vol, 1)}/90 min. Eficiência de elite.` });
    else if (acc >= 28) out.push({ level: "regular", metric: "Finalização · Eficiência Regular", text: `${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) — ${fd(vol, 1)}/90 min dentro da média.` });
    else                out.push({ level: "critico", metric: "Finalização · Baixa Eficiência",   text: `${Math.round(acc)}% no alvo (${t.shots_on_target}/${t.shots}) — taxa crítica. ${fd(vol, 1)}/90 min sem conversão efetiva.` });
  }

  // 6. Gols/90
  if (f === "fwd" || f === "mid") {
    const g = p90(t.goals, min);
    if (f === "fwd") {
      if      (g >= 0.50) out.push({ level: "bom",     metric: "Gols/90 · Artilheiro de Elite",      text: `${fd(g, 2)}/90 (${t.goals} total) — índice dominante para a posição.` });
      else if (g >= 0.25) out.push({ level: "regular", metric: "Gols/90 · Produção Regular",          text: `${fd(g, 2)}/90 (${t.goals} total) — dentro da faixa esperada para atacante.` });
      else                out.push({ level: "critico", metric: "Gols/90 · Produção Insuficiente",     text: `${fd(g, 2)} gols/90 (${t.goals} no total) — abaixo do esperado para atacante. Revisão tática recomendada.` });
    } else if (g >= 0.20) {
      out.push({ level: "bom", metric: "Gols/90 · Meio-campo Decisivo", text: `${fd(g, 2)}/90 (${t.goals} total) — contribuição ofensiva acima do esperado para meio-campo.` });
    }
  }

  // 7. Assistências
  if (f === "fwd" || f === "mid") {
    const a = p90(t.assists, min);
    if      (a >= 0.30)              out.push({ level: "bom",     metric: "Assistências · Alto Nível",          text: `${fd(a, 2)}/90 (${t.assists} total) — assistente prolífico e decisivo no jogo coletivo.` });
    else if (a >= 0.12)              out.push({ level: "regular", metric: "Assistências · Contribuição Regular", text: `${fd(a, 2)}/90 (${t.assists} total) — participação ofensiva coletiva dentro do padrão.` });
    else if (matches >= 10 && t.assists === 0) out.push({ level: "critico", metric: "Assistências · Ausência Total",   text: `0 assistências em ${matches} jogos — participação na criação coletiva precisa evoluir significativamente.` });
  }

  // 8. Dribles
  if (t.dribbles_total >= 10) {
    const acc = pctN(t.dribbles_success, t.dribbles_total)!;
    const vol = p90(t.dribbles_success, min);
    if (acc >= 65 && vol >= 2.0) out.push({ level: "bom",     metric: "Dribles · Dominância Individual",text: `${Math.round(acc)}% de êxito (${t.dribbles_success}/${t.dribbles_total}) — ${fd(vol, 1)}/90 min. Diferencial técnico individual notável.` });
    else if (acc < 40 && t.dribbles_total >= 15) out.push({ level: "critico", metric: "Dribles · Baixa Eficiência", text: `${Math.round(acc)}% de êxito em ${t.dribbles_total} tentativas — perda de bola frequente em situações de 1×1.` });
  }

  // 9. Duelos terrestres
  if (t.ground_duels_total >= 15) {
    const w = pctN(t.ground_duels_won, t.ground_duels_total)!;
    if      (w >= 55) out.push({ level: "bom",     metric: "Duelos Terrestres · Dominante",  text: `${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) — superioridade física e tática em confrontos diretos.` });
    else if (w < 44)  out.push({ level: "critico", metric: "Duelos Terrestres · Deficitário", text: `${Math.round(w)}% vencidos (${t.ground_duels_won}/${t.ground_duels_total}) — fragilidade em confrontos diretos.` });
    else              out.push({ level: "regular", metric: "Duelos Terrestres · Regular",     text: `${Math.round(w)}% — desempenho dentro da média para a posição.` });
  }

  // 10. Duelos aéreos
  if (t.aerial_duels_total >= 10 && (f === "def" || f === "fwd")) {
    const w = pctN(t.aerial_duels_won, t.aerial_duels_total)!;
    if      (w >= 60) out.push({ level: "bom",     metric: "Jogo Aéreo · Dominante",   text: `${Math.round(w)}% ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) — forte presença em bolas aéreas.` });
    else if (w < 38)  out.push({ level: "critico", metric: "Jogo Aéreo · Deficitário", text: `${Math.round(w)}% em duelos aéreos — fragilidade em bolas cruzadas e escanteios.` });
  }

  // 11. Ações defensivas
  if (f === "def" || f === "mid") {
    const tk = p90(t.tackles, min); const ic = p90(t.interceptions, min);
    const rc = p90(t.recoveries, min); const cl = p90(t.clearances, min);
    if (f === "def") {
      if      (tk >= 3.5)              out.push({ level: "bom",     metric: "Desarmes · Alta Intensidade", text: `${fd(tk, 1)}/90 (${t.tackles} total) — defensor com marcação intensa e agressiva.` });
      else if (tk < 1.5 && matches >= 8) out.push({ level: "critico", metric: "Desarmes · Volume Baixo",   text: `${fd(tk, 1)}/90 — abaixo do mínimo esperado para um defensor.` });
      if (ic >= 2.5)  out.push({ level: "bom", metric: "Interceptações · Leitura de Jogo", text: `${fd(ic, 1)}/90 (${t.interceptions} total) — excelente antecipação defensiva.` });
      if (cl >= 4.0)  out.push({ level: "bom", metric: "Cortes · Proteção da Área",       text: `${fd(cl, 1)}/90 (${t.clearances} total) — forte presença de limpeza na área.` });
    }
    if (f === "mid" && rc >= 5.0) out.push({ level: "bom", metric: "Recuperações · Volante Combativo", text: `${fd(rc, 1)}/90 (${t.recoveries} total) — alta intensidade no setor intermediário.` });
  }

  // 12. Goleiro
  if (f === "gk") {
    const tot = t.saves + t.goals_conceded;
    const sp = pctN(t.saves, tot); const cs = pctN(t.clean_sheets, matches); const gc = matches > 0 ? t.goals_conceded / matches : null;
    if (sp !== null && tot >= 10) {
      if      (sp >= 72) out.push({ level: "bom",     metric: "Defesas · Goleiro de Elite",       text: `${Math.round(sp)}% de aproveitamento — ${t.saves} defesas. Índice de goleiro de alto nível.` });
      else if (sp < 58)  out.push({ level: "critico", metric: "Defesas · Taxa Abaixo do Padrão",  text: `${Math.round(sp)}% — abaixo do mínimo esperado (58%). ${t.goals_conceded} gols sofridos em ${matches} jogos.` });
      else               out.push({ level: "regular", metric: "Defesas · Aproveitamento Regular", text: `${Math.round(sp)}% de defesas (${t.saves}/${tot}) — dentro do padrão da posição.` });
    }
    if (cs !== null && matches >= 5) {
      if      (cs >= 36) out.push({ level: "bom",     metric: "Clean Sheets · Alta Confiabilidade", text: `${t.clean_sheets} de ${matches} jogos sem sofrer gols (${Math.round(cs)}%).` });
      else if (cs < 16)  out.push({ level: "critico", metric: "Clean Sheets · Frequência Baixa",    text: `Apenas ${t.clean_sheets} de ${matches} jogos sem sofrer gols (${Math.round(cs)}%).` });
    }
    if (gc !== null && matches >= 5) {
      if      (gc < 0.95) out.push({ level: "bom",     metric: "Gols Sofridos · Solidez de Elite", text: `Média de ${fd(gc, 2)} gols sofridos/jogo — solidez defensiva de alto nível.` });
      else if (gc > 1.6)  out.push({ level: "critico", metric: "Gols Sofridos · Índice Alto",      text: `Média de ${fd(gc, 2)} gols/jogo em ${matches} partidas — sistema frágil ou dificuldades técnicas.` });
    }
  }

  // 13. Cruzamentos
  const ct = t.crosses_success + t.crosses_failed;
  if (ct >= 15) {
    const ca = pctN(t.crosses_success, ct)!;
    if      (ca >= 40) out.push({ level: "bom",     metric: "Cruzamentos · Alta Precisão",    text: `${Math.round(ca)}% certos (${t.crosses_success}/${ct}) — qualidade acima da média no jogo pelas laterais.` });
    else if (ca < 25)  out.push({ level: "critico", metric: "Cruzamentos · Baixa Eficiência", text: `${Math.round(ca)}% de êxito em ${ct} cruzamentos — contribuição lateral limitada.` });
  }

  // 14. Disciplina
  if (t.red_cards > 0) out.push({ level: "critico", metric: "Disciplina · Expulsões", text: `${t.red_cards} expulsão${t.red_cards > 1 ? "ões" : ""} — impacto na disponibilidade e risco disciplinar de mercado.` });
  if (matches > 0) {
    const yp10 = (t.yellow_cards / matches) * 10;
    if      (yp10 >= 3.5)              out.push({ level: "critico", metric: "Disciplina · Alta Taxa de Amarelos", text: `${t.yellow_cards} amarelos em ${matches} jogos (${fd(yp10, 1)}/10 partidas) — risco disciplinar significativo.` });
    else if (yp10 <= 1.2 && matches >= 10) out.push({ level: "bom", metric: "Disciplina · Perfil Equilibrado",   text: `${t.yellow_cards} cartões em ${matches} jogos — atleta disciplinado, baixo risco de suspensões.` });
  }

  // 15. Bolas perdidas
  if (t.possession_lost > 0 && min >= 450) {
    const bp = p90(t.possession_lost, min);
    if (bp >= 8.0) out.push({ level: "critico", metric: "Posse · Alta Perda de Bola", text: `${fd(bp, 1)} bolas perdidas/90 (${t.possession_lost} total) — expõe a equipe a transições adversas com frequência.` });
  }

  return out;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Page
  page: { paddingTop: 36, paddingBottom: 50, paddingHorizontal: 36, fontFamily: "Helvetica", color: C.g900, backgroundColor: C.white },

  // ── Header ──
  hdr:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  hLine: { height: 3, backgroundColor: C.red, marginBottom: 20 },
  hL:    { flex: 1 },
  hR:    { backgroundColor: C.g50, borderWidth: 1, borderColor: C.g200, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, alignItems: "flex-end", minWidth: 140 },
  hName: { fontSize: 22, fontWeight: 800, color: C.black, letterSpacing: -0.5, marginBottom: 3 },
  hSub:  { fontSize: 9, color: C.g500 },
  hTag:  { fontSize: 8, fontWeight: 700, color: C.red, letterSpacing: 0.5, marginBottom: 4 },
  hMeta: { fontSize: 8, color: C.g600, marginBottom: 2 },
  hBrand:{ fontSize: 7, color: C.g400 },

  // ── Section heading ──
  secWrap: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 10 },
  secNum:  { fontSize: 7, fontWeight: 700, color: C.white, backgroundColor: C.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 8, letterSpacing: 0.5 },
  secTxt:  { fontSize: 9, fontWeight: 700, color: C.g600, letterSpacing: 1.2, textTransform: "uppercase", flex: 1 },
  secLine: { height: 1, backgroundColor: C.g200, flex: 1, marginLeft: 8 },

  // ── Competition card ──
  cc:      { borderRadius: 6, borderWidth: 1, borderColor: C.g200, marginBottom: 12, overflow: "hidden" },
  ccHdr:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.g200, backgroundColor: C.g50 },
  ccName:  { fontSize: 10, fontWeight: 700, color: C.black, flex: 1 },
  ccRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  ccCoeff: { fontSize: 8, color: C.g500 },
  ccTier:  { fontSize: 7.5, fontWeight: 800, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  ccGames: { fontSize: 8, color: C.g500 },

  // ── Category block ──
  catWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.g100 },
  catLast: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  catHdr:  { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  catDot:  { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  catTxt:  { fontSize: 6.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" },
  catGrid: { flexDirection: "row", flexWrap: "wrap" },

  // ── Stat box ──
  box:   { width: "25%", paddingRight: 5, paddingBottom: 5 },
  bInner:{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: C.g50, borderWidth: 1, borderColor: C.g100 },
  bTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  bLabel:{ fontSize: 6, color: C.g400, textTransform: "uppercase", letterSpacing: 0.3 },
  bPct:  { fontSize: 6, fontWeight: 700, paddingHorizontal: 2.5, paddingVertical: 1, borderRadius: 2 },
  bVal:  { fontSize: 14, fontWeight: 800, color: C.g900, lineHeight: 1 },

  // ── Dark total card ──
  tc:     { borderRadius: 6, backgroundColor: C.g950, marginBottom: 12, overflow: "hidden" },
  tcHdr:  { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  tcTit:  { fontSize: 10, fontWeight: 700, color: C.white },
  tcSub:  { fontSize: 8, color: C.g500, marginTop: 2 },
  tcCatW: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  tcCatL: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  dbInner:{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  dbVal:  { fontSize: 14, fontWeight: 800, color: C.white, lineHeight: 1 },
  dbLabel:{ fontSize: 6, color: C.g500, textTransform: "uppercase", letterSpacing: 0.3 },

  // ── Weighted card ──
  wCard:  { borderRadius: 6, backgroundColor: C.g950, marginBottom: 14, paddingHorizontal: 16, paddingVertical: 14, overflow: "hidden" },
  wTitle: { fontSize: 9, fontWeight: 700, color: C.white, marginBottom: 2 },
  wSub:   { fontSize: 7.5, color: C.g500, marginBottom: 14 },
  wGrid:  { flexDirection: "row" },
  wItem:  { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.07)", paddingHorizontal: 4 },
  wItemL: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  wVal:   { fontSize: 18, fontWeight: 800, color: C.white, marginBottom: 3 },
  wLabel: { fontSize: 6, color: C.g500, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 2 },
  wBruto: { fontSize: 7, color: C.amber, textAlign: "center" },

  // ── Insight section ──
  insSection: { marginBottom: 10 },
  insHdrRow:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  insHdrTxt:  { fontSize: 9, fontWeight: 700 },
  insCount:   { fontSize: 8, fontWeight: 400, marginLeft: 4 },
  insBody:    { borderLeftWidth: 3, borderRightWidth: 1, borderBottomWidth: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },

  // ── Each insight item — wrap={false} prevents splitting ──
  insItem:    { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  insSep:     { height: 1, marginHorizontal: 0 },
  insDotWrap: { width: 14, paddingTop: 3, flexShrink: 0 },
  insDot:     { width: 8, height: 8, borderRadius: 4 },
  insContent: { flex: 1 },
  insMetric:  { fontSize: 7.5, fontWeight: 700, marginBottom: 3, letterSpacing: 0.2 },
  insText:    { fontSize: 8.5, lineHeight: 1.55, color: C.g600 },

  // ── Footer ──
  footer:    { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.g200, paddingTop: 8 },
  ftxt:      { fontSize: 7, color: C.g400 },
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
  const inner = dark ? s.dbInner : s.bInner;
  const labelStyle = dark ? s.dbLabel : s.bLabel;
  const valStyle   = dark ? s.dbVal   : s.bVal;
  return (
    <View style={s.box}>
      <View style={inner}>
        <View style={s.bTop}>
          <Text style={labelStyle}>{item.label}</Text>
          {item.pct !== undefined && pc !== null && (
            <Text style={[s.bPct, { color: pc, borderColor: pc, borderWidth: 0.5 }]}>
              {item.pct === null ? "0%" : `${Math.round(item.pct)}%`}
            </Text>
          )}
        </View>
        <Text style={[valStyle, { color: vc }]}>{fv(item.value)}</Text>
      </View>
    </View>
  );
}

// ─── CategoryBlock ───────────────────────────────────────────────────────────

function CatBlock({ title, color, items, isLast = false, dark = false }: {
  title: string; color: string; items: StatItem[]; isLast?: boolean; dark?: boolean;
}) {
  const wrap = dark ? (isLast ? s.tcCatL : s.tcCatW) : (isLast ? s.catLast : s.catWrap);
  return (
    <View style={wrap} wrap={false}>
      <View style={s.catHdr}>
        <View style={[s.catDot, { backgroundColor: color }]} />
        <Text style={[s.catTxt, { color }]}>{title}</Text>
      </View>
      <View style={s.catGrid}>
        {items.map((item, i) => <StatBox key={i} item={item} dark={dark} />)}
      </View>
    </View>
  );
}

// ─── Build stat arrays from Agg ──────────────────────────────────────────────

function blocks(t: Agg, isGK: boolean) {
  const ataque: StatItem[] = [
    { label: "Gols",          value: t.goals,            positive: true },
    { label: "Final. Gol",    value: t.shots_on_target,  positive: true },
    { label: "Final. Fora",   value: t.shots_off_target              },
    { label: "Final. Bloq.",  value: t.shots_blocked                 },
    { label: "Na Trave",      value: t.shots_on_post,    positive: true },
    { label: "Final. Total",  value: t.shots                         },
    { label: "Impedim.",      value: t.offsides,         negative: true },
    { label: "Pên. Sofrido",  value: t.penalties_won,    positive: true },
  ];
  const passes: StatItem[] = [
    { label: "Assist.",           value: t.assists,             positive: true },
    { label: "Passes Dec.",       value: t.key_passes,          positive: true },
    { label: "Chances",           value: t.chances_created,     positive: true },
    { label: "Passes ✓",          value: t.passes_completed,    positive: true, pct: pctN(t.passes_completed, t.passes_total) },
    { label: "Passes ✗",          value: t.passes_failed,       negative: true },
    { label: "Pass. Prog.",       value: t.progressive_passes,  positive: true },
    { label: "Passes Tot.",       value: t.passes_total                        },
    { label: "Cruzam. ✓",         value: t.crosses_success,     positive: true, pct: pctN(t.crosses_success, t.crosses_success + t.crosses_failed) },
    { label: "Cruzam. ✗",         value: t.crosses_failed,      negative: true },
    { label: "Passe Longo ✓",     value: t.long_passes_accurate, positive: true, pct: pctN(t.long_passes_accurate, t.long_passes_total) },
    { label: "Passe Longo ✗",     value: t.long_passes_failed,  negative: true },
    { label: "Passe Longo Tot.",  value: t.long_passes_total                   },
  ];
  const dribles: StatItem[] = [
    { label: "Dribles ✓",    value: t.dribbles_success, positive: true, pct: pctN(t.dribbles_success, t.dribbles_total) },
    { label: "Dribles ✗",    value: t.dribbles_failed,  negative: true },
    { label: "Dribles Tot.", value: t.dribbles_total                   },
    { label: "Faltas Sof.",  value: t.fouls_suffered                   },
    { label: "Bolas Perd.",  value: t.possession_lost,  negative: true },
  ];
  const defesa: StatItem[] = [
    { label: "Roubada de Bola",  value: t.steals,            positive: true },
    { label: "Desarmes",         value: t.tackles,            positive: true },
    { label: "Interc.",          value: t.interceptions,      positive: true },
    { label: "Cortes",           value: t.clearances,         positive: true },
    { label: "Recup.",           value: t.recoveries,         positive: true },
    { label: "Chute Bloq.",      value: t.blocked_shots,      positive: true },
    { label: "Dribles Sofridos", value: t.was_dribbled,       negative: true },
    { label: "Duelo Chão ✓",     value: t.ground_duels_won,   positive: true, pct: pctN(t.ground_duels_won, t.ground_duels_total) },
    { label: "Duelo Chão ✗",     value: Math.max(0, t.ground_duels_total - t.ground_duels_won), negative: true },
    { label: "Duelo Chão Tot.",  value: t.ground_duels_total },
    { label: "Duelo Aéreo ✓",    value: t.aerial_duels_won,   positive: true, pct: pctN(t.aerial_duels_won, t.aerial_duels_total) },
    { label: "Duelo Aéreo ✗",    value: Math.max(0, t.aerial_duels_total - t.aerial_duels_won), negative: true },
    { label: "Duelo Aéreo Tot.", value: t.aerial_duels_total },
    { label: "Faltas Com.",      value: t.fouls_committed,    negative: true },
    { label: "Amarelos",         value: t.yellow_cards,       negative: true },
    { label: "Vermelhos",        value: t.red_cards,          negative: true },
    ...(isGK ? [
      { label: "Defesas",     value: t.saves,          positive: true } as StatItem,
      { label: "Gols Sof.",   value: t.goals_conceded, negative: true } as StatItem,
      { label: "Clean Sheet", value: t.clean_sheets,   positive: true } as StatItem,
      { label: "Pên. Salvos", value: t.penalties_saved,positive: true } as StatItem,
    ] : []),
  ];
  return { ataque, passes, dribles, defesa };
}

// ─── CompCard ────────────────────────────────────────────────────────────────

function CompCard({ row, meta, isGK }: { row: PublicSeasonRow; meta?: CompetitionMeta; isGK: boolean }) {
  const t    = toAgg(row.stats);
  const name = row.competition_name ?? meta?.name ?? "—";
  const coeff = meta?.final_coefficient ?? 0;
  const tk   = tierKey(coeff);
  const tier = TIER[tk];
  const blks = blocks(t, isGK);
  return (
    <View style={[s.cc, { borderTopWidth: 3, borderTopColor: tier.bg }]} wrap={false}>
      <View style={s.ccHdr}>
        <Text style={s.ccName}>{name}</Text>
        <View style={s.ccRight}>
          {coeff > 0 && <Text style={s.ccCoeff}>Coef. {fd(coeff, 2)}</Text>}
          <Text style={[s.ccTier, { backgroundColor: tier.bg, color: tier.fg }]}>{tk} · {tier.label}</Text>
          <Text style={s.ccGames}>{t.matches} J · {t.minutes} min</Text>
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
  const blks = blocks(t, isGK);
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

interface InsSectionProps {
  title: string;
  countLabel: string;
  items: Ins[];
  color: string;
  bgHeader: string;
  dotColor: string;
  metricColor: string;
  borderColor: string;
  separatorColor: string;
}

function InsightSection({ title, countLabel, items, color, bgHeader, dotColor, metricColor, borderColor, separatorColor }: InsSectionProps) {
  if (!items.length) return null;
  return (
    <View style={s.insSection}>
      {/* Header strip */}
      <View style={[s.insHdrRow, { backgroundColor: bgHeader }]}>
        <Text style={[s.insHdrTxt, { color }]}>{title}</Text>
        <Text style={[s.insCount, { color }]}>— {countLabel}</Text>
      </View>
      {/* Body with left border accent */}
      <View style={[s.insBody, { borderLeftColor: color, borderRightColor: borderColor, borderBottomColor: borderColor }]}>
        {items.map((ins, i) => (
          <View key={i}>
            {/* wrap={false} ensures this item never splits across pages */}
            <View style={s.insItem} wrap={false}>
              <View style={s.insDotWrap}>
                <View style={[s.insDot, { backgroundColor: dotColor }]} />
              </View>
              <View style={s.insContent}>
                <Text style={[s.insMetric, { color: metricColor }]}>{ins.metric}</Text>
                <Text style={s.insText}>{ins.text}</Text>
              </View>
            </View>
            {/* Separator between items (not after last) */}
            {i < items.length - 1 && (
              <View style={[s.insSep, { backgroundColor: separatorColor }]} />
            )}
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
  playerName, playerPosition, year, rows, competitionMeta, generatedAt,
}: PlayerSeasonPdfProps) {
  const isGK   = fam(playerPosition) === "gk";
  const total  = totals(rows);
  const ins    = insights(total, playerPosition, competitionMeta, rows);
  const crits  = ins.filter(i => i.level === "critico");
  const regs   = ins.filter(i => i.level === "regular");
  const goods  = ins.filter(i => i.level === "bom");

  // Números ponderados por coeficiente × minutos
  let wG = 0, wA = 0, wPa = 0, wPd = 0, wDa = 0, wDd = 0, cSum = 0, cN = 0;
  rows.forEach(r => {
    const c = r.competition_id ? (competitionMeta[r.competition_id]?.final_coefficient ?? 1) : 1;
    const m = r.stats.minutes;
    if (!m) return;
    wG += p90(r.stats.goals, m) * c;
    wA += p90(r.stats.assists, m) * c;
    if (r.stats.passes_total > 0)        { wPa += pctN(r.stats.passes_completed, r.stats.passes_total)! * c;      wPd += c; }
    if (r.stats.ground_duels_total > 0)  { wDa += pctN(r.stats.ground_duels_won, r.stats.ground_duels_total)! * c; wDd += c; }
    cSum += c; cN++;
  });
  const avgC = cN ? cSum / cN : 1;
  const wGoals   = cN ? wG / cN : 0;
  const wAssists = cN ? wA / cN : 0;
  const wPass    = wPd ? wPa / wPd : null;
  const wDuel    = wDd ? wDa / wDd : null;

  return (
    <Document title={`Relatório · ${playerName} · ${year}`} author="M3Scout" subject="Relatório de Temporada">
      <Page size="A4" style={s.page}>

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <View style={s.hdr} fixed>
          <View style={s.hL}>
            <Text style={s.hName}>{playerName}</Text>
            <Text style={s.hSub}>{playerPosition ?? "—"} · Temporada {year}</Text>
          </View>
          <View style={s.hR}>
            <Text style={s.hTag}>RELATÓRIO GERAL</Text>
            <Text style={s.hMeta}>Temporada {year}</Text>
            <Text style={s.hBrand}>M3Scout · Intelligence Platform</Text>
          </View>
        </View>
        <View style={s.hLine} fixed />

        {/* ── SEÇÃO 01: Por competição ───────────────────────────────────── */}
        <SectionHead num="01" label="Estatísticas por Competição" />
        {rows.map(row => (
          <CompCard
            key={row.id}
            row={row}
            meta={row.competition_id ? competitionMeta[row.competition_id] : undefined}
            isGK={isGK}
          />
        ))}

        {/* ── SEÇÃO 02: Total consolidado ───────────────────────────────── */}
        <SectionHead num="02" label="Total Consolidado" />
        <TotalCard t={total} year={year} isGK={isGK} />

        {/* ── Ponderados ────────────────────────────────────────────────── */}
        <View style={s.wCard} wrap={false}>
          <Text style={s.wTitle}>Números Ponderados por Coeficiente de Competição</Text>
          <Text style={s.wSub}>Eficiência real de mercado — peso proporcional ao final_coefficient · Coef. médio: {fd(avgC, 2)}</Text>
          <View style={s.wGrid}>
            {[
              { label: "Gols / 90\nPonderado",    value: fd(wGoals, 2),                              bruto: `bruto: ${fd(p90(total.goals, total.minutes), 2)} / 90`   },
              { label: "Assist. / 90\nPonderado", value: fd(wAssists, 2),                            bruto: `bruto: ${fd(p90(total.assists, total.minutes), 2)} / 90` },
              { label: "Passe %\nPonderado",      value: wPass !== null ? `${Math.round(wPass)}%` : "—", bruto: `bruto: ${pctS(total.passes_completed, total.passes_total)}`  },
              { label: "Duelo %\nPonderado",      value: wDuel !== null ? `${Math.round(wDuel)}%` : "—", bruto: `bruto: ${pctS(total.ground_duels_won, total.ground_duels_total)}` },
            ].map((w, i, arr) => (
              <View key={i} style={i < arr.length - 1 ? s.wItem : s.wItemL}>
                <Text style={s.wVal}>{w.value}</Text>
                <Text style={s.wLabel}>{w.label}</Text>
                <Text style={s.wBruto}>{w.bruto}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── SEÇÃO 03: Scout Intelligence ─────────────────────────────── */}
        <SectionHead num="03" label="Inteligência de Scout · Análise Tática" />

        <InsightSection
          title="Pontos Críticos"
          countLabel={`${crits.length} alerta${crits.length > 1 ? "s" : ""} identificado${crits.length > 1 ? "s" : ""}`}
          items={crits}
          color={C.red}
          bgHeader="rgba(229,23,63,0.07)"
          dotColor={C.red}
          metricColor={C.red}
          borderColor="rgba(229,23,63,0.2)"
          separatorColor="rgba(229,23,63,0.08)"
        />

        <InsightSection
          title="Desempenho Regular"
          countLabel={`${regs.length} ponto${regs.length > 1 ? "s" : ""} estável${regs.length > 1 ? "is" : ""}`}
          items={regs}
          color="#92400E"
          bgHeader="rgba(245,158,11,0.07)"
          dotColor={C.amber}
          metricColor="#78350F"
          borderColor="rgba(245,158,11,0.2)"
          separatorColor="rgba(245,158,11,0.08)"
        />

        <InsightSection
          title="Pontos de Destaque"
          countLabel={`${goods.length} diferencial${goods.length > 1 ? "ais" : ""} identificado${goods.length > 1 ? "s" : ""}`}
          items={goods}
          color={C.green}
          bgHeader="rgba(22,163,74,0.07)"
          dotColor={C.greenL}
          metricColor="#14532D"
          borderColor="rgba(22,163,74,0.2)"
          separatorColor="rgba(22,163,74,0.08)"
        />

        <Footer name={playerName} year={year} date={generatedAt} />
      </Page>
    </Document>
  );
}
