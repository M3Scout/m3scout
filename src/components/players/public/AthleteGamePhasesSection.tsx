import { motion } from "framer-motion";
import { 
  Crosshair, 
  Sparkles, 
  Footprints, 
  Shield,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardHover } from "@/lib/animations";

interface SeasonStats {
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  accurate_passes: number;
  successful_dribbles: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
}

interface AthleteGamePhasesSectionProps {
  currentSeasonStats: SeasonStats | null;
  latestAvailableSeasonYear: number | null;
}

// Premium phase panel with animated bars
function PhasePanel({ 
  title, 
  icon: Icon, 
  color,
  stats,
  index = 0,
}: { 
  title: string;
  icon: React.ElementType;
  color: "orange" | "purple" | "green" | "blue";
  stats: { label: string; value: number; max?: number }[];
  index?: number;
}) {
  const colorMap = {
    orange: { 
      bg: "from-orange-500/12 via-orange-500/6", 
      icon: "text-orange-400", 
      bar: "bg-gradient-to-r from-orange-500 to-orange-400",
      glow: "shadow-orange-500/20",
      border: "border-orange-500/15",
    },
    purple: { 
      bg: "from-purple-500/12 via-purple-500/6", 
      icon: "text-purple-400", 
      bar: "bg-gradient-to-r from-purple-500 to-purple-400",
      glow: "shadow-purple-500/20",
      border: "border-purple-500/15",
    },
    green: { 
      bg: "from-emerald-500/12 via-emerald-500/6", 
      icon: "text-emerald-400", 
      bar: "bg-gradient-to-r from-emerald-500 to-emerald-400",
      glow: "shadow-emerald-500/20",
      border: "border-emerald-500/15",
    },
    blue: { 
      bg: "from-blue-500/12 via-blue-500/6", 
      icon: "text-blue-400", 
      bar: "bg-gradient-to-r from-blue-500 to-blue-400",
      glow: "shadow-blue-500/20",
      border: "border-blue-500/15",
    },
  };

  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        "relative p-5 rounded-2xl overflow-hidden cursor-default group",
        "bg-gradient-to-br to-transparent",
        "border transition-all duration-300",
        c.bg,
        c.border,
        "hover:shadow-lg",
        c.glow
      )}
    >
      {/* Subtle corner glow on hover */}
      <div className={cn(
        "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl",
        "opacity-0 group-hover:opacity-30 transition-opacity duration-500",
        color === "orange" && "bg-orange-500",
        color === "purple" && "bg-purple-500",
        color === "green" && "bg-emerald-500",
        color === "blue" && "bg-blue-500",
      )} />
      
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={cn(
            "p-2 rounded-xl transition-transform duration-300 group-hover:scale-110",
            color === "orange" && "bg-orange-500/15",
            color === "purple" && "bg-purple-500/15",
            color === "green" && "bg-emerald-500/15",
            color === "blue" && "bg-blue-500/15",
          )}>
            <Icon className={cn("w-4 h-4", c.icon)} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        
        <div className="space-y-3">
          {stats.map((stat, statIdx) => {
            const pct = stat.max ? Math.min(100, (stat.value / stat.max) * 100) : Math.min(100, stat.value);
            return (
              <div key={stat.label} className="group/stat">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground group-hover/stat:text-foreground transition-colors">
                    {stat.label}
                  </span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{stat.value}</span>
                </div>
                <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: (index * 0.08) + (statIdx * 0.1), ease: "easeOut" }}
                    className={cn("h-full rounded-full", c.bar)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function AthleteGamePhasesSection({
  currentSeasonStats,
  latestAvailableSeasonYear,
}: AthleteGamePhasesSectionProps) {
  return (
    <motion.section 
      className="mb-10 md:mb-14"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {/* Section Header */}
      <motion.div 
        className="flex items-center gap-3 mb-6 md:mb-8"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="p-2 rounded-xl bg-purple-500/10">
          <Layers className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Fases do Jogo</h2>
          {latestAvailableSeasonYear && (
            <p className="text-xs text-muted-foreground">Temporada {latestAvailableSeasonYear}</p>
          )}
        </div>
      </motion.div>

      {currentSeasonStats ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <PhasePanel 
            title="Ataque" 
            icon={Crosshair} 
            color="orange"
            index={0}
            stats={[
              { label: "Gols", value: currentSeasonStats.goals, max: 20 },
              { label: "Chutes", value: currentSeasonStats.shots, max: 50 },
              { label: "Chutes no Gol", value: currentSeasonStats.shots_on_target, max: 30 },
            ]}
          />
          <PhasePanel 
            title="Criatividade" 
            icon={Sparkles} 
            color="purple"
            index={1}
            stats={[
              { label: "Assistências", value: currentSeasonStats.assists, max: 15 },
              { label: "Passes Decisivos", value: currentSeasonStats.key_passes, max: 40 },
              { label: "Chances Criadas", value: currentSeasonStats.chances_created, max: 30 },
            ]}
          />
          <PhasePanel 
            title="Passe" 
            icon={Footprints} 
            color="green"
            index={2}
            stats={[
              { label: "Passes Certos", value: currentSeasonStats.accurate_passes, max: 500 },
              { label: "Dribles Certos", value: currentSeasonStats.successful_dribbles, max: 30 },
            ]}
          />
          <PhasePanel 
            title="Defesa" 
            icon={Shield} 
            color="blue"
            index={3}
            stats={[
              { label: "Desarmes", value: currentSeasonStats.tackles, max: 40 },
              { label: "Interceptações", value: currentSeasonStats.interceptions, max: 30 },
              { label: "Recuperações", value: currentSeasonStats.recoveries, max: 50 },
            ]}
          />
        </div>
      ) : (
        <motion.div 
          className={cn(
            "text-center py-12",
            "rounded-2xl",
            "bg-gradient-to-br from-zinc-800/30 to-transparent",
            "border border-zinc-800/30"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-muted-foreground text-sm">Sem estatísticas disponíveis ainda.</p>
        </motion.div>
      )}
    </motion.section>
  );
}
