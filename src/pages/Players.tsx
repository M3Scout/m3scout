import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AthleteCardPremium } from "@/components/players/AthleteCardPremium";
import { ControlBarPremium } from "@/components/players/ControlBarPremium";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { safeArray } from "@/lib/utils";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

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
  // Scouting mode fields
  dominant_foot: string | null;
  height: number | null;
  estimated_level: string | null;
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
  const [scoutingMode, setScoutingMode] = useState(() => {
    const saved = localStorage.getItem('m3-scouting-mode');
    return saved === 'true';
  });

  // Persist scouting mode preference
  useEffect(() => {
    localStorage.setItem('m3-scouting-mode', String(scoutingMode));
  }, [scoutingMode]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url, auto_rating, dominant_foot, height, estimated_level")
        .eq("is_public", true)
        .order("full_name");

      if (data) {
        setPlayers(data as Player[]);
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
    <div 
      className="min-h-screen bg-[#080808]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette effect */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16">
        
        {/* Header Section - Editorial */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="pt-32 pb-12 md:pt-40 md:pb-16"
        >
          {/* Micro label */}
          <p className="text-[11px] uppercase tracking-[0.35em] text-neutral-500 font-medium mb-4">
            Portfólio
          </p>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-5">
            Nossos{" "}
            <span className="text-[#e52421]">Atletas</span>
          </h1>
          
          {/* Subtitle - Europa level copy */}
          <p className="text-neutral-400 text-lg md:text-xl font-light max-w-2xl leading-relaxed tracking-wide">
            Curadoria, dados e contexto competitivo. Portfólio pronto para decisão.
          </p>
        </motion.section>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-10" />

        {/* Control Bar */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6"
        >
          <ControlBarPremium
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            positionFilter={positionFilter}
            onPositionChange={setPositionFilter}
            nationalityFilter={nationalityFilter}
            onNationalityChange={setNationalityFilter}
          />
        </motion.section>

        {/* Results Count + Scouting Mode Toggle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10"
        >
          <p className="text-sm text-neutral-500 font-light tracking-wide">
            {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} no portfólio
          </p>
          
          {/* Scouting Mode Toggle */}
          <div 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200"
            style={{
              background: scoutingMode ? 'rgba(229, 36, 33, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: scoutingMode ? '1px solid rgba(229, 36, 33, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <Eye className={`w-4 h-4 transition-colors duration-200 ${scoutingMode ? 'text-[#e52421]' : 'text-neutral-500'}`} />
            <span className={`text-sm font-medium tracking-wide transition-colors duration-200 ${scoutingMode ? 'text-white' : 'text-neutral-400'}`}>
              Modo Scouting
            </span>
            <Switch
              checked={scoutingMode}
              onCheckedChange={setScoutingMode}
              className="data-[state=checked]:bg-[#e52421]"
            />
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
          </div>
        ) : filteredPlayers.length > 0 ? (
          <>
            {/* Athletes Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
              {safeArray(paginatedPlayers).map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: Math.min(index * 0.05, 0.3),
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                >
                  <AthleteCardPremium
                    id={player.id}
                    slug={player.slug}
                    name={player.full_name}
                    position={player.position}
                    age={player.age || 0}
                    nationality={player.nationality}
                    currentClub={player.current_club || ""}
                    imageUrl={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                    scoutingMode={scoutingMode}
                    dominantFoot={player.dominant_foot}
                    height={player.height}
                    currentLeague={player.estimated_level}
                  />
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-16 border-t border-white/5 mt-16">
                {/* Info & Items per page */}
                <div className="flex items-center gap-6">
                  <p className="text-sm text-neutral-500 font-light">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredPlayers.length)} de {filteredPlayers.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600">Itens:</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-9 bg-transparent border-white/10 text-white rounded-lg focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-white/10 rounded-lg">
                        {safeArray(PAGE_SIZE_OPTIONS).map((size) => (
                          <SelectItem 
                            key={size} 
                            value={String(size)}
                            className="text-white focus:bg-white/10 focus:text-white rounded-md"
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
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {safeArray(getPageNumbers()).map((page, index) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-3 text-neutral-600">
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? "bg-white text-black"
                            : "border border-white/10 text-white hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-32">
            <p className="text-neutral-500 font-light">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="pb-16" />
      </div>
    </div>
  );
};

export default Players;
