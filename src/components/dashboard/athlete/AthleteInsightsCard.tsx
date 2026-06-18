import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Target, Shield, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Crosshair, Zap, Award, ChevronRight, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG    = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED      = "#62616a";
const TEXT       = "#ededee";
const RED        = "#ec4525";
const AMBER      = "#f59e0b";
const GREEN      = "#22c55e";
const BLUE       = "#06b6d4";

type Severity = "alert" | "warning" | "good" | "neutral";

interface Insight {
  id: string;
  icon: React.ElementType;
  severity: Severity;
  title: string;
  description: string;
  href?: string;
}

interface LiveStats {
  shots_on_target: number;
  shots_off_target: number;
  shots_blocked: number;
  shots_on_post: number;
  crosses_success: number;
  crosses_failed: number;
  dribbles_success: number;
  dribbles_total: number;
  chances_created: number;
  key_passes: number;
}

interface AthleteInsightsCardProps {
  athleteId: string;
  athletePosition: string;
  averageRating: number | null;
  recentTrend: "up" | "down" | "stable";
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
  yellowCards?: number;
  redCards?: number;
  liveStats?: LiveStats | null;
}

function severityColor(s: Severity): string {
  if (s === "alert")   return RED;
  if (s === "warning") return AMBER;
  if (s === "good")    return GREEN;
  return TEXT;
}

function severityIconBg(s: Severity): string {
  if (s === "alert")   return "rgba(236,69,37,0.15)";
  if (s === "warning") return "rgba(245,158,11,0.15)";
  if (s === "good")    return "rgba(34,197,94,0.15)";
  return "rgba(255,255,255,0.06)";
}

function fmt1(n: number) { return n.toFixed(1); }
function fmt0(n: number) { return Math.round(n).toString(); }

