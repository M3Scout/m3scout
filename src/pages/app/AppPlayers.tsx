import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  MoreVertical,
  Eye,
  FileText,
  Edit,
  Loader2,
  Trash2,
  X,
  Star,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";

interface Player {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  contract_end: string | null;
  is_public: boolean;
  avg_score?: number | null;
  photo_url?: string | null;
}

type SortField = "full_name" | "position" | "current_club" | "avg_score" | "contract_end" | "is_public";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "grid";

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const AppPlayers = () => {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; full_name: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Filters
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPlayers = async () => {
    // Fetch players with photo_url
    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, full_name, position, age, nationality, current_club, contract_end, is_public, photo_url")
      .order("full_name");

    if (playersError || !playersData) {
      setLoading(false);
      return;
    }

    // Fetch average scores for all players
    const { data: scoresData } = await supabase
      .from("scouting_reports")
      .select("player_id, final_score");

    // Calculate average scores per player
    const scoresByPlayer: Record<string, number[]> = {};
    scoresData?.forEach((report) => {
      if (!scoresByPlayer[report.player_id]) {
        scoresByPlayer[report.player_id] = [];
      }
      scoresByPlayer[report.player_id].push(report.final_score);
    });

    const playersWithScores = playersData.map((player) => ({
      ...player,
      avg_score: scoresByPlayer[player.id]
        ? scoresByPlayer[player.id].reduce((a, b) => a + b, 0) / scoresByPlayer[player.id].length
        : null,
    }));

    setPlayers(playersWithScores);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const positions = [...new Set(players.map((p) => p.position))].sort();
    const nationalities = [...new Set(players.map((p) => p.nationality))].sort();
    const clubs = [...new Set(players.map((p) => p.current_club).filter(Boolean))].sort() as string[];
    return { positions, nationalities, clubs };
  }, [players]);

  const filteredAndSortedPlayers = useMemo(() => {
    // Filter
    const filtered = players.filter((player) => {
      const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      const matchesNationality = nationalityFilter === "all" || player.nationality === nationalityFilter;
      const matchesClub = clubFilter === "all" || player.current_club === clubFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "public" && player.is_public) ||
        (statusFilter === "private" && !player.is_public);

      return matchesSearch && matchesPosition && matchesNationality && matchesClub && matchesStatus;
    });

    // Sort
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "full_name":
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case "position":
          aValue = a.position.toLowerCase();
          bValue = b.position.toLowerCase();
          break;
        case "current_club":
          aValue = (a.current_club || "").toLowerCase();
          bValue = (b.current_club || "").toLowerCase();
          break;
        case "avg_score":
          aValue = a.avg_score ?? -1;
          bValue = b.avg_score ?? -1;
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
  }, [players, searchQuery, positionFilter, nationalityFilter, clubFilter, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPlayers.length / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedPlayers, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, positionFilter, nationalityFilter, clubFilter, statusFilter]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Atletas</h1>
          <p className="text-muted-foreground">
            Gerencie todos os atletas da agência
          </p>
        </div>
        <Button variant="gradient" asChild>
          <Link to="/app/players/new">
            <Plus className="w-4 h-4" />
            Novo Atleta
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar atleta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-dark"
            />
          </div>
          <div className="flex gap-2">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="w-4 h-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="table" aria-label="Visualização em tabela" className="px-3">
                <LayoutList className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Visualização em cards" className="px-3">
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Filtros Avançados</h3>
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
                      {filterOptions.positions.map((pos) => (
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
                      {filterOptions.nationalities.map((nat) => (
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
                      {filterOptions.clubs.map((club) => (
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
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredAndSortedPlayers.length} atleta{filteredAndSortedPlayers.length !== 1 ? "s" : ""} encontrado{filteredAndSortedPlayers.length !== 1 ? "s" : ""}
      </p>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th 
                    className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("full_name")}
                  >
                    <span className="flex items-center">
                      Atleta
                      <SortIcon field="full_name" />
                    </span>
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("position")}
                  >
                    <span className="flex items-center">
                      Posição
                      <SortIcon field="position" />
                    </span>
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("current_club")}
                  >
                    <span className="flex items-center">
                      Clube
                      <SortIcon field="current_club" />
                    </span>
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("avg_score")}
                  >
                    <span className="flex items-center">
                      Média Score
                      <SortIcon field="avg_score" />
                    </span>
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("contract_end")}
                  >
                    <span className="flex items-center">
                      Contrato
                      <SortIcon field="contract_end" />
                    </span>
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("is_public")}
                  >
                    <span className="flex items-center">
                      Status
                      <SortIcon field="is_public" />
                    </span>
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.map((player) => (
                  <tr 
                    key={player.id}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{player.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.age ? `${player.age} anos` : ''}{player.age && player.nationality ? ' • ' : ''}{player.nationality}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="position-badge">{player.position}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {player.current_club || '-'}
                    </td>
                    <td className="p-4">
                      {player.avg_score !== null && player.avg_score !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-medium">{player.avg_score.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {player.contract_end 
                        ? new Date(player.contract_end).toLocaleDateString("pt-BR") 
                        : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        player.is_public 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {player.is_public ? "Público" : "Privado"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/app/players/${player.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/players/${player.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/reports/new?player=${player.id}`}>
                              <FileText className="w-4 h-4 mr-2" />
                              Novo Relatório
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteClick(player)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid/Cards View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedPlayers.map((player) => (
            <Card key={player.id} className="group overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
              <Link to={`/app/players/${player.id}`}>
                <div className="aspect-[4/3] relative bg-secondary/50 overflow-hidden">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.full_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      player.is_public 
                        ? "bg-primary/90 text-primary-foreground" 
                        : "bg-muted/90 text-muted-foreground"
                    }`}>
                      {player.is_public ? "Público" : "Privado"}
                    </span>
                  </div>
                  {/* Score Badge */}
                  {player.avg_score !== null && player.avg_score !== undefined && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 text-primary fill-primary" />
                      <span className="text-xs font-medium">{player.avg_score.toFixed(1)}</span>
                    </div>
                  )}
                  {/* Position Badge */}
                  <div className="absolute bottom-2 left-2">
                    <span className="position-badge text-xs">{player.position}</span>
                  </div>
                </div>
              </Link>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/app/players/${player.id}`}>
                      <h3 className="font-semibold truncate hover:text-primary transition-colors">
                        {player.full_name}
                      </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                      {player.age && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {player.age} anos
                        </span>
                      )}
                      {player.current_club && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{player.current_club}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0 -mr-2">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/app/players/${player.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/app/players/${player.id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/app/reports/new?player=${player.id}`}>
                          <FileText className="w-4 h-4 mr-2" />
                          Novo Relatório
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(player)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSortedPlayers.length)} de {filteredAndSortedPlayers.length} atletas
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

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={playerToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default AppPlayers;
