import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronRight, Loader2, Target, Crosshair, Zap, Award,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildInsights, CAT,
  type Insight, type AggregateRow, type GoalRow, type ContractRow, type PhysicalRow,
} from "@/lib/insightsEngine";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";

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

function fmt1(n: number) { return n.toFixed(1); }
function fmt0(n: number) { return Math.round(n).toString(); }

// Builds the athlete-narrative insights that the shared roster-alert engine
// doesn't cover: per-90 goal contribution, shot/chance-creation quality, and
// attribute-score trend vs the previous season. These are personal-narrative
// framings, distinct from the pass/duel/dribble efficiency rules the shared
// engine already produces from the same season aggregates.
function buildNarrativeInsights(params: {
  athleteId: string; playerName: string; profileHref: string;
  goals: number; assists: number; matches: number; minutes: number;
  yellowCards: number; redCards: number;
  recentTrend: "up" | "down" | "stable"; averageRating: number | null;
  liveStats?: LiveStats | null;
  ata: number | null; prevAta: number | null;
}): Insight[] {
  const { athleteId: playerId, playerName, profileHref: link, goals, assists, matches, minutes,
    yellowCards, redCards, recentTrend, averageRating, liveStats, ata, prevAta } = params;
  const list: Insight[] = [];

  // ── Participação em Gol (G+A por 90) ──────────────────────────────────────
  {
    const ga = goals + assists;
    const per90 = minutes >= 90 ? (ga / minutes) * 90 : null;
    if (ga === 0) {
      list.push({
        id: "narrative-ga", playerId, playerName, category: "alert", priority: 4,
        icon: Target,
        title: "Sem Participações Diretas em Gol",
        description: `${matches} jogos sem gol ou assistência registrada ainda.`,
        tooltip: `${playerName} — ${matches} jogos sem participação direta em gol.`,
        link,
      });
    } else {
      const category = per90 !== null && per90 >= 0.4 ? "positive" : per90 !== null && per90 >= 0.15 ? "neutral" : "alert";
      list.push({
        id: "narrative-ga", playerId, playerName, category, priority: category === "positive" ? 6 : 4,
        icon: Target,
        title: `Participações em Gol: ${ga} (G+A)`,
        description: per90 !== null
          ? `${fmt1(per90)} G+A/90 min · ${goals}G + ${assists}A em ${matches} jogos.`
          : `${goals} gols + ${assists} assistências em ${matches} jogos.`,
        tooltip: `${playerName} — ${ga} participações em gol (${goals}G + ${assists}A) em ${matches} jogos e ${minutes} minutos.`,
        link,
      });
    }
  }

  // ── Precisão de Finalização ────────────────────────────────────────────────
  if (liveStats) {
    const totalShots = (liveStats.shots_on_target ?? 0) + (liveStats.shots_off_target ?? 0) + (liveStats.shots_blocked ?? 0) + (liveStats.shots_on_post ?? 0);
    if (totalShots >= 4) {
      const pct = (liveStats.shots_on_target / totalShots) * 100;
      const category = pct >= 45 ? "positive" : pct >= 30 ? "neutral" : "critical";
      list.push({
        id: "narrative-shots", playerId, playerName, category, priority: category === "critical" ? 1 : category === "positive" ? 6 : 7,
        icon: Crosshair,
        title: pct < 30 ? "Finalização no Alvo: Abaixo do Esperado" : pct >= 45 ? "Boa Precisão de Finalização" : "Finalização no Alvo: Razoável",
        description: `${fmt0(pct)}% das finalizações no gol (${liveStats.shots_on_target}/${totalShots} chutes).`,
        tooltip: `${playerName} — ${fmt0(pct)}% de precisão de finalização (${liveStats.shots_on_target}/${totalShots} chutes no alvo).`,
        link,
      });
    }

    // ── Criação de Chances ────────────────────────────────────────────────────
    if (liveStats.chances_created > 0 || liveStats.key_passes > 0) {
      const category = liveStats.chances_created >= 10 ? "positive" : liveStats.chances_created >= 4 ? "neutral" : "alert";
      list.push({
        id: "narrative-chances", playerId, playerName, category, priority: category === "positive" ? 6 : 7,
        icon: Zap,
        title: "Criação de Chances",
        description: `${liveStats.chances_created} chances criadas · ${liveStats.key_passes} passes decisivos.`,
        tooltip: `${playerName} — ${liveStats.chances_created} chances criadas e ${liveStats.key_passes} passes decisivos na temporada.`,
        link,
      });
    }
  }

  // ── Nota de Ataque (ATA) vs ano anterior ──────────────────────────────────
  if (ata !== null) {
    let title: string; let description: string; let category: Insight["category"];
    if (prevAta !== null) {
      const delta = ata - prevAta;
      category = delta >= 5 ? "positive" : delta <= -5 ? "critical" : ata >= 60 ? "positive" : ata >= 40 ? "neutral" : "alert";
      const direction = delta >= 5 ? "↑ subiu" : delta <= -5 ? "↓ caiu" : "manteve";
      title = `Nota de Ataque: ${fmt0(ata)}/100`;
      description = `${direction} ${Math.abs(delta) >= 2 ? Math.round(Math.abs(delta)) + " pontos" : "estável"} vs temporada anterior (${fmt0(prevAta)}).`;
    } else {
      category = ata >= 60 ? "positive" : ata >= 40 ? "neutral" : "alert";
      title = `Nota de Ataque: ${fmt0(ata)}/100`;
      description = ata < 40 ? "Índice ofensivo abaixo de 40 — espaço para evolução."
        : ata >= 60 ? "Bom índice ofensivo na temporada atual."
        : "Índice ofensivo dentro da média.";
    }
    list.push({
      id: "narrative-ata", playerId, playerName, category, priority: category === "critical" ? 1 : category === "positive" ? 6 : 4,
      icon: TrendingUp, title, description,
      tooltip: `${playerName} — ${description}`,
      link,
    });
  }

  // ── Disciplina / Tendência de Nota ────────────────────────────────────────
  {
    const avgMin = matches > 0 ? minutes / matches : 0;
    const cardsPerMatch = matches > 0 ? (yellowCards + redCards * 2) / matches : 0;

    if (cardsPerMatch >= 0.5 || redCards > 0) {
      list.push({
        id: "narrative-discipline", playerId, playerName, category: "critical", priority: 1,
        icon: AlertTriangle,
        title: "Disciplina: Atenção aos Cartões",
        description: `${yellowCards} amarelo${yellowCards !== 1 ? "s" : ""}${redCards > 0 ? ` + ${redCards} vermelho${redCards !== 1 ? "s" : ""}` : ""} em ${matches} jogos.`,
        tooltip: `${playerName} — ${yellowCards} cartões amarelos e ${redCards} vermelhos em ${matches} jogos.`,
        link,
      });
    } else {
      const category = recentTrend === "up" ? "positive" : recentTrend === "down" ? "alert" : "neutral";
      const trendLabel = recentTrend === "up" ? "Em Alta" : recentTrend === "down" ? "Em Baixa" : "Estável";
      list.push({
        id: "narrative-trend", playerId, playerName, category, priority: category === "positive" ? 6 : 4,
        icon: recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Minus,
        title: `Tendência de Nota: ${trendLabel}`,
        description: averageRating !== null
          ? `Nota média ${averageRating.toFixed(1)} · ${fmt0(avgMin)} min/jogo · ${yellowCards} amarelo${yellowCards !== 1 ? "s" : ""}.`
          : `Média de ${fmt0(avgMin)} min/jogo em ${matches} partidas.`,
        tooltip: `${playerName} — tendência de nota ${trendLabel.toLowerCase()}, média ${averageRating?.toFixed(1) ?? "N/D"}.`,
        link,
      });
    }
  }

  return list;
}

