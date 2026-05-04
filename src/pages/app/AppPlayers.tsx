import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { logFetchSkipped, logFetchError, logFetchSuccess, isAbortError } from "@/lib/fetchLogger";
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
  LayoutGrid,
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
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { ScoutingPlayerCard } from "@/components/players/ScoutingPlayerCard";
import { PlayerListRowPremium, PlayerListRowMobilePremium } from "@/components/players/PlayerListRowPremium";
import { SortControlsPremium } from "@/components/players/SortControlsPremium";
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
  if (import.meta.env.DEV) console.log("[MOUNT] AppPlayers (Atletas)");

  const { isAdmin, session, permissionsLoading, rolesLoading } = useAuth();
  const rbacReady = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  
  const isMobile = useIsMobile();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
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
  
  // Ref to track last successful fetch (for stale-while-revalidate logging)
  const lastFetchRef = useRef<{ count: number; timestamp: number } | null>(null);

  // Debug (para identificar variável que está vindo indefinida e causando crash com `.length`)
  if (import.meta.env.DEV) {
    console.log("[AppPlayers DEBUG] players:", typeof players, Array.isArray(players), "length:", Array.isArray(players) ? players.length : "N/A");
  }

  const fetchPlayers = useCallback(async (isBackground = false) => {
    // GUARD: Only fetch when session and RBAC are ready
    if (!session?.user) {
      logFetchSkipped("AppPlayers", "no session");
      return;
    }
    if (!rbacReady) {
      logFetchSkipped("AppPlayers", "rbac not ready");
      return;
    }
    
    if (import.meta.env.DEV) console.log("[FETCH] AppPlayers start", { isBackground, hasCachedData: players.length > 0 });
    
    // STALE-WHILE-REVALIDATE: Only show loading if no cached data
    if (players.length === 0) {
      setLoading(true);
    } else {
      // Background refetch - show subtle indicator but keep data
      setIsRefetching(true);
    }
    
    // DO NOT clear players here - keep stale data while fetching
    setFetchError(null);
    
    const fetchStart = performance.now();

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
        logFetchError(playersError, { endpoint: "AppPlayers.players" });
        // Only set error if we have no cached data to show
        if (players.length === 0) {
          setFetchError(
            "Não foi possível carregar os atletas. Verifique sua conexão e tente novamente."
          );
        }
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
          .is("deleted_at", null)
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
        // Non-blocking - just log
        if (!isAbortError(e)) {
          logFetchError(e, { endpoint: "AppPlayers.scores" });
        }
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

      logFetchSuccess({ endpoint: "AppPlayers" }, performance.now() - fetchStart);
      
      // Log when updating (for debugging stale-while-revalidate)
      const prevCount = lastFetchRef.current?.count ?? 0;
      const newCount = playersWithScores.length;
      if (import.meta.env.DEV && prevCount > 0 && prevCount !== newCount) {
        console.log(`[AppPlayers] Data updated: ${prevCount} → ${newCount} players`);
      }
      
      lastFetchRef.current = { count: newCount, timestamp: Date.now() };
      
      // Only update if we got valid data
      if (Array.isArray(playersWithScores)) {
        setPlayers(playersWithScores);
      }
    } catch (error) {
      // Handle AbortError gracefully
      if (isAbortError(error)) {
        if (import.meta.env.DEV) {
          console.log("[FETCH ABORT] AppPlayers - request cancelled");
        }
        return;
      }
      
      logFetchError(error, { endpoint: "AppPlayers" });
      // Only set error if we have no cached data to show
      if (players.length === 0) {
        setFetchError("Ocorreu um erro inesperado ao carregar os atletas.");
      }
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, [session?.user, rbacReady, showArchived, players.length]);

  // Trigger fetch when RBAC becomes ready
  useEffect(() => {
    if (rbacReady) {
      fetchPlayers();
    }
  }, [rbacReady, showArchived]);

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
    fetchPlayers(true); // Background refetch
  };

  const handleDeleteSuccess = () => {
    fetchPlayers(true); // Background refetch
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
    <div className="space-y-3 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="m3-page-title">ATLETAS</h1>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium whitespace-nowrap">
                {filteredCount} atleta{filteredCount !== 1 ? "s" : ""}
                {isRefetching && " · atualizando..."}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <span className="hidden md:inline-flex">
              <BulkRecalculateButton onComplete={() => fetchPlayers(true)} />
            </span>
          )}
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex h-8 px-4 rounded-full bg-zinc-900/40 border-zinc-800/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-[11px] font-medium">
            <Link to="/app/compare">
              <GitCompare className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Comparar</span>
            </Link>
          </Button>
          <Button size="sm" asChild className="hidden md:inline-flex h-8 px-4 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: '#e63946' }}>
            <Link to="/app/players/new">
              <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Novo Atleta</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Search and Controls - Premium bar */}
      <div className="space-y-2 animate-fade-in delay-75">
        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <Input
              type="text"
              placeholder="Buscar atleta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 bg-zinc-900/40 border-zinc-800/40 rounded-full text-xs placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
            />
          </div>
          
          {/* Filter button */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3.5 bg-zinc-900/40 border-zinc-800/40 hover:bg-zinc-800/60 hover:border-zinc-700 rounded-full text-[11px] font-medium"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline ml-1.5">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1.5 w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-medium" style={{ backgroundColor: '#e63946' }}>
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
            className="h-8 p-0.5 rounded-full bg-zinc-900/40"
          >
            <ToggleGroupItem 
              value="table" 
              aria-label="Visualização em lista" 
              className="px-2.5 h-7 rounded-full data-[state=on]:bg-zinc-800 data-[state=on]:text-white data-[state=off]:text-zinc-500"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="scouting" 
              aria-label="Visualização em cards" 
              className="px-2.5 h-7 rounded-full data-[state=on]:bg-zinc-800 data-[state=on]:text-white data-[state=off]:text-zinc-500"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Advanced Filters - Premium Panel */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="p-4 space-y-4 rounded-xl bg-zinc-900/50 mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">Filtros Avançados</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-zinc-400 hover:text-white">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Posição</label>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="h-9 bg-zinc-900/60 border-zinc-800/50 rounded-lg text-sm">
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

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Nacionalidade</label>
                  <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                    <SelectTrigger className="h-9 bg-zinc-900/60 border-zinc-800/50 rounded-lg text-sm">
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

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Clube</label>
                  <Select value={clubFilter} onValueChange={setClubFilter}>
                    <SelectTrigger className="h-9 bg-zinc-900/60 border-zinc-800/50 rounded-lg text-sm">
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

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 bg-zinc-900/60 border-zinc-800/50 rounded-lg text-sm">
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

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-archived"
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                  />
                  <Label htmlFor="show-archived" className="text-xs text-zinc-400 cursor-pointer">
                    Mostrar arquivados
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="infinite-scroll"
                    checked={paginationMode === "infinite"}
                    onCheckedChange={(checked) => setPaginationMode(checked ? "infinite" : "pages")}
                  />
                  <Label htmlFor="infinite-scroll" className="text-xs text-zinc-400 cursor-pointer flex items-center gap-1">
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
            <Button variant="outline" onClick={() => fetchPlayers()} className="mt-2">
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
        /* LIST MODE - Premium rows */
        <div className="space-y-1 animate-fade-in delay-100 w-full min-w-0">
          {/* Sort Controls - Premium */}
          <div className="flex items-center justify-between mb-1 w-full min-w-0">
            {isMobile ? (
              <SortControlsPremium
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onSortChange={(field, dir) => {
                  setSortField(field);
                  setSortDirection(dir);
                }}
                isMobile
              />
            ) : (
              <SortControlsPremium
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
          </div>
          
          {/* List View - Premium Rows */}
          {isMobile ? (
            <div className="space-y-2">
              {safeArray(paginatedPlayers).map((player, index) => (
                <PlayerListRowMobilePremium
                  key={player.id}
                  id={player.id}
                  fullName={player.full_name}
                  position={player.position}
                  age={player.age}
                  nationality={player.nationality}
                  currentClub={player.current_club}
                  photoUrl={player.photo_url}
                  autoRating={player.auto_rating}
                  avgScore={player.avg_score}
                  scoreTrend={player.score_trend}
                  contractEnd={player.contract_end}
                  isPublic={player.is_public}
                  isArchived={player.is_archived}
                  isAdmin={isAdmin}
                  onArchive={() => handleArchivePlayer(player)}
                  onDelete={() => handleDeleteClick(player)}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {safeArray(paginatedPlayers).map((player, index) => (
                <PlayerListRowPremium
                  key={player.id}
                  id={player.id}
                  fullName={player.full_name}
                  position={player.position}
                  age={player.age}
                  nationality={player.nationality}
                  currentClub={player.current_club}
                  photoUrl={player.photo_url}
                  autoRating={player.auto_rating}
                  avgScore={player.avg_score}
                  scoreTrend={player.score_trend}
                  contractEnd={player.contract_end}
                  isPublic={player.is_public}
                  isArchived={player.is_archived}
                  isAdmin={isAdmin}
                  onArchive={() => handleArchivePlayer(player)}
                  onDelete={() => handleDeleteClick(player)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* GRID MODE - Position Identity Cards with colors */
        <div className="space-y-4 animate-fade-in delay-100">
          {/* Sort Controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <button 
                onClick={() => handleSort("auto_rating")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium hover:bg-zinc-800/40 transition-colors ${sortField === "auto_rating" ? "bg-zinc-800 text-zinc-100" : ""}`}
              >
                OVR <SortIcon field="auto_rating" />
              </button>
              <button 
                onClick={() => handleSort("full_name")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium hover:bg-zinc-800/40 transition-colors ${sortField === "full_name" ? "bg-zinc-800 text-zinc-100" : ""}`}
              >
                Nome <SortIcon field="full_name" />
              </button>
              <button 
                onClick={() => handleSort("position")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium hover:bg-zinc-800/40 transition-colors ${sortField === "position" ? "bg-zinc-800 text-zinc-100" : ""}`}
              >
                Posição <SortIcon field="position" />
              </button>
            </div>
          </div>
          
          {/* Grid View - Position Identity Cards with Stagger Animation */}
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
              {safeArray(paginatedPlayers).map((player) => (
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
              {safeArray(paginatedPlayers).map((player) => (
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
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredCount)} de {filteredCount}
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
