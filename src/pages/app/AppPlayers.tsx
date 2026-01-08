import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical,
  Eye,
  FileText,
  Edit,
  Loader2,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

const AppPlayers = () => {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; full_name: string } | null>(null);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, position, age, nationality, current_club, contract_end, is_public")
      .order("full_name");

    if (data) {
      setPlayers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter((player) =>
    player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Filters */}
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
        <Button variant="outline">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

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
