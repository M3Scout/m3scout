/**
 * Debug Performance Page
 * 
 * Displays Web Vitals, bundle info, and mobile performance metrics.
 * Admin-only access for diagnosing performance issues.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Smartphone, 
  Gauge, 
  Timer, 
  Layers, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Zap
} from "lucide-react";
import { 
  initWebVitals, 
  subscribeToWebVitals, 
  getMetricRating,
  type WebVitalsData 
} from "@/lib/webVitals";
import { getPrefetchedRoutes } from "@/lib/routePrefetch";
import { cn } from "@/lib/utils";

export default function DebugPerformance() {
  const { isAdmin } = useAuth();
  const [vitals, setVitals] = useState<WebVitalsData | null>(null);
  const [prefetchedRoutes, setPrefetchedRoutes] = useState<string[]>([]);
  const [memoryInfo, setMemoryInfo] = useState<{ used: number; total: number } | null>(null);
  
  // Initialize Web Vitals on mount
  useEffect(() => {
    initWebVitals();
    
    const unsubscribe = subscribeToWebVitals(setVitals);
    
    // Update prefetched routes periodically
    const updatePrefetched = () => setPrefetchedRoutes(getPrefetchedRoutes());
    updatePrefetched();
    const interval = setInterval(updatePrefetched, 2000);
    
    // Memory info (Chrome only)
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      setMemoryInfo({
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        total: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
      });
    }
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
  
  // Non-admin guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }
  
  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "good":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "needs-improvement":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "poor":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Gauge className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "good":
        return "bg-primary/10 text-primary border-primary/30";
      case "needs-improvement":
        return "bg-warning/10 text-warning border-warning/30";
      case "poor":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  
  const formatMetricValue = (metric: string, value: number | null): string => {
    if (value === null) return "—";
    if (metric === "cls") return value.toFixed(3);
    return `${value}ms`;
  };
  
  const getMetricDescription = (metric: string): string => {
    const descriptions: Record<string, string> = {
      lcp: "Largest Contentful Paint - tempo até o maior elemento visível",
      inp: "Interaction to Next Paint - responsividade a interações",
      cls: "Cumulative Layout Shift - estabilidade visual",
      ttfb: "Time to First Byte - tempo de resposta do servidor",
      fcp: "First Contentful Paint - primeiro conteúdo renderizado",
    };
    return descriptions[metric] || "";
  };
  
  const getMetricTarget = (metric: string): string => {
    const targets: Record<string, string> = {
      lcp: "< 2.5s",
      inp: "< 200ms",
      cls: "< 0.1",
      ttfb: "< 800ms",
      fcp: "< 1.8s",
    };
    return targets[metric] || "";
  };
  
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Debug: Performance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Web Vitals, code-splitting e métricas mobile
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recarregar
        </Button>
      </div>
      
      {/* Web Vitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {["lcp", "inp", "cls", "ttfb", "fcp"].map((metric) => {
          const value = vitals?.[metric as keyof WebVitalsData] as number | null;
          const rating = getMetricRating(metric as keyof WebVitalsData, value);
          
          return (
            <Card key={metric} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    {metric}
                  </CardTitle>
                  {getRatingIcon(rating)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  {vitals ? (
                    <>
                      <span className="text-3xl font-bold">
                        {formatMetricValue(metric, value)}
                      </span>
                      <Badge variant="outline" className={cn("text-xs", getRatingColor(rating))}>
                        {rating === "good" ? "Bom" : rating === "needs-improvement" ? "Melhorar" : rating === "poor" ? "Ruim" : "—"}
                      </Badge>
                    </>
                  ) : (
                    <Skeleton className="h-9 w-24" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {getMetricDescription(metric)}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Meta: <span className="text-foreground">{getMetricTarget(metric)}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Memory Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Memória JS
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {memoryInfo ? (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold">{memoryInfo.used}MB</span>
                  <span className="text-sm text-muted-foreground">/ {memoryInfo.total}MB</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (memoryInfo.used / memoryInfo.total) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Não disponível neste navegador</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Code Splitting Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Code Splitting & Prefetch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Rotas Pré-carregadas</h4>
            {prefetchedRoutes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prefetchedRoutes.map((route) => (
                  <Badge key={route} variant="secondary" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {route}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma rota pré-carregada ainda. O prefetch acontece após o boot.
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                Estratégia de Prefetch
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Boot completo → Prefetch Live Match</li>
                <li>2. 2s depois → Prefetch rotas secundárias</li>
                <li>3. Atletas → Prefetch dashboard/compare</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Otimizações Mobile
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Lazy loading por rota</li>
                <li>✓ Live Match queue com retry</li>
                <li>✓ UI otimista para eventos</li>
                <li>✓ Cache de 3min para RBAC</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Live Match Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Live Match Mobile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-medium mb-1">Queue Retry</h4>
              <p className="text-2xl font-bold">1s → 2s → 4s</p>
              <p className="text-xs text-muted-foreground">Backoff exponencial</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-medium mb-1">Max Retries</h4>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">Antes de marcar como falho</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-medium mb-1">Persistência</h4>
              <p className="text-2xl font-bold">localStorage</p>
              <p className="text-xs text-muted-foreground">Sobrevive a reloads</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
