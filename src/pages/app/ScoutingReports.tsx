import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Search, 
  Plus, 
  FileText, 
  Users,
  Trophy,
  User,
  LayoutGrid,
  ClipboardList
} from "lucide-react";
import { cn, safeArray } from "@/lib/utils";

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

const ScoutingReports = () => {
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState<ScoutingReportListItem[]>([]);
  const [scoutNames, setScoutNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

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

  const canDeleteReport = (scoutId: string) => {
    return isAdmin || scoutId === user?.id;
  };

  const handleReportDeleted = () => {
    setDeleteDialogOpen(null);
    fetchReports();
  };

  // Filter reports by search
  const filteredReports = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return reports.filter((report) => 
      report.players?.full_name?.toLowerCase().includes(query) ||
      report.competitions?.name?.toLowerCase().includes(query) ||
      scoutNames[report.scout_id]?.toLowerCase().includes(query)
    );
  }, [reports, searchQuery, scoutNames]);

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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            Relatórios
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Avaliações técnicas e análises de scouting
          </p>
        </div>
        <Link to="/app/reports/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </header>

      {/* Controls Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3 sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar atleta, competição ou scout..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900/60 border-zinc-800 focus:border-zinc-700"
          />
        </div>

        {/* Grouping */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 hidden sm:inline">Agrupar:</span>
          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <TabsList className="bg-zinc-900/60 border border-zinc-800 h-9">
              <TabsTrigger value="none" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-800">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Todos</span>
              </TabsTrigger>
              <TabsTrigger value="player" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-800">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Atleta</span>
              </TabsTrigger>
              <TabsTrigger value="competition" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-800">
                <Trophy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Competição</span>
              </TabsTrigger>
              <TabsTrigger value="scout" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-800">
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scout</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Count badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/40">
          <ClipboardList className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-400 font-medium">
            {totalReports} relatório{totalReports !== 1 ? "s" : ""}
          </span>
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
              <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                <Plus className="w-4 h-4" />
                Criar Relatório
              </Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedReports).map(([groupName, groupReports], groupIndex) => (
              <motion.div
                key={groupName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: groupIndex * 0.1 }}
              >
                {/* Group header (only show if grouped) */}
                {groupBy !== "none" && (
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-zinc-200">
                      {groupName}
                    </h2>
                    <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
                      {groupReports.length} relatório{groupReports.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {/* Reports grid */}
                <div className="space-y-3">
                  {safeArray(groupReports).map((report, i) => (
                    <div key={report.id}>
                      <ReportCard
                        report={report}
                        scoutName={scoutNames[report.scout_id] || "Scout"}
                        canDelete={canDeleteReport(report.scout_id)}
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
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ScoutingReports;
