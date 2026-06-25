/**
 * PDF de relatório estatístico de temporada — M3Scout.
 * Usa @react-pdf/renderer para saída vetorial.
 * Tier sempre derivado do final_coefficient via getTierFromCoefficient.
 */
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "@/lib/pdfStyles";
import { getTierFromCoefficient } from "@/lib/tierClassification";
import type { PublicSeasonRow } from "@/lib/mergeSeasonStats";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface CompetitionMeta {
  id: string;
  name: string;
  final_coefficient: number;
  /** Ignorado — sempre recalculado via getTierFromCoefficient. */
  tier: string;
}

export interface PlayerSeasonPdfProps {
  playerName: string;
  playerPosition?: string;
  year: number;
  rows: PublicSeasonRow[];
  competitionMeta: Record<string, CompetitionMeta>;
  generatedAt: string;
}

// ─── Paleta e tier ────────────────────────────────────────────────────────────

// Cores exactas de CompetitionVisuals.TIER_COLORS
const TIER_COLORS = {
  S: { bg: "#F5C451", text: "#1A1A1A", label: "Elite Mundial"  },
  A: { bg: "#2ECC71", text: "#FFFFFF", label: "Alta Qualidade" },
  B: { bg: "#3498DB", text: "#FFFFFF", label: "Intermediário"  },
  C: { bg: "#7F8C8D", text: "#FFFFFF", label: "Regional"       },
  D: { bg: "#E74C3C", text: "#FFFFFF", label: "Base/Local"     },
} as const;

const CAT_RED   = "#E5173F";
const CAT_AMBER = "#F59E0B";
const CAT_CYAN  = "#06B6D4";
const CAT_BLUE  = "#6B9EE5";
const GREEN     = "#22C55E";
const WHITE     = "#FFFFFF";

const G9 = PDF_COLORS.gray900;
const G7 = PDF_COLORS.gray700;
const G6 = PDF_COLORS.gray600;
const G5 = PDF_COLORS.gray500;
const G4 = PDF_COLORS.gray400;
const G2 = PDF_COLORS.gray200;
const G1 = PDF_COLORS.gray100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDiv(a: number, b: number): number | null { return b > 0 ? a / b : null; }
function pctN(a: number, b: number): number | null { const r = safeDiv(a, b); return r !== null ? r * 100 : null; }
function pctStr(a: number, b: number): string { const p = pctN(a, b); return p === null ? "—" : `${Math.round(p)}%`; }
function per90(v: number, min: number): number { return min > 0 ? (v / min) * 90 : 0; }
function fmtDec(v: number, d = 2): string { return v.toFixed(d); }
function fmtV(v: number): string { return v.toString(); }

function tierOf(coeff: number) {
  const t = getTierFromCoefficient(coeff) as keyof typeof TIER_COLORS;
  return TIER_COLORS[t] ?? TIER_COLORS.D;
}

// ─── Tipos de stats agregadas ─────────────────────────────────────────────────

