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
import { Loader2, ChevronLeft, ChevronRight, Eye, Calendar } from "lucide-react";
import { safeArray } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { fadeInUp, staggerContainer, staggerItem, smoothTransition, buttonHover, buttonTap, pillHover } from "@/lib/animations";

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
}

interface PlayerMinutes {
  player_id: string;
  total_minutes: number;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const currentYear = new Date().getFullYear();
const availableYears = [currentYear, currentYear - 1, currentYear - 2];

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerMinutes, setPlayerMinutes] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("todos");
  const [nationalityFilter, setNationalityFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedYear, setSelectedYear] = useState(currentYear);
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

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url, auto_rating, dominant_foot, height")
        .eq("is_public", true)
        .order("full_name");

      if (data) {
        setPlayers(data as Player[]);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  // Fetch minutes for selected year
  useEffect(() => {
    const fetchMinutes = async () => {
      if (players.length === 0) return;
      
      const playerIds = players.map(p => p.id);
      
      const { data, error } = await supabase
        .from("player_stats")
        .select("player_id, minutes")
        .in("player_id", playerIds)
        .eq("season_year", selectedYear);

      if (data) {
        // Aggregate minutes per player
        const minutesMap = new Map<string, number>();
        data.forEach((stat) => {
          const current = minutesMap.get(stat.player_id) || 0;
          minutesMap.set(stat.player_id, current + (stat.minutes || 0));
        });
        setPlayerMinutes(minutesMap);
      }
    };

    fetchMinutes();
  }, [players, selectedYear]);

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
      className="min-h-screen"
      style={{ 
        backgroundColor: "#070910",
        fontFamily: "'Poppins', sans-serif" 
      }}
    >
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>
      
      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-[var(--padding-mobile)] md:px-12 lg:px-16">
        
        {/* Header Section - Editorial */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="pt-28 pb-10 md:pt-40 md:pb-16"
        >
          {/* Micro label */}
          <motion.p 
            className="text-[11px] uppercase tracking-[0.35em] text-neutral-500 font-medium mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Portfólio
          </motion.p>
          
          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-4 md:mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Nossos{" "}
            <span className="text-[#e52421]">Atletas</span>
          </motion.h1>
          
          {/* Subtitle - Europa level copy */}
          <motion.p 
            className="text-neutral-400 text-base md:text-xl font-light max-w-2xl leading-relaxed tracking-wide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Curadoria, dados e contexto competitivo. Portfólio pronto para decisão.
          </motion.p>
        </motion.section>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-8 md:mb-10" />

        {/* Control Bar */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 md:mb-6"
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

        {/* Results Count + Year Filter + Scouting Mode Toggle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col gap-4 mb-8 md:mb-10"
        >
          <p className="text-sm text-neutral-500 font-light tracking-wide">
            {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} no portfólio
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Filter - Pill Style */}
            <motion.div 
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-pill)] min-h-[var(--tap-target)]"
              style={{
                background: 'var(--bg-glass)',
                border: 'var(--border-glass)',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calendar className="w-4 h-4 text-neutral-500" />
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger 
                  className="w-[80px] h-8 bg-transparent border-0 text-white text-sm p-0 focus:ring-0"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-white/10 rounded-[var(--radius-button)]">
                  {availableYears.map((year) => (
                    <SelectItem 
                      key={year} 
                      value={String(year)}
                      className="text-white focus:bg-white/10 focus:text-white rounded-[var(--radius-button)]"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            {/* Scouting Mode Toggle - Pill Style */}
            <motion.div 
              className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-pill)] min-h-[var(--tap-target)] transition-all duration-200"
              style={{
                background: scoutingMode ? 'rgba(229, 36, 33, 0.08)' : 'var(--bg-glass)',
                border: scoutingMode ? '1px solid rgba(229, 36, 33, 0.2)' : 'var(--border-glass)',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
          </div>
        ) : filteredPlayers.length > 0 ? (
          <>
            {/* Athletes Grid - Responsive with generous spacing */}
            <motion.div 
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4 xl:gap-8"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {safeArray(paginatedPlayers).map((player, index) => (
                <motion.div
                  key={player.id}
                  variants={staggerItem}
                  custom={index}
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
                    totalMinutes={playerMinutes.get(player.id) || null}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-between gap-6 py-12 md:py-16 border-t border-white/5 mt-12 md:mt-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {/* Info & Items per page */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
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
                      <SelectTrigger className="w-[70px] h-10 bg-transparent border-white/10 text-white rounded-[var(--radius-button)] focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-white/10 rounded-[var(--radius-button)]">
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
                  <motion.button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-10 h-10 min-h-[var(--tap-target)] flex items-center justify-center rounded-[var(--radius-button)] border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                    whileHover={currentPage !== 1 ? buttonHover : {}}
                    whileTap={currentPage !== 1 ? buttonTap : {}}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  
                  {safeArray(getPageNumbers()).map((page, index) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-3 text-neutral-600">
                        …
                      </span>
                    ) : (
                      <motion.button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 min-h-[var(--tap-target)] flex items-center justify-center rounded-[var(--radius-button)] text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? "bg-white text-black"
                            : "border border-white/10 text-white hover:border-white/20 hover:bg-white/5"
                        }`}
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                      >
                        {page}
                      </motion.button>
                    )
                  )}
                  
                  <motion.button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 min-h-[var(--tap-target)] flex items-center justify-center rounded-[var(--radius-button)] border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                    whileHover={currentPage !== totalPages ? buttonHover : {}}
                    whileTap={currentPage !== totalPages ? buttonTap : {}}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
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
