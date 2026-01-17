import { Link } from "react-router-dom";
import { FileText, ChevronRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { safeArray } from "@/lib/utils";
import { fadeInUp, cardHover, cardTap } from "@/lib/animations";

interface RecentReport {
  id: string;
  player_name: string;
  competition_name: string;
  match_date: string;
  scout_name: string;
  rating: number;
  final_score: number;
}

interface RecentReportsCardProps {
  reports: RecentReport[];
}

const getScoreColor = (score: number) => {
  if (score >= 4.5) return "from-emerald-500 to-green-600";
  if (score >= 4.0) return "from-blue-500 to-indigo-600";
  if (score >= 3.0) return "from-amber-500 to-orange-600";
  return "from-zinc-500 to-zinc-600";
};

const getCompetitionColor = (name: string) => {
  const colors = [
    "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ];
  // Simple hash to get consistent color per competition
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const RecentReportsCard = ({ reports }: RecentReportsCardProps) => {
  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.3 }}
      className="w-full h-full flex flex-col rounded-[var(--radius-card)] border border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-sm overflow-hidden"
    >
      {/* Header - Fixed at top */}
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-glass)] bg-zinc-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-violet-500/20 to-purple-600/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Relatórios Recentes</h2>
            <p className="text-[10px] text-muted-foreground">Últimas avaliações de scouting</p>
          </div>
        </div>
        
        <Link 
          to="/app/reports" 
          className="text-xs text-muted-foreground hover:text-zinc-300 transition-colors flex items-center gap-0.5"
        >
          Ver todos
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content - Scrollable list area */}
      <div className="p-3 flex-1 flex flex-col min-h-0 overflow-auto">
        {reports.length > 0 ? (
          <div className="space-y-2">
            {safeArray(reports).map((report) => (
              <motion.div
                key={report.id}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <Link 
                  to={`/app/reports/${report.id}`}
                  className="group flex items-center gap-3 sm:gap-4 p-3 rounded-[var(--radius-button)] bg-zinc-900/30 border border-transparent hover:border-[var(--border-glass)] hover:bg-zinc-800/30 transition-all duration-200"
                >
                  {/* Score */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[var(--radius-button)] bg-gradient-to-br ${getScoreColor(report.final_score)} flex items-center justify-center shadow-lg shrink-0`}>
                    <span className="text-white font-bold text-xs sm:text-sm">
                      {report.final_score.toFixed(1)}
                    </span>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {report.player_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCompetitionColor(report.competition_name)}`}>
                        {report.competition_name}
                      </span>
                    </div>
                  </div>
                  
                  {/* Date */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.match_date).toLocaleDateString("pt-BR", { 
                        day: "2-digit", 
                        month: "short" 
                      })}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center flex-1 flex flex-col items-center justify-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Nenhum relatório ainda</p>
            <Link 
              to="/app/reports/new" 
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              Criar primeiro relatório
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
};
