/**
 * Attribute Score Calculator — Pure Math Engine
 *
 * Recebe MatchDerivedStats (já mergeado pelo mergeSeasonRows) e minutos totais,
 * retorna ATA / CRI / TEC / DEF / TAT (0–100) + per-90 debug.
 *
 * BENCHMARKS: valor de referência = 100 pts no eixo (jogador elite médio).
 * PESOS: somam 1.0 por eixo. NEG = métrica negativa (penalidade).
 */

import type { MatchDerivedStats } from "@/hooks/usePlayerMatchStats";

export interface AttributeScoreOutput {
  ata: number;
  cri: number;
  tec: number;
  def: number;
  tat: number;
  confidence: number;
  matches: number;
  minutes: number;
  per90: Record<string, number>;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const p90 = (v: number, minutes: number) => (v * 90) / minutes;
const score = (raw: number, benchmark: number) => clamp((raw / benchmark) * 100);
const scoreNeg = (raw: number, benchmark: number) => clamp(100 - (raw / benchmark) * 100);

export function calculateAttributeScores(
  stats: MatchDerivedStats,
  minutes: number
): AttributeScoreOutput {
  if (minutes <= 0) {
    const zero: AttributeScoreOutput = {
      ata: 0, cri: 0, tec: 0, def: 0, tat: 0,
      confidence: 0, matches: stats.matches, minutes: 0, per90: {},
    };
    return zero;
  }

  const confidence = Math.min(1.0, minutes / 900);

  // ── Per-90 values ──────────────────────────────────────────────────────────
  const g    = p90(stats.goals,              minutes);
  const sot  = p90(stats.shots_on_target,    minutes);
  const sop  = p90(stats.shots_on_post ?? 0, minutes);
  const penW = p90(stats.penalties_won,      minutes);
  const off  = p90(stats.offsides,           minutes);

  const kp   = p90(stats.key_passes,           minutes);
  const cc   = p90(stats.chances_created,       minutes);
  const crs  = p90(stats.crosses_success,       minutes);
  const crf  = p90(stats.crosses_failed,        minutes);
  const pp   = p90(stats.progressive_passes ?? 0, minutes);

  const ast  = p90(stats.assists,            minutes);
  const acp  = p90(stats.passes_completed,   minutes);
  const lpA  = p90(stats.long_passes_accurate, minutes);
  const lpF  = p90(stats.long_passes_failed,   minutes);
  const drs  = p90(stats.dribbles_success,   minutes);
  const drf  = p90(stats.dribbles_failed,    minutes);
  const fd   = p90(stats.fouls_suffered,     minutes);
  const pf   = p90(stats.passes_failed,      minutes);
  const posL = p90(stats.possession_lost,    minutes);

  const tkl  = p90(stats.tackles,       minutes);
  const stl  = p90(stats.steals,        minutes);
  const rcv  = p90(stats.recoveries,    minutes);
  const int_ = p90(stats.interceptions, minutes);
  const clr  = p90(stats.clearances,    minutes);
  const blk  = p90(stats.blocked_shots, minutes);
  const wdb  = p90(stats.was_dribbled,  minutes);
  const gdW  = p90(stats.ground_duels_won,                              minutes);
  const gdL  = p90(Math.max(0, stats.ground_duels_total - stats.ground_duels_won), minutes);
  const adW  = p90(stats.aerial_duels_won,                              minutes);
  const adL  = p90(Math.max(0, stats.aerial_duels_total - stats.aerial_duels_won), minutes);
  const fc   = p90(stats.fouls_committed, minutes);
  const yc   = p90(stats.yellow_cards,    minutes);
  const rc   = p90(stats.red_cards,       minutes);

  // ── Axis scores ────────────────────────────────────────────────────────────
  const ata = clamp(
    score(g,    0.60) * 0.50 +
    score(sot,  1.80) * 0.25 +
    score(penW, 0.10) * 0.10 +
    score(sop,  0.50) * 0.05 +
    scoreNeg(off, 1.50) * 0.10
  );

  const cri = clamp(
    score(cc,  0.60) * 0.25 +
    score(kp,  1.50) * 0.25 +
    score(ast, 0.30) * 0.20 +
    score(pp,  5.00) * 0.15 +
    score(crs, 1.00) * 0.10 +
    scoreNeg(crf, 4.00) * 0.05
  );

  const tec = clamp(
    score(ast,  0.30) * 0.25 +
    score(acp,  25.0) * 0.15 +
    score(drs,  2.00) * 0.15 +
    score(pp,   3.50) * 0.10 +
    score(lpA,  2.00) * 0.10 +
    score(fd,   2.60) * 0.05 +
    scoreNeg(pf,   12.0) * 0.05 +
    scoreNeg(lpF,  6.00) * 0.05 +
    scoreNeg(drf,  2.50) * 0.05 +
    scoreNeg(posL, 15.0) * 0.05
  );

  const tat = clamp(
    score(int_, 1.20) * 0.15 +
    score(pp,   3.50) * 0.12 +
    score(rcv,  4.50) * 0.10 +
    score(stl,  1.50) * 0.10 +
    score(tkl,  2.00) * 0.08 +
    score(gdW,  2.50) * 0.06 +
    score(adW,  1.50) * 0.06 +
    scoreNeg(fc,  3.00) * 0.08 +
    scoreNeg(rc,  0.05) * 0.12 +
    scoreNeg(yc,  0.30) * 0.06 +
    scoreNeg(gdL, 3.00) * 0.04 +
    scoreNeg(adL, 2.00) * 0.03
  );

  const def = clamp(
    score(stl,  1.50) * 0.20 +
    score(tkl,  2.00) * 0.12 +
    score(int_, 1.20) * 0.12 +
    score(rcv,  4.50) * 0.10 +
    score(clr,  1.50) * 0.10 +
    score(blk,  1.00) * 0.10 +
    score(gdW,  2.50) * 0.08 +
    score(adW,  1.50) * 0.08 +
    scoreNeg(gdL, 3.00) * 0.06 +
    scoreNeg(adL, 2.00) * 0.04
  );

  return {
    ata: Math.round(ata),
    cri: Math.round(cri),
    tec: Math.round(tec),
    def: Math.round(def),
    tat: Math.round(tat),
    confidence,
    matches: stats.matches,
    minutes,
    per90: { g, sot, sop, penW, off, kp, cc, crs, crf, pp, ast, acp, lpA, lpF,
             drs, drf, fd, pf, posL, tkl, stl, rcv, int_, clr, blk, wdb,
             gdW, gdL, adW, adL, fc, yc, rc },
  };
}
