import { Users, FileText, MessageSquare, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cardHover, cardTap, staggerItem } from "@/lib/animations";

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[var(--gap-mobile)] md:gap-4">
      {kpiConfig.map((kpi, index) => {
        const value = values[kpi.key];
        const isWarning = kpi.key === "contracts" && value > 0;
        
        return (
          <motion.div
            key={kpi.key}
            variants={staggerItem}
            whileHover={cardHover}
            whileTap={cardTap}
          >
            <Link
              to={kpi.link}
              className={`group relative block overflow-hidden rounded-[var(--radius-card)] border ${kpi.borderColor} bg-gradient-to-br ${kpi.color} p-4 sm:p-5 transition-all duration-300 hover:shadow-xl ${kpi.glowColor}`}
            >
              {/* Subtle glow effect */}
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex flex-col gap-2 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--radius-button)] bg-zinc-900/50 flex items-center justify-center ${kpi.iconColor}`}>
                  <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                
                <div>
                  <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold tabular-nums ${isWarning ? 'text-amber-400' : 'text-foreground'}`}>
                    {value}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      {kpi.label}
                    </p>
                    {kpi.sublabel && (
                      <span className="text-[9px] sm:text-[10px] text-zinc-600">
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
