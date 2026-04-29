/**
 * playerWhatsAppSummary
 *
 * Gera um texto enxuto, formatado para WhatsApp, com os principais números
 * consolidados de um atleta. Usa o mesmo critério do `unified_player_season_stats`
 * (LIVE > MANUAL por contexto) — basta passar o agregado já produzido por
 * `aggregateUnifiedStats`.
 *
 * Inclui:
 *  - Dados do atleta (nome, posição, idade, clube)
 *  - Volume (jogos, minutos)
 *  - Ataque (gols, assist., finalizações + precisão)
 *  - Passes / Dribles / Duelos com TOTAIS RECALCULADOS quando incoerentes
 *    (total < soma dos componentes ⇒ usa a soma)
 *  - Defesa e disciplina
 *  - Específicos de goleiro quando aplicável
 */

import type { AggregatedUnifiedStats } from "@/hooks/useUnifiedPlayerStats";

export interface PlayerSummaryInput {
  fullName: string;
  position?: string | null;
  age?: number | null;
  currentClub?: string | null;
  /** Total agregado vindo de `aggregateUnifiedStats` (pode ser null se não houver stats). */
  stats: AggregatedUnifiedStats | null;
  /** Tratar como goleiro? (mostra bloco GK e omite ataque outfield). */
  isGoalkeeper?: boolean;
  /** Posições disponíveis para detectar GK automaticamente (fallback). */
  positionHint?: string | null;
}

/** Recalcula coerentemente um total: max(total registrado, soma dos componentes). */
function coherentTotal(total: number, ...components: number[]): number {
  const sum = components.reduce((a, b) => a + b, 0);
  return Math.max(total, sum);
}

function pct(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.min(100, Math.round((part / total) * 100))}%`;
}

function per90(value: number, minutes: number): string {
  if (minutes <= 0) return "—";
  return (value * (90 / minutes)).toFixed(2);
}

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  return String(Math.round(n));
}

function isGoalkeeperPosition(pos?: string | null): boolean {
  if (!pos) return false;
  const p = pos.toLowerCase();
  return p.includes("goleiro") || p.includes("goalkeeper") || p === "gk";
}

/**
 * Gera o texto pronto para colar no WhatsApp. Utiliza apenas caracteres
 * suportados nativamente pelo WhatsApp (negrito *...*, itálico _..._).
 */
export function buildPlayerWhatsAppSummary(input: PlayerSummaryInput): string {
  const { fullName, position, age, currentClub, stats } = input;
  const isGK = input.isGoalkeeper ?? isGoalkeeperPosition(position ?? input.positionHint);

  const lines: string[] = [];
  lines.push(`*${fullName}*`);

  const headerBits: string[] = [];
  if (position) headerBits.push(position);
  if (typeof age === "number" && age > 0) headerBits.push(`${age} anos`);
  if (currentClub) headerBits.push(currentClub);
  if (headerBits.length) lines.push(`_${headerBits.join(" • ")}_`);
  lines.push("");

  if (!stats || stats.matches === 0) {
    lines.push("Sem estatísticas registradas.");
    return lines.join("\n");
  }

  // Totais recalculados (defensivo: garante coerência mesmo se a base estiver torta)
  const totalPasses = coherentTotal(stats.total_passes, stats.accurate_passes);
  const totalDribbles = coherentTotal(stats.total_dribbles, stats.successful_dribbles);
  const groundDuelsTotal = coherentTotal(stats.ground_duels_total, stats.ground_duels_won);
  const aerialDuelsTotal = coherentTotal(stats.aerial_duels_total, stats.aerial_duels_won);
  const shotsTotal = coherentTotal(stats.shots, stats.shots_on_target);

  // === Volume ===
  lines.push("*📊 Volume*");
  lines.push(`• Jogos: ${fmt(stats.matches)}`);
  lines.push(`• Minutos: ${fmt(stats.minutes)}`);
  lines.push("");

  if (!isGK) {
    // === Ataque ===
    lines.push("*⚽ Ataque*");
    lines.push(`• Gols: ${fmt(stats.goals)} (${per90(stats.goals, stats.minutes)}/90)`);
    lines.push(`• Assistências: ${fmt(stats.assists)} (${per90(stats.assists, stats.minutes)}/90)`);
    lines.push(
      `• Finalizações: ${fmt(stats.shots_on_target)}/${fmt(shotsTotal)} (${pct(stats.shots_on_target, shotsTotal)} no gol)`,
    );
    if (stats.chances_created > 0 || stats.key_passes > 0) {
      lines.push(`• Passes decisivos: ${fmt(stats.key_passes)} • Chances criadas: ${fmt(stats.chances_created)}`);
    }
    lines.push("");

    // === Passes / Dribles ===
    lines.push("*🎯 Passes & Dribles*");
    lines.push(
      `• Passes: ${fmt(stats.accurate_passes)}/${fmt(totalPasses)} (${pct(stats.accurate_passes, totalPasses)})`,
    );
    lines.push(
      `• Dribles: ${fmt(stats.successful_dribbles)}/${fmt(totalDribbles)} (${pct(stats.successful_dribbles, totalDribbles)})`,
    );
    lines.push("");
  }

  // === Defesa ===
  lines.push("*🛡 Defesa*");
  lines.push(`• Desarmes: ${fmt(stats.tackles)} • Interceptações: ${fmt(stats.interceptions)}`);
  lines.push(`• Recuperações: ${fmt(stats.recoveries)}`);
  lines.push(
    `• Duelos chão: ${fmt(stats.ground_duels_won)}/${fmt(groundDuelsTotal)} (${pct(stats.ground_duels_won, groundDuelsTotal)})`,
  );
  lines.push(
    `• Duelos aéreos: ${fmt(stats.aerial_duels_won)}/${fmt(aerialDuelsTotal)} (${pct(stats.aerial_duels_won, aerialDuelsTotal)})`,
  );
  lines.push("");

  // === Goleiro ===
  if (isGK) {
    lines.push("*🧤 Goleiro*");
    lines.push(`• Defesas: ${fmt(stats.saves)}`);
    lines.push(`• Gols sofridos: ${fmt(stats.goals_conceded)}`);
    lines.push(`• Clean sheets: ${fmt(stats.clean_sheets)}`);
    if (stats.penalties_saved > 0) lines.push(`• Pênaltis defendidos: ${fmt(stats.penalties_saved)}`);
    if (stats.errors_leading_to_goal > 0) lines.push(`• Erros → gol: ${fmt(stats.errors_leading_to_goal)}`);
    lines.push("");
  }

  // === Disciplina ===
  lines.push("*📋 Disciplina*");
  lines.push(`• 🟨 ${fmt(stats.yellow_cards)}  • 🟥 ${fmt(stats.red_cards)}`);
  lines.push(`• Faltas com.: ${fmt(stats.fouls_committed)} • Faltas sof.: ${fmt(stats.fouls_drawn)}`);

  return lines.join("\n");
}
