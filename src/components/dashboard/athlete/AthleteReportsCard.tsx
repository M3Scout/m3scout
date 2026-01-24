import { Link } from "react-router-dom";
import { FileText, ChevronRight, Calendar, Star } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, cardHover, cardTap } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScoutingReport {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  competition_name: string | null;
}

interface AthleteReportsCardProps {
  reports: ScoutingReport[];
  athleteId: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 8.0) return "bg-gradient-to-r from-emerald-500/20 to-green-600/10 text-emerald-400 border-emerald-500/30";
  if (score >= 6.5) return "bg-gradient-to-r from-blue-500/20 to-indigo-600/10 text-blue-400 border-blue-500/30";
  if (score >= 5.0) return "bg-gradient-to-r from-amber-500/20 to-yellow-600/10 text-amber-400 border-amber-500/30";
  return "bg-gradient-to-r from-red-500/20 to-rose-600/10 text-red-400 border-red-500/30";
};

const getScoreBadge = (score: number): { label: string; variant: "success" | "default" | "secondary" | "destructive" } => {
  if (score >= 8.0) return { label: "Excelente", variant: "success" };
  if (score >= 6.5) return { label: "Bom", variant: "default" };
  if (score >= 5.0) return { label: "Regular", variant: "secondary" };
  return { label: "Abaixo", variant: "destructive" };
};

export function AthleteReportsCard({ reports, athleteId }: AthleteReportsCardProps) {
  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.45 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-amber-500/20 to-yellow-600/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Meus Relatórios</h2>
            <p className="text-[10px] text-muted-foreground">Avaliações do scout</p>
          </div>
        </div>
        
        <Link 
          to={`/app/players/${athleteId}?tab=overview`} 
          className="text-xs text-muted-foreground hover:text-zinc-300 transition-colors flex items-center gap-0.5"
        >
          Ver todos
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      <div className="p-3">
        {reports.length > 0 ? (
          <div className="space-y-2">
            {reports.slice(0, 5).map((report) => {
              const scoreBadge = getScoreBadge(report.final_score);
              return (
                <motion.div
                  key={report.id}
                  whileHover={cardHover}
                  whileTap={cardTap}
                >
                  <Link
                    to={`/app/reports/${report.id}`}
                    className="group flex items-center gap-3 p-3 rounded-[var(--radius-button)] bg-zinc-900/30 hover:bg-zinc-800/30 transition-all duration-200"
                  >
                    {/* Score Circle */}
                    <div className={`w-11 h-11 rounded-full ${getScoreColor(report.final_score)} flex items-center justify-center shrink-0 border`}>
                      <span className="text-sm font-bold">{report.final_score.toFixed(1)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {report.competition_name || "Partida"}
                        </p>
                        <Badge variant={scoreBadge.variant} className="text-[9px] px-1.5 py-0">
                          {scoreBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(report.match_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium text-foreground">{report.rating}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Nenhum relatório ainda</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Relatórios aparecerão após avaliações do scout
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
