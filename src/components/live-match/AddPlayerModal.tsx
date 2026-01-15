import { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Check, Plus } from "lucide-react";

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

const PAGE_SIZE = 30;

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset visible count when modal opens
  useEffect(() => {
    if (open) {
      setVisibleCount(PAGE_SIZE);
    }
  }, [open]);

  // Fetch all players on mount (not search-dependent)
  const { data: allPlayers = [], isLoading } = useQuery({
    queryKey: ["players-all-for-match"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, photo_url, position, current_club")
        .or(`is_archived.is.null,is_archived.eq.false`)
        .order("full_name")
        .limit(500);

      if (error) throw error;
      return data as Player[];
    },
    enabled: open,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Filter players based on search (local filter)
  const filteredPlayers = useMemo(() => {
    let result = allPlayers.filter(p => !existingPlayerIds.includes(p.id));
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(p => 
        p.full_name.toLowerCase().includes(searchLower) ||
        p.position.toLowerCase().includes(searchLower) ||
        (p.current_club && p.current_club.toLowerCase().includes(searchLower))
      );
    }
    
    return result;
  }, [allPlayers, existingPlayerIds, search]);

  // Players to display (with pagination)
  const displayedPlayers = filteredPlayers.slice(0, visibleCount);
  const hasMore = filteredPlayers.length > visibleCount;

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

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  // Skeleton loader
  const PlayerSkeleton = () => (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Jogador
          </DialogTitle>
        </DialogHeader>

        {!selectedPlayer ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome, posição ou clube..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Results */}
            <ScrollArea className="flex-1 h-[350px] -mx-2 px-2">
              {isLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <PlayerSkeleton key={i} />
                  ))}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {search ? "Nenhum jogador encontrado" : "Nenhum jogador disponível"}
                </p>
              ) : (
                <div className="space-y-1">
                  {displayedPlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left group"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {player.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          <span className="font-semibold text-foreground/80">{player.position}</span>
                          {player.current_club && ` • ${player.current_club}`}
                        </p>
                      </div>
                      <Plus className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  
                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      className="w-full mt-2"
                    >
                      Carregar mais ({filteredPlayers.length - visibleCount} restantes)
                    </Button>
                  )}
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
