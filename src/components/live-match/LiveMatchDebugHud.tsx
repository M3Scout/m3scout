import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
  if (!isAdmin) return null;

  const m = match as any;
  const status = String(m?.status ?? "");
  const isApplied = Boolean(m?.is_applied ?? m?.isApplied ?? status === "applied");
  const appliedAt = m?.applied_at ?? m?.appliedAt ?? null;

  return (
    <div className="fixed left-2 right-2 top-2 z-[9999] pointer-events-none">
      <div
        className={cn(
          "mx-auto max-w-[1100px] rounded-lg border bg-background/80 backdrop-blur px-3 py-2",
          "text-xs text-foreground shadow-sm"
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="secondary" className="h-5 px-2">DEBUG</Badge>
          <span>
            <span className="text-muted-foreground">match.status:</span> {status || "—"}
          </span>
          <span>
            <span className="text-muted-foreground">match.is_applied:</span> {String(isApplied)}
          </span>
          <span>
            <span className="text-muted-foreground">appliedAt:</span> {appliedAt ? String(appliedAt) : "—"}
          </span>
          <span>
            <span className="text-muted-foreground">isReviewMode:</span> {String(isReviewMode)}
          </span>
          <span>
            <span className="text-muted-foreground">canAddEvents:</span> {String(canAddEvents)}
          </span>
          <span>
            <span className="text-muted-foreground">uiReadOnlyReason:</span> {uiReadOnlyReason || "—"}
          </span>
          <span>
            <span className="text-muted-foreground">lastActionAttempt:</span> {lastActionAttempt || "—"}
          </span>
          <span>
            <span className="text-muted-foreground">lastRpcError:</span>{" "}
            {lastRpcError
              ? `${lastRpcError.status ? `${lastRpcError.status} ` : ""}${lastRpcError.message ?? ""}`.trim() || "(sem mensagem)"
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
