import { motion } from "framer-motion";
import { Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PendingEventsBadgeProps {
  count: number;
  className?: string;
}

export function PendingEventsBadge({ count, className }: PendingEventsBadgeProps) {
  if (count === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn("inline-flex", className)}
          >
            <Badge
              className={cn(
                "h-7 gap-1.5 text-xs font-semibold cursor-help",
                "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                "opacity-80 hover:opacity-100 transition-opacity"
              )}
            >
              <Clock className="w-3 h-3" />
              {count} pendente{count > 1 ? "s" : ""}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-zinc-100">Eventos Pendentes</p>
              <p className="text-xs text-zinc-400 mt-1">
                {count} evento{count > 1 ? "s foram registrados" : " foi registrado"} durante o pré-jogo.
                Será{count > 1 ? "ão" : ""} oficializado{count > 1 ? "s" : ""} automaticamente quando o jogo iniciar.
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
