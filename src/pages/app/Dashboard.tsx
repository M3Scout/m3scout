import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  {
    label: "Total de Atletas",
    value: "156",
    change: "+12",
    trend: "up",
    icon: Users,
  },
  {
    label: "Relatórios este mês",
    value: "34",
    change: "+8",
    trend: "up",
    icon: FileText,
  },
  {
    label: "Leads Recebidos",
    value: "23",
    change: "+5",
    trend: "up",
    icon: TrendingUp,
  },
  {
    label: "Contratos a Vencer",
    value: "7",
    change: "-2",
    trend: "down",
    icon: AlertCircle,
  },
];

const recentReports = [
  {
    id: "1",
    playerName: "Gabriel Santos",
    competition: "Brasileirão Série A",
    date: "2024-01-15",
    scout: "Carlos Silva",
    rating: 4,
  },
  {
    id: "2",
    playerName: "Lucas Oliveira",
    competition: "Copa do Brasil",
    date: "2024-01-14",
    scout: "Maria Costa",
    rating: 5,
  },
  {
    id: "3",
    playerName: "Pedro Almeida",
    competition: "Brasileirão Série B",
    date: "2024-01-13",
    scout: "João Santos",
    rating: 3,
  },
];

const recentLeads = [
  {
    id: "1",
    name: "Manchester United",
    player: "Gabriel Santos",
    date: "2024-01-15",
    status: "new",
  },
  {
    id: "2",
    name: "FC Porto",
    player: "Lucas Oliveira",
    date: "2024-01-14",
    status: "contacted",
  },
  {
    id: "3",
    name: "Sporting CP",
    player: "Matheus Costa",
    date: "2024-01-12",
    status: "new",
  },
];

const Dashboard = () => {
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
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.trend === "up" ? "text-primary" : "text-destructive"
              }`}>
                {stat.change}
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
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
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div 
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{report.playerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {report.competition}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(report.date).toLocaleDateString("pt-BR")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    por {report.scout}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Leads Recentes</h2>
            <Link to="/app/leads">
              <Button variant="ghost" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div 
                key={lead.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Interesse em: {lead.player}
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
                    {new Date(lead.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
