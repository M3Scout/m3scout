import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MatchPlayer, MatchEventType } from "@/hooks/useLiveMatch";
import { Goal, Shield, Target, Footprints, HandHelping, RotateCcw, Ban } from "lucide-react";

const EVENT_OPTIONS: { value: MatchEventType; label: string; icon: React.ReactNode }[] = [
  { value: "goal", label: "Gol", icon: <Goal className="w-4 h-4" /> },
  { value: "assist", label: "Assistência", icon: <HandHelping className="w-4 h-4" /> },
  { value: "shot_on_target", label: "Finalização no Gol", icon: <Target className="w-4 h-4" /> },
  { value: "shot", label: "Finalização", icon: <Target className="w-4 h-4" /> },
  { value: "tackle", label: "Desarme", icon: <Shield className="w-4 h-4" /> },
  { value: "interception", label: "Interceptação", icon: <Shield className="w-4 h-4" /> },
  { value: "recovery", label: "Recuperação", icon: <RotateCcw className="w-4 h-4" /> },
  { value: "clearance", label: "Corte", icon: <Ban className="w-4 h-4" /> },
  { value: "dribble_success", label: "Drible Certo", icon: <Footprints className="w-4 h-4" /> },
  { value: "key_pass", label: "Passe Decisivo", icon: <HandHelping className="w-4 h-4" /> },
  { value: "chance_created", label: "Chance Criada", icon: <Target className="w-4 h-4" /> },
  { value: "yellow", label: "Cartão Amarelo", icon: <span className="w-4 h-4 bg-yellow-400 rounded-sm" /> },
  { value: "red", label: "Cartão Vermelho", icon: <span className="w-4 h-4 bg-red-500 rounded-sm" /> },
  { value: "foul_committed", label: "Falta Cometida", icon: <Ban className="w-4 h-4" /> },
  { value: "foul_suffered", label: "Falta Sofrida", icon: <Ban className="w-4 h-4" /> },
  { value: "save", label: "Defesa (GK)", icon: <Shield className="w-4 h-4" /> },
  { value: "goal_conceded", label: "Gol Sofrido (GK)", icon: <Goal className="w-4 h-4" /> },
  { value: "ground_duel_won", label: "Duelo Chão Ganho", icon: <Shield className="w-4 h-4" /> },
  { value: "aerial_duel_won", label: "Duelo Aéreo Ganho", icon: <Shield className="w-4 h-4" /> },
];

interface AddManualEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: MatchPlayer[];
  onAddEvent: (playerId: string, eventType: MatchEventType, minute: number, notes?: string) => void;
  isPending?: boolean;
}

export function AddManualEventModal({
  open,
  onOpenChange,
  players,
  onAddEvent,
  isPending,
}: AddManualEventModalProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedEventType, setSelectedEventType] = useState<MatchEventType | "">("");
  const [minute, setMinute] = useState<string>("");
  const [notes, setNotes] = useState("");

  const activePlayers = useMemo(() => 
    players.filter(p => !p.is_removed && p.player), 
    [players]
  );

  const handleSubmit = () => {
    if (!selectedPlayerId || !selectedEventType || !minute) return;
    
    const minuteNum = parseInt(minute, 10);
    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 130) {
      return;
    }

    onAddEvent(selectedPlayerId, selectedEventType, minuteNum, notes || undefined);
    
    // Reset form
    setSelectedPlayerId("");
    setSelectedEventType("");
    setMinute("");
    setNotes("");
    onOpenChange(false);
  };

  const isValid = selectedPlayerId && selectedEventType && minute && 
    parseInt(minute, 10) >= 0 && parseInt(minute, 10) <= 130;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Adicionar Evento Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Player Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Jogador *</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Selecione o jogador" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {activePlayers.map((mp) => (
                  <SelectItem key={mp.id} value={mp.player_id}>
                    {mp.player?.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Tipo de Evento *</Label>
            <Select value={selectedEventType} onValueChange={(v) => setSelectedEventType(v as MatchEventType)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[300px]">
                {EVENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minute Input */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Minuto do Evento *</Label>
            <Input
              type="number"
              min={0}
              max={130}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              placeholder="Ex: 74"
              className="bg-zinc-800 border-zinc-700"
            />
            <p className="text-xs text-zinc-500">Entre 0 e 130 minutos</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Observação (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes do evento..."
              className="bg-zinc-800 border-zinc-700 resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending ? "Salvando..." : "Adicionar Evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
