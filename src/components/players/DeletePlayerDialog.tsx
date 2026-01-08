import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeletePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: {
    id: string;
    full_name: string;
  } | null;
  onSuccess: () => void;
}

export const DeletePlayerDialog = ({
  open,
  onOpenChange,
  player,
  onSuccess,
}: DeletePlayerDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const isConfirmValid = confirmText === "EXCLUIR";

  const handleDelete = async () => {
    if (!player || !isConfirmValid) return;

    setDeleting(true);

    try {
      // First, delete all scouting reports for this player (cascade)
      const { error: reportsError } = await supabase
        .from("scouting_reports")
        .delete()
        .eq("player_id", player.id);

      if (reportsError) {
        throw reportsError;
      }

      // Then, delete the player
      const { error: playerError } = await supabase
        .from("players")
        .delete()
        .eq("id", player.id);

      if (playerError) {
        throw playerError;
      }

      toast({
        title: "Atleta excluído com sucesso",
        description: `${player.full_name} foi removido do sistema.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting player:", error);
      toast({
        title: "Erro ao excluir atleta",
        description: error.message || "Não foi possível excluir o atleta.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setConfirmText("");
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setConfirmText("");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Excluir Atleta</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Você está prestes a excluir o atleta{" "}
              <strong className="text-foreground">{player?.full_name}</strong>.
            </p>
            <p className="text-destructive font-medium">
              Essa ação não pode ser desfeita. Todos os relatórios de scouting
              vinculados a este atleta também serão excluídos.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
            Digite <span className="font-mono font-bold text-foreground">EXCLUIR</span> para confirmar:
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
            className="mt-2"
            disabled={deleting}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Atleta"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
