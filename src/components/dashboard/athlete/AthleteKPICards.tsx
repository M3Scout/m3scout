import { Shirt, Clock, Target, Handshake, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { kpiCardVariants, subtleHover, subtleTap } from "@/lib/animations";

interface AthleteKPICardsProps {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  averageRating: number | null;
  athleteId: string;
}

const formatMinutes = (minutes: number): string => {
  if (minutes >= 1000) {
    return `${(minutes / 1000).toFixed(1)}k`;
  }
  return String(minutes);
};

export function AthleteKPICards({ 
  matches, 
  minutes, 
  goals, 
  assists, 
  averageRating,
  athleteId
}: AthleteKPICardsProps) {
  const kpis = [
    {
      key: "matches",
      label: "Partidas",
      value: matches,
      icon: Shirt,
      color: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
      glowColor: "group-hover:shadow-blue-500/10",
    },
    {
      key: "minutes",
      label: "Minutos",
      value: formatMinutes(minutes),
      icon: Clock,
      color: "from-violet-500/20 to-purple-600/10",
      iconColor: "text-violet-400",
      glowColor: "group-hover:shadow-violet-500/10",
    },
    {
      key: "goals",
      label: "Gols",
      value: goals,
      icon: Target,
      color: "from-emerald-500/20 to-green-600/10",
      iconColor: "text-emerald-400",
      glowColor: "group-hover:shadow-emerald-500/10",
    },
    {
      key: "assists",
      label: "Assistências",
      value: assists,
      icon: Handshake,
      color: "from-amber-500/20 to-yellow-600/10",
      iconColor: "text-amber-400",
      glowColor: "group-hover:shadow-amber-500/10",
    },
    {
      key: "rating",
      label: "Nota Média",
      value: averageRating !== null ? averageRating.toFixed(1) : "—",
      icon: Star,
      color: "from-primary/20 to-red-600/10",
      iconColor: "text-primary",
      glowColor: "group-hover:shadow-primary/10",
      highlight: averageRating !== null && averageRating >= 7.0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[var(--gap-mobile)] md:gap-4 w-full max-w-full">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.key}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={kpiCardVariants}
          whileHover={subtleHover}
          whileTap={subtleTap}
        >
          <Link
            to={`/app/players/${athleteId}?tab=stats`}
            className={`group relative block overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br ${kpi.color} p-4 sm:p-5 transition-all duration-300 hover:shadow-xl ${kpi.glowColor}`}
          >
            {/* Subtle glow effect */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex flex-col gap-2 sm:gap-3">
              <motion.div 
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--radius-button)] bg-zinc-900/50 flex items-center justify-center ${kpi.iconColor}`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.4, type: "spring", stiffness: 200 }}
              >
                <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.div>
              
              <div>
                <motion.p 
                  className={`text-2xl sm:text-3xl lg:text-4xl font-bold tabular-nums ${kpi.highlight ? 'text-primary' : 'text-foreground'}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.3 }}
                >
                  {kpi.value}
                </motion.p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">
                  {kpi.label}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
