import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  Search,
  Calendar,
  Filter,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import {
  fetchUnifiedPlayerStats,
  aggregateUnifiedStats,
  getAvailableYears,
  getAvailableCompetitions,
  type UnifiedStats,
  type AggregatedUnifiedStats,
} from "@/hooks/useUnifiedPlayerStats";
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

interface PlayerWithStats extends Player {
  stats: UnifiedStats[];
  filteredStats: UnifiedStats[];
  aggregatedStats: AggregatedUnifiedStats | null;
}

const currentYear = new Date().getFullYear();

const ComparePlayers = () => {
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get("debugCompare") === "1";
  
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [openSelector, setOpenSelector] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"absolute" | "per90">("absolute");
  
  // Filters - season and competition
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");

  // Debug logging helper
  const debugLog = useCallback((label: string, data: any) => {
    if (debugMode) {
      console.log(`[Compare Debug] ${label}:`, data);
    }
  }, [debugMode]);

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

  // Compute available years/competitions from all selected players
  const availableYears = useMemo(() => {
    const allStats = selectedPlayers.flatMap(p => p.stats);
    return getAvailableYears(allStats);
  }, [selectedPlayers]);

  const availableCompetitions = useMemo(() => {
    const allStats = selectedPlayers.flatMap(p => p.stats);
    // Filter by season if set
    const filtered = seasonFilter !== "all" 
      ? allStats.filter(s => s.season_year === parseInt(seasonFilter))
      : allStats;
    return getAvailableCompetitions(filtered);
  }, [selectedPlayers, seasonFilter]);

  // No auto-select of season - respect user's "all" choice for career view
  // Users can manually change to specific seasons if needed

  // Reset competition filter when season changes
  useEffect(() => {
    setCompetitionFilter("all");
  }, [seasonFilter]);

  // Apply filters to player stats
  const filteredPlayers = useMemo(() => {
    return selectedPlayers.map(player => {
      let filteredStats = player.stats;

      // Filter by season
      if (seasonFilter !== "all") {
        filteredStats = filteredStats.filter(s => s.season_year === parseInt(seasonFilter));
      }

      // Filter by competition
      if (competitionFilter !== "all") {
        filteredStats = filteredStats.filter(s => s.competition_id === competitionFilter);
      }

      // Re-aggregate with filtered stats
      const aggregatedStats = aggregateUnifiedStats(filteredStats);

      debugLog(`Player ${player.full_name} filtered stats`, {
        seasonFilter,
        competitionFilter,
        originalCount: player.stats.length,
        filteredCount: filteredStats.length,
        sources: filteredStats.map(s => ({ 
          competition: s.competition_name, 
          season: s.season_year,
          source: s.data_source,
          matches: s.matches,
          minutes: s.minutes
        })),
        aggregated: aggregatedStats
      });

      return {
        ...player,
        filteredStats,
        aggregatedStats,
      };
    });
  }, [selectedPlayers, seasonFilter, competitionFilter, debugLog]);

  const handleSelectPlayer = async (player: Player, slotIndex: number) => {
    if (selectedPlayers.find((p) => p.id === player.id)) {
      setOpenSelector(null);
      return;
    }

    setLoadingStats(true);
    
    // Fetch unified stats (LIVE priority over MANUAL, never combined)
    const stats = await fetchUnifiedPlayerStats(player.id);
    
    debugLog(`Fetched stats for ${player.full_name}`, {
      totalRows: stats.length,
      bySource: stats.reduce((acc, s) => {
        acc[s.data_source] = (acc[s.data_source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      details: stats.map(s => ({
        competition: s.competition_name,
        season: s.season_year,
        source: s.data_source,
        matches: s.matches,
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        passes: `${s.accurate_passes}/${s.total_passes}`,
        shots: s.shots
      }))
    });
    
    // Initial aggregation (will be re-filtered by useMemo)
    const aggregatedStats = aggregateUnifiedStats(stats);

    const playerWithStats: PlayerWithStats = {
      ...player,
      stats,
      filteredStats: stats,
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

  // Create stat values array - USES filteredPlayers for current filter context
  const createStatValues = (
    getValue: (p: PlayerWithStats) => number | string | null,
    getPer90Value?: (p: PlayerWithStats) => number | null
  ) => {
    return filteredPlayers.map((p) => ({
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

  const PlayerSelector = ({ slotIndex, required = false }: { slotIndex: number; required?: boolean }) => {
    const isMobile = useIsMobile();
    const [searchQuery, setSearchQuery] = useState("");
    const isOpen = openSelector === slotIndex;

    const filteredPlayers = useMemo(() => {
      if (!searchQuery.trim()) return availablePlayers;
      const query = searchQuery.toLowerCase();
      return availablePlayers.filter((p) =>
        p.full_name.toLowerCase().includes(query) ||
        p.position.toLowerCase().includes(query) ||
        (p.current_club && p.current_club.toLowerCase().includes(query))
      );
    }, [availablePlayers, searchQuery]);

    const handleClose = () => {
      setOpenSelector(null);
      setSearchQuery("");
    };

    const handleSelect = (player: Player) => {
      handleSelectPlayer(player, slotIndex);
      setSearchQuery("");
    };

    // Player list item component
    const PlayerListItem = ({ player }: { player: Player }) => {
      const posColor = getPositionColor(player.position);
      return (
        <div
          onClick={() => handleSelect(player)}
          className="flex items-center gap-3 w-full p-3 cursor-pointer hover:bg-zinc-800 active:bg-zinc-700 transition-colors rounded-lg"
        >
          <div className={cn(
            "w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 ring-2",
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
                <User className="w-5 h-5 text-zinc-600" />
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
      );
    };

    // Mobile: Drawer
    if (isMobile) {
      return (
        <>
          <div onClick={() => setOpenSelector(slotIndex)}>
            <CompareEmptySlot
              index={slotIndex}
              required={required}
              onClick={() => setOpenSelector(slotIndex)}
            />
          </div>
          <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DrawerContent className="bg-zinc-900 border-zinc-800 max-h-[85vh]">
              <DrawerHeader className="border-b border-zinc-800 pb-4">
                <DrawerTitle className="text-zinc-100">Selecionar Atleta</DrawerTitle>
              </DrawerHeader>
              
              {/* Search Input - No autoFocus */}
              <div className="p-4 border-b border-zinc-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Buscar atleta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* Scrollable Player List */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-2" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                {filteredPlayers.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8">Nenhum atleta encontrado.</p>
                ) : (
                  <div className="space-y-1">
                    {safeArray(filteredPlayers).map((player) => (
                      <PlayerListItem key={player.id} player={player} />
                    ))}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      );
    }

    // Desktop: Popover with Command
    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => (open ? setOpenSelector(slotIndex) : handleClose())}
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
                      onSelect={() => handleSelect(player)}
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
  };

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
            {/* Season Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                <SelectTrigger className="h-8 w-[120px] text-xs bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Temporada" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">Todas</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Competition Filter */}
            {availableCompetitions.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                  <SelectTrigger className="h-8 w-[180px] text-xs bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Competição" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all">Todas</SelectItem>
                    {availableCompetitions.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                players={filteredPlayers.map((p) => ({
                  ...p,
                  statsRows: p.filteredStats.map((s) => ({
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
                    clearances: 0, // Not in unified view, use recoveries
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
            players={filteredPlayers.map((p) => ({
              id: p.id,
              name: p.full_name,
              position: p.position,
              statsRows: p.filteredStats.map((s) => ({
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
                clearances: 0, // Not in unified view, use recoveries
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
