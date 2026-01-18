import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  User,
  Trophy,
  Target,
  Shield,
  Activity,
  Footprints,
  Info,
} from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import { formatFixed } from "@/lib/formatters";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { ComparisonRadarOverlay } from "@/components/players/ComparisonRadarOverlay";
import { CompareHero } from "@/components/compare/CompareHero";
import { ComparePlayerCard, CompareEmptySlot } from "@/components/compare/ComparePlayerCard";
import { CompareStatRow, CompareStatBlock, CompareBarRow } from "@/components/compare/CompareStatBlock";
import { SimilarPlayerSuggestions } from "@/components/compare/SimilarPlayerSuggestions";
import { ExportComparePdfButton } from "@/components/compare/ExportComparePdfButton";
import type { PlayerStatRow } from "@/lib/attributeRadar";

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
  height: number | null;
  dominant_foot: string | null;
}

interface FullPlayerStats {
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
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  duels_won: number;
  total_duels: number;
  accurate_passes: number;
  total_passes: number;
  successful_dribbles: number;
  total_dribbles: number;
  clearances: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
}

interface PlayerWithStats extends Player {
  stats: FullPlayerStats[];
  aggregatedStats: AggregatedStats | null;
}

interface AggregatedStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  duels_won: number;
  total_duels: number;
  accurate_passes: number;
  total_passes: number;
  successful_dribbles: number;
  total_dribbles: number;
  clearances: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
}

const currentYear = new Date().getFullYear();

