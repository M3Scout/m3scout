import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchEvent } from "@/hooks/useLiveMatch";
import { 
  Target, 
  Crosshair, 
  Square, 
  Shield,
  ShieldCheck,
  RotateCcw,
  Ban,
  Zap,
  HandHelping,
  ArrowRight,
  AlertTriangle,
  Activity,
  Goal,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveStatsPanelProps {
  events: MatchEvent[];
  className?: string;
  currentHalf?: number;
}

// Category configuration
const CATEGORY_CONFIG = {
  attack: {
    key: "attack",
    label: "Ataque",
    icon: Target,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    accentGradient: "from-orange-500/20 to-red-500/10",
  },
  creativity: {
    key: "creativity",
    label: "Criatividade",
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    accentGradient: "from-purple-500/20 to-pink-500/10",
  },
  passing: {
    key: "passing",
    label: "Passe",
    icon: ArrowRight,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    accentGradient: "from-blue-500/20 to-cyan-500/10",
  },
  defense: {
    key: "defense",
    label: "Defesa",
    icon: Shield,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    accentGradient: "from-cyan-500/20 to-teal-500/10",
  },
  discipline: {
    key: "discipline",
    label: "Disciplina",
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    accentGradient: "from-amber-500/20 to-yellow-500/10",
  },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;

interface StatItem {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  category: CategoryKey;
  highlight?: boolean;
  suffix?: string;
}

interface MiniStatCardProps {
  item: StatItem;
  delay?: number;
  categoryConfig: typeof CATEGORY_CONFIG[CategoryKey];
}

function MiniStatCard({ item, delay = 0, categoryConfig }: MiniStatCardProps) {
  const hasValue = item.value > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-2xl",
        "transition-all duration-200 cursor-default group",
        "border backdrop-blur-sm overflow-hidden",
        hasValue ? [
          categoryConfig.bgColor,
          categoryConfig.borderColor,
        ] : [
          "bg-zinc-800/30",
          "border-zinc-700/30",
        ]
      )}
    >
      {/* Subtle glow effect when has value */}
      {hasValue && (
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-gradient-to-br",
          categoryConfig.accentGradient
        )} />
      )}
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Icon */}
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center mb-1.5",
          hasValue ? categoryConfig.bgColor : "bg-zinc-700/40"
        )}>
          <span className={cn(
            "transition-colors",
            hasValue ? categoryConfig.color : "text-zinc-500"
          )}>
            {item.icon}
          </span>
        </div>
        
        {/* Value */}
        <AnimatePresence mode="popLayout">
          <motion.span
            key={item.value}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
              "text-xl font-bold tabular-nums leading-none",
              hasValue ? "text-zinc-100" : "text-zinc-500"
            )}
          >
            {item.value}{item.suffix || ""}
          </motion.span>
        </AnimatePresence>
        
        {/* Label */}
        <span className={cn(
          "text-[9px] uppercase tracking-wider font-medium mt-1",
          hasValue ? "text-zinc-400" : "text-zinc-600"
        )}>
          {item.label}
        </span>
      </div>

      {/* Highlight indicator for special stats */}
      {item.highlight && hasValue && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900"
        />
      )}
    </motion.div>
  );
}

interface CategorySectionProps {
  category: CategoryKey;
  stats: StatItem[];
  delay?: number;
}

