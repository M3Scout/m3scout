import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Check } from "lucide-react";

interface Player {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string;
  current_club: string | null;
}

interface AddPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPlayerIds: string[];
  onAddPlayer: (params: {
    playerId: string;
    playerPosition: string;
    started: boolean;
    enteredMinute?: number;
    exitedMinute?: number;
    autoMinutes?: boolean;
  }) => void;
  isPending?: boolean;
}

export function AddPlayerModal({
  open,
  onOpenChange,
  existingPlayerIds,
  onAddPlayer,
  isPending,
}: AddPlayerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [started, setStarted] = useState(true);
  const [enteredMinute, setEnteredMinute] = useState<string>("");
  const [exitedMinute, setExitedMinute] = useState<string>("");
  const [autoMinutes, setAutoMinutes] = useState(true);

  // Search players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, photo_url, position, current_club")
        .or(`is_archived.is.null,is_archived.eq.false`)
        .ilike("full_name", `%${search}%`)
        .order("full_name")
        .limit(20);

      if (error) throw error;
      return data as Player[];
    },
    enabled: search.length >= 2,
  });

  const availablePlayers = players.filter(p => !existingPlayerIds.includes(p.id));

  const handleConfirm = () => {
    if (!selectedPlayer) return;

    onAddPlayer({
      playerId: selectedPlayer.id,
      playerPosition: selectedPlayer.position,
      started,
      enteredMinute: !started && enteredMinute ? parseInt(enteredMinute) : undefined,
      exitedMinute: exitedMinute ? parseInt(exitedMinute) : undefined,
      autoMinutes,
    });

    // Reset state
    setSelectedPlayer(null);
    setStarted(true);
    setEnteredMinute("");
    setExitedMinute("");
    setAutoMinutes(true);
    setSearch("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedPlayer(null);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Jogador
          </DialogTitle>
        </DialogHeader>

        {!selectedPlayer ? (
          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar jogador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Results */}
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : search.length < 2 ? (
                <p className="text-center text-muted-foreground py-8">
                  Digite ao menos 2 caracteres para buscar
                </p>
              ) : availablePlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum jogador encontrado
                </p>
              ) : (
                <div className="space-y-2">
                  {availablePlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photo_url || undefined} />
                        <AvatarFallback>
                          {player.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {player.position} • {player.current_club || "Sem clube"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected player */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedPlayer.photo_url || undefined} />
                <AvatarFallback>
                  {selectedPlayer.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedPlayer.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPlayer.position}
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="started">Titular</Label>
                <Switch
                  id="started"
                  checked={started}
                  onCheckedChange={setStarted}
                />
              </div>

              {!started && (
                <div className="space-y-2">
                  <Label htmlFor="entered">Minuto de entrada</Label>
                  <Input
                    id="entered"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Ex: 46"
                    value={enteredMinute}
                    onChange={(e) => setEnteredMinute(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="exited">Minuto de saída (opcional)</Label>
                <Input
                  id="exited"
                  type="number"
                  min={0}
                  max={120}
                  placeholder="Ex: 75"
                  value={exitedMinute}
                  onChange={(e) => setExitedMinute(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-minutes">Auto-minutos</Label>
                  <p className="text-xs text-muted-foreground">
                    Calcula minutos automaticamente
                  </p>
                </div>
                <Switch
                  id="auto-minutes"
                  checked={autoMinutes}
                  onCheckedChange={setAutoMinutes}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedPlayer(null)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