type A = {
  matches: number; minutes: number;
  goals: number; assists: number;
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

function toA(r: PublicSeasonRow["stats"]): A {
  const s = r as any;
  return {
    matches: r.matches, minutes: r.minutes,
    goals: r.goals, assists: r.assists,
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

function sumA(a: A, b: A): A {
  return Object.fromEntries(Object.keys(a).map(k => [k, (a as any)[k] + (b as any)[k]])) as A;
}

function computeTotals(rows: PublicSeasonRow[]): A {
  return rows.map(r => toA(r.stats)).reduce(sumA);
}

// ─── Posição ──────────────────────────────────────────────────────────────────

type PosFam = "gk" | "def" | "mid" | "fwd";

function posFam(pos?: string): PosFam {
  if (!pos) return "mid";
  const p = pos.toLowerCase();
  if (p.includes("goleiro") || p === "gk") return "gk";
  if (p.includes("zagueiro") || p.includes("lateral") || p.includes("beque")) return "def";
  if (p.includes("atacante") || p.includes("ponta") || p.includes("centroavante") || p.includes("forward")) return "fwd";
  return "mid";
}

// ─── Motor de Insights ────────────────────────────────────────────────────────

type Level = "critico" | "regular" | "bom";
interface Insight { level: Level; metric: string; text: string }

function buildInsights(t: A, position?: string, meta: Record<string, CompetitionMeta> = {}, rows: PublicSeasonRow[] = []): Insight[] {
  const ins: Insight[] = [];
  const fam = posFam(position);
  const { minutes, matches } = t;

  // ── Coeficiente médio ponderado ────────────────────────────────────────────
  let coeffSum = 0, coeffN = 0;
  rows.forEach(r => {
    if (r.competition_id && meta[r.competition_id]) {
      coeffSum += meta[r.competition_id].final_coefficient * r.stats.minutes;
      coeffN   += r.stats.minutes;
    }
  });
  const avgCoeff = coeffN > 0 ? coeffSum / coeffN : null;

  // ── 1. Minutagem ──────────────────────────────────────────────────────────
  if (minutes > 4200) {
    ins.push({
      level: "critico",
      metric: "Minutagem · Zona de Risco",
      text: `${minutes} minutos disputados na temporada — acima do limite de segurança (4200 min). Alta propensão a queda de rendimento e lesões por fadiga acumulada. Recomenda-se rotação imediata e monitoramento físico intensivo.`,
    });
  } else if (minutes >= 2500) {
    ins.push({
      level: "bom",
      metric: "Minutagem · Protagonista",
      text: `${minutes} minutos em ${matches} jogos — titular absoluto com dados altamente confiáveis para análise de mercado. Volume ideal de participação na temporada.`,
    });
  } else if (minutes >= 1200) {
    ins.push({
      level: "regular",
      metric: "Minutagem · Jogador de Elenco",
      text: `${minutes} minutos em ${matches} jogos — reserva imediato ou titular que perdeu espaço por opção técnica, lesão ou rotação. Dados confiáveis, mas amostra parcial.`,
    });
  } else {
    ins.push({
      level: "critico",
      metric: "Minutagem · Amostragem Baixa",
      text: `Apenas ${minutes} minutos em ${matches} jogos. Minutagem escassa compromete a confiabilidade estatística. O atleta precisa de sequência para validação de desempenho.`,
    });
  }

  // ── 2. Nível de competição ────────────────────────────────────────────────
  if (avgCoeff !== null) {
    const tier = getTierFromCoefficient(avgCoeff);
    const tc   = TIER_COLORS[tier as keyof typeof TIER_COLORS];
    if (tier === "S" || tier === "A") {
      ins.push({
        level: "bom",
        metric: "Nível de Competição",
        text: `Coeficiente médio ponderado de ${fmtDec(avgCoeff, 2)} (Tier ${tier} — ${tc.label}). Os números desta temporada foram obtidos contra concorrência de alto nível, aumentando o valor de mercado das estatísticas.`,
      });
    } else if (tier === "B") {
      ins.push({
        level: "regular",
        metric: "Nível de Competição",
        text: `Coeficiente médio de ${fmtDec(avgCoeff, 2)} (Tier B — Intermediário). Nível de competição moderado; estatísticas representam bom parâmetro mas exigem ajuste ao comparar com mercados de topo.`,
      });
    } else {
      ins.push({
        level: "critico",
        metric: "Nível de Competição",
        text: `Coeficiente médio de ${fmtDec(avgCoeff, 2)} (Tier ${tier} — ${tc.label}). Competições de nível inferior reduzem o peso das estatísticas na avaliação de mercado. Necessário confirmar em competições de maior coeficiente.`,
      });
    }
  }

  // ─── A partir daqui, só analisar se há minutagem mínima ──────────────────
  if (minutes < 270) {
    return ins;
  }

  // ── 3. Precisão de passe ──────────────────────────────────────────────────
  if (t.passes_total >= 40) {
    const pAcc = pctN(t.passes_completed, t.passes_total)!;
    const p90  = per90(t.passes_total, minutes);
    if (pAcc < 65) {
      ins.push({
        level: "critico",
        metric: "Passes · Precisão Crítica",
        text: `${Math.round(pAcc)}% de aproveitamento de passe (${t.passes_completed}/${t.passes_total}) — abaixo do mínimo aceitável. Volume de ${fmtDec(p90, 1)} passes/90 min com alta taxa de perda compromete a circulação de bola.`,
      });
    } else if (pAcc < 78) {
      ins.push({
        level: "regular",
        metric: "Passes · Aproveitamento Regular",
        text: `${Math.round(pAcc)}% de precisão de passe (${t.passes_completed}/${t.passes_total}). Volume de ${fmtDec(p90, 1)} passes/90 min dentro do esperado para a posição.`,
      });
    } else {
      ins.push({
        level: "bom",
        metric: "Passes · Alta Precisão",
        text: `${Math.round(pAcc)}% de aproveitamento — excelente circulação de bola. Volume de ${fmtDec(p90, 1)} passes/90 min com qualidade acima da média de mercado.`,
      });
    }
  }

  // ── 4. Passes por 90 min (volume) ─────────────────────────────────────────
  if (t.passes_total >= 40 && minutes >= 450) {
    const p90 = per90(t.passes_total, minutes);
    const kp90 = per90(t.key_passes, minutes);
    const threshold = fam === "def" ? 30 : fam === "fwd" ? 25 : 45;
    if (p90 < threshold) {
      ins.push({
        level: "critico",
        metric: "Passes · Volume Abaixo",
        text: `${fmtDec(p90, 1)} passes/90 min — volume abaixo do esperado para ${fam === "def" ? "um defensor" : fam === "fwd" ? "um atacante" : "a posição"}. Baixa participação no jogo de construção.`,
      });
    }
    if (kp90 >= 1.5) {
      ins.push({
        level: "bom",
        metric: "Passes Decisivos · Criação de Elite",
        text: `${fmtDec(kp90, 1)} passes decisivos/90 min (${t.key_passes} total) — perfil criativo de alto impacto ofensivo.`,
      });
    } else if (kp90 >= 0.7) {
      ins.push({
        level: "regular",
        metric: "Passes Decisivos",
        text: `${fmtDec(kp90, 1)} passes decisivos/90 min — participação ofensiva consistente.`,
      });
    }
  }

  // ── 5. Finalização ────────────────────────────────────────────────────────
  if (fam !== "gk" && t.shots >= 8) {
    const sAcc   = pctN(t.shots_on_target, t.shots)!;
    const fin90  = per90(t.shots, minutes);
    if (sAcc < 28) {
      ins.push({
        level: "critico",
        metric: "Finalização · Baixa Eficiência",
        text: `${Math.round(sAcc)}% de chutes no alvo (${t.shots_on_target}/${t.shots}) — taxa crítica. ${fmtDec(fin90, 1)} finalizações/90 min sem conversão efetiva.`,
      });
    } else if (sAcc < 42) {
      ins.push({
        level: "regular",
        metric: "Finalização · Eficiência Regular",
        text: `${Math.round(sAcc)}% de chutes no alvo (${t.shots_on_target}/${t.shots}). ${fmtDec(fin90, 1)} finalizações/90 min dentro da média.`,
      });
    } else {
      ins.push({
        level: "bom",
        metric: "Finalização · Alta Conversão",
        text: `${Math.round(sAcc)}% de chutes no alvo — excelente direcionamento. ${fmtDec(fin90, 1)} finalizações/90 min com aproveitamento de elite.`,
      });
    }
  }

  // ── 6. Gols por 90 ───────────────────────────────────────────────────────
  if (fam === "fwd" || fam === "mid") {
    const g90 = per90(t.goals, minutes);
    if (fam === "fwd") {
      if (g90 < 0.25) {
        ins.push({ level: "critico", metric: "Gols/90 · Produção Insuficiente", text: `${fmtDec(g90, 2)} gols/90 (${t.goals} no total) — produção abaixo do esperado para atacante. Eficiência ofensiva precisa de revisão tática.` });
      } else if (g90 < 0.50) {
        ins.push({ level: "regular", metric: "Gols/90 · Produção Regular",      text: `${fmtDec(g90, 2)} gols/90 (${t.goals} total) — produção dentro da faixa esperada para a posição.` });
      } else {
        ins.push({ level: "bom",     metric: "Gols/90 · Artilheiro de Elite",   text: `${fmtDec(g90, 2)} gols/90 (${t.goals} total) — índice de finalização dominante. Atacante de altíssimo impacto ofensivo.` });
      }
    } else {
      if (g90 >= 0.20) {
        ins.push({ level: "bom", metric: "Gols/90 · Meio-campo Decisivo", text: `${fmtDec(g90, 2)} gols/90 (${t.goals} total) — contribuição ofensiva acima do esperado para meio-campo.` });
      }
    }
  }

  // ── 7. Assistências ───────────────────────────────────────────────────────
  if (fam === "fwd" || fam === "mid") {
    const a90 = per90(t.assists, minutes);
    if (a90 >= 0.30) {
      ins.push({ level: "bom",     metric: "Assistências · Criação de Alto Nível", text: `${fmtDec(a90, 2)} assistências/90 (${t.assists} total) — assistente prolífico e decisivo.` });
    } else if (a90 >= 0.12) {
      ins.push({ level: "regular", metric: "Assistências · Contribuição Regular",  text: `${fmtDec(a90, 2)} assistências/90 (${t.assists} total) — participação ofensiva coletiva dentro do padrão.` });
    } else if (matches >= 10 && t.assists === 0) {
      ins.push({ level: "critico", metric: "Assistências · Ausência Total",        text: `0 assistências em ${matches} jogos. Participação no jogo de criação coletiva precisa evoluir significativamente.` });
    }
  }

  // ── 8. Dribles ───────────────────────────────────────────────────────────
  if (t.dribbles_total >= 10) {
    const dAcc = pctN(t.dribbles_success, t.dribbles_total)!;
    const d90  = per90(t.dribbles_success, minutes);
    if (dAcc >= 65 && d90 >= 2.0) {
      ins.push({ level: "bom",     metric: "Dribles · Dominância Individual",  text: `${Math.round(dAcc)}% de eficiência (${t.dribbles_success}/${t.dribbles_total}) — ${fmtDec(d90, 1)} dribles bem-sucedidos/90 min. Diferencial técnico individual notável.` });
    } else if (dAcc < 40 && t.dribbles_total >= 15) {
      ins.push({ level: "critico", metric: "Dribles · Baixa Eficiência",       text: `${Math.round(dAcc)}% de êxito em ${t.dribbles_total} tentativas — perda de bola frequente em situação de 1×1.` });
    }
  }

  // ── 9. Duelos terrestres ──────────────────────────────────────────────────
  if (t.ground_duels_total >= 15) {
    const dW = pctN(t.ground_duels_won, t.ground_duels_total)!;
    if (dW >= 55) {
      ins.push({ level: "bom",     metric: "Duelos Terrestres · Dominante",  text: `${Math.round(dW)}% de duelos terrestres vencidos (${t.ground_duels_won}/${t.ground_duels_total}) — superioridade física e tática clara em confrontos diretos.` });
    } else if (dW < 44) {
      ins.push({ level: "critico", metric: "Duelos Terrestres · Deficitário", text: `${Math.round(dW)}% de aproveitamento em duelos (${t.ground_duels_won}/${t.ground_duels_total}) — fragilidade física ou tática em confrontos diretos.` });
    } else {
      ins.push({ level: "regular", metric: "Duelos Terrestres · Regular",     text: `${Math.round(dW)}% de duelos terrestres vencidos — desempenho dentro da média para a posição.` });
    }
  }

  // ── 10. Duelos aéreos ────────────────────────────────────────────────────
  if (t.aerial_duels_total >= 10 && (fam === "def" || fam === "fwd")) {
    const aW = pctN(t.aerial_duels_won, t.aerial_duels_total)!;
    if (aW >= 60) {
      ins.push({ level: "bom",     metric: "Jogo Aéreo · Dominante",   text: `${Math.round(aW)}% de duelos no alto ganhos (${t.aerial_duels_won}/${t.aerial_duels_total}) — forte presença em bolas aéreas.` });
    } else if (aW < 38) {
      ins.push({ level: "critico", metric: "Jogo Aéreo · Deficitário", text: `${Math.round(aW)}% em duelos aéreos — déficit significativo que fragiliza a marcação em bolas cruzadas e escanteios.` });
    }
  }

  // ── 11. Ações defensivas ─────────────────────────────────────────────────
  if (fam === "def" || fam === "mid") {
    const tk90  = per90(t.tackles,       minutes);
    const int90 = per90(t.interceptions, minutes);
    const rec90 = per90(t.recoveries,    minutes);
    const clr90 = per90(t.clearances,    minutes);

    if (fam === "def") {
      if (tk90 >= 3.5) {
        ins.push({ level: "bom",     metric: "Desarmes · Alta Intensidade", text: `${fmtDec(tk90, 1)} desarmes/90 min (${t.tackles} total) — defensor com marcação intensa e agressiva dentro dos limites técnicos.` });
      } else if (tk90 < 1.5 && matches >= 8) {
        ins.push({ level: "critico", metric: "Desarmes · Volume Baixo",     text: `${fmtDec(tk90, 1)} desarmes/90 — volume abaixo do mínimo esperado para um defensor.` });
      }
      if (int90 >= 2.5) {
        ins.push({ level: "bom", metric: "Interceptações · Leitura de Jogo", text: `${fmtDec(int90, 1)} interceptações/90 (${t.interceptions} total) — excelente leitura de jogo defensiva.` });
      }
      if (clr90 >= 4.0) {
        ins.push({ level: "bom", metric: "Cortes · Proteção da Área", text: `${fmtDec(clr90, 1)} cortes/90 (${t.clearances} total) — forte presença de limpeza dentro da área.` });
      }
    }

    if (fam === "mid" && rec90 >= 5.0) {
      ins.push({ level: "bom", metric: "Recuperações · Volante Combativo", text: `${fmtDec(rec90, 1)} recuperações de bola/90 min (${t.recoveries} total) — perfil combativo e de alta intensidade no setor intermediário.` });
    }
  }

  // ── 12. Goleiro ───────────────────────────────────────────────────────────
  if (fam === "gk") {
    const total  = t.saves + t.goals_conceded;
    const savePct = pctN(t.saves, total);
    const csPct   = pctN(t.clean_sheets, matches);
    const gcPG    = matches > 0 ? t.goals_conceded / matches : null;

    if (savePct !== null && total >= 10) {
      if (savePct >= 72) {
        ins.push({ level: "bom",     metric: "Defesas · Goleiro de Elite",      text: `${Math.round(savePct)}% de aproveitamento — ${t.saves} defesas em ${total} finalizações sofridas. Índice de goleiro de alto nível.` });
      } else if (savePct < 58) {
        ins.push({ level: "critico", metric: "Defesas · Taxa Abaixo do Padrão", text: `${Math.round(savePct)}% de defesas — abaixo do mínimo esperado (58%). ${t.goals_conceded} gols sofridos em ${matches} jogos.` });
      } else {
        ins.push({ level: "regular", metric: "Defesas · Aproveitamento Regular", text: `${Math.round(savePct)}% de defesas (${t.saves}/${total}) — dentro do padrão esperado para a posição.` });
      }
    }
    if (csPct !== null && matches >= 5) {
      if (csPct >= 36) {
        ins.push({ level: "bom",     metric: "Clean Sheets · Confiabilidade Alta", text: `${t.clean_sheets} jogos sem sofrer gols em ${matches} (${Math.round(csPct)}%) — goleiro de alto aproveitamento defensivo.` });
      } else if (csPct < 16) {
        ins.push({ level: "critico", metric: "Clean Sheets · Frequência Baixa",    text: `Apenas ${t.clean_sheets} jogos sem sofrer gols em ${matches} (${Math.round(csPct)}%).` });
      }
    }
    if (gcPG !== null && matches >= 5) {
      if (gcPG < 0.95) {
        ins.push({ level: "bom",     metric: "Gols Sofridos · Índice Excelente", text: `Média de ${fmtDec(gcPG, 2)} gols sofridos/jogo — solidez defensiva de elite.` });
      } else if (gcPG > 1.6) {
        ins.push({ level: "critico", metric: "Gols Sofridos · Índice Alto",      text: `Média de ${fmtDec(gcPG, 2)} gols sofridos/jogo em ${matches} partidas — sistema defensivo fragilizado ou goleiro com dificuldades.` });
      }
    }
  }

  // ── 13. Cruzamentos ─────────────────────────────────────────────────────
  const crossTotal = t.crosses_success + t.crosses_failed;
  if (crossTotal >= 15) {
    const cAcc = pctN(t.crosses_success, crossTotal)!;
    if (cAcc >= 40) {
      ins.push({ level: "bom",     metric: "Cruzamentos · Alta Precisão", text: `${Math.round(cAcc)}% de cruzamentos certos (${t.crosses_success}/${crossTotal}) — qualidade acima da média no jogo pelas laterais.` });
    } else if (cAcc < 25) {
      ins.push({ level: "critico", metric: "Cruzamentos · Baixa Eficiência", text: `Apenas ${Math.round(cAcc)}% de êxito em cruzamentos (${t.crosses_success}/${crossTotal}) — contribuição lateral limitada.` });
    }
  }

  // ── 14. Disciplina ───────────────────────────────────────────────────────
  if (matches > 0) {
    const ycPer10 = (t.yellow_cards / matches) * 10;
    if (t.red_cards > 0) {
      ins.push({ level: "critico", metric: "Disciplina · Expulsões", text: `${t.red_cards} expulsão${t.red_cards > 1 ? "ões" : ""} na temporada — impacto direto na disponibilidade e no risco disciplinar de mercado.` });
    }
    if (ycPer10 >= 3.5) {
      ins.push({ level: "critico", metric: "Disciplina · Alta Taxa de Amarelos", text: `${t.yellow_cards} amarelos em ${matches} jogos (${ycPer10.toFixed(1)}/10 partidas) — risco disciplinar significativo que compromete a continuidade.` });
    } else if (ycPer10 <= 1.2 && matches >= 10) {
      ins.push({ level: "bom", metric: "Disciplina · Perfil Equilibrado", text: `Apenas ${t.yellow_cards} cartões em ${matches} jogos — atleta disciplinado, baixo risco de suspensões.` });
    }
  }

  // ── 15. Bolas perdidas (contexto) ────────────────────────────────────────
  if (t.possession_lost > 0 && minutes >= 450) {
    const bp90 = per90(t.possession_lost, minutes);
    if (bp90 >= 8.0) {
      ins.push({ level: "critico", metric: "Posse · Alta Perda de Bola", text: `${fmtDec(bp90, 1)} bolas perdidas/90 min (${t.possession_lost} total) — atleta com alta taxa de deturpação de posse, expondo a equipe a transições adversas.` });
    }
  }

  return ins;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 46, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 9, color: G9, backgroundColor: WHITE },

  // Header
  hdr:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, marginBottom: 14, borderBottomWidth: 3, borderBottomColor: CAT_RED },
  hLeft:    { flex: 1 },
  hRight:   { backgroundColor: G1, borderRadius: 5, padding: 9, minWidth: 130, alignItems: "flex-end" },
  hName:    { fontSize: 17, fontWeight: 800, color: G9, marginBottom: 2 },
  hSub:     { fontSize: 8.5, color: G5 },
  hTag:     { fontSize: 8, fontWeight: 700, color: CAT_RED, marginBottom: 2 },
  hMeta:    { fontSize: 8, color: G6 },
  hBrand:   { fontSize: 7, color: G4, marginTop: 4 },

  // Seção
  sHead:    { fontSize: 7.5, fontWeight: 700, color: G5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, marginTop: 14, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: G2 },
  sNum:     { color: CAT_RED, fontWeight: 800 },

  // Card de competição
  card:     { borderRadius: 5, borderWidth: 1, borderColor: G2, marginBottom: 10 },
  cardHdr:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: G1, paddingHorizontal: 10, paddingVertical: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomWidth: 1, borderBottomColor: G2 },
  cardName: { fontSize: 9.5, fontWeight: 700, color: G9, flex: 1 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardCoeff:{ fontSize: 7.5, color: "#0284C7", fontWeight: 600 },
  tierPill: { fontSize: 7.5, fontWeight: 800, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  gamesMeta:{ fontSize: 7.5, color: G5 },

  // Bloco de categoria dentro de card
  catWrap:  { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: G2 },
  catLast:  { paddingHorizontal: 10, paddingVertical: 8 },
  catTitle: { fontSize: 7, fontWeight: 700, letterSpacing: 1.0, textTransform: "uppercase", marginBottom: 5 },
  grid:     { flexDirection: "row", flexWrap: "wrap" },
  box25:    { width: "25%", paddingRight: 4, paddingBottom: 4 },
  boxInner: { backgroundColor: G1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 4 },
  boxTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  boxLabel: { fontSize: 6, color: G5, textTransform: "uppercase", letterSpacing: 0.3, flex: 1 },
  boxPct:   { fontSize: 6, fontWeight: 700, paddingHorizontal: 2, paddingVertical: 1, borderRadius: 2 },
  boxVal:   { fontSize: 12, fontWeight: 800, color: G9 },

  // Card total (fundo escuro)
  tCard:    { borderRadius: 5, borderWidth: 2, borderColor: G9, marginBottom: 10, backgroundColor: G9 },
  tHdr:     { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)" },
  tTitle:   { fontSize: 9.5, fontWeight: 700, color: WHITE },
  tSub:     { fontSize: 7.5, color: G4, marginTop: 1 },
  tCatWrap: { paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  tCatLast: { paddingHorizontal: 10, paddingVertical: 7 },
  tCatTit:  { fontSize: 7, fontWeight: 700, letterSpacing: 1.0, textTransform: "uppercase", marginBottom: 5 },
  tBoxInner:{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 4 },
  tBoxLabel:{ fontSize: 6, color: G4, textTransform: "uppercase", letterSpacing: 0.3, flex: 1 },
  tBoxVal:  { fontSize: 12, fontWeight: 800, color: WHITE },

  // Números ponderados
  wCard:    { borderRadius: 5, backgroundColor: G9, padding: 12, marginBottom: 10 },
  wTitle:   { fontSize: 9, fontWeight: 700, color: WHITE, marginBottom: 1 },
  wSub:     { fontSize: 7.5, color: G4, marginBottom: 10 },
  wGrid:    { flexDirection: "row", flexWrap: "wrap" },
  wItem:    { width: "25%", paddingVertical: 5, paddingHorizontal: 3, alignItems: "center" },
  wVal:     { fontSize: 13, fontWeight: 800, color: WHITE },
  wLabel:   { fontSize: 6.5, color: G4, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2, textAlign: "center" },
  wSub2:    { fontSize: 6.5, color: "#F59E0B", marginTop: 1, textAlign: "center" },

  // Insights
  insCard:  { borderRadius: 5, borderWidth: 1, padding: 10, marginBottom: 7 },
  insTitle: { fontSize: 8.5, fontWeight: 700, marginBottom: 6 },
  insRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  insDot:   { width: 7, height: 7, borderRadius: 3.5, marginTop: 2.5, marginRight: 7, flexShrink: 0 },
  insMetric:{ fontSize: 7, fontWeight: 700, color: G9, marginBottom: 1 },
  insText:  { fontSize: 8, color: G6, flex: 1, lineHeight: 1.4 },
  insBlock: { flex: 1 },

  // Footer
  footer:   { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: G2, paddingTop: 7 },
  ftxt:     { fontSize: 7, color: G4 },
});

// ─── Helpers de cor ───────────────────────────────────────────────────────────

function pctColor(p: number | null, dark = false): string {
  if (p === null) return dark ? G4 : G5;
  if (p >= 60) return dark ? "#4ADE80" : GREEN;
  if (p >= 50) return dark ? "#FCD34D" : "#CA8A04";
  return dark ? "#FB7185" : CAT_RED;
}

function valColor(v: number, positive?: boolean, negative?: boolean, dark = false): string {
  const d_white = WHITE, d_text = G9;
  if (positive && v > 0) return dark ? "#4ADE80" : GREEN;
  if (negative && v > 0) return dark ? "#FB7185" : CAT_RED;
  return dark ? d_white : d_text;
}

// ─── Componente: célula de stat ───────────────────────────────────────────────

interface StatItem {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  pct?: number | null;
}

function StatBox({ item, dark = false }: { item: StatItem; dark?: boolean }) {
  const vc = valColor(item.value, item.positive, item.negative, dark);
  const pc = item.pct !== undefined ? pctColor(item.pct ?? null, dark) : null;
  return (
    <View style={s.box25}>
      <View style={dark ? s.tBoxInner : s.boxInner}>
        <View style={s.boxTop}>
          <Text style={dark ? s.tBoxLabel : s.boxLabel}>{item.label}</Text>
          {item.pct !== undefined && pc && (
            <Text style={[s.boxPct, { color: pc, borderColor: pc, borderWidth: 0.5 }]}>
              {item.pct === null ? "0%" : `${Math.round(item.pct)}%`}
            </Text>
          )}
        </View>
        <Text style={[dark ? s.tBoxVal : s.boxVal, { color: vc }]}>{fmtV(item.value)}</Text>
      </View>
    </View>
  );
}

// ─── Bloco de categoria ───────────────────────────────────────────────────────

function CatBlock({ title, color, items, isLast = false, dark = false }: {
  title: string; color: string; items: StatItem[]; isLast?: boolean; dark?: boolean;
}) {
  const wrap  = dark ? (isLast ? s.tCatLast : s.tCatWrap) : (isLast ? s.catLast : s.catWrap);
  const title_ = dark ? s.tCatTit : s.catTitle;
  return (
    <View style={wrap} wrap={false}>
      <Text style={[title_, { color }]}>{title}</Text>
      <View style={s.grid}>
        {items.map((item, i) => <StatBox key={i} item={item} dark={dark} />)}
      </View>
    </View>
  );
}

// ─── Construir arrays de stats para uma AggStats ─────────────────────────────

function buildStatBlocks(t: A, isGK: boolean) {
  const ataque: StatItem[] = [
    { label: "Gols",          value: t.goals,            positive: true },
    { label: "Final. Gol",    value: t.shots_on_target,  positive: true },
    { label: "Final. Fora",   value: t.shots_off_target                 },
    { label: "Final. Bloq.",  value: t.shots_blocked                    },
    { label: "Na Trave",      value: t.shots_on_post,    positive: true },
    { label: "Final. Total",  value: t.shots                            },
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
    { label: "Passes Tot.",       value: t.passes_total                         },
    { label: "Cruzam. ✓",         value: t.crosses_success,     positive: true, pct: pctN(t.crosses_success, t.crosses_success + t.crosses_failed) },
    { label: "Cruzam. ✗",         value: t.crosses_failed,      negative: true },
    { label: "Passe Longo ✓",     value: t.long_passes_accurate, positive: true, pct: pctN(t.long_passes_accurate, t.long_passes_total) },
    { label: "Passe Longo ✗",     value: t.long_passes_failed,  negative: true },
    { label: "Passe Longo Tot.",  value: t.long_passes_total                    },
  ];
  const dribles: StatItem[] = [
    { label: "Dribles ✓",    value: t.dribbles_success, positive: true, pct: pctN(t.dribbles_success, t.dribbles_total) },
    { label: "Dribles ✗",    value: t.dribbles_failed,  negative: true },
    { label: "Dribles Tot.", value: t.dribbles_total                   },
    { label: "Faltas Sof.",  value: t.fouls_suffered                   },
    { label: "Bolas Perd.",  value: t.possession_lost,  negative: true },
  ];
  const defesa: StatItem[] = [
    { label: "Roubada de Bola",  value: t.steals,          positive: true },
    { label: "Desarmes",         value: t.tackles,          positive: true },
    { label: "Interc.",          value: t.interceptions,    positive: true },
    { label: "Cortes",           value: t.clearances,       positive: true },
    { label: "Recup.",           value: t.recoveries,       positive: true },
    { label: "Chute Bloq.",      value: t.blocked_shots,    positive: true },
    { label: "Dribles Sofridos", value: t.was_dribbled,     negative: true },
    { label: "Duelo Chão ✓",     value: t.ground_duels_won, positive: true, pct: pctN(t.ground_duels_won, t.ground_duels_total) },
    { label: "Duelo Chão ✗",     value: Math.max(0, t.ground_duels_total - t.ground_duels_won), negative: true },
    { label: "Duelo Chão Tot.",  value: t.ground_duels_total },
    { label: "Duelo Aéreo ✓",    value: t.aerial_duels_won, positive: true, pct: pctN(t.aerial_duels_won, t.aerial_duels_total) },
    { label: "Duelo Aéreo ✗",    value: Math.max(0, t.aerial_duels_total - t.aerial_duels_won), negative: true },
    { label: "Duelo Aéreo Tot.", value: t.aerial_duels_total },
    { label: "Faltas Com.",      value: t.fouls_committed,  negative: true },
    { label: "Amarelos",         value: t.yellow_cards,     negative: true },
    { label: "Vermelhos",        value: t.red_cards,        negative: true },
    ...(isGK ? [
      { label: "Defesas",     value: t.saves,          positive: true } as StatItem,
      { label: "Gols Sof.",   value: t.goals_conceded, negative: true } as StatItem,
      { label: "Clean Sheet", value: t.clean_sheets,   positive: true } as StatItem,
      { label: "Pên. Salvos", value: t.penalties_saved,positive: true } as StatItem,
    ] : []),
  ];
  return { ataque, passes, dribles, defesa };
}

// ─── Card de competição ───────────────────────────────────────────────────────

function CompCard({ row, meta, isGK }: { row: PublicSeasonRow; meta?: CompetitionMeta; isGK: boolean }) {
  const t    = toA(row.stats);
  const name = row.competition_name ?? meta?.name ?? "—";
  const coeff = meta?.final_coefficient ?? 0;
  const tierKey = getTierFromCoefficient(coeff) as keyof typeof TIER_COLORS;
  const tier  = TIER_COLORS[tierKey];
  const blks = buildStatBlocks(t, isGK);

  return (
    <View style={s.card} wrap={false}>
      <View style={s.cardHdr}>
        <Text style={s.cardName}>{name}</Text>
        <View style={s.cardMeta}>
          {coeff > 0 && <Text style={s.cardCoeff}>Coef. {fmtDec(coeff, 2)}</Text>}
          <Text style={[s.tierPill, { backgroundColor: tier.bg, color: tier.text }]}>
            {tierKey} · {tier.label}
          </Text>
          <Text style={s.gamesMeta}>{t.matches} J · {t.minutes} min</Text>
        </View>
      </View>
      <CatBlock title="Ataque"          color={CAT_RED}   items={blks.ataque}  />
      <CatBlock title="Passes"          color={CAT_AMBER} items={blks.passes}  />
      <CatBlock title="Dribles / Posse" color={CAT_CYAN}  items={blks.dribles} />
      <CatBlock title="Defesa"          color={CAT_BLUE}  items={blks.defesa}  isLast />
    </View>
  );
}

// ─── Card de total ────────────────────────────────────────────────────────────

function TotalCard({ t, year, isGK }: { t: A; year: number; isGK: boolean }) {
  const blks = buildStatBlocks(t, isGK);
  return (
    <View style={s.tCard}>
      <View style={s.tHdr}>
        <Text style={s.tTitle}>Total Geral · Temporada {year}</Text>
        <Text style={s.tSub}>{t.matches} jogos · {t.minutes} minutos disputados</Text>
      </View>
      <CatBlock title="Ataque"          color={CAT_RED}   items={blks.ataque}  dark />
      <CatBlock title="Passes"          color={CAT_AMBER} items={blks.passes}  dark />
      <CatBlock title="Dribles / Posse" color={CAT_CYAN}  items={blks.dribles} dark />
      <CatBlock title="Defesa"          color={CAT_BLUE}  items={blks.defesa}  dark isLast />
    </View>
  );
}

// ─── Rodapé ───────────────────────────────────────────────────────────────────

function Footer({ playerName, year, generatedAt }: { playerName: string; year: number; generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.ftxt}>{playerName} · Temporada {year} · M3Scout</Text>
      <Text style={s.ftxt}>{generatedAt}</Text>
      <Text style={s.ftxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ─── Documento principal ──────────────────────────────────────────────────────

export function PlayerSeasonPdfDocument({
  playerName, playerPosition, year, rows, competitionMeta, generatedAt,
}: PlayerSeasonPdfProps) {
  const isGK     = posFam(playerPosition) === "gk";
  const totals   = computeTotals(rows);
  const insights = buildInsights(totals, playerPosition, competitionMeta, rows);

  const criticals = insights.filter(i => i.level === "critico");
  const regulars  = insights.filter(i => i.level === "regular");
  const goods     = insights.filter(i => i.level === "bom");

  // Ponderados por coeficiente (ponderação por minutos jogados na competição)
  let wG = 0, wA = 0, wPacc = 0, wPden = 0, wDW = 0, wDden = 0, coeffWSum = 0, coeffN = 0;
  rows.forEach(r => {
    const c    = r.competition_id ? (competitionMeta[r.competition_id]?.final_coefficient ?? 1) : 1;
    const mins = r.stats.minutes;
    if (!mins) return;
    wG    += per90(r.stats.goals,   mins) * c;
    wA    += per90(r.stats.assists, mins) * c;
    if (r.stats.passes_total > 0)         { wPacc += pctN(r.stats.passes_completed, r.stats.passes_total)! * c;       wPden += c; }
    if (r.stats.ground_duels_total > 0)   { wDW   += pctN(r.stats.ground_duels_won, r.stats.ground_duels_total)! * c; wDden += c; }
    coeffWSum += c; coeffN++;
  });
  const avgCoeff = coeffN ? coeffWSum / coeffN : 1;
  const wGoals   = coeffN ? wG / coeffN : 0;
  const wAssists = coeffN ? wA / coeffN : 0;
  const wPass    = wPden  ? wPacc / wPden : null;
  const wDuel    = wDden  ? wDW   / wDden : null;

  return (
    <Document title={`Relatório · ${playerName} · ${year}`} author="M3Scout" subject="Relatório de Temporada">
      <Page size="A4" style={s.page}>

        {/* Cabeçalho */}
        <View style={s.hdr} fixed>
          <View style={s.hLeft}>
            <Text style={s.hName}>{playerName}</Text>
            <Text style={s.hSub}>{playerPosition ?? "—"} · Temporada {year}</Text>
          </View>
          <View style={s.hRight}>
            <Text style={s.hTag}>RELATÓRIO GERAL</Text>
            <Text style={s.hMeta}>Temporada {year}</Text>
            <Text style={s.hBrand}>M3Scout · Intelligence Platform</Text>
          </View>
        </View>

        {/* Seção 1: por competição */}
        <Text style={s.sHead}><Text style={s.sNum}>01 — </Text>ESTATÍSTICAS POR COMPETIÇÃO</Text>
        {rows.map(row => (
          <CompCard
            key={row.id}
            row={row}
            meta={row.competition_id ? competitionMeta[row.competition_id] : undefined}
            isGK={isGK}
          />
        ))}

        {/* Seção 2: total consolidado */}
        <Text style={s.sHead}><Text style={s.sNum}>02 — </Text>TOTAL CONSOLIDADO</Text>
        <TotalCard t={totals} year={year} isGK={isGK} />

        {/* Números ponderados */}
        <View style={s.wCard} wrap={false}>
          <Text style={s.wTitle}>Números Ponderados · Ajustados por Coeficiente de Competição</Text>
          <Text style={s.wSub}>Eficiência real de mercado — cada competição pesada pelo seu final_coefficient · Coef. médio: {fmtDec(avgCoeff, 2)}</Text>
          <View style={s.wGrid}>
            {[
              { label: "Gols/90\nPonderado",    value: fmtDec(wGoals,   2), sub: `bruto: ${fmtDec(per90(totals.goals,   totals.minutes), 2)}/90` },
              { label: "Assist./90\nPonderado", value: fmtDec(wAssists, 2), sub: `bruto: ${fmtDec(per90(totals.assists, totals.minutes), 2)}/90` },
              { label: "Passe%\nPonderado",     value: wPass !== null ? `${Math.round(wPass)}%` : "—", sub: `bruto: ${pctStr(totals.passes_completed, totals.passes_total)}` },
              { label: "Duelo%\nPonderado",     value: wDuel !== null ? `${Math.round(wDuel)}%` : "—", sub: `bruto: ${pctStr(totals.ground_duels_won, totals.ground_duels_total)}` },
            ].map((w, i) => (
              <View key={i} style={s.wItem}>
                <Text style={s.wVal}>{w.value}</Text>
                <Text style={s.wLabel}>{w.label}</Text>
                <Text style={s.wSub2}>{w.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Seção 3: Scout Intelligence */}
        <Text style={s.sHead}><Text style={s.sNum}>03 — </Text>INTELIGÊNCIA DE SCOUT · ANÁLISE TÁTICA</Text>

        {criticals.length > 0 && (
          <View style={[s.insCard, { borderColor: "#FECACA", borderLeftWidth: 3, borderLeftColor: CAT_RED }]} wrap={false}>
            <Text style={[s.insTitle, { color: CAT_RED }]}>Insights Críticos — {criticals.length} ponto{criticals.length > 1 ? "s" : ""} de atenção</Text>
            {criticals.map((ins, i) => (
              <View key={i} style={s.insRow}>
                <View style={[s.insDot, { backgroundColor: CAT_RED }]} />
                <View style={s.insBlock}>
                  <Text style={s.insMetric}>{ins.metric}</Text>
                  <Text style={s.insText}>{ins.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {regulars.length > 0 && (
          <View style={[s.insCard, { borderColor: "#FEF3C7", borderLeftWidth: 3, borderLeftColor: CAT_AMBER }]} wrap={false}>
            <Text style={[s.insTitle, { color: "#92400E" }]}>Insights Regulares — {regulars.length} ponto{regulars.length > 1 ? "s" : ""} estáveis</Text>
            {regulars.map((ins, i) => (
              <View key={i} style={s.insRow}>
                <View style={[s.insDot, { backgroundColor: CAT_AMBER }]} />
                <View style={s.insBlock}>
                  <Text style={s.insMetric}>{ins.metric}</Text>
                  <Text style={s.insText}>{ins.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {goods.length > 0 && (
          <View style={[s.insCard, { borderColor: "#BBF7D0", borderLeftWidth: 3, borderLeftColor: GREEN }]} wrap={false}>
            <Text style={[s.insTitle, { color: "#14532D" }]}>Pontos de Destaque — {goods.length} diferencial{goods.length > 1 ? "ais" : ""} identificado{goods.length > 1 ? "s" : ""}</Text>
            {goods.map((ins, i) => (
              <View key={i} style={s.insRow}>
                <View style={[s.insDot, { backgroundColor: GREEN }]} />
                <View style={s.insBlock}>
                  <Text style={s.insMetric}>{ins.metric}</Text>
                  <Text style={s.insText}>{ins.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Footer playerName={playerName} year={year} generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}
