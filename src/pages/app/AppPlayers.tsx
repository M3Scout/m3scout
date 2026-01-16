import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Filter, 
  Loader2,
  X,
  LayoutList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  AlertTriangle,
  RefreshCw,
  ChevronsDown,
  ClipboardList,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { ScoutingPlayerCard } from "@/components/players/ScoutingPlayerCard";
import { PositionIdentityCard, PositionIdentityCardMobile } from "@/components/players/PositionIdentityCard";
import { BulkRecalculateButton } from "@/components/players/BulkRecalculateButton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlayersListSkeleton } from "@/components/players/PlayersListSkeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { safeArray } from "@/lib/utils";

interface Player {
  id: string;
  slug?: string;
  full_name: string;
  position: string | null;
  secondary_positions?: string[] | null;
  age: number | null;
  nationality: string;
  current_club: string | null;
  contract_end: string | null;
  contract_status?: string | null;
  is_public: boolean;
  avg_score?: number | null;
  score_trend?: number | null; // Difference from previous evaluation
  photo_url?: string | null;
  auto_rating?: number | null;
  auto_rating_details?: any;
  is_archived?: boolean | null;
  height?: number | null;
  weight?: number | null;
  dominant_foot?: string | null;
  estimated_level?: string | null;
  overall_rating?: number | null;
  potential_rating?: number | null;
}

type SortField = "full_name" | "position" | "current_club" | "avg_score" | "auto_rating" | "contract_end" | "is_public";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "scouting";
type PaginationMode = "pages" | "infinite";

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const INFINITE_SCROLL_PAGE_SIZE = 24;

