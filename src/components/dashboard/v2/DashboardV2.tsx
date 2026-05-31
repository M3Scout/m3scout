import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { useContractNotificationCheck } from "@/hooks/useContractNotificationCheck";
import { AdminSkeletonDashboard } from "@/components/admin/AdminSkeleton";
import { AthleteDashboard } from "@/components/dashboard/athlete/AthleteDashboard";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { isAbortError, logFetchError, logFetchSkipped, logFetchSuccess } from "@/lib/fetchLogger";
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

const getScoreClass = (score: number) => {
  if (score >= 65) return "m3dash-report-score--green";
  if (score >= 55) return "m3dash-report-score--yellow";
  return "m3dash-report-score--red";
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

export const DashboardV2 = () => {
  const { isAdmin, isScout, isPlayer, rolesLoading, session, permissionsLoading } = useAuth();
  const rbacReady = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  useContractNotificationCheck();

  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0, reportsThisMonth: 0, totalLeads: 0, expiringContracts: 0,
  });
  const [positionData, setPositionData] = useState<PositionData[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [topPlayers, setTopPlayers] = useState<RankedPlayer[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionUsage[]>([]);

  // Alert: find lowest-rated player
  const lowestPlayer = topPlayers.length > 0
    ? topPlayers.reduce((min, p) => ((p.auto_rating ?? 99) < (min.auto_rating ?? 99) ? p : min), topPlayers[0])
    : null;
  const showAlert = lowestPlayer && (lowestPlayer.auto_rating ?? 99) < 5.0;

  const fetchAll = useCallback(async () => {
    if (!session?.user) { logFetchSkipped("DashboardV2", "no session"); return; }
    if (!rbacReady) { logFetchSkipped("DashboardV2", "rbac not ready"); return; }
    if (hasFetched) return;
    setHasFetched(true);

    const start = performance.now();
    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const [
        playersRes, leadsRes, contractsRes, positionsRes,
        recentReportsRes, reportsThisMonthRes, topPlayersRes, compsRes,
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
        supabase.from("competitions")
          .select("id, name, display_name, tier, final_coefficient")
          .eq("is_active", true),
      ]);

      setStats({
        totalPlayers: playersRes.count || 0,
        reportsThisMonth: reportsThisMonthRes.count || 0,
        totalLeads: leadsRes.count || 0,
        expiringContracts: contractsRes.count || 0,
      });

      if (positionsRes.data) {
        const counts: Record<string, number> = {};
        (positionsRes.data as PositionRow[]).forEach((p) => {
          const pos = shortPos(p.position || "");
          counts[pos] = (counts[pos] || 0) + 1;
        });
        setPositionData(
          Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value).slice(0, 5)
        );
      }

      if (recentReportsRes.data) {
        setRecentReports((recentReportsRes.data as unknown as RecentReportRow[]).map((r) => ({
          id: r.id,
          player_name: r.players?.full_name || "—",
          competition_name: r.competitions?.name || "—",
          match_date: r.match_date,
          final_score: r.final_score ?? 0,
        })));
      }

      if (topPlayersRes.data) setTopPlayers(topPlayersRes.data as RankedPlayer[]);

      if (compsRes.data) {
        const comps = compsRes.data as CompetitionRow[];
        const seasonYear = new Date().getFullYear();
        const yearStart = `${seasonYear}-01-01`;
        const nextYearStart = `${seasonYear + 1}-01-01`;
        const usageRows = await Promise.all(
          comps.map(async (c) => {
            const [scoutingR, matchesR, matchIdsR, manualStatsR, legacyStatsR, lastScoutR, lastMatchR] = await Promise.all([
              supabase.from("scouting_reports")
                .select("player_id", { count: "exact" })
                .eq("competition_id", c.id)
                .is("deleted_at", null)
                .gte("match_date", yearStart)
                .lt("match_date", nextYearStart),
              supabase.from("matches")
                .select("id", { count: "exact", head: true })
                .eq("competition_id", c.id).eq("season_year", seasonYear).eq("status", "applied"),
              supabase.from("matches")
                .select("id")
                .eq("competition_id", c.id).eq("season_year", seasonYear).eq("status", "applied"),
              supabase.from("manual_player_stats")
                .select("player_id", { count: "exact" })
                .eq("competition_id", c.id).eq("season_year", seasonYear).gt("games", 0),
              supabase.from("player_stats")
                .select("player_id", { count: "exact" })
                .eq("competition_id", c.id).eq("season_year", seasonYear)
                .or("is_archived.is.null,is_archived.eq.false").gt("matches", 0),
              supabase.from("scouting_reports")
                .select("match_date").eq("competition_id", c.id)
                .is("deleted_at", null)
                .gte("match_date", yearStart)
                .lt("match_date", nextYearStart)
                .order("match_date", { ascending: false }).limit(1).maybeSingle(),
              supabase.from("matches")
                .select("match_date").eq("competition_id", c.id).eq("season_year", seasonYear).eq("status", "applied")
                .order("match_date", { ascending: false }).limit(1).maybeSingle(),
            ]);
            const matchIds = (matchIdsR.data as IdRow[] | null)?.map((m) => m.id) || [];
            const matchPlayersR = matchIds.length > 0
              ? await supabase.from("match_players").select("player_id", { count: "exact" }).in("match_id", matchIds)
              : { data: [], count: 0 };
            const totalUsos = (scoutingR.count || 0) + (matchesR.count || 0) + (manualStatsR.count || 0) + (legacyStatsR.count || 0);
            const lastScouting = lastScoutR.data?.match_date || null;
            const lastMatch = lastMatchR.data?.match_date || null;
            const ultimoUso = lastScouting && lastMatch
              ? (lastScouting > lastMatch ? lastScouting : lastMatch)
              : lastScouting || lastMatch;
            return {
              id: c.id, name: c.display_name || c.name, tier: c.tier, final_coefficient: c.final_coefficient,
              usos: totalUsos,
              jogadores: uniqueCount([
                ...((scoutingR.data as PlayerIdRow[] | null) || []).map((row) => row.player_id),
                ...((manualStatsR.data as PlayerIdRow[] | null) || []).map((row) => row.player_id),
                ...((legacyStatsR.data as PlayerIdRow[] | null) || []).map((row) => row.player_id),
                ...((matchPlayersR.data as PlayerIdRow[] | null) || []).map((row) => row.player_id),
              ]),
              ultimo_uso: ultimoUso,
            } as CompetitionUsage;
          })
        );
        const visibleCompetitions = usageRows
          .filter(c => c.usos > 0)
          .sort((a, b) => (b.ultimo_uso || "").localeCompare(a.ultimo_uso || "") || b.usos - a.usos);
        console.log(`[DashboardV2] Competições ${seasonYear} retornadas`, visibleCompetitions);
        setCompetitions(visibleCompetitions);
      }

      logFetchSuccess({ endpoint: "DashboardV2" }, performance.now() - start);
    } catch (err) {
      if (isAbortError(err)) { setHasFetched(false); return; }
      logFetchError(err, { endpoint: "DashboardV2" });
    } finally {
      setLoading(false);
      setDataReady(true);
    }
  }, [session?.user, rbacReady, hasFetched]);

  useEffect(() => { if (rbacReady && !hasFetched) fetchAll(); }, [rbacReady, hasFetched, fetchAll]);

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
          <div className="m3dash-header-actions">
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

          {/* [Row 2, Col 1] Relatórios Recentes */}
          <div className="m3dash-section">
            <div className="m3dash-section-head">
              <div className="m3dash-section-title">
                <span className="red">// </span>Relatórios Recentes
              </div>
              <Link to="/dashboard/relatorios" className="m3dash-section-link">
                Ver Todos <ArrowRight size={10} style={{ display: "inline", verticalAlign: "middle" }} />
              </Link>
            </div>
            {recentReports.length === 0 ? (
              <div className="m3dash-empty">Nenhum relatório ainda</div>
            ) : (
              recentReports.map(r => (
                <Link key={r.id} to={`/dashboard/relatorios/${r.id}`} className="m3dash-report">
                  <div className={`m3dash-report-score ${getScoreClass(r.final_score)}`}>
                    {(r.final_score ?? 0).toFixed(1)}
                  </div>
                  <div className="m3dash-report-info">
                    <div className="m3dash-report-name">{r.player_name}</div>
                    <div className="m3dash-report-comp">{r.competition_name}</div>
                  </div>
                  <div className="m3dash-report-date">{formatDateShort(r.match_date)}</div>
                </Link>
              ))
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
