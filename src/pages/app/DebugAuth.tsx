/**
 * Debug Auth Page
 * 
 * Admin-only page showing auth/session diagnostic logs.
 * Useful for debugging mobile issues without DevTools.
 * 
 * Key checks:
 * - sbClientCount should always be 1
 * - Timeline: app_boot → getSession_ok → me_context_ok → boot_complete
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRecentDiagLogs, clearDiagLogs, getSbClientCount } from "@/lib/diagnosticLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, ArrowLeft, Shield, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function DebugAuth() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Array<{ t: string; e: string; c?: Record<string, unknown> }>>([]);
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
  
  // Get badge color based on event type
  const getEventColor = (event: string): "default" | "destructive" | "secondary" | "outline" => {
    if (event.includes("fail") || event.includes("timeout") || event.includes("403") || event.includes("signout")) {
      return "destructive";
    }
    if (event.includes("_ok") || event.includes("success") || event.includes("complete")) {
      return "default";
    }
    if (event.includes("start") || event.includes("boot")) {
      return "secondary";
    }
    return "outline";
  };
  
  // Check if timeline is healthy
  const hasAppBoot = logs.some(l => l.e === "app_boot");
  const hasGetSessionOk = logs.some(l => l.e === "getSession_ok");
  const hasMeContextOk = logs.some(l => l.e === "me_context_ok");
  const hasBootComplete = logs.some(l => l.e === "boot_complete");
  const isHealthy = hasAppBoot && hasGetSessionOk && hasMeContextOk && hasBootComplete && sbClientCount === 1;
  
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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-sm text-muted-foreground">Total de eventos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">
              {logs.filter(l => l.e.includes("fail") || l.e.includes("timeout") || l.e.includes("signout")).length}
            </div>
            <div className="text-sm text-muted-foreground">Erros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">
              {logs.filter(l => l.e.includes("_ok") || l.e.includes("success") || l.e.includes("complete")).length}
            </div>
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
                {[...logs].reverse().map((log, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="text-xs text-muted-foreground font-mono shrink-0 w-20">
                      {format(new Date(log.t), "HH:mm:ss")}
                    </div>
                    <Badge variant={getEventColor(log.e)} className="shrink-0">
                      {log.e}
                    </Badge>
                    {log.c && (
                      <div className="text-xs font-mono text-muted-foreground truncate flex-1">
                        {JSON.stringify(log.c)}
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
