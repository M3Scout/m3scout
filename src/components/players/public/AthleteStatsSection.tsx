import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingUp, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cardHover, cardTap, pillHover } from "@/lib/animations";
import { formatFixed } from "@/lib/formatters";

interface SeasonStats {
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  successful_dribbles: number;
  total_dribbles: number;
  accurate_passes: number;
  total_passes: number;
  clearances: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
}

interface CompetitionStats {
  competition_id: string;
  competition_name: string;
  competition_type: string;
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
}

interface CareerTotals {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
}

type TabValue = "current" | "per90" | "competition" | "career";

interface AthleteStatsSectionProps {
  careerTotals: CareerTotals;
  careerStats: SeasonStats[];
  competitionStats: CompetitionStats[];
  currentSeasonStats: SeasonStats | null;
  latestAvailableSeasonYear: number | null;
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
}

// Large KPI card with glow
function KPICard({ 
  label, 
  value, 
  highlight = false,
  icon: Icon,
  index = 0,
}: { 
  label: string;
  value: number | string;
  highlight?: boolean;
  icon?: React.ElementType;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -3 }}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 md:p-5",
        "rounded-2xl transition-all duration-300 cursor-default overflow-hidden",
        highlight 
          ? "bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/20"
          : "bg-gradient-to-br from-zinc-800/40 via-zinc-900/30 to-transparent border border-zinc-800/30",
        highlight && "shadow-[0_0_30px_-10px] shadow-primary/30"
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '12px 12px'
        }} 
      />
      
      {Icon && (
        <div className={cn(
          "p-1.5 rounded-lg mb-2",
          highlight ? "bg-primary/20" : "bg-zinc-800/50"
        )}>
          <Icon className={cn(
            "w-3.5 h-3.5",
            highlight ? "text-primary" : "text-zinc-500"
          )} />
        </div>
      )}
      
      <span className={cn(
        "text-2xl md:text-4xl font-bold tabular-nums tracking-tight",
        highlight ? "text-foreground" : "text-zinc-300"
      )}>
        {value}
      </span>
      <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </span>
    </motion.div>
  );
}

// Tab button with active indicator
function TabButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={pillHover}
      whileTap={cardTap}
      className={cn(
        "relative px-4 md:px-5 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap",
        "min-h-[44px] rounded-xl transition-all duration-200",
        active 
          ? "text-foreground bg-zinc-800/60" 
          : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/30"
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

// Stats grid item
function StatGridItem({ label, value }: { label: string; value: number | string }) {
  return (
    <motion.div 
      className="text-center p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </motion.div>
  );
}

export function AthleteStatsSection({
  careerTotals,
  careerStats,
  competitionStats,
  currentSeasonStats,
  latestAvailableSeasonYear,
  activeTab,
  setActiveTab,
}: AthleteStatsSectionProps) {
  const currentYear = new Date().getFullYear();
  
  const calculatePer90 = (value: number, minutes: number): string => {
    if (minutes < 90) return "—";
    return formatFixed((value / minutes) * 90, 2);
  };

  if (careerStats.length === 0) return null;

  return (
    <motion.section 
      className="mb-10 md:mb-14"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Section Header */}
      <motion.div 
        className="flex items-center gap-3 mb-6 md:mb-8"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="p-2 rounded-xl bg-primary/10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Estatísticas</h2>
          <p className="text-xs text-muted-foreground">Performance consolidada</p>
        </div>
      </motion.div>

      {/* KPIs Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3 mb-6">
        <KPICard label="Jogos" value={careerTotals.matches} icon={Trophy} index={0} />
        <KPICard label="Minutos" value={careerTotals.minutes.toLocaleString()} index={1} />
        <KPICard label="Gols" value={careerTotals.goals} highlight icon={Zap} index={2} />
        <KPICard label="Assist." value={careerTotals.assists} index={3} />
        <KPICard label="G+A" value={careerTotals.goals + careerTotals.assists} highlight icon={TrendingUp} index={4} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <TabButton active={activeTab === "current"} onClick={() => setActiveTab("current")}>
          Temporada {latestAvailableSeasonYear ?? currentYear}
        </TabButton>
        <TabButton active={activeTab === "per90"} onClick={() => setActiveTab("per90")}>
          Por 90 min
        </TabButton>
        <TabButton active={activeTab === "competition"} onClick={() => setActiveTab("competition")}>
          Por Competição
        </TabButton>
        <TabButton active={activeTab === "career"} onClick={() => setActiveTab("career")}>
          Carreira
        </TabButton>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "p-5 md:p-6",
            "rounded-2xl",
            "bg-gradient-to-br from-zinc-800/30 via-zinc-900/20 to-transparent",
            "border border-zinc-800/30"
          )}
        >
          {activeTab === "current" && currentSeasonStats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
              <StatGridItem label="Jogos" value={currentSeasonStats.matches} />
              <StatGridItem label="Minutos" value={currentSeasonStats.minutes} />
              <StatGridItem label="Gols" value={currentSeasonStats.goals} />
              <StatGridItem label="Assist." value={currentSeasonStats.assists} />
              <StatGridItem label="Desarmes" value={currentSeasonStats.tackles} />
              <StatGridItem label="Intercep." value={currentSeasonStats.interceptions} />
            </div>
          )}

          {activeTab === "current" && !currentSeasonStats && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Sem estatísticas disponíveis ainda.
            </div>
          )}

          {activeTab === "per90" && currentSeasonStats && currentSeasonStats.minutes >= 90 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              <StatGridItem label="Gols/90" value={calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes)} />
              <StatGridItem label="Assist./90" value={calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes)} />
              <StatGridItem label="G+A/90" value={calculatePer90(currentSeasonStats.goals + currentSeasonStats.assists, currentSeasonStats.minutes)} />
              <StatGridItem label="Desarmes/90" value={calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes)} />
            </div>
          )}

          {activeTab === "per90" && (!currentSeasonStats || currentSeasonStats.minutes < 90) && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Mínimo de 90 minutos necessários.
            </div>
          )}

          {activeTab === "competition" && competitionStats.length > 0 && (
            <div className="space-y-2">
              {competitionStats.slice(0, 5).map((comp, idx) => (
                <motion.div 
                  key={`${comp.competition_id}-${comp.season_year}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl",
                    "bg-zinc-800/20 hover:bg-zinc-800/40",
                    "border border-transparent hover:border-zinc-700/30",
                    "transition-all duration-200 cursor-default"
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{comp.competition_name}</div>
                    <div className="text-xs text-muted-foreground">{comp.season_year}</div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground tabular-nums">{comp.matches}J</span>
                    <span className="text-foreground font-semibold tabular-nums">{comp.goals}G</span>
                    <span className="text-muted-foreground tabular-nums">{comp.assists}A</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "competition" && competitionStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Sem competições registradas.
            </div>
          )}

          {activeTab === "career" && (
            <div className="space-y-2">
              {careerStats.map((season, idx) => (
                <motion.div 
                  key={season.season_year}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl",
                    "bg-zinc-800/20 hover:bg-zinc-800/40",
                    "border border-transparent hover:border-zinc-700/30",
                    "transition-all duration-200 cursor-default"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground tabular-nums">{season.season_year}</span>
                    {season.season_year === currentYear && (
                      <Badge variant="outline" className="text-[9px] border-primary/50 text-primary px-1.5">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm tabular-nums">
                    <span className="text-muted-foreground">{season.matches}J</span>
                    <span className="text-foreground font-semibold">{season.goals}G</span>
                    <span className="text-muted-foreground">{season.assists}A</span>
                    <span className="text-muted-foreground/60 hidden sm:inline">{season.minutes}'</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
