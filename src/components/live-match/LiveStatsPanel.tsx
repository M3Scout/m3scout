import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchEvent, MatchEventType } from "@/hooks/useLiveMatch";
import { 
  Target, 
  Crosshair, 
  Square, 
  AlertTriangle,
  CircleDot,
  Activity,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveStatsPanelProps {
  events: MatchEvent[];
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  borderColor: string;
  delay?: number;
}

function StatCard({ icon, label, value, color, bgColor, borderColor, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-xl border backdrop-blur-sm",
        bgColor,
        borderColor
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-1", color)}>
        {icon}
      </div>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
          animate={{ scale: 1, color: "inherit" }}
          className="text-2xl font-bold text-zinc-100"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">
        {label}
      </span>
    </motion.div>
  );
}

export function LiveStatsPanel({ events, className }: LiveStatsPanelProps) {
  const stats = useMemo(() => {
    const goals = events.filter(e => e.event_type === "goal").reduce((acc, e) => acc + e.value, 0);
    const assists = events.filter(e => e.event_type === "assist").reduce((acc, e) => acc + e.value, 0);
    const yellowCards = events.filter(e => e.event_type === "yellow").reduce((acc, e) => acc + e.value, 0);
    const redCards = events.filter(e => e.event_type === "red").reduce((acc, e) => acc + e.value, 0);
    
    // Finalizações: shot = para fora, shot_on_target = no gol, goal = conta como finalização no gol
    const shotsOff = events.filter(e => e.event_type === "shot").reduce((acc, e) => acc + e.value, 0);
    const shotsOnTarget = events.filter(e => e.event_type === "shot_on_target").reduce((acc, e) => acc + e.value, 0);
    // Gols contam como finalizações no gol
    const totalShotsOnTarget = shotsOnTarget + goals;
    const totalShots = shotsOff + totalShotsOnTarget;
    
    // Possession calculation (based on passes vs possession lost)
    const passSuccess = events.filter(e => e.event_type === "pass_success").reduce((acc, e) => acc + e.value, 0);
    const passTotal = events.filter(e => e.event_type === "pass_total").reduce((acc, e) => acc + e.value, 0);
    const possessionLost = events.filter(e => e.event_type === "possession_lost").reduce((acc, e) => acc + e.value, 0);
    
    // Simple possession estimate: pass success rate as proxy
    const passAccuracy = passTotal > 0 ? Math.round((passSuccess / passTotal) * 100) : 0;
    
    // Defensive stats
    const tackles = events.filter(e => e.event_type === "tackle").reduce((acc, e) => acc + e.value, 0);
    const interceptions = events.filter(e => e.event_type === "interception").reduce((acc, e) => acc + e.value, 0);
    const recoveries = events.filter(e => e.event_type === "recovery").reduce((acc, e) => acc + e.value, 0);
    
    return {
      goals,
      assists,
      yellowCards,
      redCards,
      shots: totalShots,
      shotsOnTarget: totalShotsOnTarget,
      passAccuracy,
      tackles,
      interceptions,
      recoveries,
      totalCards: yellowCards + redCards,
    };
  }, [events]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-4 backdrop-blur-lg",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Estatísticas ao Vivo</h3>
          <p className="text-[10px] text-zinc-500">{events.length} eventos registrados</p>
        </div>
        
        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5 bg-red-500/20 rounded-full px-2 py-0.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[10px] font-medium text-red-400">LIVE</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatCard
          icon={<Target className="w-4 h-4 text-green-400" />}
          label="Gols"
          value={stats.goals}
          color="bg-green-500/20"
          bgColor="bg-green-500/5"
          borderColor="border-green-500/20"
          delay={0}
        />
        <StatCard
          icon={<Crosshair className="w-4 h-4 text-blue-400" />}
          label="Assist."
          value={stats.assists}
          color="bg-blue-500/20"
          bgColor="bg-blue-500/5"
          borderColor="border-blue-500/20"
          delay={0.05}
        />
        <StatCard
          icon={<Square className="w-4 h-4 text-yellow-400" fill="currentColor" />}
          label="Amarelos"
          value={stats.yellowCards}
          color="bg-yellow-500/20"
          bgColor="bg-yellow-500/5"
          borderColor="border-yellow-500/20"
          delay={0.1}
        />
        <StatCard
          icon={<Square className="w-4 h-4 text-red-400" fill="currentColor" />}
          label="Vermelhos"
          value={stats.redCards}
          color="bg-red-500/20"
          bgColor="bg-red-500/5"
          borderColor="border-red-500/20"
          delay={0.15}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/40">
          <div className="flex items-center gap-2 mb-1">
            <CircleDot className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] text-zinc-500 uppercase">Finalizações</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-zinc-100">{stats.shots}</span>
            <span className="text-xs text-zinc-500">
              ({stats.shotsOnTarget} no gol)
            </span>
          </div>
        </div>
        
        <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/40">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-zinc-500 uppercase">Passes</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-zinc-100">{stats.passAccuracy}%</span>
            <span className="text-xs text-zinc-500">precisão</span>
          </div>
        </div>
        
        <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/40">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] text-zinc-500 uppercase">Defesa</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-zinc-100">
              {stats.tackles + stats.interceptions}
            </span>
            <span className="text-xs text-zinc-500">ações</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
