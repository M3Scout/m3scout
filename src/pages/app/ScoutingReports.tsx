import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  FileText, 
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeArray } from "@/lib/utils";
import { AdminSkeletonTable } from "@/components/admin/AdminSkeleton";

interface ScoutingReportListItem {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  created_at: string;
  scout_id: string;
  players: {
    full_name: string;
    position: string;
  } | null;
  competitions: {
    name: string;
  } | null;
}

const ScoutingReports = () => {
  const [reports, setReports] = useState<ScoutingReportListItem[]>([]);
  const [scoutNames, setScoutNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      console.log("Fetching scouting reports...");
      
      const { data, error } = await supabase
        .from("scouting_reports")
        .select(`
          id,
          match_date,
          final_score,
          rating,
          created_at,
          scout_id,
          players (full_name, position),
          competitions (name)
        `)
        .order("created_at", { ascending: false });

      console.log("Reports query result:", { data, error, count: data?.length });

      if (error) {
        console.error("Error fetching reports:", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setReports(data as ScoutingReportListItem[]);
        
        // Fetch scout names separately
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
    };

    fetchReports();
  }, []);

  const filteredReports = reports.filter((report) =>
    report.players?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-white";
    if (score >= 40) return "text-zinc-400";
    return "text-zinc-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="admin-header animate-fade-in">
        <div>
          <h1 className="admin-title">Relatórios</h1>
          <p className="admin-subtitle">Avaliações de scouting</p>
        </div>
        <Link to="/app/reports/new">
          <Button className="admin-btn-primary">
            <Plus className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </header>

      {/* Search */}
      <div className="relative max-w-md animate-fade-in delay-75">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <Input
          type="text"
          placeholder="Buscar por atleta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-input pl-10"
        />
      </div>

      {/* Reports List */}
      {loading ? (
        <AdminSkeletonTable rows={8} />
      ) : filteredReports.length === 0 ? (
        <div className="admin-card animate-fade-in">
          <div className="admin-empty py-16">
            <FileText className="admin-empty-icon" />
            <p className="admin-empty-title">Nenhum relatório encontrado</p>
            <p className="admin-empty-desc mb-4">
              {searchQuery ? "Tente ajustar sua busca" : "Comece criando o primeiro relatório"}
            </p>
            {!searchQuery && (
              <Link to="/app/reports/new">
                <Button className="admin-btn-primary">
                  <Plus className="w-4 h-4" />
                  Criar Relatório
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-card overflow-hidden animate-fade-in delay-100">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Atleta</th>
                <th>Competição</th>
                <th>Data</th>
                <th>Scout</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {safeArray(filteredReports).map((report) => (
                <tr key={report.id}>
                  <td>
                    <span className={`text-xl font-bold tabular-nums ${getScoreColor(report.final_score)}`}>
                      {Number.isFinite(Number(report.final_score)) ? Number(report.final_score).toFixed(1) : "—"}
                    </span>
                  </td>
                  <td>
                    <div>
                      <p className="admin-table-cell-primary">
                        {report.players?.full_name || "Atleta desconhecido"}
                      </p>
                      {report.players?.position && (
                        <p className="text-[11px] text-zinc-600">{report.players.position}</p>
                      )}
                    </div>
                  </td>
                  <td className="admin-table-cell-muted">
                    {report.competitions?.name || "—"}
                  </td>
                  <td className="admin-table-cell-muted tabular-nums">
                    {format(new Date(report.match_date), "dd MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="admin-table-cell-muted">
                    {scoutNames[report.scout_id] || "—"}
                  </td>
                  <td className="text-right">
                    <Link 
                      to={`/app/reports/${report.id}`}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ScoutingReports;