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
  Star,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";

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

export function ReportCard({
  report,
  scoutName,
  scoutAvatar,
  canDelete,
  onDelete,
  insight,
  index = 0,
}: ReportCardProps) {
  const position = report.players?.position || null;
  const posColor = getPositionColor(position);
  const shortPos = getShortPosition(position);
  
  // Score color based on value
  const getScoreStyle = (score: number) => {
    if (score >= 80) return { text: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (score >= 60) return { text: "text-blue-400", bg: "bg-blue-500/20" };
    if (score >= 40) return { text: "text-amber-400", bg: "bg-amber-500/20" };
    return { text: "text-red-400", bg: "bg-red-500/20" };
  };
  
  const scoreStyle = getScoreStyle(report.final_score);
  
  // Insight badge config
  const insightConfig = {
    best: { icon: TrendingUp, label: "Melhor nota", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    first: { icon: Sparkles, label: "Primeiro relatório", className: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
    decline: { icon: TrendingDown, label: "Queda de desempenho", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    strong_competition: { icon: Trophy, label: "Competição forte", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  };
  
  const InsightBadge = insight && insightConfig[insight] ? (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
      insightConfig[insight].className
    )}>
      {(() => {
        const Icon = insightConfig[insight].icon;
        return <Icon className="w-3 h-3" />;
      })()}
      {insightConfig[insight].label}
    </div>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <Link to={`/app/reports/${report.id}`}>
        <div className={cn(
          "relative flex items-stretch gap-0 rounded-xl overflow-hidden",
          "bg-zinc-900/60 border border-zinc-800/60",
          "hover:border-zinc-700/60 hover:bg-zinc-900/80",
          "transition-all duration-300",
          "hover:shadow-lg",
          posColor.glowClass
        )}>
          {/* Position accent bar */}
          <div className={cn("w-1 shrink-0", posColor.accentClass)} />
          
          {/* Score Section */}
          <div className={cn(
            "flex flex-col items-center justify-center py-4 px-5 shrink-0",
            "bg-gradient-to-br from-zinc-800/50 to-zinc-900/50",
            posColor.bgClass
          )}>
            <div className={cn(
              "text-3xl sm:text-4xl font-black tabular-nums tracking-tight",
              scoreStyle.text
            )}>
              {Number.isFinite(report.final_score) ? report.final_score.toFixed(1) : "—"}
            </div>
            
            {/* Global rating (0-5) */}
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs text-zinc-400 font-medium">
                {Number.isFinite(report.rating) ? report.rating.toFixed(1) : "—"}
              </span>
            </div>
            
            {/* Position badge */}
            <div className={cn(
              "mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
              posColor.bgClass,
              posColor.textClass,
              "border",
              posColor.borderClass
            )}>
              {shortPos}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 py-4 px-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Player name */}
                <h3 className="text-base sm:text-lg font-bold text-zinc-100 truncate group-hover:text-white transition-colors">
                  {report.players?.full_name || "Atleta desconhecido"}
                </h3>
                
                {/* Position + Age */}
                <p className="text-sm text-zinc-500 truncate">
                  {position || "Posição não definida"}
                  {report.players?.age && (
                    <span className="text-zinc-600"> • {report.players.age} anos</span>
                  )}
                </p>
                
                {/* Competition badge */}
                {report.competitions?.name && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40">
                    <Trophy className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs text-zinc-400 font-medium truncate max-w-[180px]">
                      {report.competitions.name}
                    </span>
                  </div>
                )}
                
                {/* Date + Insight */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-600 tabular-nums">
                    {format(new Date(report.match_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  {InsightBadge}
                </div>
              </div>
              
              {/* Scout info + Actions */}
              <div className="flex flex-col items-end gap-2">
                {/* Scout */}
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7 border border-zinc-700">
                    <AvatarImage src={scoutAvatar} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                      {scoutName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-500 hidden sm:inline max-w-[80px] truncate">
                    {scoutName}
                  </span>
                </div>
                
                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Skeleton for loading state
export function ReportCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden"
    >
      <div className="flex items-stretch">
        <div className="w-1 bg-zinc-700 animate-pulse" />
        <div className="py-4 px-5 flex flex-col items-center gap-2">
          <div className="w-16 h-10 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-8 h-5 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 py-4 px-4 space-y-3">
          <div className="w-48 h-5 bg-zinc-800 rounded animate-pulse" />
          <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-40 h-6 bg-zinc-800 rounded animate-pulse" />
          <div className="w-24 h-4 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
