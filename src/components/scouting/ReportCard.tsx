import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  report: {
    id: string;
    match_date: string;
    final_score: number;
    rating: number;
    created_at: string;
    scout_id: string;
    opponent?: string | null;
    players: {
      full_name: string;
      position: string;
      age?: number | null;
      photo_url?: string | null;
    } | null;
    competitions: {
      name: string;
      country?: string;
    } | null;
  };
  scoutName: string;
  scoutAvatar?: string;
  canDelete: boolean;
  onDelete: () => void;
  insight?: "best" | "first" | "decline" | "strong_competition" | null;
  index?: number;
}

// Tone-on-tone: dark bg + bright text of same hue
const getScoreTheme = (score: number) => {
  if (score >= 80) return { bg: "bg-emerald-950/60", text: "text-emerald-400" };
  if (score >= 60) return { bg: "bg-blue-950/60", text: "text-blue-400" };
  if (score >= 40) return { bg: "bg-amber-950/60", text: "text-amber-400" };
  return { bg: "bg-red-950/60", text: "text-red-400" };
};

export function ReportCard({
  report,
  canDelete,
  onDelete,
  insight,
  index = 0,
}: ReportCardProps) {
  const scoreTheme = getScoreTheme(report.final_score);

  const insightConfig = {
    best: { icon: TrendingUp, label: "Melhor nota", className: "bg-emerald-500/15 text-emerald-400" },
    first: { icon: Sparkles, label: "Primeiro relatório", className: "bg-violet-500/15 text-violet-400" },
    decline: { icon: TrendingDown, label: "Queda", className: "bg-red-500/15 text-red-400" },
    strong_competition: { icon: Trophy, label: "Competição forte", className: "bg-amber-500/15 text-amber-400" },
  };

  const InsightBadge = insight && insightConfig[insight] ? (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
      insightConfig[insight].className
    )}>
      {(() => { const Icon = insightConfig[insight].icon; return <Icon className="w-3 h-3" />; })()}
      {insightConfig[insight].label}
    </span>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group"
    >
      <Link to={`/app/reports/${report.id}`}>
        <div className={cn(
          "relative flex items-stretch rounded-xl overflow-hidden",
          "bg-zinc-900/50 border border-zinc-800/40",
          "hover:border-zinc-700/50 hover:bg-zinc-900/70",
          "transition-all duration-200",
        )}>
          {/* Score Block — tone-on-tone */}
          <div className={cn(
            "flex items-center justify-center shrink-0 w-[88px] sm:w-[100px]",
            scoreTheme.bg,
          )}>
            <span className={cn(
              "text-3xl sm:text-4xl font-black tabular-nums tracking-tight",
              scoreTheme.text,
            )}>
              {Number.isFinite(report.final_score) ? report.final_score.toFixed(1) : "—"}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 py-3.5 px-4 min-w-0 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Player name */}
              <h3 className="text-[15px] font-bold text-zinc-100 truncate group-hover:text-white transition-colors leading-tight">
                {report.players?.full_name || "Atleta desconhecido"}
              </h3>

              {/* Position + Age */}
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {report.players?.position || "Posição não definida"}
                {report.players?.age && (
                  <span className="text-zinc-600"> • {report.players.age} anos</span>
                )}
              </p>

              {/* Date + Competition + Insight */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[11px] text-zinc-600 tabular-nums">
                  {format(new Date(report.match_date), "dd MMM yyyy", { locale: ptBR })}
                </span>
                {report.competitions?.name && (
                  <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[180px]">
                    {report.competitions.name}
                  </span>
                )}
                {InsightBadge}
              </div>
            </div>

            {/* Actions — only three dots */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem asChild>
                  <Link to={`/app/reports/${report.id}`} className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Ver relatório
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/app/reports/${report.id}/edit`} className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Duplicar
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Skeleton
export function ReportCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl bg-zinc-900/50 border border-zinc-800/40 overflow-hidden"
    >
      <div className="flex items-stretch">
        <div className="w-[88px] sm:w-[100px] bg-zinc-800/40 animate-pulse" />
        <div className="flex-1 py-3.5 px-4 space-y-2.5">
          <div className="w-44 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-28 h-3 bg-zinc-800/60 rounded animate-pulse" />
          <div className="w-36 h-3 bg-zinc-800/40 rounded animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
