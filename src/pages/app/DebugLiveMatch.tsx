/**
 * Debug Live Match Page
 * 
 * Admin-only page showing Live Match event queue and telemetry.
 * Useful for debugging mobile issues without DevTools.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { getLogEntries, clearLogEntries, getLogStats, type TelemetryEntry } from "@/lib/liveMatchTelemetry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, ArrowLeft, Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function DebugLiveMatch() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<TelemetryEntry[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getLogStats> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, loading, navigate]);
  
  // Load logs
  useEffect(() => {
    setLogs(getLogEntries());
    setStats(getLogStats());
  }, [refreshKey]);
  
  const handleClear = () => {
    clearLogEntries();
    setLogs([]);
    setStats(null);
  };
  
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };
  
  // Get badge color based on event type
  const getEventColor = (event: string): "default" | "destructive" | "secondary" | "outline" => {
    if (event.includes("fail") || event.includes("error")) {
      return "destructive";
    }
    if (event.includes("success")) {
      return "default";
    }
    if (event.includes("start") || event.includes("enqueue")) {
      return "secondary";
    }
    return "outline";
  };
  
  // Get icon based on event type
  const getEventIcon = (event: string) => {
    if (event.includes("fail") || event.includes("error")) {
      return <AlertTriangle className="w-3 h-3" />;
    }
    if (event.includes("success")) {
      return <CheckCircle2 className="w-3 h-3" />;
    }
    if (event.includes("retry") || event.includes("sending")) {
      return <Clock className="w-3 h-3" />;
    }
    return <Zap className="w-3 h-3" />;
  };
  
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
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">Debug Live Match</h1>
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
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats?.errors ?? 0}</div>
            <div className="text-sm text-muted-foreground">Erros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-500">
              {stats?.byEvent?.send_success ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Enviados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">
              {stats?.byEvent?.retry_scheduled ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Retries</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Event Breakdown */}
      {stats?.byEvent && Object.keys(stats.byEvent).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Tipo de Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEvent).map(([event, count]) => (
                <Badge 
                  key={event} 
                  variant={getEventColor(event)}
                  className="gap-1"
                >
                  {event}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Log Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento registrado
              </div>
            ) : (
              <div className="space-y-2">
                {[...logs].reverse().map((log, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="text-xs text-muted-foreground font-mono shrink-0 w-20">
                      {format(new Date(log.t), "HH:mm:ss")}
                    </div>
                    <Badge variant={getEventColor(log.e)} className="shrink-0 gap-1">
                      {getEventIcon(log.e)}
                      {log.e}
                    </Badge>
                    {log.c && (
                      <div className="text-xs font-mono text-muted-foreground truncate flex-1">
                        {log.c.matchId && <span className="text-primary">match:{String(log.c.matchId).slice(0, 8)}</span>}
                        {log.c.eventType && <span className="ml-2">{String(log.c.eventType)}</span>}
                        {log.c.errorCode && <span className="ml-2 text-destructive">code:{String(log.c.errorCode)}</span>}
                        {log.c.errorMessage && <span className="ml-2 text-destructive">{String(log.c.errorMessage).slice(0, 50)}</span>}
                      </div>
                    )}
                  </div>
                ))}
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
              a.download = `debug-live-match-${Date.now()}.json`;
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
