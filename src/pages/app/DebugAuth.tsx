/**
 * Debug Auth Page
 * 
 * Admin-only page showing auth/session diagnostic logs.
 * Useful for debugging mobile issues without DevTools.
 * 
 * Key checks:
 * - sbClientCount should always be 1
 * - Timeline: app_boot → getSession_ok → me_context_ok → boot_complete
 * 
 * Smart watchdog classification:
 * - auth_watchdog_timeout is WARNING (not error) if boot_complete follows within 15s
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRecentDiagLogs, clearDiagLogs, getSbClientCount } from "@/lib/diagnosticLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, ArrowLeft, Shield, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

type LogEntry = { t: string; e: string; c?: Record<string, unknown> };

// Check if watchdog timeout was recovered (boot_complete within 15s)
function isWatchdogRecovered(logs: LogEntry[], watchdogLog: LogEntry): boolean {
  const watchdogTime = new Date(watchdogLog.t).getTime();
  const recoveryWindow = 15 * 1000; // 15 seconds
  
  return logs.some(log => {
    if (log.e !== "boot_complete") return false;
    const logTime = new Date(log.t).getTime();
    // boot_complete must be AFTER watchdog and within 15s
    return logTime > watchdogTime && logTime - watchdogTime <= recoveryWindow;
  });
}

// Get duration display from log context
function getDurationDisplay(context?: Record<string, unknown>): string | null {
  if (!context) return null;
  const durationMs = context.durationMs ?? context.duration ?? context.elapsedMs;
  if (typeof durationMs === "number") {
    return `${durationMs}ms`;
  }
  return null;
}

export default function DebugAuth() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sbClientCount, setSbClientCount] = useState(0);
  
  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/app");
    }
  }, [isAdmin, loading, navigate]);
  
  // Load logs
  useEffect(() => {
    setLogs(getRecentDiagLogs());
    setSbClientCount(getSbClientCount());
  }, [refreshKey]);
  
  const handleClear = () => {
    clearDiagLogs();
    setLogs([]);
  };
  
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };
  
  // Compute recovered watchdog timeouts
  const recoveredWatchdogs = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(log => {
      if (log.e === "auth_watchdog_timeout" && isWatchdogRecovered(logs, log)) {
        set.add(log.t); // Use timestamp as unique key
      }
    });
    return set;
  }, [logs]);
  
  // Get badge color based on event type (with smart watchdog classification)
  const getEventBadge = (log: LogEntry): { variant: "default" | "destructive" | "secondary" | "outline"; isWarning?: boolean } => {
    const event = log.e;
    
    // Special handling for watchdog timeout
    if (event === "auth_watchdog_timeout") {
      const isRecovered = recoveredWatchdogs.has(log.t);
      if (isRecovered) {
        return { variant: "secondary", isWarning: true }; // Warning, not error
      }
      return { variant: "destructive" }; // Real error
    }
    
    if (event.includes("fail") || event.includes("timeout") || event.includes("403") || event.includes("signout")) {
      return { variant: "destructive" };
    }
    if (event.includes("_ok") || event.includes("success") || event.includes("complete")) {
      return { variant: "default" };
    }
    if (event.includes("start") || event.includes("boot")) {
      return { variant: "secondary" };
    }
    return { variant: "outline" };
  };
  
  // Check if timeline is healthy
  const hasAppBoot = logs.some(l => l.e === "app_boot");
  const hasGetSessionOk = logs.some(l => l.e === "getSession_ok");
  const hasMeContextOk = logs.some(l => l.e === "me_context_ok");
  const hasBootComplete = logs.some(l => l.e === "boot_complete");
  const isHealthy = hasAppBoot && hasGetSessionOk && hasMeContextOk && hasBootComplete && sbClientCount === 1;
  
  // Count errors (excluding recovered watchdog timeouts)
  const errorCount = useMemo(() => {
    return logs.filter(l => {
      // Recovered watchdog timeouts don't count as errors
      if (l.e === "auth_watchdog_timeout" && recoveredWatchdogs.has(l.t)) {
        return false;
      }
      return l.e.includes("fail") || l.e.includes("timeout") || l.e.includes("signout");
    }).length;
  }, [logs, recoveredWatchdogs]);
  
  // Count warnings (recovered watchdog timeouts)
  const warningCount = recoveredWatchdogs.size;
  
  // Count successes
  const successCount = logs.filter(l => 
    l.e.includes("_ok") || l.e.includes("success") || l.e.includes("complete")
  ).length;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">Debug Auth</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>
      
      {/* Health Check */}
      <Card className={isHealthy ? "border-emerald-500/50 bg-emerald-950/20" : "border-destructive/50 bg-destructive/10"}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            {isHealthy ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            )}
            <div>
              <div className="font-semibold">{isHealthy ? "Sistema Saudável" : "Problemas Detectados"}</div>
              <div className="text-sm text-muted-foreground">
                sbClientCount: <span className={sbClientCount === 1 ? "text-emerald-500" : "text-destructive"}>{sbClientCount}</span>
                {sbClientCount !== 1 && " (deve ser 1!)"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Timeline Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline Esperada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "app_boot", has: hasAppBoot },
              { key: "getSession_ok", has: hasGetSessionOk },
              { key: "me_context_ok", has: hasMeContextOk },
              { key: "boot_complete", has: hasBootComplete },
            ].map(({ key, has }) => (
              <Badge 
                key={key} 
                variant={has ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {has ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {key}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-sm text-muted-foreground">Total de eventos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <div className="text-sm text-muted-foreground">Erros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-500">{warningCount}</div>
            <div className="text-sm text-muted-foreground">Avisos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{successCount}</div>
            <div className="text-sm text-muted-foreground">Sucessos</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Log Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento registrado
              </div>
            ) : (
              <div className="space-y-2">
                {[...logs].reverse().map((log, idx) => {
                  const badge = getEventBadge(log);
                  const duration = getDurationDisplay(log.c);
                  const isRecoveredWatchdog = log.e === "auth_watchdog_timeout" && recoveredWatchdogs.has(log.t);
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        isRecoveredWatchdog 
                          ? "bg-amber-950/20 hover:bg-amber-950/30 border border-amber-500/30" 
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground font-mono shrink-0 w-20">
                        {format(new Date(log.t), "HH:mm:ss")}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={badge.variant} className="shrink-0">
                          {log.e}
                        </Badge>
                        {duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {duration}
                          </span>
                        )}
                        {isRecoveredWatchdog && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">
                            Recuperação lenta, mas concluída
                          </Badge>
                        )}
                      </div>
                      {log.c && !isRecoveredWatchdog && (
                        <div className="text-xs font-mono text-muted-foreground truncate flex-1">
                          {JSON.stringify(log.c)}
                        </div>
                      )}
                      {isRecoveredWatchdog && log.c && (
                        <div className="text-xs font-mono text-amber-500/70 truncate flex-1">
                          {JSON.stringify(log.c)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Raw JSON Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `debug-auth-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Baixar logs como JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
