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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Clock, AlertTriangle, Bug, ChevronDown } from "lucide-react";
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
  // Debug info - raw event data
  debugEvent?: {
    id: string;
    event_type: string;
    half: number | null;
    period: number | null;
    minute: number | null;
    game_time_seconds: number | null;
    display_minute: string | null;
    created_at: string;
    updated_at?: string;
  };
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
  debugEvent,
}: EditEventTimeModalProps) {
  // Convert seconds to minute (European format: absolute match minute 0-90+)
  // No half conversion - game_time_seconds is ALWAYS absolute from start of match
  const getCurrentMinute = () => {
    if (currentGameTimeSeconds == null) return 0;
    // Simple conversion: seconds to minutes
    return Math.floor(currentGameTimeSeconds / 60);
  };

  const [minute, setMinute] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

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

    // Convert minute to absolute seconds (European format: minute * 60)
    // No half offset - always store as absolute match time
    const totalSeconds = minuteNum * 60;

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

  // Debug info computed values
  const derivedMinute = currentGameTimeSeconds != null 
    ? Math.floor(currentGameTimeSeconds / 60) 
    : null;

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
            <Label className="text-sm text-zinc-400">Minuto do Evento (absoluto 0-90+)</Label>
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

          {/* Debug Section - Collapsible */}
          {debugEvent && (
            <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 w-full justify-center py-2">
                <Bug className="w-3 h-3" />
                Debug Info
                <ChevronDown className={cn("w-3 h-3 transition-transform", debugOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs font-mono space-y-1">
                  <div className="text-zinc-400">
                    <span className="text-zinc-500">event_id:</span> {debugEvent.id}
                  </div>
                  <div className="text-zinc-400">
                    <span className="text-zinc-500">type:</span> {debugEvent.event_type}
                  </div>
                  <div className="text-zinc-400">
                    <span className="text-zinc-500">half/period:</span> {debugEvent.half ?? "null"} / {debugEvent.period ?? "null"}
                  </div>
                  <div className="text-zinc-400">
                    <span className="text-zinc-500">minute (raw):</span> {debugEvent.minute ?? "null"}
                  </div>
                  <div className={cn(
                    "font-bold",
                    debugEvent.game_time_seconds != null && debugEvent.game_time_seconds < 2700 && (debugEvent.half === 2 || debugEvent.period === 2)
                      ? "text-red-400" // Flag potentially wrong data
                      : "text-green-400"
                  )}>
                    <span className="text-zinc-500">game_time_seconds:</span> {debugEvent.game_time_seconds ?? "null"}
                  </div>
                  <div className="text-zinc-400">
                    <span className="text-zinc-500">display_minute:</span> {debugEvent.display_minute ?? "null"}
                  </div>
                  <div className="text-blue-400 font-bold">
                    <span className="text-zinc-500">derivedMinute:</span> {derivedMinute ?? "null"}'
                  </div>
                  <div className="text-zinc-500 text-[10px] mt-2">
                    created: {debugEvent.created_at}
                  </div>
                  {/* Warning for potentially wrong 2nd half data */}
                  {debugEvent.game_time_seconds != null && 
                   debugEvent.game_time_seconds < 2700 && 
                   (debugEvent.half === 2 || debugEvent.period === 2) && (
                    <div className="mt-2 p-2 bg-red-500/20 rounded text-red-300">
                      ⚠️ ALERTA: Evento do 2º tempo com game_time_seconds &lt; 45min. Pode estar salvo incorretamente!
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