export function AthleteInsightsCard({
  athleteId,
  athletePosition,
  averageRating,
  recentTrend,
  goals,
  assists,
  matches,
  minutes,
  yellowCards = 0,
  redCards    = 0,
  liveStats,
}: AthleteInsightsCardProps) {
  const [loading, setLoading] = useState(true);
  const [attrData, setAttrData] = useState<{
    current: { ata: number | null; tec: number | null; tat: number | null; def: number | null; cri: number | null } | null;
    previous: { ata: number | null } | null;
  }>({ current: null, previous: null });

  useEffect(() => {
    const fetchAttrs = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const { data } = await supabase
          .from("player_attribute_scores")
          .select("ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, season_year")
          .eq("player_id", athleteId)
          .in("season_year", [currentYear, currentYear - 1])
          .order("updated_at", { ascending: false });

        const cur = data?.find(r => r.season_year === currentYear) ?? null;
        const prev = data?.find(r => r.season_year === currentYear - 1) ?? null;

        setAttrData({
          current: cur
            ? { ata: cur.ata_score_100, tec: cur.tec_score_100, tat: cur.tat_score_100, def: cur.def_score_100, cri: cur.cri_score_100 }
            : null,
          previous: prev ? { ata: prev.ata_score_100 } : null,
        });
      } catch (e) {
        console.error("[AthleteInsightsCard]", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAttrs();
  }, [athleteId]);

  const insights = useMemo((): Insight[] => {
    const list: Insight[] = [];
    const profileHref = `/dashboard/atletas/${athleteId}?tab=stats`;

    // ── 1. Participação em Gol (G+A) ─────────────────────────────────────────
    {
      const ga = goals + assists;
      const per90 = minutes >= 90 ? (ga / minutes) * 90 : null;
      if (ga === 0) {
        list.push({
          id: "ga",
          icon: Target,
          severity: "alert",
          title: "Sem Participações Diretas em Gol",
          description: `${matches} jogos sem gol ou assistência registrada ainda.`,
          href: profileHref,
        });
      } else {
        const sev: Severity = per90 !== null && per90 >= 0.4 ? "good" : per90 !== null && per90 >= 0.15 ? "neutral" : "warning";
        list.push({
          id: "ga",
          icon: Target,
          severity: sev,
          title: `Participações em Gol: ${ga} (G+A)`,
          description: per90 !== null
            ? `${fmt1(per90)} G+A/90 min · ${goals}G + ${assists}A em ${matches} jogos.`
            : `${goals} gols + ${assists} assistências em ${matches} jogos.`,
          href: profileHref,
        });
      }
    }

    // ── 2. Precisão de Finalização ────────────────────────────────────────────
    if (liveStats) {
      const totalShots = (liveStats.shots_on_target ?? 0) + (liveStats.shots_off_target ?? 0) + (liveStats.shots_blocked ?? 0) + (liveStats.shots_on_post ?? 0);
      if (totalShots >= 4) {
        const pct = (liveStats.shots_on_target / totalShots) * 100;
        const sev: Severity = pct >= 45 ? "good" : pct >= 30 ? "neutral" : "alert";
        list.push({
          id: "shots",
          icon: Crosshair,
          severity: sev,
          title: pct < 30
            ? `Finalização no Alvo: Abaixo do Esperado`
            : pct >= 45
              ? `Boa Precisão de Finalização`
              : `Finalização no Alvo: Razoável`,
          description: `${fmt0(pct)}% das finalizações no gol (${liveStats.shots_on_target}/${totalShots} chutes).`,
          href: profileHref,
        });
      }
    }

    // ── 3. Aproveitamento de Cruzamentos ─────────────────────────────────────
    if (liveStats) {
      const totalCrosses = (liveStats.crosses_success ?? 0) + (liveStats.crosses_failed ?? 0);
      if (totalCrosses >= 5) {
        const pct = (liveStats.crosses_success / totalCrosses) * 100;
        const sev: Severity = pct >= 50 ? "good" : pct >= 30 ? "warning" : "alert";
        list.push({
          id: "crosses",
          icon: Zap,
          severity: sev,
          title: pct < 30
            ? `Cruzamentos: Aproveitamento Crítico`
            : pct >= 50
              ? `Bom Aproveitamento de Cruzamentos`
              : `Cruzamentos: Atenção`,
          description: `${fmt0(pct)}% de aproveitamento (${liveStats.crosses_success}/${totalCrosses} certos).`,
          href: profileHref,
        });
      } else if (liveStats.chances_created > 0 || liveStats.key_passes > 0) {
        // Fallback: criação de chances
        const sev: Severity = liveStats.chances_created >= 10 ? "good" : liveStats.chances_created >= 4 ? "neutral" : "warning";
        list.push({
          id: "crosses",
          icon: Zap,
          severity: sev,
          title: `Criação de Chances`,
          description: `${liveStats.chances_created} chances criadas · ${liveStats.key_passes} passes decisivos.`,
          href: profileHref,
        });
      }
    }

    // ── 4. Dribles ────────────────────────────────────────────────────────────
    if (liveStats && liveStats.dribbles_total >= 5) {
      const pct = (liveStats.dribbles_success / liveStats.dribbles_total) * 100;
      const sev: Severity = pct >= 60 ? "good" : pct >= 40 ? "neutral" : "warning";
      list.push({
        id: "dribbles",
        icon: Award,
        severity: sev,
        title: pct >= 60
          ? `Dribles: Alta Taxa de Sucesso`
          : pct >= 40
            ? `Dribles: Aproveitamento Médio`
            : `Dribles: Atenção ao Aproveitamento`,
        description: `${fmt0(pct)}% de sucesso (${liveStats.dribbles_success}/${liveStats.dribbles_total} tentativas).`,
        href: profileHref,
      });
    }

    // ── 5. Nota de Ataque (ATA) vs ano anterior ───────────────────────────────
    {
      const ata = attrData.current?.ata ?? null;
      const prevAta = attrData.previous?.ata ?? null;
      if (ata !== null) {
        let title: string;
        let description: string;
        let sev: Severity;
        if (prevAta !== null) {
          const delta = ata - prevAta;
          sev = delta >= 5 ? "good" : delta <= -5 ? "alert" : ata >= 60 ? "good" : ata >= 40 ? "neutral" : "warning";
          const direction = delta >= 5 ? "↑ subiu" : delta <= -5 ? "↓ caiu" : "manteve";
          title = `Nota de Ataque: ${fmt0(ata)}/100`;
          description = `${direction} ${Math.abs(delta) >= 2 ? Math.round(Math.abs(delta)) + " pontos" : "estável"} vs temporada anterior (${fmt0(prevAta)}).`;
        } else {
          sev = ata >= 60 ? "good" : ata >= 40 ? "neutral" : "warning";
          title = `Nota de Ataque: ${fmt0(ata)}/100`;
          description = ata < 40
            ? `Índice ofensivo abaixo de 40 — espaço para evolução.`
            : ata >= 60
              ? `Bom índice ofensivo na temporada atual.`
              : `Índice ofensivo dentro da média.`;
        }
        list.push({ id: "ata", icon: TrendingUp, severity: sev, title, description, href: profileHref });
      }
    }

    // ── 6. Disciplina / Minutagem ─────────────────────────────────────────────
    {
      const avgMin = matches > 0 ? minutes / matches : 0;
      const cardsPerMatch = matches > 0 ? (yellowCards + redCards * 2) / matches : 0;

      if (cardsPerMatch >= 0.5 || redCards > 0) {
        list.push({
          id: "discipline",
          icon: AlertTriangle,
          severity: "alert",
          title: `Disciplina: Atenção aos Cartões`,
          description: `${yellowCards} amarelo${yellowCards !== 1 ? "s" : ""}${redCards > 0 ? ` + ${redCards} vermelho${redCards !== 1 ? "s" : ""}` : ""} em ${matches} jogos.`,
          href: profileHref,
        });
      } else if (avgMin < 60 && matches >= 5) {
        list.push({
          id: "discipline",
          icon: AlertTriangle,
          severity: "warning",
          title: `Minutagem Abaixo do Esperado`,
          description: `Média de ${fmt0(avgMin)} min/jogo em ${matches} partidas — abaixo de 60 min.`,
          href: profileHref,
        });
      } else {
        const TIcon = recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Minus;
        const trendLabel = recentTrend === "up" ? "Em Alta" : recentTrend === "down" ? "Em Baixa" : "Estável";
        const sev: Severity = recentTrend === "up" ? "good" : recentTrend === "down" ? "warning" : "neutral";
        list.push({
          id: "discipline",
          icon: TIcon,
          severity: sev,
          title: `Tendência de Nota: ${trendLabel}`,
          description: averageRating !== null
            ? `Nota média ${averageRating.toFixed(1)} · ${fmt0(avgMin)} min/jogo · ${yellowCards} amarelo${yellowCards !== 1 ? "s" : ""}.`
            : `Média de ${fmt0(avgMin)} min/jogo em ${matches} partidas.`,
          href: profileHref,
        });
      }
    }

    // ── Preenche até 6 insights ────────────────────────────────────────────────
    while (list.length < 6) {
      list.push({
        id: `fill-${list.length}`,
        icon: Shield,
        severity: "neutral",
        title: "Mais dados em breve",
        description: "Registre mais partidas para gerar novos insights.",
        href: profileHref,
      });
    }

    return list.slice(0, 6);
  }, [attrData, averageRating, recentTrend, goals, assists, matches, minutes, yellowCards, redCards, liveStats, athleteId]);

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col flex-1"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: CARD_BORDER }}
      >
        <span
          className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase"
          style={{ color: MUTED }}
        >
          // INSIGHTS DO ATLETA
        </span>
        <span className="font-editorial-mono text-[10px] tracking-[0.1em]" style={{ color: MUTED }}>
          {new Date().getFullYear()}
        </span>
      </div>

      {/* ── Insights list ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: CARD_BORDER }}>
          {insights.map((insight) => {
            const Icon  = insight.icon;
            const color = severityColor(insight.severity);
            const bg    = severityIconBg(insight.severity);

            const inner = (
              <div
                className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 group cursor-pointer"
                style={{ borderColor: CARD_BORDER }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-editorial-mono text-[12px] font-semibold leading-tight tracking-[0.02em] truncate"
                    style={{ color }}
                  >
                    {insight.title}
                  </p>
                  <p
                    className="font-editorial-mono text-[10.5px] mt-0.5 leading-snug line-clamp-2"
                    style={{ color: MUTED }}
                  >
                    {insight.description}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: MUTED }}
                />
              </div>
            );

            return insight.href ? (
              <Link key={insight.id} to={insight.href} className="block" style={{ borderColor: CARD_BORDER }}>
                {inner}
              </Link>
            ) : (
              <div key={insight.id} style={{ borderColor: CARD_BORDER }}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
