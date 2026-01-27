/**
 * Market Score Internal Notes Modal
 * 
 * Allows scouts/admins to add internal notes to a Market Score
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface MarketScoreNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoreId: string | undefined;
  currentNotes: string;
}

export function MarketScoreNotesModal({
  open,
  onOpenChange,
  scoreId,
  currentNotes,
}: MarketScoreNotesModalProps) {
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Sync when modal opens
  useEffect(() => {
    if (open) {
      setNotes(currentNotes);
    }
  }, [open, currentNotes]);

  const handleSave = async () => {
    if (!scoreId) {
      toast({
        title: "Erro",
        description: "Score não encontrado. Aguarde o cálculo inicial.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("market_scores")
        .update({ notes_internal: notes || null })
        .eq("id", scoreId);

      if (error) throw error;

      toast({
        title: "Nota salva",
        description: "A nota interna foi atualizada com sucesso.",
      });

      // Invalidate query to refresh
      queryClient.invalidateQueries({ queryKey: ["market-score"] });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a nota. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Nota Interna do Score
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações internas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações internas sobre este atleta e seu Market Score..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Estas notas são visíveis apenas para a equipe interna.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !scoreId}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
