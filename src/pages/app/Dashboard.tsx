import { useState, useEffect } from "react";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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
            .limit(5),
          supabase
            .from("leads")
            .select("id, name, subject, created_at, status")
            .order("created_at", { ascending: false })
            .limit(5),
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
            .slice(0, 5);
          
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
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
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
          <Button className="admin-btn-primary">
            <FileText className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </header>

      {/* Key Metrics - Condensed Overview */}
      <div className="admin-card p-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-3xl font-semibold text-white tabular-nums">{stats.totalPlayers}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Atletas</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-semibold text-white tabular-nums">{stats.reportsThisMonth}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Relatórios</p>
              <span className="text-[10px] text-zinc-600">este mês</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-semibold text-white tabular-nums">{stats.totalLeads}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Leads</p>
          </div>
          <div className="space-y-1">
            <p className={`text-3xl font-semibold tabular-nums ${stats.expiringContracts > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.expiringContracts}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Contratos</p>
              <span className="text-[10px] text-zinc-600">90 dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Position Chart - Minimal */}
        <div className="lg:col-span-2 admin-card animate-fade-in delay-100">
          <div className="admin-card-header">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Posições</h2>
          </div>
          <div className="admin-card-body">
            {positionData.length > 0 ? (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                    <XAxis 
                      type="number" 
                      hide
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#52525b" 
                      fontSize={11}
                      width={50}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#18181b", 
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "11px"
                      }}
                      formatter={(value: number) => [`${value}`, ""]}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 4, 4, 0]}
                    >
                      {positionData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? "hsl(var(--primary))" : "#3f3f46"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="admin-empty h-[180px]">
                <p className="admin-empty-desc">Nenhum dado</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports - Editorial Style */}
        <div className="lg:col-span-3 admin-card animate-fade-in delay-150">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Relatórios Recentes</h2>
            <Link to="/app/reports" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-0.5">
              Ver todos
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {recentReports.length > 0 ? (
              safeArray(recentReports).map((report) => (
                <Link 
                  key={report.id}
                  to={`/app/reports/${report.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center shrink-0">
                    <span className="admin-score-lg text-sm">
                      {report.final_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{report.player_name}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{report.competition_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-zinc-500 tabular-nums">
                      {new Date(report.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="admin-empty">
                <FileText className="admin-empty-icon" />
                <p className="admin-empty-desc">Nenhum relatório</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="admin-card animate-fade-in delay-200">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Leads Recentes</h2>
            <Link to="/app/leads" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-0.5">
              Ver todos
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {recentLeads.length > 0 ? (
              safeArray(recentLeads).slice(0, 4).map((lead) => (
                <div 
                  key={lead.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{lead.name}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{lead.subject}</p>
                  </div>
                  <span className={lead.status === "new" ? "admin-badge-primary" : "admin-badge-default"}>
                    {lead.status === "new" ? "Novo" : "Contatado"}
                  </span>
                </div>
              ))
            ) : (
              <div className="admin-empty">
                <p className="admin-empty-desc">Nenhum lead</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-card animate-fade-in delay-250">
          <div className="admin-card-header">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Ações Rápidas</h2>
          </div>
          <div className="admin-card-body grid grid-cols-2 gap-3">
            <Link to="/app/players/new" className="admin-btn-outline text-center py-4">
              <Users className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">Novo Atleta</span>
            </Link>
            <Link to="/app/reports/new" className="admin-btn-outline text-center py-4">
              <FileText className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">Novo Relatório</span>
            </Link>
            <Link to="/app/players" className="admin-btn-outline text-center py-4">
              <TrendingUp className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">Ver Atletas</span>
            </Link>
            <Link to="/app/competitions" className="admin-btn-outline text-center py-4">
              <AlertCircle className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">Competições</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Player Ranking - Compact */}
      <div className="animate-fade-in delay-300">
        <PlayerRankingCard />
      </div>

      {/* Competition Usage - Admin only */}
      {isAdmin && (
        <div className="animate-fade-in delay-400">
          <CompetitionUsageWidget />
        </div>
      )}
    </div>
  );
};

export default Dashboard;