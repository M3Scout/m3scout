/**
 * Bulk Recalculate GK Radars Button
 * 
 * Recalculates all goalkeeper radars with percentile normalization
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recalculateAllGKRadars } from "@/lib/goalkeeperRadarService";

interface RecalculateResult {
  playerId: string;
  playerName: string;
  success: boolean;
  error?: string;
}

export function BulkRecalculateGKButton() {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RecalculateResult[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const handleRecalculate = async () => {
    setProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const result = await recalculateAllGKRadars((current, total, playerName, success, error) => {
        setTotalPlayers(total);
        setProgress(Math.round((current / total) * 100));
        setResults(prev => [
          ...prev,
          { playerId: "", playerName, success, error }
        ]);
      });

      toast.success(`${result.success} goleiros recalculados com sucesso!`);
    } catch (err) {
      console.error("Bulk recalculate error:", err);
      toast.error("Erro inesperado ao recalcular");
    } finally {
      setProcessing(false);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="w-4 h-4" />
          Recalcular Radares GK
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recalcular Radares de Goleiros
          </DialogTitle>
          <DialogDescription>
            Recalcula os radares de todos os goleiros usando normalização por percentil.
            Isso compara cada goleiro com outros do mesmo nível de competição.
          </DialogDescription>
        </DialogHeader>

        {!processing && results.length === 0 && (
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">O que será feito:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Buscar todos os jogadores com posição "Goleiro"</li>
                <li>• Agregar estatísticas com peso por minutos</li>
                <li>• Normalizar por percentil entre goleiros</li>
                <li>• Salvar radar em auto_rating_details.gk_radar</li>
              </ul>
            </div>
          </div>
        )}

        {processing && (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Processando goleiros...</span>
              <span className="text-muted-foreground">
                {results.length} / {totalPlayers || "..."}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Recent results preview */}
            <div className="max-h-32 overflow-y-auto space-y-1">
              {results.slice(-5).map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  )}
                  <span className="truncate">{r.playerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!processing && results.length > 0 && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Badge variant="default" className="gap-1 bg-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {successCount} sucesso
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorCount} erros
                </Badge>
              )}
            </div>

            {/* Results list */}
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <span className="truncate flex-1">{r.playerName}</span>
                  {r.error && (
                    <span className="text-xs text-destructive truncate max-w-[120px]">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {!processing && results.length === 0 && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRecalculate} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Iniciar Recálculo
              </Button>
            </>
          )}
          {processing && (
            <Button disabled className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </Button>
          )}
          {!processing && results.length > 0 && (
            <Button onClick={() => { setResults([]); setOpen(false); }}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
