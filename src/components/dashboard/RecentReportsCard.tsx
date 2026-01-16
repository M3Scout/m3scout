import { Link } from "react-router-dom";
import { FileText, ChevronRight, Calendar, Star } from "lucide-react";
import { motion } from "framer-motion";
import { safeArray } from "@/lib/utils";

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full h-full flex flex-col rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden"
    >
      {/* Header - Fixed at top */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Relatórios Recentes</h2>
            <p className="text-[10px] text-zinc-500">Últimas avaliações de scouting</p>
          </div>
        </div>
        
        <Link 
          to="/app/reports" 
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
        >
          Ver todos
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content - Scrollable list area */}
      <div className="p-3 flex-1 flex flex-col min-h-0 overflow-auto">
        {reports.length > 0 ? (
          <div className="space-y-2">
            {safeArray(reports).map((report, index) => (
              <Link 
                key={report.id}
                to={`/app/reports/${report.id}`}
                className="group flex items-center gap-4 p-3 rounded-lg bg-zinc-900/30 border border-transparent hover:border-zinc-800 hover:bg-zinc-800/30 transition-all duration-200"
              >
                {/* Score */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getScoreColor(report.final_score)} flex items-center justify-center shadow-lg shrink-0`}>
                  <span className="text-white font-bold text-sm">
                    {report.final_score.toFixed(1)}
                  </span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
                    {report.player_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getCompetitionColor(report.competition_name)}`}>
                      {report.competition_name}
                    </span>
                  </div>
                </div>
                
                {/* Date */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.match_date).toLocaleDateString("pt-BR", { 
                      day: "2-digit", 
                      month: "short" 
                    })}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center flex-1 flex flex-col items-center justify-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Nenhum relatório ainda</p>
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
