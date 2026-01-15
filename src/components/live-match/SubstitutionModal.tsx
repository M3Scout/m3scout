import { useState } from "react";
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
import { ArrowRightLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playersOnField: MatchPlayer[];
  playersOffField: MatchPlayer[];
  onSubstitute: (params: {
    playerOutId: string;
    playerInId: string;
    minute: number;
  }) => void;
  isPending?: boolean;
  currentMinute?: number;
}

export function SubstitutionModal({
  open,
  onOpenChange,
  playersOnField,
  playersOffField,
  onSubstitute,
  isPending,
  currentMinute = 0,
}: SubstitutionModalProps) {
  const [playerOutId, setPlayerOutId] = useState<string | null>(null);
  const [playerInId, setPlayerInId] = useState<string | null>(null);
  const [minute, setMinute] = useState(currentMinute.toString());

  const handleConfirm = () => {
    if (!playerOutId || !playerInId) return;

    onSubstitute({
      playerOutId,
      playerInId,
      minute: parseInt(minute) || currentMinute,
    });

    // Reset state
    setPlayerOutId(null);
    setPlayerInId(null);
    setMinute(currentMinute.toString());
    onOpenChange(false);
  };

  const handleClose = () => {
    setPlayerOutId(null);
    setPlayerInId(null);
    onOpenChange(false);
  };

  const selectedOut = playersOnField.find((p) => p.player_id === playerOutId);
  const selectedIn = playersOffField.find((p) => p.player_id === playerInId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Substituição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Minute input */}
          <div className="space-y-2">
            <Label htmlFor="sub-minute">Minuto da substituição</Label>
            <Input
              id="sub-minute"
              type="number"
              min={0}
              max={120}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="text-center text-lg font-bold"
            />
          </div>

          {/* Visual summary */}
          {(selectedOut || selectedIn) && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50">
              {selectedOut ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10 border-2 border-red-500/50">
                    <AvatarImage src={selectedOut.player?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {selectedOut.player?.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-red-400">SAI</span>
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30" />
              )}
              
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              
              {selectedIn ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-400">ENTRA</span>
                  <Avatar className="h-10 w-10 border-2 border-green-500/50">
                    <AvatarImage src={selectedIn.player?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {selectedIn.player?.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30" />
              )}
            </div>
          )}

          {/* Player out selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">SAI</Badge>
              Jogador em campo
            </Label>
            <ScrollArea className="h-[120px] border rounded-lg">
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
                        "w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                        playerOutId === mp.player_id
                          ? "bg-red-500/20 border border-red-500/50"
                          : "hover:bg-accent border border-transparent"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={mp.player?.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {mp.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {mp.player?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mp.player?.position}
                        </p>
                      </div>
                      {playerOutId === mp.player_id && (
                        <Check className="h-4 w-4 text-red-400" />
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
              Jogador no banco
            </Label>
            <ScrollArea className="h-[120px] border rounded-lg">
              <div className="p-2 space-y-1">
                {playersOffField.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Nenhum jogador no banco
                  </p>
                ) : (
                  playersOffField.map((mp) => (
                    <button
                      key={mp.id}
                      onClick={() => setPlayerInId(mp.player_id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                        playerInId === mp.player_id
                          ? "bg-green-500/20 border border-green-500/50"
                          : "hover:bg-accent border border-transparent"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={mp.player?.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {mp.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {mp.player?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mp.player?.position}
                        </p>
                      </div>
                      {playerInId === mp.player_id && (
                        <Check className="h-4 w-4 text-green-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!playerOutId || !playerInId || isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isPending ? "Substituindo..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
