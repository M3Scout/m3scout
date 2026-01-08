import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Upload, 
  Trophy,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Competition {
  id: string;
  name: string;
  country: string;
  state: string | null;
  type: string;
  division: string | null;
  phase: string | null;
  base_coefficient: number;
  computed_coefficient: number;
  visibility_score: number | null;
  is_active: boolean;
}

const CONFIRMATION_TEXT = "EXCLUIR TUDO";

const Competitions = () => {
  const { isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("name");

    if (data) {
      setCompetitions(data);
    }
    setLoading(false);
  };

  // Get unique states for filter
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    competitions.forEach((comp) => {
      if (comp.state) states.add(comp.state);
    });
    return Array.from(states).sort();
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      const matchesSearch = 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.state && comp.state.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || comp.type === typeFilter;
      const matchesState = stateFilter === "all" || comp.state === stateFilter;
      return matchesSearch && matchesType && matchesState;
    });
  }, [competitions, searchQuery, typeFilter, stateFilter]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      league: "Liga",
      cup: "Copa",
      state_league: "Estadual",
      continental: "Continental",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      league: "bg-primary/20 text-primary",
      cup: "bg-accent/20 text-accent",
      state_league: "bg-emerald-500/20 text-emerald-400",
      continental: "bg-purple-500/20 text-purple-400",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStateFilter("all");
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || stateFilter !== "all";

  const handleDeleteAll = async () => {
    if (confirmationInput !== CONFIRMATION_TEXT) {
      toast.error("Texto de confirmação incorreto");
      return;
    }

    setIsDeleting(true);

    try {
      // First, delete all scouting reports (they have FK to competitions)
      const { error: reportsError } = await supabase
        .from("scouting_reports")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (reportsError) throw reportsError;

      // Then, delete all competitions
      const { error: competitionsError } = await supabase
        .from("competitions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (competitionsError) throw competitionsError;

      setCompetitions([]);
      setDeleteDialogOpen(false);
      setConfirmationInput("");
      toast.success("Todas as competições e relatórios vinculados foram removidos.");
    } catch (error: any) {
      console.error("Error deleting competitions:", error);
      toast.error(error.message || "Erro ao excluir competições");
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationValid = confirmationInput === CONFIRMATION_TEXT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-accent" />
            Competições
          </h1>
          <p className="text-muted-foreground">
            Gerencie competições e seus coeficientes
          </p>
        </div>
        <div className="flex gap-2">
          {/* Delete All Button - Admin Only */}
          {isAdmin && competitions.length > 0 && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="default">
                  <Trash2 className="w-4 h-4" />
                  Excluir Todas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Excluir TODAS as Competições?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      Esta ação irá <strong>remover permanentemente</strong> todas as{" "}
                      <strong>{competitions.length} competições</strong> e{" "}
                      <strong>todos os relatórios de scouting vinculados</strong>.
                    </p>
                    <p className="text-destructive font-medium">
                      ⚠️ Esta ação NÃO pode ser desfeita!
                    </p>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="confirmation">
                        Digite <strong>{CONFIRMATION_TEXT}</strong> para confirmar:
                      </Label>
                      <Input
                        id="confirmation"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder={CONFIRMATION_TEXT}
                        className="font-mono"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmationInput("")}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAll}
                    disabled={!isConfirmationValid || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Excluir Todas
                      </>
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Link to="/app/competitions/import">
            <Button variant="gradient">
              <Upload className="w-4 h-4" />
              Importar CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-dark"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[180px] input-dark">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="league">Liga</SelectItem>
            <SelectItem value="cup">Copa</SelectItem>
            <SelectItem value="state_league">Estadual</SelectItem>
            <SelectItem value="continental">Continental</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-full md:w-[180px] input-dark">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {uniqueStates.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="shrink-0">
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{competitions.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {competitions.filter(c => c.type === 'league').length}
          </p>
          <p className="text-sm text-muted-foreground">Ligas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-accent">
            {competitions.filter(c => c.type === 'cup').length}
          </p>
          <p className="text-sm text-muted-foreground">Copas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {competitions.filter(c => c.type === 'state_league').length}
          </p>
          <p className="text-sm text-muted-foreground">Estaduais</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {competitions.filter(c => c.type === 'continental').length}
          </p>
          <p className="text-sm text-muted-foreground">Continentais</p>
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredCompetitions.length} de {competitions.length} competições
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {hasActiveFilters ? "Nenhuma competição encontrada" : "Nenhuma competição cadastrada"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {hasActiveFilters 
              ? "Tente ajustar os filtros de busca."
              : "Importe um arquivo CSV para adicionar competições."
            }
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : (
            <Link to="/app/competitions/import">
              <Button variant="gradient">
                <Upload className="w-4 h-4" />
                Importar CSV
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Competição
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Divisão / Fase
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Coeficiente
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
                {filteredCompetitions.map((comp) => (
                  <tr 
                    key={comp.id}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {comp.country}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(comp.type)}`}>
                        {getTypeLabel(comp.type)}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {comp.state || '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {comp.division || '-'}{comp.phase && ` / ${comp.phase}`}
                    </td>
                    <td className="p-4">
                      <span className="text-lg font-bold text-accent">
                        ×{Number(comp.computed_coefficient).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        comp.is_active 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {comp.is_active ? "Ativa" : "Inativa"}
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
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
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
    </div>
  );
};

export default Competitions;
