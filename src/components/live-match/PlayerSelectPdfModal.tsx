/**
 * Modal for selecting players to export PDF
 */
import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, FileDown, Loader2, Users } from "lucide-react";
import { MatchPlayer } from "@/hooks/useLiveMatch";

interface PlayerSelectPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchPlayers: MatchPlayer[];
  onExport: (playerIds: string[]) => Promise<void>;
  isExporting: boolean;
}

export function PlayerSelectPdfModal({
  open,
  onOpenChange,
  matchPlayers,
  onExport,
  isExporting,
}: PlayerSelectPdfModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter players with valid data
  const activePlayers = useMemo(() => {
    return matchPlayers
      .filter((mp) => mp.player && !mp.is_removed)
      .sort((a, b) => {
        // Sort by position, then name
        const posA = a.player?.position || "";
        const posB = b.player?.position || "";
        if (posA !== posB) return posA.localeCompare(posB);
        return (a.player?.full_name || "").localeCompare(b.player?.full_name || "");
      });
  }, [matchPlayers]);

  // Filter by search
  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return activePlayers;
    const q = search.toLowerCase();
    return activePlayers.filter((mp) =>
      mp.player?.full_name.toLowerCase().includes(q) ||
      mp.player?.position.toLowerCase().includes(q)
    );
  }, [activePlayers, search]);

  const handleToggle = (playerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPlayers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlayers.map((mp) => mp.player_id)));
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) return;
    await onExport(Array.from(selectedIds));
    onOpenChange(false);
    setSelectedIds(new Set());
    setSearch("");
  };

  const allSelected = selectedIds.size === filteredPlayers.length && filteredPlayers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Exportar PDF por Jogador
          </DialogTitle>
          <DialogDescription>
            Selecione um ou mais jogadores para gerar o PDF filtrado
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            {allSelected ? "Desmarcar Todos" : "Selecionar Todos"}
          </Button>
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Player List */}
        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-2 space-y-1">
            {filteredPlayers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhum jogador encontrado
              </p>
            ) : (
              filteredPlayers.map((mp) => {
                if (!mp.player) return null;
                const isSelected = selectedIds.has(mp.player_id);

                return (
                  <div
                    key={mp.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleToggle(mp.player_id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(mp.player_id)}
                      className="pointer-events-none"
                    />
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={mp.player.photo_url || undefined} className="object-cover object-top" />
                      <AvatarFallback className="text-xs">
                        {mp.player.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {mp.player.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mp.player.position}
                      </p>
                    </div>
                    {mp.started && (
                      <Badge variant="outline" className="text-[10px]">
                        Titular
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedIds.size === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Gerar PDF ({selectedIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