const ComparePlayers = () => {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [openSelector, setOpenSelector] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"absolute" | "per90">("absolute");
  const [seasonFilter, setSeasonFilter] = useState<string>(currentYear.toString());

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, full_name, position, age, nationality, current_club, photo_url, auto_rating, is_archived, height, dominant_foot")
      .or("is_archived.eq.false,is_archived.is.null")
      .order("full_name");

    if (data) {
      setAllPlayers(data);
    }
    setLoading(false);
  };

  const fetchPlayerStats = async (playerId: string): Promise<FullPlayerStats[]> => {
    const { data } = await supabase
      .from("player_stats")
      .select("*")
      .eq("player_id", playerId);

    return (data as FullPlayerStats[]) || [];
  };

  const handleSelectPlayer = async (player: Player, slotIndex: number) => {
    if (selectedPlayers.find((p) => p.id === player.id)) {
      setOpenSelector(null);
      return;
    }

    setLoadingStats(true);
    const stats = await fetchPlayerStats(player.id);
    
    // Aggregate all stats
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
            shots: acc.shots + (s.shots ?? 0),
            shots_on_target: acc.shots_on_target + (s.shots_on_target ?? 0),
            key_passes: acc.key_passes + (s.key_passes ?? 0),
            chances_created: acc.chances_created + (s.chances_created ?? 0),
            duels_won: acc.duels_won + (s.duels_won ?? 0),
            total_duels: acc.total_duels + (s.total_duels ?? 0),
            accurate_passes: acc.accurate_passes + (s.accurate_passes ?? 0),
            total_passes: acc.total_passes + (s.total_passes ?? 0),
            successful_dribbles: acc.successful_dribbles + (s.successful_dribbles ?? 0),
            total_dribbles: acc.total_dribbles + (s.total_dribbles ?? 0),
            clearances: acc.clearances + (s.clearances ?? 0),
            aerial_duels_won: acc.aerial_duels_won + (s.aerial_duels_won ?? 0),
            aerial_duels_total: acc.aerial_duels_total + (s.aerial_duels_total ?? 0),
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
            shots: 0,
            shots_on_target: 0,
            key_passes: 0,
            chances_created: 0,
            duels_won: 0,
            total_duels: 0,
            accurate_passes: 0,
            total_passes: 0,
            successful_dribbles: 0,
            total_dribbles: 0,
            clearances: 0,
            aerial_duels_won: 0,
            aerial_duels_total: 0,
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

  // Helper to calculate per 90 stats
  const per90 = (value: number | null, minutes: number | null): number | null => {
    if (value === null || minutes === null || minutes === 0) return null;
    return (value / minutes) * 90;
  };

  // Create stat values array
  const createStatValues = (
    getValue: (p: PlayerWithStats) => number | string | null,
    getPer90Value?: (p: PlayerWithStats) => number | null
  ) => {
    return selectedPlayers.map((p) => ({
      playerId: p.id,
      playerName: p.full_name,
      position: p.position,
      value: getValue(p),
      per90: getPer90Value ? getPer90Value(p) : undefined,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const PlayerSelector = ({ slotIndex, required = false }: { slotIndex: number; required?: boolean }) => (
    <Popover
      open={openSelector === slotIndex}
      onOpenChange={(open) => setOpenSelector(open ? slotIndex : null)}
    >
      <PopoverTrigger asChild>
        <div>
          <CompareEmptySlot
            index={slotIndex}
            required={required}
            onClick={() => setOpenSelector(slotIndex)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-zinc-900 border-zinc-800" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-transparent" shouldFilter={true}>
          <CommandInput 
            placeholder="Buscar atleta..." 
            className="border-zinc-800"
            autoFocus={false}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhum atleta encontrado.</CommandEmpty>
            <CommandGroup>
              {safeArray(availablePlayers).map((player) => {
                const posColor = getPositionColor(player.position);
                return (
                  <CommandItem
                    key={player.id}
                    value={player.full_name}
                    onSelect={() => handleSelectPlayer(player, slotIndex)}
                    className="cursor-pointer hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={cn(
                        "w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-2",
                        posColor.ringClass
                      )}>
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-4 h-4 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-200 truncate">{player.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                            posColor.bgClass,
                            posColor.textClass
                          )}>
                            {getShortPosition(player.position)}
                          </span>
                          <span className="text-xs text-zinc-500 truncate">
                            {player.current_club || "Sem clube"}
                          </span>
                        </div>
                      </div>
                      {player.auto_rating !== null && (
                        <span className="text-sm font-bold text-zinc-400">
                          {formatFixed(player.auto_rating, 0)}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <CompareHero playersCount={selectedPlayers.length} />

      {/* Player Selection Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {[0, 1, 2, 3].map((slotIndex) => {
            const player = selectedPlayers[slotIndex];

            if (player) {
              return (
                <ComparePlayerCard
                  key={player.id}
                  player={player}
                  onRemove={() => handleRemovePlayer(player.id)}
                  index={slotIndex}
                />
              );
            }

            // Show slot if it's required (first two) or if we have enough players
            if (slotIndex < 2 || selectedPlayers.length >= slotIndex) {
              return (
                <PlayerSelector
                  key={`slot-${slotIndex}`}
                  slotIndex={slotIndex}
                  required={slotIndex < 2}
                />
              );
            }

            return null;
          })}
        </AnimatePresence>
      </div>

      {/* Smart Suggestions - Show when at least 1 player selected and less than 4 */}
      {selectedPlayers.length >= 1 && selectedPlayers.length < 4 && (
        <SimilarPlayerSuggestions
          selectedPlayers={selectedPlayers}
          allPlayers={allPlayers}
          onSelectPlayer={(player) => handleSelectPlayer(player as Player, selectedPlayers.length)}
        />
      )}

      {loadingStats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-6"
        >
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-3 text-zinc-400">Carregando estatísticas...</span>
        </motion.div>
      )}

      {/* Comparison Content */}
      {selectedPlayers.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Modo:</span>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "absolute" | "per90")}>
                <TabsList className="h-8 bg-zinc-800">
                  <TabsTrigger value="absolute" className="text-xs h-7 px-3">Absoluto</TabsTrigger>
                  <TabsTrigger value="per90" className="text-xs h-7 px-3">Por 90 min</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Export + Info */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Melhor valor destacado automaticamente</span>
              </div>
              <ExportComparePdfButton 
                players={selectedPlayers.map((p) => ({
                  ...p,
                  statsRows: p.stats.map((s) => ({
                    matches: s.matches,
                    minutes: s.minutes,
                    goals: s.goals,
                    assists: s.assists,
                    shots: s.shots ?? 0,
                    shots_on_target: s.shots_on_target ?? 0,
                    key_passes: s.key_passes ?? 0,
                    chances_created: s.chances_created ?? 0,
                    tackles: s.tackles,
                    interceptions: s.interceptions,
                    recoveries: s.recoveries,
                    duels_won: s.duels_won ?? 0,
                    total_duels: s.total_duels ?? 0,
                    yellow_cards: s.yellow_cards,
                    red_cards: s.red_cards,
                    accurate_passes: s.accurate_passes ?? 0,
                    total_passes: s.total_passes ?? 0,
                    successful_dribbles: s.successful_dribbles ?? 0,
                    total_dribbles: s.total_dribbles ?? 0,
                    clearances: s.clearances ?? 0,
                    aerial_duels_won: s.aerial_duels_won ?? 0,
                    aerial_duels_total: s.aerial_duels_total ?? 0,
                    ground_duels_won: s.ground_duels_won ?? 0,
                    ground_duels_total: s.ground_duels_total ?? 0,
                    saves: s.saves ?? 0,
                    goals_conceded: s.goals_conceded ?? 0,
                    clean_sheets: s.clean_sheets ?? 0,
                    penalties_saved: s.penalties_saved ?? 0,
                    errors_leading_to_goal: s.errors_leading_to_goal ?? 0,
                  })),
                }))}
              />
            </div>
          </div>

          {/* Radar Comparison */}
          <ComparisonRadarOverlay
            players={selectedPlayers.map((p) => ({
              id: p.id,
              name: p.full_name,
              position: p.position,
              statsRows: p.stats.map((s) => ({
                matches: s.matches,
                minutes: s.minutes,
                goals: s.goals,
                assists: s.assists,
                shots: s.shots ?? 0,
                shots_on_target: s.shots_on_target ?? 0,
                key_passes: s.key_passes ?? 0,
                chances_created: s.chances_created ?? 0,
                tackles: s.tackles,
                interceptions: s.interceptions,
                recoveries: s.recoveries,
                duels_won: s.duels_won ?? 0,
                total_duels: s.total_duels ?? 0,
                yellow_cards: s.yellow_cards,
                red_cards: s.red_cards,
                accurate_passes: s.accurate_passes ?? 0,
                total_passes: s.total_passes ?? 0,
                successful_dribbles: s.successful_dribbles ?? 0,
                total_dribbles: s.total_dribbles ?? 0,
                clearances: s.clearances ?? 0,
                aerial_duels_won: s.aerial_duels_won ?? 0,
                aerial_duels_total: s.aerial_duels_total ?? 0,
                ground_duels_won: s.ground_duels_won ?? 0,
                ground_duels_total: s.ground_duels_total ?? 0,
                saves: s.saves ?? 0,
                goals_conceded: s.goals_conceded ?? 0,
                clean_sheets: s.clean_sheets ?? 0,
                penalties_saved: s.penalties_saved ?? 0,
                errors_leading_to_goal: s.errors_leading_to_goal ?? 0,
              })),
            }))}
            loading={loadingStats}
          />

          {/* Stats Blocks Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Block 1 - Visão Geral */}
            <CompareStatBlock title="Visão Geral" icon={User}>
              <CompareStatRow
                label="Nota Global"
                values={createStatValues((p) => p.auto_rating)}
                format="decimal"
              />
              <CompareStatRow
                label="Idade"
                values={createStatValues((p) => p.age)}
                higherIsBetter={false}
              />
              <CompareStatRow
                label="Altura (cm)"
                values={createStatValues((p) => p.height)}
              />
              <CompareStatRow
                label="Jogos"
                values={createStatValues((p) => p.aggregatedStats?.matches ?? null)}
              />
              <CompareStatRow
                label="Minutos"
                values={createStatValues((p) => p.aggregatedStats?.minutes ?? null)}
              />
            </CompareStatBlock>

            {/* Block 2 - Produção Ofensiva */}
            <CompareStatBlock title="Produção Ofensiva" icon={Target}>
              <CompareStatRow
                label="Gols"
                values={createStatValues(
                  (p) => p.aggregatedStats?.goals ?? null,
                  (p) => per90(p.aggregatedStats?.goals ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Assistências"
                values={createStatValues(
                  (p) => p.aggregatedStats?.assists ?? null,
                  (p) => per90(p.aggregatedStats?.assists ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="G+A"
                values={createStatValues(
                  (p) => {
                    const g = p.aggregatedStats?.goals ?? 0;
                    const a = p.aggregatedStats?.assists ?? 0;
                    return g + a;
                  },
                  (p) => per90((p.aggregatedStats?.goals ?? 0) + (p.aggregatedStats?.assists ?? 0), p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Finalizações"
                values={createStatValues(
                  (p) => p.aggregatedStats?.shots ?? null,
                  (p) => per90(p.aggregatedStats?.shots ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="% Conversão"
                values={createStatValues((p) => {
                  const shots = p.aggregatedStats?.shots;
                  const goals = p.aggregatedStats?.goals;
                  if (!shots || shots === 0) return null;
                  return Math.round((goals ?? 0) / shots * 100);
                })}
                format="percent"
              />
            </CompareStatBlock>

            {/* Block 3 - Construção & Jogo */}
            <CompareStatBlock title="Construção & Jogo" icon={Footprints}>
              <CompareStatRow
                label="% Passes"
                values={createStatValues((p) => {
                  const acc = p.aggregatedStats?.accurate_passes;
                  const total = p.aggregatedStats?.total_passes;
                  if (!total || total === 0) return null;
                  return Math.round((acc ?? 0) / total * 100);
                })}
                format="percent"
              />
              <CompareStatRow
                label="Passes Decisivos"
                values={createStatValues(
                  (p) => p.aggregatedStats?.key_passes ?? null,
                  (p) => per90(p.aggregatedStats?.key_passes ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Chances Criadas"
                values={createStatValues(
                  (p) => p.aggregatedStats?.chances_created ?? null,
                  (p) => per90(p.aggregatedStats?.chances_created ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Dribles"
                values={createStatValues(
                  (p) => p.aggregatedStats?.successful_dribbles ?? null,
                  (p) => per90(p.aggregatedStats?.successful_dribbles ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="% Dribles"
                values={createStatValues((p) => {
                  const succ = p.aggregatedStats?.successful_dribbles;
                  const total = p.aggregatedStats?.total_dribbles;
                  if (!total || total === 0) return null;
                  return Math.round((succ ?? 0) / total * 100);
                })}
                format="percent"
              />
            </CompareStatBlock>

            {/* Block 4 - Defesa */}
            <CompareStatBlock title="Defesa" icon={Shield}>
              <CompareStatRow
                label="Desarmes"
                values={createStatValues(
                  (p) => p.aggregatedStats?.tackles ?? null,
                  (p) => per90(p.aggregatedStats?.tackles ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Interceptações"
                values={createStatValues(
                  (p) => p.aggregatedStats?.interceptions ?? null,
                  (p) => per90(p.aggregatedStats?.interceptions ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Recuperações"
                values={createStatValues(
                  (p) => p.aggregatedStats?.recoveries ?? null,
                  (p) => per90(p.aggregatedStats?.recoveries ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="Duelos Ganhos"
                values={createStatValues(
                  (p) => p.aggregatedStats?.duels_won ?? null,
                  (p) => per90(p.aggregatedStats?.duels_won ?? null, p.aggregatedStats?.minutes ?? null)
                )}
                per90Mode={viewMode === "per90"}
              />
              <CompareStatRow
                label="% Duelos"
                values={createStatValues((p) => {
                  const won = p.aggregatedStats?.duels_won;
                  const total = p.aggregatedStats?.total_duels;
                  if (!total || total === 0) return null;
                  return Math.round((won ?? 0) / total * 100);
                })}
                format="percent"
              />
            </CompareStatBlock>
          </div>

          {/* Bar Charts - Visual Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Comparação Visual</h3>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <CompareBarRow
                label="Gols"
                values={createStatValues((p) => p.aggregatedStats?.goals ?? 0)}
              />
              <CompareBarRow
                label="Assistências"
                values={createStatValues((p) => p.aggregatedStats?.assists ?? 0)}
              />
              <CompareBarRow
                label="Desarmes"
                values={createStatValues((p) => p.aggregatedStats?.tackles ?? 0)}
              />
              <CompareBarRow
                label="Recuperações"
                values={createStatValues((p) => p.aggregatedStats?.recoveries ?? 0)}
              />
            </div>
          </motion.div>

          {/* Discipline Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Disciplina</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CompareStatRow
                label="Amarelos"
                values={createStatValues((p) => p.aggregatedStats?.yellow_cards ?? null)}
                higherIsBetter={false}
              />
              <CompareStatRow
                label="Vermelhos"
                values={createStatValues((p) => p.aggregatedStats?.red_cards ?? null)}
                higherIsBetter={false}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Empty state when only 1 player */}
      {selectedPlayers.length === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Info className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">
              Adicione mais um atleta para iniciar a comparação
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ComparePlayers;
