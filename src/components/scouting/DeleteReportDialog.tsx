import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteReportDialogProps {
  reportId: string;
  onDeleted: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DeleteReportDialog = ({
  reportId,
  onDeleted,
  trigger,
  disabled = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteReportDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Auto-open when controlled and open becomes true
  useEffect(() => {
    if (isControlled && controlledOpen) {
      // Dialog is now controlled and open
    }
  }, [isControlled, controlledOpen]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from("scouting_reports")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) {
        console.error("Error deleting report:", error);
        toast.error("Erro ao excluir relatório", {
          description: error.message,
        });
        return;
      }

      toast.success("Relatório excluído com sucesso");
      setOpen(false);
      onDeleted();
    } catch (err: any) {
      console.error("Exception deleting report:", err);
      toast.error("Erro ao excluir relatório");
    } finally {
      setDeleting(false);
    }
  };

  // If controlled and no trigger, render just the dialog content
  if (isControlled && !trigger) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O relatório será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button 
            variant="destructive" 
            size="sm" 
            disabled={disabled}
            title={disabled ? "Sem permissão para excluir" : "Excluir relatório"}
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. O relatório será permanentemente removido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
