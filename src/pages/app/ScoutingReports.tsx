import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteReportDialog } from "@/components/scouting/DeleteReportDialog";
import { ReportCard, ReportCardSkeleton } from "@/components/scouting/ReportCard";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Search, 
  Plus,
  FileText, 
  ClipboardList,
  Calendar,
} from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import { startOfYear, subDays, isAfter, parseISO } from "date-fns";

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
    const query = searchQuery.toLowerCase();
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
  }, [reports, searchQuery, scoutNames, periodFilter]);

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

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="m3-page-title">RELATÓRIOS</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">
            Avaliações técnicas e análises de scouting
          </p>
        </div>
        <Link to="/app/reports/new">
          <Button className="bg-[#e63946] hover:bg-[#d62839] text-white gap-2 rounded-full px-5 h-9 text-sm font-semibold">
            <Plus className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </header>

      {/* Controls Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        {/* Top row: Search + Period + Count */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Buscar atleta, competição ou scout..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-800/50 focus:border-zinc-700 rounded-full h-9 text-sm"
            />
          </div>

          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-800/50 text-sm h-9 rounded-full">
              <Calendar className="w-3.5 h-3.5 mr-2 text-zinc-500" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="season">Temporada atual</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/40">
            <ClipboardList className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-xs text-zinc-500 font-medium tabular-nums">
              {totalReports} relatório{totalReports !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Minimal tabs for grouping */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mr-2 hidden sm:inline">Agrupar</span>
          {([
            { value: "none" as GroupBy, label: "Todos" },
            { value: "player" as GroupBy, label: "Atleta" },
            { value: "competition" as GroupBy, label: "Competição" },
            { value: "scout" as GroupBy, label: "Scout" },
          ]).map(tab => (
            <button
              key={tab.value}
              onClick={() => setGroupBy(tab.value)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-all duration-200 font-medium",
                groupBy === tab.value
                  ? "text-zinc-100 bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReportCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">
            Nenhum relatório encontrado
          </h3>
          <p className="text-sm text-zinc-500 text-center max-w-sm mb-6">
            {searchQuery 
              ? "Tente ajustar sua busca ou limpar os filtros"
              : "Comece criando o primeiro relatório de scouting"}
          </p>
          {!searchQuery && (
            <Link to="/app/reports/new">
              <Button className="bg-[#e63946] hover:bg-[#d62839] text-white gap-2 rounded-full px-5 h-9 text-sm font-semibold">
                <Plus className="w-4 h-4" />
                Criar Relatório
              </Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key={groupBy}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-8"
          >
            {Object.entries(groupedReports).map(([groupName, groupReports], groupIndex) => (
              <motion.div
                key={groupName}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05, duration: 0.25 }}
              >
                {/* Group header (only show if grouped) */}
                {groupBy !== "none" && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.05 + 0.1 }}
                    className="flex items-center gap-3 mb-4"
                  >
                    <h2 className="text-lg font-semibold text-zinc-200">
                      {groupName}
                    </h2>
                    <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
                      {groupReports.length} relatório{groupReports.length !== 1 ? "s" : ""}
                    </span>
                  </motion.div>
                )}

                {/* Reports grid */}
                <div className="space-y-3">
                  {safeArray(groupReports).map((report, i) => (
                    <motion.div 
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 + i * 0.03, duration: 0.2 }}
                    >
                      <ReportCard
                        report={report}
                        scoutName={scoutNames[report.scout_id] || "Scout"}
                        canDelete={canDeleteReport()}
                        onDelete={() => setDeleteDialogOpen(report.id)}
                        insight={report.insight}
                        index={i}
                      />
                      <DeleteReportDialog
                        reportId={report.id}
                        onDeleted={handleReportDeleted}
                        open={deleteDialogOpen === report.id}
                        onOpenChange={(open) => {
                          if (!open) setDeleteDialogOpen(null);
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ScoutingReports;
