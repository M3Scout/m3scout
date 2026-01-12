import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerCard } from "@/components/players/PlayerCard";
import { FeaturedPlayerCard } from "@/components/players/FeaturedPlayerCard";
import { PlayerFilters } from "@/components/players/PlayerFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { safeArray } from "@/lib/utils";

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
  auto_rating: number | null;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const FEATURED_COUNT = 2; // Number of featured athletes to show

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
      const { data, error } = await supabase
        .from("players")
        .select("id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url, auto_rating")
        .eq("is_public", true)
        .order("full_name");

      if (data) {
        setPlayers(data);
      }
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
    <div className="min-h-screen bg-black">
      {/* Main Container */}
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-8">
        
        {/* Header Section */}
        <section className="pt-32 pb-12">
          {/* Eyebrow */}
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">
            Portfólio
          </p>
          
          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-4">
            Nossos{" "}
            <span className="text-[#e52421] italic">Atletas</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-zinc-400 text-lg max-w-2xl">
            Explore nosso portfólio completo de atletas. Use os filtros para encontrar 
            o perfil ideal para suas necessidades.
          </p>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-800 mb-8" />

        {/* Filters */}
        <section className="mb-8">
          <PlayerFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            positionFilter={positionFilter}
            onPositionChange={setPositionFilter}
            nationalityFilter={nationalityFilter}
            onNationalityChange={setNationalityFilter}
          />
        </section>

        {/* Results Count */}
        <div className="mb-8">
          <p className="text-sm text-zinc-500">
            {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} encontrado{filteredPlayers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : filteredPlayers.length > 0 ? (
          <>
            {/* Athletes Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-7 2xl:grid-cols-5">
              {safeArray(paginatedPlayers).map((player, index) => {
                // Show featured cards only on first page for top-rated players
                const isFeatured = currentPage === 1 && index < FEATURED_COUNT && (player.auto_rating ?? 0) >= 3.5;
                
                if (isFeatured) {
                  return (
                    <FeaturedPlayerCard
                      key={player.id}
                      id={player.id}
                      slug={player.slug}
                      name={player.full_name}
                      position={player.position}
                      age={player.age || 0}
                      nationality={player.nationality}
                      currentClub={player.current_club || ""}
                      imageUrl={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                      autoRating={player.auto_rating}
                    />
                  );
                }
                
                return (
                  <div 
                    key={player.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
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
                      autoRating={player.auto_rating}
                    />
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-16 border-t border-zinc-800 mt-12">
                {/* Info & Items per page */}
                <div className="flex items-center gap-6">
                  <p className="text-sm text-zinc-500">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredPlayers.length)} de {filteredPlayers.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-600">Itens:</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-9 bg-transparent border-zinc-800 text-white rounded-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none">
                        {safeArray(PAGE_SIZE_OPTIONS).map((size) => (
                          <SelectItem 
                            key={size} 
                            value={String(size)}
                            className="text-white focus:bg-zinc-800 focus:text-white rounded-none"
                          >
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center border border-zinc-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {safeArray(getPageNumbers()).map((page, index) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-3 text-zinc-600">
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 flex items-center justify-center border text-sm font-medium transition-colors ${
                          currentPage === page
                            ? "bg-white text-black border-white"
                            : "border-zinc-800 text-white hover:border-zinc-600"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center border border-zinc-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-zinc-500">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="pb-16" />
      </div>
    </div>
  );
};

export default Players;
