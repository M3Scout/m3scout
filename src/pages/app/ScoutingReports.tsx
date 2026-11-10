import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DeleteReportDialog } from "@/components/scouting/DeleteReportDialog";
import { useAuth } from "@/hooks/authContext";
import { usePermissions } from "@/hooks/usePermissions";
import { startOfYear, subDays, isAfter, parseISO } from "date-fns";
import { Ic } from "@/components/dash/icons";
import { Head, Seg, View, fmt, scoreColor } from "@/components/dash/ui";

interface ScoutingReportListItem {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  created_at: string;
  scout_id: string;
  player_id: string;
  opponent?: string | null;
  players: {
    full_name: string;
    position: string;
    age?: number | null;
    photo_url?: string | null;
  } | null;
  competitions: {
    id: string;
    name: string;
    country?: string;
  } | null;
}

type GroupBy = "none" | "player" | "competition" | "scout";
type PeriodFilter = "all" | "7days" | "30days" | "season";

const ScoutingReports = () => {
  const { user, isAdmin } = useAuth();
  const { canDelete } = usePermissions();
  const [reports, setReports] = useState<ScoutingReportListItem[]>([]);
  const [scoutNames, setScoutNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const mobileSearch = "";

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("scouting_reports")
      .select(`
        id,
        match_date,
        final_score,
        rating,
        created_at,
        scout_id,
        player_id,
        opponent,
        players (full_name, position, age, photo_url),
        competitions (id, name, country)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setReports(data as ScoutingReportListItem[]);
      
      // Fetch scout names
      const scoutIds = [...new Set(data.map(r => r.scout_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", scoutIds);
      
      if (profiles) {
        const namesMap: Record<string, string> = {};
        profiles.forEach(p => {
          namesMap[p.user_id] = p.full_name || "Scout";
        });
        setScoutNames(namesMap);
      }
    } else {
      setReports([]);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const canDeleteReport = () => {
    // Only ADMIN can delete reports (RBAC policy)
    return canDelete("reports");
  };

  const handleReportDeleted = () => {
    setDeleteDialogOpen(null);
    fetchReports();
  };

  // Filter reports by search and period
  const filteredReports = useMemo(() => {
    const query = (searchQuery || mobileSearch).toLowerCase();
    const now = new Date();
    
    return reports.filter((report) => {
      // Text search filter
      const matchesSearch = 
        report.players?.full_name?.toLowerCase().includes(query) ||
        report.competitions?.name?.toLowerCase().includes(query) ||
        scoutNames[report.scout_id]?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
      
      // Period filter
      if (periodFilter === "all") return true;
      
      const reportDate = parseISO(report.match_date);
      
      if (periodFilter === "7days") {
        return isAfter(reportDate, subDays(now, 7));
      }
      
      if (periodFilter === "30days") {
        return isAfter(reportDate, subDays(now, 30));
      }
      
      if (periodFilter === "season") {
        // Current season: from January 1st of current year
        const seasonStart = startOfYear(now);
        return isAfter(reportDate, seasonStart);
      }
      
      return true;
    });
  }, [reports, searchQuery, mobileSearch, scoutNames, periodFilter]);

  // Calculate insights for each report
  const reportsWithInsights = useMemo(() => {
    // Group reports by player to calculate insights
    const byPlayer: Record<string, ScoutingReportListItem[]> = {};
    filteredReports.forEach(r => {
      if (!byPlayer[r.player_id]) byPlayer[r.player_id] = [];
      byPlayer[r.player_id].push(r);
    });

    return filteredReports.map(report => {
      const playerReports = byPlayer[report.player_id] || [];
      
      // Sort by date to find patterns
      const sorted = [...playerReports].sort(
        (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      );
      
      let insight: "best" | "first" | "decline" | "strong_competition" | null = null;
      
      // Check if first report
      if (playerReports.length === 1) {
        insight = "first";
      } else {
        // Check if best score
        const maxScore = Math.max(...playerReports.map(r => r.final_score));
        if (report.final_score === maxScore && report.final_score >= 70) {
          insight = "best";
        }
        
        // Check for decline (current score lower than average)
        const avgScore = playerReports.reduce((sum, r) => sum + r.final_score, 0) / playerReports.length;
        if (!insight && sorted[0]?.id === report.id && report.final_score < avgScore - 10) {
          insight = "decline";
        }
      }
      
      return { ...report, insight };
    });
  }, [filteredReports]);

  // Group reports
  const groupedReports = useMemo(() => {
    if (groupBy === "none") {
      return { "Todos os Relatórios": reportsWithInsights };
    }

    const groups: Record<string, typeof reportsWithInsights> = {};
    
    reportsWithInsights.forEach(report => {
      let key = "Outros";
      
      if (groupBy === "player") {
        key = report.players?.full_name || "Atleta desconhecido";
      } else if (groupBy === "competition") {
        key = report.competitions?.name || "Competição não definida";
      } else if (groupBy === "scout") {
        key = scoutNames[report.scout_id] || "Scout desconhecido";
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(report);
    });

    // Sort groups by number of reports
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
    );
  }, [reportsWithInsights, groupBy, scoutNames]);

  const totalReports = filteredReports.length;
  const posName = (p?: string | null) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "");
  const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "").replace(/ de /g, " ");
  const TAG: Record<string, [string, string]> = {
    first: ["Primeiro relatório", "var(--purple)"],
    best: ["Melhor nota", "var(--green)"],
    decline: ["Queda de rendimento", "var(--orange)"],
    strong_competition: ["Competição forte", "var(--teal)"],
  };

  const row = (r: (typeof reportsWithInsights)[number]) => (
    <div className="rr-wrap" key={r.id}>
      <Link className="rr" to={`/dashboard/relatorios/${r.id}`}>
        <span className="rr-sc tab" style={{ ["--c" as string]: scoreColor(r.final_score) }}>{fmt(r.final_score, 1)}</span>
        <div>
          <h3>{r.players?.full_name ?? "Atleta"}</h3>
          <p>{[posName(r.players?.position), r.players?.age ? `${r.players.age} anos` : null, fmtDate(r.match_date), scoutNames[r.scout_id]].filter(Boolean).join(" · ")}</p>
          <div className="tags">
            {r.competitions?.name && <span className="pill">{r.competitions.name}</span>}
            {r.opponent && <span className="pill">vs {r.opponent}</span>}
            {r.insight && <span className="pill c" style={{ ["--c" as string]: TAG[r.insight][1] }}>{TAG[r.insight][0]}</span>}
          </div>
        </div>
        <span className="lnk" style={{ color: "var(--l3)" }}><Ic n="arrow" /></span>
      </Link>
      {canDeleteReport() && (
        <button type="button" className="rr-del" aria-label="Excluir relatório" onClick={() => setDeleteDialogOpen(r.id)}>
          <Ic n="x" />
        </button>
      )}
      <DeleteReportDialog
        reportId={r.id}
        onDeleted={handleReportDeleted}
        open={deleteDialogOpen === r.id}
        onOpenChange={(open) => { if (!open) setDeleteDialogOpen(null); }}
      />
    </div>
  );

  return (
    <View>
      <Head title="Relatórios">
        <Link className="btn r" to="/dashboard/relatorios/novo"><Ic n="plus" />Novo relatório</Link>
      </Head>

      <div className="tools" style={{ ["--s" as string]: 1 }}>
        <label className="field">
          <Ic n="search" />
          <span className="sr">Buscar</span>
          <input type="search" placeholder="Buscar atleta, competição ou scout" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </label>
        <select className="sel" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)} aria-label="Período">
          <option value="all">Todo o período</option>
          <option value="7days">Últimos 7 dias</option>
          <option value="30days">Últimos 30 dias</option>
          <option value="season">Temporada atual</option>
        </select>
        <Seg
          label="Agrupar"
          value={groupBy}
          onPick={(v) => setGroupBy(v as GroupBy)}
          items={[{ v: "none", label: "Todos" }, { v: "player", label: "Por atleta" }, { v: "competition", label: "Por competição" }, { v: "scout", label: "Por scout" }]}
        />
      </div>

      <section style={{ ["--s" as string]: 2 }}>
        {loading ? (
          <div className="rl">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rr" style={{ height: 108, opacity: 0.4 }} />)}</div>
        ) : totalReports === 0 ? (
          <div className="empty">
            {reports.length === 0 ? "Nenhum relatório ainda." : "Nenhum relatório encontrado."}
            {reports.length === 0 && <Link className="btn r sm" to="/dashboard/relatorios/novo"><Ic n="plus" />Criar o primeiro</Link>}
          </div>
        ) : groupBy === "none" ? (
          <div className="rl">{reportsWithInsights.map(row)}</div>
        ) : (
          Object.entries(groupedReports).map(([name, list]) => (
            <div key={name}>
              <p className="grp">{name} · {list.length}</p>
              <div className="rl">{list.map(row)}</div>
            </div>
          ))
        )}
      </section>
    </View>
  );
};

export default ScoutingReports;
