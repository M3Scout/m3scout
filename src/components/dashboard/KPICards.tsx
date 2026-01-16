import { Users, FileText, MessageSquare, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface KPICardsProps {
  totalPlayers: number;
  reportsThisMonth: number;
  totalLeads: number;
  expiringContracts: number;
}

const kpiConfig = [
  {
    key: "players",
    label: "Atletas",
    icon: Users,
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    glowColor: "group-hover:shadow-blue-500/10",
    link: "/app/players",
  },
  {
    key: "reports",
    label: "Relatórios",
    sublabel: "este mês",
    icon: FileText,
    color: "from-violet-500/20 to-purple-600/10",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/20",
    glowColor: "group-hover:shadow-violet-500/10",
    link: "/app/reports",
  },
  {
    key: "leads",
    label: "Leads",
    icon: MessageSquare,
    color: "from-amber-500/20 to-yellow-600/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    glowColor: "group-hover:shadow-amber-500/10",
    link: "/app/leads",
  },
  {
    key: "contracts",
    label: "Contratos",
    sublabel: "expirando",
    icon: AlertTriangle,
    color: "from-emerald-500/20 to-green-600/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    glowColor: "group-hover:shadow-emerald-500/10",
    link: "/app/players?contract=expiring",
    warningThreshold: 0,
  },
];

export const KPICards = ({ totalPlayers, reportsThisMonth, totalLeads, expiringContracts }: KPICardsProps) => {
  const values: Record<string, number> = {
    players: totalPlayers,
    reports: reportsThisMonth,
    leads: totalLeads,
    contracts: expiringContracts,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiConfig.map((kpi, index) => {
        const value = values[kpi.key];
        const isWarning = kpi.key === "contracts" && value > 0;
        
        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={kpi.link}
              className={`group relative block overflow-hidden rounded-xl border ${kpi.borderColor} bg-gradient-to-br ${kpi.color} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${kpi.glowColor}`}
            >
              {/* Subtle glow effect */}
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-lg bg-zinc-900/50 flex items-center justify-center ${kpi.iconColor}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                
                <div>
                  <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${isWarning ? 'text-amber-400' : 'text-white'}`}>
                    {value}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                      {kpi.label}
                    </p>
                    {kpi.sublabel && (
                      <span className="text-[10px] text-zinc-600">
                        {kpi.sublabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};
