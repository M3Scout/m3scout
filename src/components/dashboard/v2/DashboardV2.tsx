import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { useContractNotificationCheck } from "@/hooks/useContractNotificationCheck";
import { AdminSkeletonDashboard } from "@/components/admin/AdminSkeleton";
import { AthleteDashboard } from "@/components/dashboard/athlete/AthleteDashboard";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { isAbortError, logFetchError, logFetchSuccess } from "@/lib/fetchLogger";
import { Star, Users, FileText, ArrowRight } from "lucide-react";
import "./dashboard-v2.css";

interface DashboardStats {
  totalPlayers: number;
  reportsThisMonth: number;
  totalLeads: number;
  expiringContracts: number;
}
interface PositionData { name: string; value: number; }
interface RecentReport {
  id: string; player_name: string; competition_name: string;
  match_date: string; final_score: number;
}
interface CompetitionUsage {
  id: string; name: string; tier: string; final_coefficient: number;
  usos: number; jogadores: number; ultimo_uso: string | null;
}
interface PositionRow { position: string | null; }
interface RecentReportRow {
  id: string; match_date: string; final_score: number | null;
  players?: { full_name: string | null } | null;
  competitions?: { name: string | null } | null;
}
interface CompetitionRow {
  id: string; name: string; display_name?: string | null;
  tier: string; final_coefficient: number;
}
interface IdRow { id: string; }
interface PlayerIdRow { player_id: string | null; }
interface RankedPlayer {
  id: string; full_name: string; position: string;
  auto_rating: number | null; current_club: string | null; age: number | null;
}

const POS_BAR_COLOR: Record<string, string> = {
  PD: "#E5173F", PE: "#E5173F",
  MEI: "#E8C84A", MEA: "#E8C84A",
  GOL: "#2DCE8A", ZAG: "#2DCE8A",
  LD: "#2DCE8A", LE: "#2DCE8A",
  VOL: "#E8C84A",
  CA: "#E5173F", ATA: "#E5173F",
};

const POS_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  GOL: { bg: "rgba(45,206,138,0.12)", color: "#2DCE8A" },
  ZAG: { bg: "rgba(45,206,138,0.12)", color: "#2DCE8A" },
  LD: { bg: "rgba(45,206,138,0.12)", color: "#2DCE8A" },
  LE: { bg: "rgba(45,206,138,0.12)", color: "#2DCE8A" },
  VOL: { bg: "rgba(232,200,74,0.12)", color: "#E8C84A" },
  MEI: { bg: "rgba(232,200,74,0.12)", color: "#E8C84A" },
  MEA: { bg: "rgba(232,200,74,0.12)", color: "#E8C84A" },
  PD: { bg: "rgba(229,23,63,0.12)", color: "#E5173F" },
  PE: { bg: "rgba(229,23,63,0.12)", color: "#E5173F" },
  CA: { bg: "rgba(229,23,63,0.12)", color: "#E5173F" },
  ATA: { bg: "rgba(229,23,63,0.12)", color: "#E5173F" },
};

const SHORT_POS: Record<string, string> = {
  "Goleiro": "GOL", "Zagueiro": "ZAG",
  "Lateral Direito": "LD", "Lateral Esquerdo": "LE",
  "Volante": "VOL", "Meia": "MEI", "Meia Atacante": "MEA",
  "Ponta Direita": "PD", "Ponta Esquerda": "PE",
  "Centroavante": "CA", "Atacante": "ATA",
};
const shortPos = (p: string) => SHORT_POS[p] || (p ? p.slice(0, 3).toUpperCase() : "—");

const formatDateShort = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const now = new Date();
const currentMonth = now.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
const currentYear = now.getFullYear();

const uniqueCount = (values: Array<string | null | undefined>) => new Set(values.filter(Boolean)).size;

// ── Multi-player radar ────────────────────────────────────────────────────
const RADAR_COLORS = ["#06b6d4", "#2DCE8A", "#E8C44A", "#ec4525", "#a855f7", "#f97316"];
const RADAR_AXES = [
  { key: "ata", label: "ATA" },
  { key: "tec", label: "TEC" },
  { key: "tat", label: "TAT" },
  { key: "def", label: "DEF" },
  { key: "cri", label: "CRI" },
] as const;

