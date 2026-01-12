import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecalculateResult {
  player_id: string;
  player_name: string;
  old_rating: number | null;
  new_rating: number | null;
}

interface BulkRecalculateButtonProps {
  onComplete?: () => void;
}

export function BulkRecalculateButton({ onComplete }: BulkRecalculateButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RecalculateResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setLoading(true);
    setProgress(10);
    setResults(null);
    setError(null);

    try {
      setProgress(30);
      
      // Call the database function to recalculate all ratings
      const { data, error: rpcError } = await supabase.rpc('recalculate_all_player_ratings');
      
      setProgress(80);

      if (rpcError) {
        console.error("Error recalculating ratings:", rpcError);
        setError(rpcError.message);
        toast.error("Erro ao recalcular notas");
        return;
      }

      setProgress(100);
      setResults(data as RecalculateResult[]);
      
      const changedCount = (data as RecalculateResult[])?.filter(
        (r) => r.old_rating !== r.new_rating
      ).length ?? 0;
      
      toast.success(`Recálculo concluído! ${changedCount} nota(s) alterada(s).`);
      
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Erro inesperado ao recalcular notas");
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setResults(null);
      setError(null);
      setProgress(0);
    }
  };

  const changedResults = results?.filter((r) => r.old_rating !== r.new_rating) ?? [];
  const unchangedCount = (results?.length ?? 0) - changedResults.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="admin-btn-outline"
          onClick={() => setOpen(true)}
        >
          <RefreshCw className="w-4 h-4" />
          Recalcular em Massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recalcular Notas em Massa
          </DialogTitle>
          <DialogDescription>
            Esta ação recalcula a nota automática de todos os atletas não arquivados 
            com base nas estatísticas atuais e no algoritmo V2.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Recalculando notas...
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Erro</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          {results && !loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle className="w-5 h-5" />
                Recálculo concluído!
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Total processados</p>
                  <p className="text-lg font-semibold">{results.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-muted-foreground">Notas alteradas</p>
                  <p className="text-lg font-semibold text-primary">{changedResults.length}</p>
                </div>
              </div>

              {changedResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Alterações:</p>
                  {changedResults.slice(0, 20).map((r) => (
                    <div 
                      key={r.player_id}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                    >
                      <span className="truncate max-w-[180px]">{r.player_name}</span>
                      <span className="text-muted-foreground">
                        {r.old_rating?.toFixed(1) ?? "N/D"} → {r.new_rating?.toFixed(1) ?? "N/D"}
                      </span>
                    </div>
                  ))}
                  {changedResults.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{changedResults.length - 20} mais alterações
                    </p>
                  )}
                </div>
              )}

              {changedResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma nota foi alterada. Todas as notas já estavam atualizadas.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!results && !loading && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleRecalculate}>
                <RefreshCw className="w-4 h-4" />
                Iniciar Recálculo
              </Button>
            </>
          )}
          {(results || error) && !loading && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
