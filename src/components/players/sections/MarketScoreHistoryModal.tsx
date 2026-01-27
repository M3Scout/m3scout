/**
 * Market Score History Modal
 * 
 * Displays the audit log of score changes (market_score_events)
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { MarketScoreEvent } from "@/types/marketScore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MarketScoreHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: MarketScoreEvent[];
  loading?: boolean;
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <Badge variant="secondary" className="text-emerald-400 bg-emerald-500/20 border-emerald-500/30">
        <TrendingUp className="w-3 h-3 mr-1" />
        +{delta.toFixed(1)}
      </Badge>
    );
  }
  if (delta < 0) {
    return (
      <Badge variant="secondary" className="text-red-400 bg-red-500/20 border-red-500/30">
        <TrendingDown className="w-3 h-3 mr-1" />
        {delta.toFixed(1)}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      <Minus className="w-3 h-3 mr-1" />
      0
    </Badge>
  );
}

export function MarketScoreHistoryModal({
  open,
  onOpenChange,
  events,
  loading = false,
}: MarketScoreHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico do Score
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 p-3 rounded-lg bg-secondary/30">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhum histórico registrado ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-secondary/30 border border-zinc-800/50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "dd MMM yyyy, HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <DeltaIndicator delta={event.delta} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {event.previous_score_total !== null && (
                      <>
                        <span>{event.previous_score_total.toFixed(0)}</span>
                        <span>→</span>
                      </>
                    )}
                    <span className="font-medium text-foreground">
                      {event.new_score_total.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