// Same insight engine the admin panel uses (position-aware thresholds,
// physical composition vs elite, real contract source, season fallback),
// merged with athlete-only narrative insights (shot accuracy, ATA trend,
// rating trend, disciplina) that don't apply to a roster-wide view.
export function AthleteInsightsCard({
  athleteId, averageRating, recentTrend, goals, assists, matches, minutes,
  yellowCards = 0, redCards = 0, liveStats,
}: AthleteInsightsCardProps) {
  const currentYear = new Date().getFullYear();

  const { data: aggResult, isLoading: loadingAgg } = useQuery({
    queryKey: ["athlete-insights-aggregates", athleteId, currentYear],
    queryFn: async () => {
      for (const year of [currentYear, currentYear - 1, currentYear - 2]) {
        const { data, error } = await supabase.rpc("get_season_player_aggregates", { p_season_year: year });
        if (error) throw error;
        const rows = ((data ?? []) as AggregateRow[]).filter(r => r.player_id === athleteId);
        if (rows.length > 0) return { year, aggregates: rows };
      }
      return { year: currentYear, aggregates: [] as AggregateRow[] };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!athleteId,
  });

  const resolvedYear = aggResult?.year ?? currentYear;
  const aggregates = aggResult?.aggregates ?? [];

  const { data: goalMetas = [], isLoading: loadingGoals } = useQuery<GoalRow[]>({
    queryKey: ["athlete-insights-goals", athleteId, resolvedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_season_goals")
        .select("id, player_id, goal_type, target_value, season_year, player:players(full_name)")
        .eq("player_id", athleteId)
        .eq("season_year", resolvedYear);
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!athleteId && !!aggResult,
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<ContractRow[]>({
    queryKey: ["athlete-insights-contract", athleteId],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      const ninetyDaysStr = ninetyDays.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("player_contract_history")
        .select("player_id, end_date, players!player_contract_history_player_id_fkey(full_name, is_archived)")
        .eq("player_id", athleteId)
        .eq("is_archived", false)
        .not("end_date", "is", null)
        .gte("end_date", todayStr)
        .lte("end_date", ninetyDaysStr)
        .order("end_date", { ascending: true })
        .limit(1);
      if (error) throw error;

      const row = (data ?? [])[0] as { player_id: string; end_date: string; players: { full_name: string; is_archived: boolean | null } | null } | undefined;
      if (!row || row.players?.is_archived) return [];
      return [{ id: row.player_id, full_name: row.players?.full_name ?? "Atleta", contract_end: row.end_date }];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!athleteId,
  });

  const { data: physicalRows = [], isLoading: loadingPhysical } = useQuery<PhysicalRow[]>({
    queryKey: ["athlete-insights-physical", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, position, body_fat_percentage")
        .eq("id", athleteId)
        .maybeSingle();
      if (error) throw error;
      return data ? [data as PhysicalRow] : [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!athleteId,
  });

  const [attrData, setAttrData] = useState<{ ata: number | null; prevAta: number | null }>({ ata: null, prevAta: null });
  const [loadingAttr, setLoadingAttr] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAttr(true);
      try {
        const { data } = await supabase
          .from("player_attribute_scores")
          .select("ata_score_100, season_year")
          .eq("player_id", athleteId)
          .in("season_year", [resolvedYear, resolvedYear - 1])
          .order("updated_at", { ascending: false });
        if (cancelled) return;
        const cur = data?.find(r => r.season_year === resolvedYear) ?? null;
        const prev = data?.find(r => r.season_year === resolvedYear - 1) ?? null;
        setAttrData({ ata: cur?.ata_score_100 ?? null, prevAta: prev?.ata_score_100 ?? null });
      } catch (e) {
        console.error("[AthleteInsightsCard]", e);
      } finally {
        if (!cancelled) setLoadingAttr(false);
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId, resolvedYear]);

  const positionByPlayerId = useMemo(
    () => new Map(physicalRows.map(p => [p.id, p.position])),
    [physicalRows],
  );

  const playerName = physicalRows[0]?.full_name ?? "";
  const profileHref = `/dashboard/atletas/${athleteId}?tab=stats`;

  const insights = useMemo(() => {
    const shared = buildInsights(aggregates, goalMetas, contracts, physicalRows, resolvedYear, positionByPlayerId);
    const narrative = buildNarrativeInsights({
      athleteId, playerName, profileHref,
      goals, assists, matches, minutes, yellowCards, redCards,
      recentTrend, averageRating, liveStats,
      ata: attrData.ata, prevAta: attrData.prevAta,
    });
    return [...shared, ...narrative].sort((a, b) => a.priority - b.priority);
  }, [aggregates, goalMetas, contracts, physicalRows, resolvedYear, positionByPlayerId,
      athleteId, playerName, profileHref, goals, assists, matches, minutes, yellowCards, redCards,
      recentTrend, averageRating, liveStats, attrData]);

  const isLoading = loadingAgg || loadingGoals || loadingContracts || loadingPhysical || loadingAttr;

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
          // MEUS INSIGHTS
        </span>
        <span className="font-editorial-mono text-[10px] tracking-[0.1em]" style={{ color: MUTED }}>
          {resolvedYear}
        </span>
      </div>

      {/* ── Insights list ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      ) : insights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
          <Award className="w-5 h-5" style={{ color: "#22c55e" }} />
          <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>
            Tudo em dia — nenhum ponto de atenção no momento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: CARD_BORDER }}>
          {insights.map((insight) => {
            const Icon = insight.icon;
            const cat = CAT[insight.category];

            return (
              <Link key={insight.id} to={insight.link || profileHref} className="block" style={{ borderColor: CARD_BORDER }}>
                <div
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 group cursor-pointer"
                  style={{ borderColor: CARD_BORDER }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                  title={insight.tooltip}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cat.color}18` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-editorial-mono text-[12px] font-semibold leading-tight tracking-[0.02em] truncate"
                      style={{ color: cat.color }}
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

                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: MUTED }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
