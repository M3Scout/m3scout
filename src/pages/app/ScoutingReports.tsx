import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar,
  User,
  Trophy
} from "lucide-react";
import { RatingStars } from "@/components/players/RatingStars";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeArray } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Relatórios de Scouting</h1>
          <p className="text-muted-foreground">
            Gerencie todos os relatórios de avaliação
          </p>
        </div>
        <Link to="/app/reports/new">
          <Button variant="gradient">
            <Plus className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por atleta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 input-dark"
        />
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando relatórios...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum relatório encontrado</h3>
          <p className="text-muted-foreground mb-6">
            Comece criando o primeiro relatório de scouting.
          </p>
          <Link to="/app/reports/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4" />
              Criar Relatório
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {safeArray(filteredReports).map((report) => (
            <Link key={report.id} to={`/app/reports/${report.id}`}>
              <div className="glass-card-hover p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {report.players?.full_name || "Atleta desconhecido"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {report.competitions?.name || "Competição"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(report.match_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {scoutNames[report.scout_id] || "Scout"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {Number.isFinite(Number(report.final_score)) ? Number(report.final_score).toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Score Final</p>
                    </div>
                    <div>
                      <RatingStars rating={report.rating} size="md" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScoutingReports;
