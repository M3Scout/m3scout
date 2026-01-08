import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Star
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
}

const AppPlayers = () => {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; full_name: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filters
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPlayers = async () => {
    // Fetch players
    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, full_name, position, age, nationality, current_club, contract_end, is_public")
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

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
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
  }, [players, searchQuery, positionFilter, nationalityFilter, clubFilter, statusFilter]);

  const activeFiltersCount = [positionFilter, nationalityFilter, clubFilter, statusFilter].filter(
    (f) => f !== "all"
  ).length;

  const clearFilters = () => {
    setPositionFilter("all");
    setNationalityFilter("all");
    setClubFilter("all");
    setStatusFilter("all");
  };

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete({ id: player.id, full_name: player.full_name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchPlayers();
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
        {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} encontrado{filteredPlayers.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Atleta
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Posição
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Clube
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Média Score
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Contrato
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
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
