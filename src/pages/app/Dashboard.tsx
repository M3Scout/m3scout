import { useState, useEffect } from "react";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Loader2,
  ArrowUpRight,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PlayerRankingCard } from "@/components/dashboard/PlayerRankingCard";
import CompetitionUsageWidget from "@/components/competitions/CompetitionUsageWidget";
import { useAuth } from "@/hooks/useAuth";
import { safeArray } from "@/lib/utils";

interface DashboardStats {
  totalPlayers: number;
  totalReports: number;
  reportsThisMonth: number;
  totalLeads: number;
  expiringContracts: number;
}

interface PositionData {
  name: string;
  value: number;
}

interface RecentReport {
  id: string;
  player_name: string;
  competition_name: string;
  match_date: string;
  scout_name: string;
  rating: number;
  final_score: number;
}

interface RecentLead {
  id: string;
  name: string;
  subject: string;
  created_at: string;
  status: string;
}

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    totalReports: 0,
    reportsThisMonth: 0,
    totalLeads: 0,
    expiringContracts: 0,
  });
  const [positionData, setPositionData] = useState<PositionData[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          playersResult,
          reportsResult,
          leadsResult,
          contractsResult,
          positionsResult,
          recentReportsResult,
          recentLeadsResult,
        ] = await Promise.all([
          supabase.from("players").select("id", { count: "exact", head: true }),
          supabase.from("scouting_reports").select("id", { count: "exact", head: true }),
          supabase.from("leads").select("id", { count: "exact", head: true }),
          supabase
            .from("players")
            .select("id", { count: "exact", head: true })
            .gte("contract_end", new Date().toISOString().split("T")[0])
            .lte("contract_end", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          supabase.from("players").select("position"),
          supabase
            .from("scouting_reports")
            .select(`
              id,
              match_date,
              rating,
              final_score,
              players!inner(full_name),
              competitions!inner(name),
              profiles!inner(full_name)
            `)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("leads")
            .select("id, name, subject, created_at, status")
            .order("created_at", { ascending: false })
            .limit(4),
        ]);

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const { count: reportsThisMonth } = await supabase
          .from("scouting_reports")
          .select("id", { count: "exact", head: true })
          .gte("created_at", firstDayOfMonth.toISOString());

        setStats({
          totalPlayers: playersResult.count || 0,
          totalReports: reportsResult.count || 0,
          reportsThisMonth: reportsThisMonth || 0,
          totalLeads: leadsResult.count || 0,
          expiringContracts: contractsResult.count || 0,
        });

        if (positionsResult.data) {
          const positionCounts: Record<string, number> = {};
          positionsResult.data.forEach((p) => {
            const pos = p.position || "N/D";
            positionCounts[pos] = (positionCounts[pos] || 0) + 1;
          });
          
          const sortedPositions = Object.entries(positionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
          
          setPositionData(sortedPositions);
        }

        if (recentReportsResult.data) {
          const reports = recentReportsResult.data.map((r: any) => ({
            id: r.id,
            player_name: r.players?.full_name || "N/A",
            competition_name: r.competitions?.name || "N/A",
            match_date: r.match_date,
            scout_name: r.profiles?.full_name || "N/A",
            rating: r.rating,
            final_score: r.final_score,
          }));
          setRecentReports(reports);
        }

        if (recentLeadsResult.data) {
          setRecentLeads(recentLeadsResult.data);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="admin-header animate-fade-in">
        <div>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Visão geral da plataforma</p>
        </div>
        <Link to="/app/reports/new">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <FileText className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="admin-stat-icon bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="admin-stat-value">{stats.totalPlayers}</p>
          <p className="admin-stat-label">Atletas</p>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="admin-stat-icon bg-zinc-800">
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Este mês</span>
          </div>
          <p className="admin-stat-value">{stats.reportsThisMonth}</p>
          <p className="admin-stat-label">Relatórios</p>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="admin-stat-icon bg-zinc-800">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Total</span>
          </div>
          <p className="admin-stat-value">{stats.totalReports}</p>
          <p className="admin-stat-label">Relatórios</p>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="admin-stat-icon bg-amber-500/10">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">90 dias</span>
          </div>
          <p className="admin-stat-value">{stats.expiringContracts}</p>
          <p className="admin-stat-label">Contratos a Vencer</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Position Distribution Chart */}
        <div className="lg:col-span-2 admin-card animate-fade-in delay-100">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Distribuição por Posição</h2>
          </div>
          <div className="admin-card-body">
            {positionData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis 
                      type="number" 
                      stroke="#52525b" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#52525b" 
                      fontSize={11}
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#18181b", 
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                      formatter={(value: number) => [`${value}`, "Atletas"]}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm">
                Nenhum atleta cadastrado
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="admin-card animate-fade-in delay-150">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Leads Recentes</h2>
            <Link to="/app/leads" className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
              Ver todos
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="admin-card-body space-y-2">
            {recentLeads.length > 0 ? (
              safeArray(recentLeads).map((lead) => (
                <div 
                  key={lead.id}
                  className="admin-row"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{lead.subject}</p>
                  </div>
                  <span className={
                    lead.status === "new" 
                      ? "admin-badge-primary" 
                      : "admin-badge-default"
                  }>
                    {lead.status === "new" ? "Novo" : "Contatado"}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-600 text-sm">
                Nenhum lead recebido
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="admin-card animate-fade-in delay-200">
        <div className="admin-card-header flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Relatórios Recentes</h2>
          <Link to="/app/reports" className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
            Ver todos
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="admin-card-body">
          {recentReports.length > 0 ? (
            <div className="space-y-2">
              {safeArray(recentReports).map((report) => (
                <Link 
                  key={report.id}
                  to={`/app/reports/${report.id}`}
                  className="admin-row-clickable"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {report.final_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{report.player_name}</p>
                      <p className="text-xs text-zinc-500 truncate">{report.competition_name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {new Date(report.match_date).toLocaleDateString("pt-BR")}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {report.scout_name}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 ml-2 shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-600 text-sm">
              Nenhum relatório criado
            </div>
          )}
        </div>
      </div>

      {/* Player Ranking */}
      <div className="animate-fade-in delay-300">
        <PlayerRankingCard />
      </div>

      {/* Competition Usage Analytics - Admin only */}
      {isAdmin && (
        <div className="animate-fade-in delay-400">
          <CompetitionUsageWidget />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
