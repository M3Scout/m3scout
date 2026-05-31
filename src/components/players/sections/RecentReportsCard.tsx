import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Calendar } from "lucide-react";
import { cn, safeArray } from "@/lib/utils";

interface ScoutingReport {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  competition: { name: string } | null;
}

interface RecentReportsCardProps {
  reports: ScoutingReport[];
  playerId: string;
}

function getScoreColor(score: number): string {
  if (score >= 8.0) return "bg-emerald-500/[0.12] text-emerald-400/90 border-emerald-500/25";
  if (score >= 6.5) return "bg-blue-500/[0.12] text-blue-400/90 border-blue-500/25";
  if (score >= 5.0) return "bg-amber-500/[0.12] text-amber-400/90 border-amber-500/25";
  return "bg-rose-500/[0.12] text-rose-400/90 border-rose-500/25";
}

export function RecentReportsCard({ reports, playerId }: RecentReportsCardProps) {
  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-400/80" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Relatórios Recentes
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length > 0 ? (
          <div className="space-y-2">
            {safeArray(reports).map((report) => (
              <Link
                key={report.id}
                to={`/dashboard/relatorios/${report.id}`}
                className={cn(
                  "group block p-3 rounded-xl",
                  "bg-zinc-900/40 border border-zinc-800/30",
                  "transition-all duration-200",
                  "hover:bg-zinc-900/60 hover:border-zinc-700/40 hover:translate-x-0.5"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-300 truncate group-hover:text-white transition-colors">
                      {report.competition?.name || "Competição"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3 text-zinc-600" />
                      <span className="text-[10px] text-zinc-600">
                        {new Date(report.match_date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  
                  {/* Score Badge - Visual seal */}
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-sm font-bold tabular-nums border backdrop-blur-sm min-w-[52px] justify-center",
                      getScoreColor(Number.isFinite(report.final_score) ? report.final_score : 0)
                    )}
                  >
                    {Number.isFinite(report.final_score) ? report.final_score.toFixed(1) : "—"}
                  </Badge>
                </div>
              </Link>
            ))}
            
            {/* CTA - Premium and discrete */}
            <Button 
              variant="ghost" 
              className="w-full mt-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40" 
              asChild
            >
              <Link to={`/dashboard/relatorios?player=${playerId}`} className="flex items-center justify-center gap-2">
                Ver todos os relatórios
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-900/60 flex items-center justify-center">
              <FileText className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600 mb-3">
              Nenhum relatório encontrado
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="border-zinc-700/50 text-zinc-400 hover:text-zinc-300"
            >
              <Link to={`/dashboard/relatorios/novo?player=${playerId}`}>
                <FileText className="w-4 h-4 mr-2" />
                Criar Relatório
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
