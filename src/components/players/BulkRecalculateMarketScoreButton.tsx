import { useState } from "react";
import { TrendingUp, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { recalculateAllActiveMarketScores } from "@/lib/marketScoreService";

interface PlayerResult {
  name: string;
  success: boolean;
}

export function BulkRecalculateMarketScoreButton() {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [done, setDone] = useState(false);

  const handleRecalculate = async () => {
    setProcessing(true);
    setDone(false);
    setProgress(0);
    setResults([]);

    try {
      const result = await recalculateAllActiveMarketScores(
        (current, tot, playerName, success) => {
          setTotal(tot);
          setProgress(Math.round((current / tot) * 100));
          setResults(prev => [...prev, { name: playerName, success }]);
        },
        'Recálculo em massa — novo motor v2'
      );

      setDone(true);
      toast.success(`M3 Market Score: ${result.success} atletas recalculados com sucesso!`);
    } catch (err) {
      console.error("Bulk market score recalculate error:", err);
      toast.error("Erro inesperado ao recalcular");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setOpen(false);
      setDone(false);
      setProgress(0);
      setResults([]);
      setTotal(0);
    }
  };

  const failedResults = results.filter(r => !r.success);
  const successCount = results.filter(r => r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="admin-btn-outline" onClick={() => setOpen(true)}>
          <TrendingUp className="w-4 h-4" />
          Recalcular M3 Market Score
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recalcular M3 Market Score em Massa
          </DialogTitle>
          <DialogDescription>
            Recalcula o Market Score de todos os atletas ativos usando o motor atual
            (p90 por posição, pesos recalibrados, samplePenalty por minutagem).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </span>
                <span>{results.length} / {total || "?"}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {done && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                Recálculo concluído!
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Processados</p>
                  <p className="text-lg font-semibold">{total}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-muted-foreground">Atualizados</p>
                  <p className="text-lg font-semibold text-primary">{successCount}</p>
                </div>
              </div>

              {failedResults.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-destructive" />
                    {failedResults.length} erro(s):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {failedResults.map((r, i) => (
                      <p key={i} className="text-xs text-destructive/80 px-2">{r.name}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!processing && !done && (
            <p className="text-sm text-muted-foreground">
              Esta operação percorre todos os atletas ativos em sequência. Pode levar alguns minutos dependendo do volume.
            </p>
          )}
        </div>

        <DialogFooter>
          {!done && !processing && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleRecalculate}>
                <RefreshCw className="w-4 h-4" />
                Iniciar Recálculo
              </Button>
            </>
          )}
          {done && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
