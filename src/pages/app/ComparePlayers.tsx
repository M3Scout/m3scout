import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  User,
  Star,
  Trophy,
  Target,
  Shield,
  Clock,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerRatingBadge } from "@/components/players/PlayerRatingBadge";
import { formatFixed } from "@/lib/formatters";

interface Player {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
  is_archived: boolean | null;
}

interface PlayerStats {
  player_id: string;
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
}

interface PlayerWithStats extends Player {
  stats: PlayerStats[];
  aggregatedStats: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
    tackles: number;
    interceptions: number;
    recoveries: number;
  } | null;
}

const currentYear = new Date().getFullYear();

const ComparePlayers = () => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [openSelector, setOpenSelector] = useState<number | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, full_name, position, age, nationality, current_club, photo_url, auto_rating, is_archived")
      .or("is_archived.eq.false,is_archived.is.null")
      .order("full_name");

    if (data) {
      setAllPlayers(data);
    }
    setLoading(false);
  };

  const fetchPlayerStats = async (playerId: string): Promise<PlayerStats[]> => {
    const { data } = await supabase
      .from("player_stats")
      .select("*")
      .eq("player_id", playerId)
      .eq("season_year", currentYear);

    return data || [];
  };

  const handleSelectPlayer = async (player: Player, slotIndex: number) => {
    // Check if already selected
    if (selectedPlayers.find((p) => p.id === player.id)) {
      setOpenSelector(null);
      return;
    }

    setLoadingStats(true);
    const stats = await fetchPlayerStats(player.id);
    
    // Aggregate stats for current year
    const aggregatedStats = stats.length > 0
      ? stats.reduce(
          (acc, s) => ({
            matches: acc.matches + s.matches,
            minutes: acc.minutes + s.minutes,
            goals: acc.goals + s.goals,
            assists: acc.assists + s.assists,
            yellow_cards: acc.yellow_cards + s.yellow_cards,
            red_cards: acc.red_cards + s.red_cards,
            tackles: acc.tackles + s.tackles,
            interceptions: acc.interceptions + s.interceptions,
            recoveries: acc.recoveries + s.recoveries,
          }),
          {
            matches: 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
            tackles: 0,
            interceptions: 0,
            recoveries: 0,
          }
        )
      : null;

    const playerWithStats: PlayerWithStats = {
      ...player,
      stats,
      aggregatedStats,
    };

    const newSelected = [...selectedPlayers];
    if (slotIndex < newSelected.length) {
      newSelected[slotIndex] = playerWithStats;
    } else {
      newSelected.push(playerWithStats);
    }
    setSelectedPlayers(newSelected);
    setLoadingStats(false);
    setOpenSelector(null);
  };

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId));
  };

  const availablePlayers = allPlayers.filter(
    (p) => !selectedPlayers.find((sp) => sp.id === p.id)
  );

  // Find best value for each metric
  const getBestValue = (
    metric: keyof PlayerWithStats["aggregatedStats"] | "auto_rating" | "age",
    higherIsBetter = true
  ): string | null => {
    const validPlayers = selectedPlayers.filter((p) => {
      if (metric === "auto_rating") return p.auto_rating !== null;
      if (metric === "age") return p.age !== null;
      return p.aggregatedStats !== null;
    });

    if (validPlayers.length === 0) return null;

    let bestId: string | null = null;
    let bestValue: number | null = null;

    validPlayers.forEach((p) => {
      let value: number | null = null;
      if (metric === "auto_rating") {
        value = p.auto_rating;
      } else if (metric === "age") {
        value = p.age;
      } else if (p.aggregatedStats) {
        value = p.aggregatedStats[metric];
      }

      if (value !== null) {
        if (bestValue === null) {
          bestValue = value;
          bestId = p.id;
        } else if (higherIsBetter && value > bestValue) {
          bestValue = value;
          bestId = p.id;
        } else if (!higherIsBetter && value < bestValue) {
          bestValue = value;
          bestId = p.id;
        }
      }
    });

    return bestId;
  };

  const StatRow = ({
    label,
    icon: Icon,
    getValue,
    metric,
    higherIsBetter = true,
  }: {
    label: string;
    icon?: typeof Trophy;
    getValue: (p: PlayerWithStats) => number | string | null;
    metric: keyof PlayerWithStats["aggregatedStats"] | "auto_rating" | "age";
    higherIsBetter?: boolean;
  }) => {
    const bestId = getBestValue(metric, higherIsBetter);

    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedPlayers.length}, 1fr)` }}>
        {selectedPlayers.map((player) => {
          const value = getValue(player);
          const isBest = bestId === player.id;

          return (
            <div
              key={player.id}
              className={cn(
                "p-3 rounded-lg text-center transition-colors",
                isBest ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/30"
              )}
            >
              {Icon && <Icon className={cn("w-4 h-4 mx-auto mb-1", isBest ? "text-primary" : "text-muted-foreground")} />}
              <p className={cn("text-lg font-bold", isBest && "text-primary")}>
                {value ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/players">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Comparar Atletas</h1>
          <p className="text-muted-foreground">
            Selecione de 2 a 4 atletas para comparar
          </p>
        </div>
      </div>

      {/* Player Selection */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((slotIndex) => {
          const player = selectedPlayers[slotIndex];

          if (player) {
            return (
              <Card key={slotIndex} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemovePlayer(player.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-secondary/50 mb-3">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate">{player.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{player.position}</p>
                  {player.auto_rating !== null && (
                    <div className="mt-2">
                      <PlayerRatingBadge rating={player.auto_rating} size="sm" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }

          // Empty slot
          if (slotIndex < 2 || selectedPlayers.length >= slotIndex) {
            return (
              <Popover
                key={slotIndex}
                open={openSelector === slotIndex}
                onOpenChange={(open) => setOpenSelector(open ? slotIndex : null)}
              >
                <PopoverTrigger asChild>
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Plus className="w-8 h-8 mb-2" />
                      <p className="text-sm">Selecionar Atleta</p>
                    </CardContent>
                  </Card>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar atleta..." />
                    <CommandList>
                      <CommandEmpty>Nenhum atleta encontrado.</CommandEmpty>
                      <CommandGroup>
                        {availablePlayers.map((player) => (
                          <CommandItem
                            key={player.id}
                            value={player.full_name}
                            onSelect={() => handleSelectPlayer(player, slotIndex)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary/50 flex-shrink-0">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{player.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {player.position} • {player.current_club || "Sem clube"}
                                </p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          }

          return null;
        })}
      </div>

      {loadingStats && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando estatísticas...</span>
        </div>
      )}

      {/* Comparison Content */}
      {selectedPlayers.length >= 2 && (
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                label="Nota Automática"
                icon={Star}
                getValue={(p) => p.auto_rating !== null ? formatFixed(p.auto_rating, 1) : null}
                metric="auto_rating"
              />
              <StatRow
                label="Idade"
                getValue={(p) => p.age}
                metric="age"
                higherIsBetter={false}
              />
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${selectedPlayers.length}, 1fr)` }}
              >
                {selectedPlayers.map((player) => (
                  <div key={player.id} className="p-3 rounded-lg bg-secondary/30 text-center">
                    <p className="text-sm font-medium truncate">
                      {player.current_club || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Clube Atual</p>
                  </div>
                ))}
              </div>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${selectedPlayers.length}, 1fr)` }}
              >
                {selectedPlayers.map((player) => (
                  <div key={player.id} className="p-3 rounded-lg bg-secondary/30 text-center">
                    <Badge variant="outline">{player.position}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Posição</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Estatísticas ({currentYear})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                label="Jogos"
                icon={Trophy}
                getValue={(p) => p.aggregatedStats?.matches ?? null}
                metric="matches"
              />
              <StatRow
                label="Minutos"
                icon={Clock}
                getValue={(p) => p.aggregatedStats?.minutes ?? null}
                metric="minutes"
              />
              <StatRow
                label="Gols"
                icon={Target}
                getValue={(p) => p.aggregatedStats?.goals ?? null}
                metric="goals"
              />
              <StatRow
                label="Assistências"
                getValue={(p) => p.aggregatedStats?.assists ?? null}
                metric="assists"
              />
              <StatRow
                label="Amarelos"
                getValue={(p) => p.aggregatedStats?.yellow_cards ?? null}
                metric="yellow_cards"
                higherIsBetter={false}
              />
              <StatRow
                label="Vermelhos"
                getValue={(p) => p.aggregatedStats?.red_cards ?? null}
                metric="red_cards"
                higherIsBetter={false}
              />
              <StatRow
                label="Desarmes"
                icon={Shield}
                getValue={(p) => p.aggregatedStats?.tackles ?? null}
                metric="tackles"
              />
              <StatRow
                label="Interceptações"
                getValue={(p) => p.aggregatedStats?.interceptions ?? null}
                metric="interceptions"
              />
              <StatRow
                label="Recuperações"
                getValue={(p) => p.aggregatedStats?.recoveries ?? null}
                metric="recoveries"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {selectedPlayers.length < 2 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Selecione pelo menos 2 atletas para comparar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparePlayers;
