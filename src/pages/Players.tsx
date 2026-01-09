import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters } from "@/components/players/PlayerFilters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { calculatePlayerRating } from "@/lib/playerRating";
import { type AggregatedStats } from "@/lib/playerStats";

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[];
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  autoRating?: number | null;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("todos");
  const [nationalityFilter, setNationalityFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    const fetchPlayers = async () => {
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from("players")
        .select("id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url")
        .eq("is_public", true)
        .order("full_name");

      if (!data) {
        setLoading(false);
        return;
      }

      // Fetch player stats for rating calculation
      const playerIds = data.map(p => p.id);
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("player_id, season_year, matches, minutes, goals, assists, yellow_cards, red_cards, tackles, interceptions, recoveries, competition_id, competitions(computed_coefficient)")
        .eq("season_year", currentYear)
        .in("player_id", playerIds);

      // Group stats by player
      const statsByPlayer: Record<string, { stats: AggregatedStats; maxCoef: number }> = {};
      statsData?.forEach((stat) => {
        const playerId = stat.player_id;
        const coef = (stat.competitions as any)?.computed_coefficient || 1.0;
        
        if (!statsByPlayer[playerId]) {
          statsByPlayer[playerId] = {
            stats: {
              season_year: currentYear,
              total_matches: 0,
              total_minutes: 0,
              total_goals: 0,
              total_assists: 0,
              total_yellow_cards: 0,
              total_red_cards: 0,
              total_tackles: 0,
              total_interceptions: 0,
              total_recoveries: 0,
              competitions_count: 0,
            },
            maxCoef: coef,
          };
        }
        
        const agg = statsByPlayer[playerId];
        agg.stats.total_matches += stat.matches || 0;
        agg.stats.total_minutes += stat.minutes || 0;
        agg.stats.total_goals += stat.goals || 0;
        agg.stats.total_assists += stat.assists || 0;
        agg.stats.total_yellow_cards += stat.yellow_cards || 0;
        agg.stats.total_red_cards += stat.red_cards || 0;
        agg.stats.total_tackles += stat.tackles || 0;
        agg.stats.total_interceptions += stat.interceptions || 0;
        agg.stats.total_recoveries += stat.recoveries || 0;
        agg.stats.competitions_count += 1;
        agg.maxCoef = Math.max(agg.maxCoef, coef);
      });

      // Calculate ratings
      const playersWithRatings = data.map((player) => {
        let autoRating: number | null = null;
        
        const playerStats = statsByPlayer[player.id];
        if (playerStats && playerStats.stats.total_minutes > 0) {
          const breakdown = calculatePlayerRating({
            age: player.age,
            position: player.position,
            competitionCoefficient: playerStats.maxCoef,
            stats: playerStats.stats,
          });
          autoRating = breakdown.rating0_5;
        }

        return {
          ...player,
          autoRating,
        };
      });

      setPlayers(playersWithRatings);
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "todos" || 
        player.position.toLowerCase().includes(positionFilter);
      const matchesNationality = nationalityFilter === "todos" || 
        player.nationality.toLowerCase() === nationalityFilter;
      
      return matchesSearch && matchesPosition && matchesNationality;
    });
  }, [players, searchQuery, positionFilter, nationalityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlayers, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, positionFilter, nationalityFilter]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Nossos <span className="gradient-text">Atletas</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Explore nosso portfólio completo de atletas. Use os filtros para encontrar 
            o perfil ideal para suas necessidades.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <PlayerFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            positionFilter={positionFilter}
            onPositionChange={setPositionFilter}
            nationalityFilter={nationalityFilter}
            onNationalityChange={setNationalityFilter}
          />
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} encontrado{filteredPlayers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPlayers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedPlayers.map((player, index) => (
                <div 
                  key={player.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PlayerCard
                    id={player.id}
                    slug={player.slug}
                    name={player.full_name}
                    position={player.position}
                    secondaryPositions={player.secondary_positions || []}
                    age={player.age || 0}
                    nationality={player.nationality}
                    currentClub={player.current_club || ""}
                    imageUrl={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                    autoRating={player.autoRating}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredPlayers.length)} de {filteredPlayers.length} atletas
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens:</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  {getPageNumbers().map((page, index) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => goToPage(page)}
                        className="w-9"
                      >
                        {page}
                      </Button>
                    )
                  )}
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
