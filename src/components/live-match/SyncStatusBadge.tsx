/**
 * SyncStatusBadge
 * 
 * Visual indicator for event sync status in Live Match.
 * Shows: 🟡 Pendente | 🟢 Sincronizado | 🔴 Falhou
 */

import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Loader2, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SyncStatus = "synced" | "pending" | "syncing" | "failed" | "offline";

interface SyncStatusBadgeProps {
  /** Current sync status */
  status: SyncStatus;
  /** Number of pending events */
  pendingCount?: number;
  /** Number of failed events */
  failedCount?: number;
  /** Callback to retry failed events */
  onRetry?: () => void;
  /** Show compact version */
  compact?: boolean;
  /** Whether Background Sync is supported */
  bgSyncSupported?: boolean;
  /** Custom sync method label */
  syncMethodLabel?: string;
}

const STATUS_CONFIG: Record<SyncStatus, {
  icon: React.ReactNode;
  label: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}> = {
  synced: {
    icon: <Check className="w-3 h-3" />,
    label: "Sincronizado",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  pending: {
    icon: <Cloud className="w-3 h-3" />,
    label: "Pendente",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    dotClass: "bg-amber-500",
  },
  syncing: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    label: "Sincronizando",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-400",
    dotClass: "bg-blue-500",
  },
  failed: {
    icon: <AlertTriangle className="w-3 h-3" />,
    label: "Falhou",
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
    dotClass: "bg-red-500",
  },
  offline: {
    icon: <CloudOff className="w-3 h-3" />,
    label: "Offline",
    bgClass: "bg-zinc-500/15",
    textClass: "text-zinc-400",
    dotClass: "bg-zinc-500",
  },
};

export function SyncStatusBadge({
  status,
  pendingCount = 0,
  failedCount = 0,
  onRetry,
  compact = false,
  bgSyncSupported = false,
  syncMethodLabel,
}: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  // Determine effective status based on counts
  const effectiveStatus = failedCount > 0 ? "failed" : pendingCount > 0 ? "pending" : status;
  const effectiveConfig = STATUS_CONFIG[effectiveStatus];
  
  const badge = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1",
        "border transition-colors duration-200",
        effectiveConfig.bgClass,
        effectiveConfig.textClass,
        effectiveStatus === "failed" && "border-red-500/30",
        effectiveStatus === "pending" && "border-amber-500/30",
        effectiveStatus === "synced" && "border-emerald-500/30",
        effectiveStatus === "syncing" && "border-blue-500/30",
        effectiveStatus === "offline" && "border-zinc-500/30"
      )}
    >
      {/* Animated dot */}
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        effectiveConfig.dotClass,
        (effectiveStatus === "pending" || effectiveStatus === "syncing") && "animate-pulse"
      )} />
      
      {/* Icon */}
      {effectiveConfig.icon}
      
      {/* Label (hidden in compact mode) */}
      {!compact && (
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {effectiveConfig.label}
        </span>
      )}
      
      {/* Count badge */}
      {(pendingCount > 0 || failedCount > 0) && (
        <span className={cn(
          "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
          "bg-black/20"
        )}>
          {failedCount > 0 ? failedCount : pendingCount}
        </span>
      )}
    </motion.div>
  );
  
  // If failed and has retry callback, wrap with button
  if (effectiveStatus === "failed" && onRetry) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent"
              onClick={onRetry}
            >
              <div className="flex items-center gap-1.5">
                {badge}
                <RefreshCw className="w-3 h-3 text-red-400" />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {failedCount} evento(s) falharam. Toque para tentar novamente.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Generate tooltip message
  const getTooltipMessage = () => {
    if (effectiveStatus === "synced") return "Todos os eventos sincronizados";
    if (effectiveStatus === "pending") {
      const baseMsg = `${pendingCount} evento(s) aguardando sincronização`;
      if (bgSyncSupported) {
        return `${baseMsg} — sincronizará automaticamente em background`;
      }
      return baseMsg;
    }
    if (effectiveStatus === "syncing") return "Sincronizando eventos...";
    if (effectiveStatus === "failed") return `${failedCount} evento(s) falharam`;
    if (effectiveStatus === "offline") {
      const baseMsg = "Sem conexão";
      if (bgSyncSupported) {
        return `${baseMsg} — eventos serão sincronizados automaticamente quando online`;
      }
      return `${baseMsg} — eventos serão sincronizados quando online`;
    }
    return "";
  };
  
  // Tooltip for status explanation
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px]">
          <p className="text-xs">{getTooltipMessage()}</p>
          {syncMethodLabel && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Método: {syncMethodLabel}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact inline sync indicator
 */
export function SyncStatusDot({ status }: { status: SyncStatus }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        config.dotClass,
        (status === "pending" || status === "syncing") && "animate-pulse"
      )}
    />
  );
}