function CategorySection({ category, stats, delay = 0 }: CategorySectionProps) {
  const config = CATEGORY_CONFIG[category];
  const IconComponent = config.icon;
  const hasAnyValue = stats.some(s => s.value > 0);
  
  if (stats.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="space-y-2"
    >
      {/* Category header */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center",
          hasAnyValue ? config.bgColor : "bg-zinc-800/50"
        )}>
          <IconComponent className={cn(
            "w-3 h-3",
            hasAnyValue ? config.color : "text-zinc-500"
          )} />
        </div>
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          hasAnyValue ? config.color : "text-zinc-500"
        )}>
          {config.label}
        </span>
        <div className={cn(
          "flex-1 h-px",
          hasAnyValue 
            ? `bg-gradient-to-r ${config.accentGradient} to-transparent` 
            : "bg-zinc-800/50"
        )} />
      </div>
      
      {/* Stats grid - 2 cols on mobile/tablet, 4 on desktop */}
      <div className="grid grid-cols-2 desktop:grid-cols-4 gap-2">
        {stats.map((stat, index) => (
          <MiniStatCard
            key={stat.key}
            item={stat}
            categoryConfig={config}
            delay={delay + index * 0.03}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function LiveStatsPanel({ events, className, currentHalf }: LiveStatsPanelProps) {
  const stats = useMemo(() => {
    const getValue = (type: string) => 
      events.filter(e => e.event_type === type).reduce((acc, e) => acc + e.value, 0);
    
    const goals = getValue("goal");
    const assists = getValue("assist");
    const yellowCards = getValue("yellow");
    const redCards = getValue("red");
    
    // Finalizações
    const shotsOff = getValue("shot");
    const shotsOnTarget = getValue("shot_on_target");
    const totalShotsOnTarget = shotsOnTarget + goals;
    const totalShots = shotsOff + totalShotsOnTarget;
    
    // Passes
    const passSuccess = getValue("pass_success");
    const passTotal = getValue("pass_total");
    const passAccuracy = passTotal > 0 ? Math.round((passSuccess / passTotal) * 100) : 0;
    
    // Defense
    const tackles = getValue("tackle");
    const interceptions = getValue("interception");
    const recoveries = getValue("recovery");
    const clearances = getValue("clearance");
    const duelsWon = getValue("duel_won");
    const aerialDuels = getValue("aerial_duel_won");
    
    // Creativity
    const chancesCreated = getValue("chance_created");
    const keyPasses = getValue("key_pass");
    const dribblesSuccess = getValue("dribble_success");
    
    // Discipline
    const foulsCommitted = getValue("foul_committed");
    const foulsSuffered = getValue("foul_suffered");
    
    return {
      goals,
      assists,
      yellowCards,
      redCards,
      shotsOff,
      shotsOnTarget: totalShotsOnTarget,
      totalShots,
      passSuccess,
      passTotal,
      passAccuracy,
      tackles,
      interceptions,
      recoveries,
      clearances,
      duelsWon,
      aerialDuels,
      chancesCreated,
      keyPasses,
      dribblesSuccess,
      foulsCommitted,
      foulsSuffered,
    };
  }, [events]);

  // Build stat items per category
  const attackStats: StatItem[] = [
    { key: "goals", label: "Gols", value: stats.goals, icon: <Goal className="w-3 h-3" />, category: "attack" as const, highlight: true },
    { key: "shots", label: "Finaliz.", value: stats.totalShots, icon: <Crosshair className="w-3 h-3" />, category: "attack" as const },
    { key: "shotsOn", label: "No Gol", value: stats.shotsOnTarget, icon: <Target className="w-3 h-3" />, category: "attack" as const },
  ];

  const creativityStats: StatItem[] = [
    { key: "assists", label: "Assist.", value: stats.assists, icon: <HandHelping className="w-3 h-3" />, category: "creativity" as const, highlight: true },
    { key: "chances", label: "Chances", value: stats.chancesCreated, icon: <Zap className="w-3 h-3" />, category: "creativity" as const },
    { key: "keyPasses", label: "P. Dec.", value: stats.keyPasses, icon: <ArrowRight className="w-3 h-3" />, category: "creativity" as const },
    { key: "dribbles", label: "Dribles", value: stats.dribblesSuccess, icon: <Zap className="w-3 h-3" />, category: "creativity" as const },
  ].filter(s => s.value > 0 || s.key === "assists");

  const passingStats: StatItem[] = [
    { key: "passSuccess", label: "Certos", value: stats.passSuccess, icon: <ArrowRight className="w-3 h-3" />, category: "passing" as const },
    { key: "passTotal", label: "Total", value: stats.passTotal, icon: <ArrowRight className="w-3 h-3" />, category: "passing" as const },
    { key: "passAcc", label: "Precisão", value: stats.passAccuracy, icon: <Target className="w-3 h-3" />, category: "passing" as const, suffix: "%" },
  ].filter(s => s.value > 0 || s.key === "passAcc");

  const defenseStats: StatItem[] = [
    { key: "tackles", label: "Desarmes", value: stats.tackles, icon: <Shield className="w-3 h-3" />, category: "defense" as const },
    { key: "interceptions", label: "Interc.", value: stats.interceptions, icon: <ShieldCheck className="w-3 h-3" />, category: "defense" as const },
    { key: "recoveries", label: "Recup.", value: stats.recoveries, icon: <RotateCcw className="w-3 h-3" />, category: "defense" as const },
    { key: "clearances", label: "Cortes", value: stats.clearances, icon: <Ban className="w-3 h-3" />, category: "defense" as const },
    { key: "duels", label: "Duelos", value: stats.duelsWon, icon: <Users className="w-3 h-3" />, category: "defense" as const },
  ].filter(s => s.value > 0);

  const disciplineStats: StatItem[] = [
    { key: "yellow", label: "Amarelos", value: stats.yellowCards, icon: <Square className="w-3 h-3 fill-yellow-400" />, category: "discipline" as const },
    { key: "red", label: "Vermelhos", value: stats.redCards, icon: <Square className="w-3 h-3 fill-red-500" />, category: "discipline" as const },
    { key: "foulsC", label: "Faltas", value: stats.foulsCommitted, icon: <AlertTriangle className="w-3 h-3" />, category: "discipline" as const },
    { key: "foulsS", label: "F. Sof.", value: stats.foulsSuffered, icon: <AlertTriangle className="w-3 h-3" />, category: "discipline" as const },
  ].filter(s => s.value > 0 || s.key === "yellow" || s.key === "red");

  const halfLabel = currentHalf === 1 ? "1º tempo" : currentHalf === 2 ? "2º tempo" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-zinc-900/90 border border-zinc-800/60 rounded-3xl p-5 backdrop-blur-xl",
        "shadow-2xl shadow-black/20",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Estatísticas ao Vivo</h3>
            <p className="text-[11px] text-zinc-500">
              {events.length} eventos registrados
              {halfLabel && <span className="text-zinc-600"> • {halfLabel}</span>}
            </p>
          </div>
        </div>
        
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 bg-red-500/15 rounded-full px-2.5 py-1 border border-red-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {/* Attack - Always show */}
        <CategorySection category="attack" stats={attackStats} delay={0} />
        
        {/* Creativity - Show if has assists or other data */}
        {creativityStats.length > 0 && (
          <CategorySection category="creativity" stats={creativityStats} delay={0.1} />
        )}
        
        {/* Passing - Show if has pass data */}
        {passingStats.length > 0 && stats.passTotal > 0 && (
          <CategorySection category="passing" stats={passingStats} delay={0.2} />
        )}
        
        {/* Defense - Show if has any defensive actions */}
        {defenseStats.length > 0 && (
          <CategorySection category="defense" stats={defenseStats} delay={0.3} />
        )}
        
        {/* Discipline - Always show cards */}
        <CategorySection category="discipline" stats={disciplineStats} delay={0.4} />
      </div>

      {/* Summary footer */}
      {events.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 pt-4 border-t border-zinc-800/50"
        >
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.goals}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Gols</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <p className="text-2xl font-bold text-purple-400 tabular-nums">{stats.assists}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Assist.</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <p className="text-2xl font-bold text-orange-400 tabular-nums">{stats.totalShots}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Finaliz.</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                stats.yellowCards + stats.redCards > 0 ? "text-amber-400" : "text-zinc-500"
              )}>
                {stats.yellowCards + stats.redCards}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase">Cartões</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}