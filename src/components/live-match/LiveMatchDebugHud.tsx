import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { X, Bug } from "lucide-react";

export type LiveMatchRpcError = {
  status?: number;
  message?: string;
} | null;

interface LiveMatchDebugHudProps {
  match: unknown;
  isReviewMode: boolean;
  canAddEvents: boolean;
  uiReadOnlyReason: string;
  lastActionAttempt: string | null;
  lastRpcError: LiveMatchRpcError;
}

export function LiveMatchDebugHud({
  match,
  isReviewMode,
  canAddEvents,
  uiReadOnlyReason,
  lastActionAttempt,
  lastRpcError,
}: LiveMatchDebugHudProps) {
  const { isAdmin } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check visibility conditions
  useEffect(() => {
    // Check URL param
    const urlParams = new URLSearchParams(window.location.search);
    const hasDebugParam = urlParams.get("debug") === "1";
    
    // Check if development environment
    const isDev = import.meta.env.DEV;
    
    // Show if: (dev OR debug param) AND is admin AND not dismissed
    setIsVisible((isDev || hasDebugParam) && isAdmin && !isDismissed);
  }, [isAdmin, isDismissed]);

  if (!isVisible) return null;

  const m = match as any;
  const status = String(m?.status ?? "");
  const isApplied = Boolean(m?.is_applied ?? m?.isApplied ?? status === "applied");
  const clockStatus = m?.clock_status ?? "—";

  return (
    <div className="fixed bottom-4 left-4 z-50 pointer-events-auto">
      <div
        className={cn(
          "rounded-lg border bg-zinc-900/90 backdrop-blur-sm px-3 py-2",
          "text-[10px] text-zinc-400 shadow-lg",
          "max-w-[320px] opacity-70 hover:opacity-100 transition-opacity"
        )}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Bug className="w-3 h-3 text-amber-500" />
            <span className="font-medium text-zinc-300">Debug</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
            onClick={() => setIsDismissed(true)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Debug info - compact grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-zinc-500">status:</span>
          <span className={cn(
            status === "live" && "text-green-400",
            status === "finished" && "text-blue-400",
            status === "applied" && "text-purple-400",
          )}>{status || "—"}</span>
          
          <span className="text-zinc-500">clock:</span>
          <span>{clockStatus}</span>
          
          <span className="text-zinc-500">applied:</span>
          <span>{String(isApplied)}</span>
          
          <span className="text-zinc-500">reviewMode:</span>
          <span className={isReviewMode ? "text-amber-400" : ""}>{String(isReviewMode)}</span>
          
          <span className="text-zinc-500">canAddEvents:</span>
          <span className={canAddEvents ? "text-green-400" : "text-red-400"}>{String(canAddEvents)}</span>
          
          {uiReadOnlyReason && (
            <>
              <span className="text-zinc-500">readOnly:</span>
              <span className="text-orange-400">{uiReadOnlyReason}</span>
            </>
          )}
          
          {lastActionAttempt && (
            <>
              <span className="text-zinc-500">lastAction:</span>
              <span>{lastActionAttempt}</span>
            </>
          )}
          
          {lastRpcError && (
            <>
              <span className="text-zinc-500">rpcError:</span>
              <span className="text-red-400 truncate">
                {lastRpcError.status ? `${lastRpcError.status} ` : ""}{lastRpcError.message ?? ""}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
