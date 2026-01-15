import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchPlayer } from "@/hooks/useLiveMatch";
import { ArrowRightLeft, ArrowRight, Check, Minus, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SubstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playersOnField: MatchPlayer[];
  playersOffField: MatchPlayer[];
  onSubstitute: (params: {
    playerOutId: string;
    playerInId: string;
    minute: number;
    half?: number;
    displayMinute?: string;
  }) => void;
  isPending?: boolean;
  currentMinute?: number;
  currentHalf?: number;
  displayMinute?: string;
}

const MINUTE_PRESETS = [45, 60, 70, 80, 90];

export function SubstitutionModal({
  open,
  onOpenChange,
  playersOnField,
  playersOffField,
  onSubstitute,
  isPending,
  currentMinute = 0,
  currentHalf,
  displayMinute,
}: SubstitutionModalProps) {
  const isMobile = useIsMobile();
  const [playerOutId, setPlayerOutId] = useState<string | null>(null);
  const [playerInId, setPlayerInId] = useState<string | null>(null);
  const [minute, setMinute] = useState(currentMinute);

  // Update minute when currentMinute changes (clock running)
  useEffect(() => {
    if (open && currentMinute > 0) {
      setMinute(currentMinute);
    }
  }, [open, currentMinute]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPlayerOutId(null);
      setPlayerInId(null);
      setMinute(currentMinute || 0);
    }
  }, [open, currentMinute]);

  const handleConfirm = () => {
    if (!playerOutId || !playerInId) return;

    onSubstitute({
      playerOutId,
      playerInId,
      minute,
      half: currentHalf,
      displayMinute: displayMinute ?? `${minute}'`,
    });

    // Reset state
    setPlayerOutId(null);
    setPlayerInId(null);
    setMinute(currentMinute);
    onOpenChange(false);
  };

  const handleClose = () => {
    setPlayerOutId(null);
    setPlayerInId(null);
    onOpenChange(false);
  };

  const selectedOut = playersOnField.find((p) => p.player_id === playerOutId);
  const selectedIn = playersOffField.find((p) => p.player_id === playerInId);

  // Validation warnings
  const getValidationWarnings = () => {
    const warnings: string[] = [];
    
    if (selectedOut && selectedOut.entered_minute !== null && minute < selectedOut.entered_minute) {
      warnings.push(`Aviso: ${selectedOut.player?.full_name} entrou no minuto ${selectedOut.entered_minute}. O minuto de saída (${minute}) é anterior.`);
    }
    
    if (selectedIn && selectedIn.exited_minute !== null) {
      warnings.push(`Aviso: ${selectedIn.player?.full_name} já saiu no minuto ${selectedIn.exited_minute}. Não pode entrar novamente.`);
    }
    
    return warnings;
  };

  const warnings = getValidationWarnings();
  const hasBlockingWarning = selectedIn?.exited_minute !== null;

  const content = (
    <div className="space-y-4 sm:space-y-6 px-1">
      {/* Minute input with quick adjustments */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Minuto da substituição</Label>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => setMinute(Math.max(0, minute - 1))}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            type="number"
            min={0}
            max={120}
            value={minute}
            onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
            className="w-20 text-center text-2xl font-bold h-12"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => setMinute(Math.min(120, minute + 1))}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {/* Quick minute presets */}
        <div className="flex justify-center gap-1.5 flex-wrap">
          {MINUTE_PRESETS.map((m) => (
            <Button
              key={m}
              variant={minute === m ? "default" : "outline"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setMinute(m)}
            >
              {m}'
            </Button>
          ))}
        </div>
      </div>

      {/* Visual summary */}
      {(selectedOut || selectedIn) && (
        <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50">
          {selectedOut ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-12 w-12 border-2 border-red-500/50">
                <AvatarImage src={selectedOut.player?.photo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {selectedOut.player?.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <span className="text-xs font-semibold text-red-400 block">SAI</span>
                <span className="text-xs text-muted-foreground truncate block max-w-[80px]">
                  {selectedOut.player?.full_name.split(' ')[0]}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">?</span>
            </div>
          )}
          
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          
          {selectedIn ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-xs font-semibold text-green-400 block">ENTRA</span>
                <span className="text-xs text-muted-foreground truncate block max-w-[80px]">
                  {selectedIn.player?.full_name.split(' ')[0]}
                </span>
              </div>
              <Avatar className="h-12 w-12 border-2 border-green-500/50">
                <AvatarImage src={selectedIn.player?.photo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {selectedIn.player?.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">?</span>
            </div>
          )}
        </div>
      )}

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Player out selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">SAI</Badge>
          Selecione quem sai ({playersOnField.length} em campo)
        </Label>
        <ScrollArea className={cn("border rounded-lg", isMobile ? "h-[140px]" : "h-[120px]")}>
          <div className="p-2 space-y-1">
            {playersOnField.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                Nenhum jogador em campo
              </p>
            ) : (
              playersOnField.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => setPlayerOutId(mp.player_id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2.5 rounded-lg transition-all text-left min-h-[48px]",
                    playerOutId === mp.player_id
                      ? "bg-red-500/20 border-2 border-red-500/50"
                      : "hover:bg-accent border border-transparent"
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={mp.player?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {mp.player?.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {mp.player?.full_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">
                        {mp.player?.position}
                      </p>
                      {mp.entered_minute !== null && (
                        <Badge variant="outline" className="text-[9px] px-1 h-4">
                          Entrou {mp.entered_minute}'
                        </Badge>
                      )}
                    </div>
                  </div>
                  {playerOutId === mp.player_id && (
                    <Check className="h-5 w-5 text-red-400 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Player in selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Badge className="bg-green-600 text-xs">ENTRA</Badge>
          Selecione quem entra ({playersOffField.length} no banco)
        </Label>
        <ScrollArea className={cn("border rounded-lg", isMobile ? "h-[140px]" : "h-[120px]")}>
          <div className="p-2 space-y-1">
            {playersOffField.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                Nenhum jogador disponível no banco
              </p>
            ) : (
              playersOffField.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => setPlayerInId(mp.player_id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2.5 rounded-lg transition-all text-left min-h-[48px]",
                    playerInId === mp.player_id
                      ? "bg-green-500/20 border-2 border-green-500/50"
                      : "hover:bg-accent border border-transparent"
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={mp.player?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {mp.player?.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {mp.player?.full_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">
                        {mp.player?.position}
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 h-4">
                        {mp.started ? "Titular" : "Reserva"}
                      </Badge>
                    </div>
                  </div>
                  {playerInId === mp.player_id && (
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex-1 h-12"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!playerOutId || !playerInId || isPending || hasBlockingWarning}
          className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-base font-semibold"
        >
          {isPending ? "Substituindo..." : "Confirmar Substituição"}
        </Button>
      </div>
    </div>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Substituição
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Substituição
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