interface PlayerRadarData {
  id: string;
  full_name: string;
  color: string;
  scores: { ata: number; tec: number; tat: number; def: number; cri: number };
  avg: number;
}

function MultiPlayerRadar({ players, availableYears, selectedYear, onYearChange }: {
  players: PlayerRadarData[];
  availableYears: number[];
  selectedYear: number | null;
  onYearChange: (y: number) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredPlayer = players.find(p => p.id === hoveredId) ?? null;

  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 46;
  const N = 5;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i: number, r: number): [number, number] => [
    CX + Math.cos(angle(i)) * r,
    CY + Math.sin(angle(i)) * r,
  ];

  const SCORE_KEYS: (keyof PlayerRadarData["scores"])[] = ["ata", "tec", "tat", "def", "cri"];

  return (
    <div className="flex flex-col items-center" style={{ padding: "16px 20px 20px" }}>
      {availableYears.length > 1 && (
        <div className="flex gap-1.5 mb-3 self-start">
          {availableYears.map(year => (
            <button
              key={year}
              type="button"
              onClick={() => onYearChange(year)}
              className="font-editorial-mono text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded transition-all duration-200"
              style={year === selectedYear
                ? { color: "#ededee", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }
                : { color: "#62616a", background: "transparent", border: "1px solid transparent" }
              }
            >
              {year}
            </button>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto overflow-visible" style={{ width: "100%", maxWidth: 340 }}>
        {[0.25, 0.5, 0.75, 1].map(f => {
          const pts = RADAR_AXES.map((_, i) => pt(i, R * f).join(",")).join(" ");
          return <polygon key={f} points={pts} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
        })}
        {RADAR_AXES.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
        })}
        {/* Visual polygons — pointer events disabled so fill doesn't block smaller shapes */}
        {players.map(p => {
          const vals = SCORE_KEYS.map(k => p.scores[k]);
          const pts = vals.map((v, i) => pt(i, R * (v / 100)).join(",")).join(" ");
          const isHovered = hoveredId === p.id;
          return (
            <polygon
              key={p.id}
              points={pts}
              fill={isHovered ? `${p.color}33` : `${p.color}1a`}
              stroke={p.color}
              strokeWidth={isHovered ? 2 : 1.5}
              strokeLinejoin="round"
              style={{ pointerEvents: "none", transition: "fill 0.15s" }}
            />
          );
        })}
        {/* Hit-area polygons — invisible thick stroke, detect hover by line only */}
        {players.map(p => {
          const vals = SCORE_KEYS.map(k => p.scores[k]);
          const pts = vals.map((v, i) => pt(i, R * (v / 100)).join(",")).join(" ");
          return (
            <polygon
              key={`hit-${p.id}`}
              points={pts}
              fill="none"
              stroke="white"
              strokeWidth="12"
              strokeOpacity="0"
              strokeLinejoin="round"
              pointerEvents="stroke"
              style={{ cursor: "default" }}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          );
        })}
        {RADAR_AXES.map((ax, i) => {
          const [lx, ly] = pt(i, R + 22);
          const anchor = Math.abs(lx - CX) < 8 ? "middle" : lx > CX ? "start" : "end";
          const score = hoveredPlayer ? hoveredPlayer.scores[ax.key] : null;
          return (
            <g key={ax.key}>
              <text
                x={lx} y={score !== null ? ly - 7 : ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="#62616a"
                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "10px", letterSpacing: "0.06em", transition: "y 0.15s" }}
              >
                {ax.label}
              </text>
              {score !== null && (
                <text
                  x={lx} y={ly + 8}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill={hoveredPlayer!.color}
                  style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "11px", fontWeight: 600 }}
                >
                  {score}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-row flex-wrap gap-x-5 gap-y-2 mt-3">
        {players.map(p => (
          <Link
            key={p.id}
            to={`/dashboard/atletas/${p.id}`}
            className="flex items-center gap-2 transition-opacity"
            style={{ opacity: hoveredId && hoveredId !== p.id ? 0.35 : 1 }}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: p.color }} />
            <span className="font-display text-[10px] font-medium text-[#ededee]">
              {p.full_name.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const DashboardV2 = () => {
  const { isAdmin, isScout, isPlayer, rolesLoading, session, permissionsLoading } = useAuth();
  const rbacReady = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  useContractNotificationCheck();

  const enabled = rbacReady;

  // ── Query 1: bundle of dashboard-wide stats (8 parallel reqs, runs ONCE per 5 min) ──
  const overviewQuery = useQuery({
    queryKey: ["dashboard-v2", "overview", session?.user?.id ?? null],
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const start = performance.now();
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const [
        playersRes, leadsRes, contractsRes, positionsRes,
        recentReportsRes, reportsThisMonthRes, topPlayersRes,
      ] = await Promise.all([
        supabase.from("players").select("id", { count: "exact", head: true })
          .or("is_archived.is.null,is_archived.eq.false"),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true })
          .gte("contract_end", new Date().toISOString().split("T")[0])
          .lte("contract_end", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
        supabase.from("players").select("position").or("is_archived.is.null,is_archived.eq.false"),
        supabase.from("scouting_reports")
          .select(`id, match_date, final_score, players(full_name), competitions(name)`)
          .is("deleted_at", null).order("created_at", { ascending: false }).limit(6),
        supabase.from("scouting_reports").select("id", { count: "exact", head: true })
          .is("deleted_at", null).gte("created_at", firstDayOfMonth.toISOString()),
        supabase.from("players")
          .select("id, full_name, position, auto_rating, current_club, age")
          .not("auto_rating", "is", null)
          .or("is_archived.is.null,is_archived.eq.false")
          .order("auto_rating", { ascending: false }).limit(6),
      ]);

      const stats: DashboardStats = {
        totalPlayers: playersRes.count || 0,
        reportsThisMonth: reportsThisMonthRes.count || 0,
        totalLeads: leadsRes.count || 0,
        expiringContracts: contractsRes.count || 0,
      };

      const counts: Record<string, number> = {};
      ((positionsRes.data as PositionRow[] | null) || []).forEach((p) => {
        const pos = shortPos(p.position || "");
        counts[pos] = (counts[pos] || 0) + 1;
      });
      const positionData: PositionData[] = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5);

      const recentReports: RecentReport[] = ((recentReportsRes.data as unknown as RecentReportRow[] | null) || []).map((r) => ({
        id: r.id,
        player_name: r.players?.full_name || "—",
        competition_name: r.competitions?.name || "—",
        match_date: r.match_date,
        final_score: r.final_score ?? 0,
      }));

      const topPlayers = (topPlayersRes.data as RankedPlayer[] | null) || [];

      logFetchSuccess({ endpoint: "DashboardV2.overview" }, performance.now() - start);
      return { stats, positionData, recentReports, topPlayers };
    },
  });

  // ── Query 2: competition usage — ONE RPC call replaces 1500+ N+1 requests ──
  const competitionsQuery = useQuery({
    queryKey: ["dashboard-v2", "competitions-usage", currentYear],
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const start = performance.now();
      const { data, error } = await (supabase as any).rpc("get_competitions_usage", {
        p_season_year: currentYear,
      });
      if (error) {
        if (!isAbortError(error)) logFetchError(error, { endpoint: "DashboardV2.competitions" });
        throw error;
      }
      logFetchSuccess({ endpoint: "DashboardV2.competitions" }, performance.now() - start);
      const rows = (data as any[] | null) || [];
      return rows.map((r): CompetitionUsage => ({
        id: r.id,
        name: r.name,
        tier: r.tier,
        final_coefficient: Number(r.final_coefficient ?? 1),
        usos: Number(r.usos ?? 0),
        jogadores: Number(r.jogadores ?? 0),
        ultimo_uso: r.ultimo_uso || null,
      }));
    },
  });

  const stats = overviewQuery.data?.stats ?? { totalPlayers: 0, reportsThisMonth: 0, totalLeads: 0, expiringContracts: 0 };
  const positionData = overviewQuery.data?.positionData ?? [];
  const topPlayers = overviewQuery.data?.topPlayers ?? [];
  const competitions = competitionsQuery.data ?? [];

  const topPlayerIds = useMemo(() => topPlayers.map(p => p.id), [topPlayers]);

  const radarQuery = useQuery({
    queryKey: ["dashboard-v2", "player-radar", topPlayerIds.join(",")],
    enabled: enabled && topPlayerIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_attribute_scores")
        .select("player_id, season_year, ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, details")
        .in("player_id", topPlayerIds);
      if (error) throw error;
      return (data ?? []) as Array<{
        player_id: string; season_year: number;
        ata_score_100: number | null; tec_score_100: number | null;
        tat_score_100: number | null; def_score_100: number | null;
        cri_score_100: number | null; details: Record<string, unknown> | null;
      }>;
    },
  });

  const availableRadarYears = useMemo(() => {
    const rows = radarQuery.data ?? [];
    return Array.from(new Set(rows.map(r => r.season_year)))
      .filter(y => y >= 2024)
      .sort((a, b) => b - a);
  }, [radarQuery.data]);

  const [radarYear, setRadarYear] = useState<number | null>(null);
  const activeRadarYear = radarYear ?? availableRadarYears[0] ?? null;

  const playerRadarData = useMemo((): PlayerRadarData[] => {
    const rows = radarQuery.data ?? [];
    return topPlayers.slice(0, 6).map((p, idx) => {
      const pRows = rows.filter(r => r.player_id === p.id);
      const targetYear = activeRadarYear ?? (pRows.length > 0 ? Math.max(...pRows.map(r => r.season_year)) : null);
      const yRows = targetYear ? pRows.filter(r => r.season_year === targetYear) : [];
      let ata = 0, tec = 0, tat = 0, def = 0, cri = 0, w = 0;
      yRows.forEach(r => {
        const mins = Math.max(Number((r.details as any)?.minutes ?? 0), 1);
        ata += (r.ata_score_100 ?? 0) * mins;
        tec += (r.tec_score_100 ?? 0) * mins;
        tat += (r.tat_score_100 ?? 0) * mins;
        def += (r.def_score_100 ?? 0) * mins;
        cri += (r.cri_score_100 ?? 0) * mins;
        w += mins;
      });
      const d = w || 1;
      const scores = {
        ata: Math.round(ata / d), tec: Math.round(tec / d),
        tat: Math.round(tat / d), def: Math.round(def / d), cri: Math.round(cri / d),
      };
      const avg = Math.round((scores.ata + scores.tec + scores.tat + scores.def + scores.cri) / 5);
      return { id: p.id, full_name: p.full_name, color: RADAR_COLORS[idx], scores, avg };
    }).filter(p => p.avg > 0);
  }, [topPlayers, radarQuery.data, activeRadarYear]);

  const dataReady = overviewQuery.isSuccess;
  const loading = overviewQuery.isLoading;

  // Alert: find lowest-rated player
  const lowestPlayer = useMemo(() => (
    topPlayers.length > 0
      ? topPlayers.reduce((min, p) => ((p.auto_rating ?? 99) < (min.auto_rating ?? 99) ? p : min), topPlayers[0])
      : null
  ), [topPlayers]);
  const showAlert = lowestPlayer && (lowestPlayer.auto_rating ?? 99) < 5.0;

  if (!rolesLoading && isPlayer && !isAdmin && !isScout) return <AthleteDashboard />;
  if ((loading && !dataReady && stats.totalPlayers === 0) || (!rbacReady && !dataReady)) {
    return <AdminSkeletonDashboard />;
  }


  const maxPos = Math.max(...positionData.map(p => p.value), 1);

  return (
    <div className="m3dash">
      {/* ── CONTENT ── */}
      <div className="m3dash-content">
        {/* Page header: title + action buttons */}
        <div className="m3dash-header">
          <div className="m3dash-headline">Visão geral</div>
          <div className="m3dash-header-actions hidden sm:flex">
            <Link to="/dashboard/atletas" className="m3dash-btn">
              <Users size={13} /> ATLETAS
            </Link>
            <Link to="/dashboard/relatorios/novo" className="m3dash-btn m3dash-btn--primary">
              + NOVO RELATÓRIO
            </Link>
          </div>
        </div>

        {/* Alert banner */}
        {showAlert && lowestPlayer && (
          <div className="m3dash-alert">
            <div className="m3dash-alert-icon">!</div>
            <div className="m3dash-alert-body">
              <div className="m3dash-alert-name">{lowestPlayer.full_name}</div>
              <div className="m3dash-alert-desc">
                Nota automática abaixo do limiar mínimo de performance
              </div>
            </div>
            <div className="m3dash-alert-badge">
              ↓ {((5.0 - (lowestPlayer.auto_rating ?? 0)) / 5.0 * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="m3dash-stats">
          <Link to="/dashboard/atletas" className="m3dash-stat">
            <div className="m3dash-stat-label">Atletas</div>
            <div className="m3dash-stat-value">{stats.totalPlayers}</div>
            <div className="m3dash-stat-sub">Portfólio ativo</div>
            <div className="m3dash-stat-bar m3dash-stat-bar--green" />
          </Link>
          <Link to="/dashboard/relatorios" className="m3dash-stat">
            <div className="m3dash-stat-label">Relatórios</div>
            <div className="m3dash-stat-value">{stats.reportsThisMonth}</div>
            <div className="m3dash-stat-sub">Este mês</div>
            <div className={`m3dash-stat-bar ${stats.reportsThisMonth > 0 ? "m3dash-stat-bar--muted" : "m3dash-stat-bar--muted"}`} />
          </Link>
          <Link to="/dashboard/leads" className="m3dash-stat">
            <div className="m3dash-stat-label">Leads</div>
            <div className="m3dash-stat-value">{stats.totalLeads}</div>
            <div className="m3dash-stat-sub">Total recebidos</div>
            <div className={`m3dash-stat-bar ${stats.totalLeads > 0 ? "m3dash-stat-bar--muted" : "m3dash-stat-bar--muted"}`} />
          </Link>
          <Link to="/dashboard/contratos?status=expiring&days=90" className="m3dash-stat">
            <div className="m3dash-stat-label">Contratos</div>
            <div className={`m3dash-stat-value ${stats.expiringContracts > 0 ? "warn" : ""}`}>
              {stats.expiringContracts}
            </div>
            <div className="m3dash-stat-sub">Expirando 90d</div>
            <div className="m3dash-stat-bar m3dash-stat-bar--yellow" />
          </Link>
        </div>

        {/* Insights — Full Width */}
        <div className="m3dash-section m3dash-insights-full">
          <div className="m3dash-section-head">
            <div className="m3dash-section-title">
              <span className="red">// </span>Insights da Plataforma
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Auto
            </span>
          </div>
          <div className="m3dash-insights-wrap">
            <InsightsCard />
          </div>
        </div>

        {/* 2×2 Content Grid */}
        <div className="m3dash-grid">
          {/* [Row 1, Col 1] Top Atletas */}
          <div className="m3dash-section">
            <div className="m3dash-section-head">
              <div className="m3dash-section-title">
                <span className="red">// </span>Top Atletas
              </div>
              <Link to="/dashboard/atletas" className="m3dash-section-link">
                Ver Todos <ArrowRight size={10} style={{ display: "inline", verticalAlign: "middle" }} />
              </Link>
            </div>
            {topPlayers.length === 0 ? (
              <div className="m3dash-empty">Nenhum atleta com nota disponível</div>
            ) : (
              topPlayers.map((p, i) => {
                const pos = shortPos(p.position);
                const badgeStyle = POS_BADGE_STYLE[pos] || { bg: "rgba(240,236,227,0.08)", color: "rgba(240,236,227,0.45)" };
                const isTop = i < 3;
                return (
                  <Link key={p.id} to={`/dashboard/atletas/${p.id}`} className="m3dash-athlete">
                    <div className="m3dash-athlete-rank">{String(i + 1).padStart(2, "0")}</div>
                    <div className="m3dash-athlete-avatar">{getInitials(p.full_name)}</div>
                    <div className="m3dash-athlete-info">
                      <div className="m3dash-athlete-name">{p.full_name}</div>
                      <div className="m3dash-athlete-meta">
                        {pos}{p.age ? ` · ${p.age}a` : ""}{p.current_club ? ` · ${p.current_club}` : ""}
                      </div>
                    </div>
                    <span className="m3dash-pos-badge" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                      {pos}
                    </span>
                    <div className={`m3dash-athlete-score ${isTop ? "m3dash-athlete-score--top" : "m3dash-athlete-score--low"}`}>
                      <Star fill="currentColor" />
                      {p.auto_rating?.toFixed(1) ?? "—"}
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* [Row 1, Col 2] Perfil do Elenco */}
          <div className="m3dash-section">
            <div className="m3dash-section-head">
              <div className="m3dash-section-title">
                <span className="red">// </span>Perfil do Elenco
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {positionData.reduce((s, p) => s + p.value, 0)} atletas
              </span>
            </div>
            {positionData.length === 0 ? (
              <div className="m3dash-empty">Sem dados de posição</div>
            ) : (
              <div className="m3dash-pos-list">
                {positionData.map(p => (
                  <div key={p.name} className="m3dash-pos-row">
                    <div className="m3dash-pos-label" style={{ color: POS_BAR_COLOR[p.name] || "var(--muted)" }}>
                      {p.name}
                    </div>
                    <div className="m3dash-pos-track">
                      <div
                        className="m3dash-pos-fill"
                        style={{
                          width: `${(p.value / maxPos) * 100}%`,
                          background: POS_BAR_COLOR[p.name] || "var(--muted2)",
                        }}
                      />
                    </div>
                    <div className="m3dash-pos-count">{p.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* [Row 2, Col 1] Radar de Atributos */}
          <div className="m3dash-section">
            <div className="m3dash-section-head">
              <div className="m3dash-section-title">
                <span className="red">// </span>Radar de Atributos
              </div>
              <Link to="/dashboard/atletas" className="m3dash-section-link">
                Ver Atletas <ArrowRight size={10} style={{ display: "inline", verticalAlign: "middle" }} />
              </Link>
            </div>
            {playerRadarData.length === 0 ? (
              <div className="m3dash-empty">Sem dados de atributos</div>
            ) : (
              <MultiPlayerRadar
                players={playerRadarData}
                availableYears={availableRadarYears}
                selectedYear={activeRadarYear}
                onYearChange={setRadarYear}
              />
            )}
          </div>

          {/* [Row 2, Col 2] Competições */}
          <div className="m3dash-section">
            <div className="m3dash-section-head">
              <div className="m3dash-section-title">
                <span className="red">// </span>Competições
              </div>
              <Link to="/dashboard/competicoes" className="m3dash-section-link">
                Ver Todas <ArrowRight size={10} style={{ display: "inline", verticalAlign: "middle" }} />
              </Link>
            </div>
            {competitions.length === 0 ? (
              <div className="m3dash-empty">Sem competições com uso registrado</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="m3dash-comp-table">
                  <thead>
                    <tr>
                      <th>Competição</th>
                      <th>Tier</th>
                      <th>Final</th>
                      <th>Usos</th>
                      <th>Jog.</th>
                      <th>Último</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitions.map(c => (
                      <tr key={c.id}>
                        <td><span className="m3dash-comp-name" title={c.name}>{c.name}</span></td>
                        <td><span className="m3dash-tier">{c.tier}</span></td>
                        <td>{Number(c.final_coefficient).toFixed(2)}x</td>
                        <td><span className="m3dash-usos">{c.usos}</span></td>
                        <td style={{ color: "var(--muted)" }}>{c.jogadores}</td>
                        <td style={{ color: "var(--muted2)" }}>{formatDateShort(c.ultimo_uso)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardV2;
