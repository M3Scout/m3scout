import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VoidEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventType: string;
  playerName: string;
  onConfirm: (eventId: string, reason?: string) => Promise<void>;
  isPending?: boolean;
}

export function VoidEventDialog({
  isOpen,
  onClose,
  eventId,
  eventType,
  playerName,
  onConfirm,
  isPending,
}: VoidEventDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    await onConfirm(eventId, reason.trim() || undefined);
    setReason("");
    onClose();
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-zinc-100">
            <XCircle className="w-5 h-5 text-red-400" />
            Anular Evento
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400 space-y-3">
            <p>
              Tem certeza que deseja anular este evento? O evento será marcado como anulado
              e não será contabilizado nas estatísticas.
            </p>
            
            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-200">{eventType}</p>
                <p className="text-xs text-zinc-500">{playerName}</p>
              </div>
              <Badge variant="outline" className="border-red-500/50 text-red-400">
                Será anulado
              </Badge>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400">
                O evento não será deletado, apenas marcado como anulado para fins de auditoria.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label className="text-xs text-zinc-500 mb-2 block">
            Motivo da anulação (opcional)
          </Label>
          <Textarea
            placeholder="Ex: Erro de registro, gol anulado pelo VAR..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Anular Evento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
