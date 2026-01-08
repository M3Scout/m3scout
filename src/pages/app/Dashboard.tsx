import { useState, useEffect } from "react";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  Clock,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

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

const POSITION_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
];

const Dashboard = () => {
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
        // Fetch stats in parallel
        const [
          playersResult,
          reportsResult,
          leadsResult,
          contractsResult,
          positionsResult,
          recentReportsResult,
          recentLeadsResult,
        ] = await Promise.all([
          // Total players
          supabase.from("players").select("id", { count: "exact", head: true }),
          // Total reports
          supabase.from("scouting_reports").select("id", { count: "exact", head: true }),
          // Total leads
          supabase.from("leads").select("id", { count: "exact", head: true }),
          // Expiring contracts (next 90 days)
          supabase
            .from("players")
            .select("id", { count: "exact", head: true })
            .gte("contract_end", new Date().toISOString().split("T")[0])
            .lte("contract_end", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          // Position distribution
          supabase.from("players").select("position"),
          // Recent reports with joins
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
          // Recent leads
          supabase
            .from("leads")
            .select("id, name, subject, created_at, status")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        // Calculate reports this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const { count: reportsThisMonth } = await supabase
          .from("scouting_reports")
          .select("id", { count: "exact", head: true })
          .gte("created_at", firstDayOfMonth.toISOString());

        // Set stats
        setStats({
          totalPlayers: playersResult.count || 0,
          totalReports: reportsResult.count || 0,
          reportsThisMonth: reportsThisMonth || 0,
          totalLeads: leadsResult.count || 0,
          expiringContracts: contractsResult.count || 0,
        });

        // Process position data
        if (positionsResult.data) {
          const positionCounts: Record<string, number> = {};
          positionsResult.data.forEach((p) => {
            const pos = p.position || "Não definido";
            positionCounts[pos] = (positionCounts[pos] || 0) + 1;
          });
          
          const sortedPositions = Object.entries(positionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
          
          setPositionData(sortedPositions);
        }

        // Process recent reports
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

        // Process recent leads
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

  const statsCards = [
    {
      label: "Total de Atletas",
      value: stats.totalPlayers.toString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Relatórios este mês",
      value: stats.reportsThisMonth.toString(),
      icon: FileText,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Total de Relatórios",
      value: stats.totalReports.toString(),
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Contratos a Vencer",
      value: stats.expiringContracts.toString(),
      icon: AlertCircle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      subtitle: "próximos 90 dias",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma de scouting
          </p>
        </div>
        <Link to="/app/reports/new">
          <Button variant="gradient">
            <FileText className="w-4 h-4" />
            Novo Relatório
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.subtitle && (
                <span className="text-xs text-muted-foreground">{stat.subtitle}</span>
              )}
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Position Distribution - Pie Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Distribuição por Posição</h2>
          {positionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={positionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {positionData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={POSITION_COLORS[index % POSITION_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nenhum atleta cadastrado
            </div>
          )}
        </div>

        {/* Position Distribution - Bar Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Atletas por Posição</h2>
          {positionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={positionData} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    width={100}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value} atletas`, "Total"]}
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
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nenhum atleta cadastrado
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Relatórios Recentes</h2>
            <Link to="/app/reports">
              <Button variant="ghost" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
          {recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <Link 
                  key={report.id}
                  to={`/app/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors block"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{report.player_name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        {report.final_score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {report.competition_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(report.match_date).toLocaleDateString("pt-BR")}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      por {report.scout_name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum relatório criado ainda
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Leads Recentes</h2>
            <Button variant="ghost" size="sm" disabled>
              Ver Todos
            </Button>
          </div>
          {recentLeads.length > 0 ? (
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.subject}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === "new" 
                        ? "bg-accent/20 text-accent" 
                        : "bg-primary/20 text-primary"
                    }`}>
                      {lead.status === "new" ? "Novo" : "Contatado"}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum lead recebido ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