const AppPlayers = () => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; full_name: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [paginationMode, setPaginationMode] = useState<PaginationMode>("pages");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [visibleCount, setVisibleCount] = useState(INFINITE_SCROLL_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Filters
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const safePlayers = useMemo(() => (Array.isArray(players) ? players : []), [players]);

  // Debug (para identificar variável que está vindo indefinida e causando crash com `.length`)
  console.log("[AppPlayers DEBUG] players:", typeof players, Array.isArray(players), "length:", Array.isArray(players) ? players.length : "N/A");
  console.log("[AppPlayers DEBUG] filters:", { positionFilter, nationalityFilter, clubFilter, statusFilter, showArchived });
  console.log("[AppPlayers DEBUG] searchQuery:", typeof searchQuery, `"${searchQuery}"`);

  const fetchPlayers = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      // Fetch players with auto_rating and details from database
      let query = supabase
        .from("players")
        .select(
          "id, slug, full_name, position, secondary_positions, age, nationality, current_club, contract_end, contract_status, is_public, photo_url, auto_rating, auto_rating_details, is_archived, height, weight, dominant_foot, estimated_level, overall_rating, potential_rating"
        )
        .order("full_name");

      // Filter archived by default
      if (!showArchived) {
        query = query.or("is_archived.eq.false,is_archived.is.null");
      }

      const { data: playersData, error: playersError } = await query;

      if (playersError) {
        console.error("Error fetching players:", playersError);
        setPlayers([]);
        setFetchError(
          "Não foi possível carregar os atletas. Verifique sua conexão e tente novamente."
        );
        return;
      }

      // Normalize to array (never let `players` become undefined/null)
      const safePlayersData = Array.isArray(playersData) ? playersData : [];

      // Fetch scores for all players (from scouting reports) - non-blocking
      // We need individual scores with dates to calculate trends
      const scoresByPlayer: Record<string, { score: number; date: string }[]> = {};
      try {
        const { data: scoresData } = await supabase
          .from("scouting_reports")
          .select("player_id, final_score, match_date")
          .order("match_date", { ascending: true });

        if (Array.isArray(scoresData)) {
          scoresData.forEach((report) => {
            if (!scoresByPlayer[report.player_id]) {
              scoresByPlayer[report.player_id] = [];
            }
            scoresByPlayer[report.player_id].push({
              score: report.final_score,
              date: report.match_date,
            });
          });
        }
      } catch (e) {
        console.error("Error fetching scores (non-blocking):", e);
      }

      const playersWithScores = safePlayersData.map((player) => {
        const scores = scoresByPlayer[player.id];
        let avgScore: number | null = null;
        let scoreTrend: number | null = null;

        if (Array.isArray(scores) && scores.length > 0) {
          // Calculate average
          avgScore = scores.reduce((a, b) => a + b.score, 0) / scores.length;
          
          // Calculate trend: compare last score with previous score (or average of all previous)
          if (scores.length >= 2) {
            const lastScore = scores[scores.length - 1].score;
            const previousScore = scores[scores.length - 2].score;
            scoreTrend = lastScore - previousScore;
          }
        }

        return {
          ...player,
          avg_score: avgScore,
          score_trend: scoreTrend,
        };
      });

      setPlayers(Array.isArray(playersWithScores) ? playersWithScores : []);
    } catch (error) {
      console.error("Unexpected error fetching players:", error);
      setPlayers([]);
      setFetchError("Ocorreu um erro inesperado ao carregar os atletas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [showArchived]);

  // Extract unique values for filter options with null safety
  const filterOptions = useMemo(() => {
    const base = safePlayers;
    const positions = [...new Set(safeArray(base).map((p) => p.position).filter(Boolean))].sort() as string[];
    const nationalities = [...new Set(safeArray(base).map((p) => p.nationality).filter(Boolean))].sort() as string[];
    const clubs = [...new Set(safeArray(base).map((p) => p.current_club).filter(Boolean))].sort() as string[];
    return { positions, nationalities, clubs };
  }, [safePlayers]);

  const filteredAndSortedPlayers = useMemo(() => {
    const base = safePlayers;

    // Filter with safe null checks
    const filtered = base.filter((player) => {
      const matchesSearch = (player.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "all" || (player.position || "") === positionFilter;
      const matchesNationality = nationalityFilter === "all" || (player.nationality || "") === nationalityFilter;
      const matchesClub = clubFilter === "all" || (player.current_club || "") === clubFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "public" && player.is_public) ||
        (statusFilter === "private" && !player.is_public);

      return matchesSearch && matchesPosition && matchesNationality && matchesClub && matchesStatus;
    });

    // Sort with safe null checks
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "full_name":
          aValue = (a.full_name || "").toLowerCase();
          bValue = (b.full_name || "").toLowerCase();
          break;
        case "position":
          aValue = (a.position || "").toLowerCase();
          bValue = (b.position || "").toLowerCase();
          break;
        case "current_club":
          aValue = (a.current_club || "").toLowerCase();
          bValue = (b.current_club || "").toLowerCase();
          break;
        case "avg_score":
          aValue = a.avg_score ?? -1;
          bValue = b.avg_score ?? -1;
          break;
        case "auto_rating":
          aValue = a.auto_rating ?? -1;
          bValue = b.auto_rating ?? -1;
          break;
        case "contract_end":
          aValue = a.contract_end ? new Date(a.contract_end).getTime() : 0;
          bValue = b.contract_end ? new Date(b.contract_end).getTime() : 0;
          break;
        case "is_public":
          aValue = a.is_public ? 1 : 0;
          bValue = b.is_public ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [safePlayers, searchQuery, positionFilter, nationalityFilter, clubFilter, statusFilter, sortField, sortDirection]);

  const filteredCount = Array.isArray(filteredAndSortedPlayers) ? filteredAndSortedPlayers.length : 0;

  // Pagination (traditional pages)
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const list = Array.isArray(filteredAndSortedPlayers) ? filteredAndSortedPlayers : [];
    if (paginationMode === "infinite") {
      return list.slice(0, visibleCount);
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return list.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedPlayers, currentPage, itemsPerPage, paginationMode, visibleCount]);

  // Infinite scroll
  const hasMore = paginationMode === "infinite" && visibleCount < filteredCount;

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Simulate small delay for smoother UX
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + INFINITE_SCROLL_PAGE_SIZE, filteredCount));
      setLoadingMore(false);
    }, 200);
  }, [loadingMore, hasMore, filteredCount]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: loadingMore,
    enabled: paginationMode === "infinite",
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(INFINITE_SCROLL_PAGE_SIZE);
  }, [searchQuery, positionFilter, nationalityFilter, clubFilter, statusFilter, paginationMode]);

  // Reset visible count when pagination mode changes
  useEffect(() => {
    if (paginationMode === "infinite") {
      setVisibleCount(INFINITE_SCROLL_PAGE_SIZE);
    }
  }, [paginationMode]);

  const activeFiltersCount = [positionFilter, nationalityFilter, clubFilter, statusFilter].filter(
    (f) => f !== "all"
  ).length;

  const clearFilters = () => {
    setPositionFilter("all");
    setNationalityFilter("all");
    setClubFilter("all");
    setStatusFilter("all");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete({ id: player.id, full_name: player.full_name });
    setDeleteDialogOpen(true);
  };

  const handleArchivePlayer = async (player: Player) => {
    const isArchived = player.is_archived;
    const { error } = await supabase
      .from("players")
      .update({
        is_archived: !isArchived,
        archived_at: isArchived ? null : new Date().toISOString(),
      })
      .eq("id", player.id);

    if (error) {
      toast.error("Erro ao atualizar atleta");
      return;
    }

    toast.success(isArchived ? "Atleta restaurado!" : "Atleta arquivado!");
    fetchPlayers();
  };

  const handleDeleteSuccess = () => {
    fetchPlayers();
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
    <ErrorBoundary fallbackMessage="Não foi possível carregar os detalhes da competição.">
    <div className="space-y-6">
      {/* Header */}
      <header className="admin-header animate-fade-in">
        <div>
          <h1 className="admin-title">Atletas</h1>
          <p className="admin-subtitle">Gerencie todos os atletas da agência</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <BulkRecalculateButton onComplete={fetchPlayers} />
          )}
          <Button variant="outline" asChild className="admin-btn-outline">
            <Link to="/app/compare">
              <GitCompare className="w-4 h-4" />
              Comparar
            </Link>
          </Button>
          <Button className="admin-btn-primary" asChild>
            <Link to="/app/players/new">
              <Plus className="w-4 h-4" />
              Novo Atleta
            </Link>
          </Button>
        </div>
      </header>

      {/* Search and Controls */}
      <div className="space-y-4 animate-fade-in delay-75">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input
              type="text"
              placeholder="Buscar atleta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="admin-btn-outline relative">
                  <Filter className="w-4 h-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              className="border border-zinc-800 rounded-lg bg-zinc-900/50"
            >
              <ToggleGroupItem value="table" aria-label="Visualização em tabela" className="px-3 rounded-r-none data-[state=on]:bg-zinc-800 data-[state=on]:text-white">
                <LayoutList className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="scouting" aria-label="Modo Scouting" className="px-3 rounded-l-none data-[state=on]:bg-zinc-800 data-[state=on]:text-white">
                <ClipboardList className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="admin-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Filtros Avançados</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Posição</label>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {safeArray(filterOptions.positions).map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Nacionalidade</label>
                  <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {safeArray(filterOptions.nationalities).map((nat) => (
                        <SelectItem key={nat} value={nat}>
                          {nat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Clube</label>
                  <Select value={clubFilter} onValueChange={setClubFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {safeArray(filterOptions.clubs).map((club) => (
                        <SelectItem key={club} value={club}>
                          {club}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Show Archived Toggle */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-archived"
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                  />
                  <Label htmlFor="show-archived" className="text-sm cursor-pointer">
                    Mostrar arquivados
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="infinite-scroll"
                    checked={paginationMode === "infinite"}
                    onCheckedChange={(checked) => setPaginationMode(checked ? "infinite" : "pages")}
                  />
                  <Label htmlFor="infinite-scroll" className="text-sm cursor-pointer flex items-center gap-1">
                    <ChevronsDown className="w-3 h-3" />
                    Scroll infinito
                  </Label>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results count */}
      <p className="text-xs text-zinc-500 animate-fade-in">
        {filteredCount} atleta{filteredCount !== 1 ? "s" : ""} encontrado{filteredCount !== 1 ? "s" : ""}
        {showArchived && " (incluindo arquivados)"}
      </p>

      {/* Content */}
      {loading ? (
        <PlayersListSkeleton viewMode={viewMode} count={itemsPerPage} />
      ) : fetchError ? (
        /* Error State */
        <div className="glass-card p-12 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Erro ao carregar atletas</h3>
              <p className="text-muted-foreground">{fetchError}</p>
            </div>
            <Button variant="outline" onClick={fetchPlayers} className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      ) : (!Array.isArray(safePlayers) ? 0 : safePlayers.length) === 0 ? (
        /* Empty State - No players in database */
        <div className="glass-card p-12 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Nenhum atleta cadastrado</h3>
              <p className="text-muted-foreground">
                Comece cadastrando seu primeiro atleta para gerenciar seu elenco, acompanhar estatísticas e gerar relatórios de scouting.
              </p>
            </div>
            <Button variant="gradient" asChild className="mt-2">
              <Link to="/app/players/new">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Atleta
              </Link>
            </Button>
          </div>
        </div>
      ) : filteredCount === 0 ? (
        /* Empty State - No results after filtering */
        <div className="glass-card p-12 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Não encontramos atletas com os filtros aplicados. Tente ajustar sua busca ou limpar os filtros.
              </p>
            </div>
            <Button variant="outline" onClick={clearFilters} className="mt-2">
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Position Identity Cards - Premium Grid View */
        <div className="space-y-4 animate-fade-in delay-100">
          {/* Sort Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Ordenar por:</span>
              <button 
                onClick={() => handleSort("avg_score")}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800/50 transition-colors ${sortField === "avg_score" ? "text-primary" : ""}`}
              >
                Score <SortIcon field="avg_score" />
              </button>
              <button 
                onClick={() => handleSort("auto_rating")}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800/50 transition-colors ${sortField === "auto_rating" ? "text-primary" : ""}`}
              >
                Nota Global <SortIcon field="auto_rating" />
              </button>
              <button 
                onClick={() => handleSort("full_name")}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800/50 transition-colors ${sortField === "full_name" ? "text-primary" : ""}`}
              >
                Nome <SortIcon field="full_name" />
              </button>
              <button 
                onClick={() => handleSort("position")}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800/50 transition-colors ${sortField === "position" ? "text-primary" : ""}`}
              >
                Posição <SortIcon field="position" />
              </button>
            </div>
          </div>
          
          {/* Position Identity Cards with Stagger Animation */}
          {isMobile ? (
            <motion.div 
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              {safeArray(paginatedPlayers).map((player, index) => (
                <motion.div
                  key={player.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        duration: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      },
                    },
                  }}
                >
                  <PositionIdentityCardMobile
                    id={player.id}
                    fullName={player.full_name}
                    position={player.position}
                    age={player.age}
                    nationality={player.nationality}
                    currentClub={player.current_club}
                    photoUrl={player.photo_url}
                    autoRating={player.auto_rating}
                    height={player.height}
                    dominantFoot={player.dominant_foot}
                    contractEnd={player.contract_end}
                    overallRating={player.overall_rating}
                    potentialRating={player.potential_rating}
                    isPublic={player.is_public}
                    isArchived={player.is_archived}
                    isAdmin={isAdmin}
                    onArchive={() => handleArchivePlayer(player)}
                    onDelete={() => handleDeleteClick(player)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.04,
                    delayChildren: 0.1,
                  },
                },
              }}
            >
              {safeArray(paginatedPlayers).map((player, index) => (
                <motion.div
                  key={player.id}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.97 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        duration: 0.35,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      },
                    },
                  }}
                >
                  <PositionIdentityCard
                    id={player.id}
                    fullName={player.full_name}
                    position={player.position}
                    age={player.age}
                    nationality={player.nationality}
                    currentClub={player.current_club}
                    photoUrl={player.photo_url}
                    autoRating={player.auto_rating}
                    height={player.height}
                    dominantFoot={player.dominant_foot}
                    contractEnd={player.contract_end}
                    overallRating={player.overall_rating}
                    potentialRating={player.potential_rating}
                    isPublic={player.is_public}
                    isArchived={player.is_archived}
                    isAdmin={isAdmin}
                    onArchive={() => handleArchivePlayer(player)}
                    onDelete={() => handleDeleteClick(player)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      ) : (
        /* Scouting Mode View */
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
          {safeArray(paginatedPlayers).map((player) => (
            <ScoutingPlayerCard
              key={player.id}
              id={player.id}
              slug={player.slug || player.id}
              name={player.full_name}
              position={player.position || "N/A"}
              secondaryPositions={player.secondary_positions || []}
              age={player.age || 0}
              nationality={player.nationality}
              currentClub={player.current_club || ""}
              imageUrl={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
              autoRating={player.auto_rating}
              height={player.height}
              weight={player.weight}
              dominantFoot={player.dominant_foot}
              contractStatus={player.contract_status}
              contractEnd={player.contract_end}
              estimatedLevel={player.estimated_level}
              overallRating={player.overall_rating}
              potentialRating={player.potential_rating}
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel & Load More */}
      {paginationMode === "infinite" && filteredCount > 0 && (
        <>
          {/* Sentinel element for auto-loading */}
          <div ref={sentinelRef} className="h-4" />
          
          {/* Loading indicator */}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {/* Load More Button (fallback) */}
          {hasMore && !loadingMore && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Button variant="outline" onClick={handleLoadMore}>
                <ChevronsDown className="w-4 h-4 mr-2" />
                Carregar mais
              </Button>
              <p className="text-xs text-muted-foreground">
                Mostrando {paginatedPlayers?.length ?? 0} de {filteredCount} atletas
              </p>
            </div>
          )}
          
          {/* End of list indicator */}
          {!hasMore && filteredCount > INFINITE_SCROLL_PAGE_SIZE && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Todos os {filteredCount} atletas carregados
            </div>
          )}
        </>
      )}

      {/* Traditional Pagination */}
      {paginationMode === "pages" && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredCount)} de {filteredCount} atletas
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
                  {safeArray(PAGE_SIZE_OPTIONS).map((size) => (
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
            
            {safeArray(getPageNumbers()).map((page, index) =>
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

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={playerToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
    </ErrorBoundary>
  );
};

export default AppPlayers;
