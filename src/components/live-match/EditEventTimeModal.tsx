import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditEventTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventType: string;
  currentGameTimeSeconds: number | null;
  maxGameTimeSeconds?: number;
  onSave: (eventId: string, newGameTimeSeconds: number) => Promise<void>;
  isPending?: boolean;
}

export function EditEventTimeModal({
  isOpen,
  onClose,
  eventId,
  eventType,
  currentGameTimeSeconds,
  maxGameTimeSeconds,
  onSave,
  isPending,
}: EditEventTimeModalProps) {
  // Convert seconds to minute (with football rounding: seconds >= 31 rounds up)
  const getCurrentMinute = () => {
    if (currentGameTimeSeconds == null) return 0;
    const rawMinutes = currentGameTimeSeconds / 60;
    const seconds = currentGameTimeSeconds % 60;
    return seconds >= 31 ? Math.ceil(rawMinutes) : Math.floor(rawMinutes);
  };

  const [minute, setMinute] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMinute(getCurrentMinute().toString());
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, currentGameTimeSeconds]);

  const handleMinuteChange = (value: string) => {
    // Allow empty or numeric values only
    if (value === "" || /^\d+$/.test(value)) {
      const numValue = parseInt(value) || 0;
      if (numValue <= 130) {
        setMinute(value);
        setError(null);
      }
    }
  };

  const handleSave = async () => {
    const minuteNum = parseInt(minute);
    
    // Validate
    if (isNaN(minuteNum) || minuteNum < 0) {
      setError("Informe um minuto válido (0-130)");
      return;
    }
    
    if (minuteNum > 130) {
      setError("O minuto não pode exceder 130");
      return;
    }

    // Convert minute to seconds (use 30 seconds as the middle point for that minute)
    const totalSeconds = minuteNum * 60 + 30;

    // Validate max if provided
    if (maxGameTimeSeconds !== undefined && totalSeconds > maxGameTimeSeconds + 60) {
      const maxMinute = Math.ceil(maxGameTimeSeconds / 60);
      setError(`O minuto não pode exceder ${maxMinute}'`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(eventId, totalSeconds);
      onClose();
    } catch (err) {
      setError("Erro ao salvar o minuto do evento");
    } finally {
      setIsSaving(false);
    }
  };

  const maxMinute = maxGameTimeSeconds ? Math.ceil(maxGameTimeSeconds / 60) : 130;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className="w-5 h-5 text-blue-400" />
            Editar Minuto
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Ajuste o minuto em que o evento "{eventType}" ocorreu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <Label className="text-sm text-zinc-400">Minuto do Evento</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={130}
                value={minute}
                onChange={(e) => handleMinuteChange(e.target.value)}
                className={cn(
                  "w-24 h-14 text-center text-3xl font-mono font-bold bg-zinc-800 border-zinc-700",
                  "focus:ring-blue-500 focus:border-blue-500"
                )}
                autoFocus
              />
              <span className="text-2xl font-bold text-zinc-400">'</span>
            </div>
            <p className="text-xs text-zinc-500">
              Entre 0 e {maxMinute} minutos
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 hover:bg-zinc-800"
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || isSaving || !minute}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
