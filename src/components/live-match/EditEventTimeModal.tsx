import { useState } from "react";
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
  const currentMinutes = currentGameTimeSeconds ? Math.floor(currentGameTimeSeconds / 60) : 0;
  const currentSeconds = currentGameTimeSeconds ? currentGameTimeSeconds % 60 : 0;

  const [minutes, setMinutes] = useState(currentMinutes.toString());
  const [seconds, setSeconds] = useState(currentSeconds.toString().padStart(2, "0"));
  const [error, setError] = useState<string | null>(null);

  const handleMinutesChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue <= 120) {
      setMinutes(value);
      setError(null);
    }
  };

  const handleSecondsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue < 60) {
      setSeconds(value.padStart(2, "0"));
      setError(null);
    }
  };

  const handleSave = async () => {
    const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

    // Validate: >= 0
    if (totalSeconds < 0) {
      setError("O tempo não pode ser negativo");
      return;
    }

    // Validate: <= maxGameTimeSeconds if finished
    if (maxGameTimeSeconds !== undefined && totalSeconds > maxGameTimeSeconds) {
      setError(`O tempo não pode exceder ${Math.floor(maxGameTimeSeconds / 60)}:${(maxGameTimeSeconds % 60).toString().padStart(2, "0")}`);
      return;
    }

    try {
      await onSave(eventId, totalSeconds);
      onClose();
    } catch (err) {
      setError("Erro ao salvar o tempo do evento");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className="w-5 h-5 text-blue-400" />
            Editar Tempo do Evento
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Ajuste o tempo em que o evento "{eventType}" foi registrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center">
              <Label className="text-xs text-zinc-500 mb-1">Minutos</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={minutes}
                onChange={(e) => handleMinutesChange(e.target.value)}
                className={cn(
                  "w-20 h-14 text-center text-2xl font-mono font-bold bg-zinc-800 border-zinc-700",
                  "focus:ring-blue-500 focus:border-blue-500"
                )}
              />
            </div>
            <span className="text-3xl font-bold text-zinc-400 mt-5">:</span>
            <div className="flex flex-col items-center">
              <Label className="text-xs text-zinc-500 mb-1">Segundos</Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => handleSecondsChange(e.target.value)}
                className={cn(
                  "w-20 h-14 text-center text-2xl font-mono font-bold bg-zinc-800 border-zinc-700",
                  "focus:ring-blue-500 focus:border-blue-500"
                )}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {maxGameTimeSeconds !== undefined && (
            <p className="text-xs text-zinc-500 text-center">
              Tempo máximo permitido: {Math.floor(maxGameTimeSeconds / 60)}:{(maxGameTimeSeconds % 60).toString().padStart(2, "0")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
