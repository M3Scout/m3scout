import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Upload, 
  Trophy,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  AlertTriangle,
  Plus,
  Globe,
  Eye,
  Filter,
  X,
  Copy,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  competition_code: string | null;
  country: string;
  state: string | null;
  type: string;
  division: string | null;
  phase: string | null;
  base_coefficient: number;
  computed_coefficient: number;
  final_coefficient: number;
  tier: string;
  visibility_score: number | null;
  is_active: boolean;
  is_unique: boolean | null;
  has_phases: boolean;
}

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  A: "bg-primary/20 text-primary border-primary/50",
  B: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  C: "bg-muted text-muted-foreground border-border",
};

const COMPETITION_TYPES = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Copa" },
  { value: "state_league", label: "Estadual" },
  { value: "continental", label: "Continental" },
];

const DIVISIONS = ["A1", "A2", "A3", "A4", "Serie A", "Serie B", "Serie C", "Serie D"];

const BRAZILIAN_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const CONFIRMATION_TEXT = "EXCLUIR TUDO";

const Competitions = () => {
  const { isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<[number, number]>([0, 100]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Delete all dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Single delete dialog
  const [deleteEntry, setDeleteEntry] = useState<Competition | null>(null);
  const [deleteSingleOpen, setDeleteSingleOpen] = useState(false);
  
  // Deduplication dialog
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<{ key: string; competitions: Competition[]; canonical: Competition }[]>([]);
  const [isDeduping, setIsDeduping] = useState(false);
  
  // Recalculate state
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    country: "Brasil",
    state: "",
    type: "league",
    division: "",
    base_coefficient: 1.0,
    visibility_score: 50,
    is_active: true,
    has_phases: false,
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("country")
      .order("name");

    if (data) {
      setCompetitions(data);
    }
    if (error) {
      console.error("Error fetching competitions:", error);
    }
    setLoading(false);
  };

  // Get unique values for filters
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    competitions.forEach((comp) => {
      if (comp.country) countries.add(comp.country);
    });
    return Array.from(countries).sort();
  }, [competitions]);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    competitions.forEach((comp) => {
      if (comp.state) states.add(comp.state);
    });
    return Array.from(states).sort();
  }, [competitions]);

  const uniqueDivisions = useMemo(() => {
    const divisions = new Set<string>();
    competitions.forEach((comp) => {
      if (comp.division) divisions.add(comp.division);
    });
    return Array.from(divisions).sort();
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      const matchesSearch = 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.display_name && comp.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.state && comp.state.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || comp.type === typeFilter;
      const matchesState = stateFilter === "all" || comp.state === stateFilter;
      const matchesCountry = countryFilter === "all" || comp.country === countryFilter;
      const matchesDivision = divisionFilter === "all" || comp.division === divisionFilter;
      const matchesVisibility = 
        (comp.visibility_score ?? 50) >= visibilityFilter[0] && 
        (comp.visibility_score ?? 50) <= visibilityFilter[1];
      return matchesSearch && matchesType && matchesState && matchesCountry && matchesDivision && matchesVisibility;
    });
  }, [competitions, searchQuery, typeFilter, stateFilter, countryFilter, divisionFilter, visibilityFilter]);

  const getTypeLabel = (type: string) => {
    const found = COMPETITION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      league: "bg-primary/20 text-primary border-primary/30",
      cup: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      state_league: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      continental: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    return colors[type] || "bg-muted text-muted-foreground border-border";
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStateFilter("all");
    setCountryFilter("all");
    setDivisionFilter("all");
    setVisibilityFilter([0, 100]);
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || stateFilter !== "all" || 
    countryFilter !== "all" || divisionFilter !== "all" || 
    visibilityFilter[0] !== 0 || visibilityFilter[1] !== 100;

  // Open create dialog
  const handleCreate = () => {
    setEditingCompetition(null);
    setFormData({
      name: "",
      display_name: "",
      country: "Brasil",
      state: "",
      type: "league",
      division: "",
      base_coefficient: 1.0,
      visibility_score: 50,
      is_active: true,
      has_phases: false,
    });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (comp: Competition) => {
    setEditingCompetition(comp);
    setFormData({
      name: comp.name,
      display_name: comp.display_name || "",
      country: comp.country,
      state: comp.state || "",
      type: comp.type,
      division: comp.division || "",
      base_coefficient: Number(comp.base_coefficient),
      visibility_score: comp.visibility_score ?? 50,
      is_active: comp.is_active,
      has_phases: comp.has_phases ?? false,
    });
    setDialogOpen(true);
  };

  // Validate form based on rules
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Nome é obrigatório";
    
    // base_coefficient range: 0.05 – 2.50
    if (formData.base_coefficient < 0.05 || formData.base_coefficient > 2.50) {
      return "Coeficiente base deve estar entre 0.05 e 2.50";
    }
    
    // visibility_score range: 0 – 100
    if (formData.visibility_score < 0 || formData.visibility_score > 100) {
      return "Visibilidade deve estar entre 0 e 100";
    }
    
    // State division validation
    if (formData.type === "state_league" && formData.country === "Brasil" && formData.division) {
      if (formData.state === "SP") {
        if (!["A1", "A2", "A3", "A4"].includes(formData.division)) {
          return "São Paulo permite apenas divisões A1, A2, A3 ou A4";
        }
      } else {
        if (!["A1", "A2"].includes(formData.division)) {
          return "Estados fora de SP permitem apenas divisões A1 ou A2";
        }
      }
    }
    
    return null;
  };

  // Save competition (create or update)
  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    try {
      // computed_coefficient is auto-calculated by trigger (equals base_coefficient)
      // Phase weight is applied at scouting report level, not here
      const competitionData = {
        name: formData.name.trim(),
        display_name: formData.display_name.trim() || null,
        country: formData.country,
        state: formData.state || null,
        type: formData.type as "league" | "cup" | "state_league" | "continental",
        division: formData.division || null,
        base_coefficient: formData.base_coefficient,
        visibility_score: formData.visibility_score,
        is_active: formData.is_active,
        has_phases: formData.has_phases,
      };

      if (editingCompetition) {
        const { error } = await supabase
          .from("competitions")
          .update(competitionData)
          .eq("id", editingCompetition.id);

        if (error) throw error;
        toast.success("Competição atualizada!");
      } else {
        const { error } = await supabase
          .from("competitions")
          .insert([competitionData]);

        if (error) throw error;
        toast.success("Competição criada!");
      }

      setDialogOpen(false);
      fetchCompetitions();
    } catch (error: any) {
      console.error("Error saving competition:", error);
      toast.error(error.message || "Erro ao salvar competição");
    } finally {
      setSaving(false);
    }
  };

  // Delete single competition
  const handleDeleteSingle = async () => {
    if (!deleteEntry) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("competitions")
        .delete()
        .eq("id", deleteEntry.id);

      if (error) throw error;

      toast.success("Competição excluída!");
      setDeleteSingleOpen(false);
      setDeleteEntry(null);
      fetchCompetitions();
    } catch (error: any) {
      console.error("Error deleting competition:", error);
      toast.error(error.message || "Erro ao excluir competição");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all competitions
  const handleDeleteAll = async () => {
    if (confirmationInput !== CONFIRMATION_TEXT) {
      toast.error("Texto de confirmação incorreto");
      return;
    }

    setIsDeleting(true);

    try {
      const { error: reportsError } = await supabase
        .from("scouting_reports")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (reportsError) throw reportsError;

      const { error: competitionsError } = await supabase
        .from("competitions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (competitionsError) throw competitionsError;

      setCompetitions([]);
      setDeleteDialogOpen(false);
      setConfirmationInput("");
      toast.success("Todas as competições foram removidas.");
    } catch (error: any) {
      console.error("Error deleting competitions:", error);
      toast.error(error.message || "Erro ao excluir competições");
    } finally {
      setIsDeleting(false);
    }
  };

  // Find duplicates based on country + type + state + division + name
  const findDuplicates = () => {
    const grouped = new Map<string, Competition[]>();
    
    competitions.forEach((comp) => {
      const key = `${comp.country}|${comp.type}|${comp.state || ''}|${comp.division || ''}|${comp.name}`;
      const existing = grouped.get(key) || [];
      existing.push(comp);
      grouped.set(key, existing);
    });
    
    const dupes: { key: string; competitions: Competition[]; canonical: Competition }[] = [];
    
    grouped.forEach((comps, key) => {
      if (comps.length > 1) {
        // Sort by created_at to pick the oldest as canonical (if available), otherwise first
        const sorted = [...comps].sort((a, b) => a.id.localeCompare(b.id));
        dupes.push({
          key,
          competitions: comps,
          canonical: sorted[0],
        });
      }
    });
    
    setDuplicates(dupes);
    setDedupeDialogOpen(true);
  };

  // Remove duplicates - migrate player_stats to canonical, delete duplicates
  const handleDeduplicate = async () => {
    if (duplicates.length === 0) return;
    
    setIsDeduping(true);
    
    try {
      for (const group of duplicates) {
        const duplicateIds = group.competitions
          .filter(c => c.id !== group.canonical.id)
          .map(c => c.id);
        
        // Migrate player_stats to canonical competition
        const { error: statsError } = await supabase
          .from("player_stats")
          .update({ competition_id: group.canonical.id })
          .in("competition_id", duplicateIds);
        
        if (statsError) {
          console.error("Error migrating stats:", statsError);
        }
        
        // Migrate scouting_reports to canonical competition
        const { error: reportsError } = await supabase
          .from("scouting_reports")
          .update({ competition_id: group.canonical.id })
          .in("competition_id", duplicateIds);
        
        if (reportsError) {
          console.error("Error migrating reports:", reportsError);
        }
        
        // Delete duplicate competitions
        const { error: deleteError } = await supabase
          .from("competitions")
          .delete()
          .in("id", duplicateIds);
        
        if (deleteError) throw deleteError;
      }
      
      toast.success(`${duplicates.length} grupos de duplicados removidos!`);
      setDedupeDialogOpen(false);
      setDuplicates([]);
      fetchCompetitions();
    } catch (error: any) {
      console.error("Error deduplicating:", error);
      toast.error(error.message || "Erro ao remover duplicados");
    } finally {
      setIsDeduping(false);
    }
  };

  // Recalculate all coefficients and tiers
  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    
    try {
      const { data, error } = await supabase.rpc('recalculate_all_competition_coefficients');
      
      if (error) throw error;
      
      toast.success(`${data?.length || 0} competições recalculadas!`);
      fetchCompetitions();
    } catch (error: any) {
      console.error("Error recalculating:", error);
      toast.error(error.message || "Erro ao recalcular coeficientes");
    } finally {
      setIsRecalculating(false);
    }
  };

  const isConfirmationValid = confirmationInput === CONFIRMATION_TEXT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Competições
          </h1>
          <p className="text-muted-foreground">
            Gerencie competições e seus coeficientes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && competitions.length > 0 && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button 
                variant="outline" 
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Excluir Todas
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Excluir TODAS as Competições?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      Esta ação irá remover permanentemente todas as{" "}
                      <strong>{competitions.length} competições</strong> e{" "}
                      <strong>todos os relatórios vinculados</strong>.
                    </p>
                    <div className="space-y-2 pt-2">
                      <Label>
                        Digite <strong>{CONFIRMATION_TEXT}</strong> para confirmar:
                      </Label>
                      <Input
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
                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Excluir Todas
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isAdmin && competitions.length > 0 && (
            <Button 
              variant="outline" 
              onClick={findDuplicates}
            >
              <Copy className="w-4 h-4" />
              Remover Duplicados
            </Button>
          )}
          {isAdmin && competitions.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleRecalculateAll}
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recalcular Coeficientes
            </Button>
          )}
          <Link to="/app/competitions/import">
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              Importar CSV
            </Button>
          </Link>
          {isAdmin && (
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              Nova Competição
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, estado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-secondary" : ""}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {[typeFilter !== "all", stateFilter !== "all", countryFilter !== "all", 
                  divisionFilter !== "all", visibilityFilter[0] !== 0 || visibilityFilter[1] !== 100]
                  .filter(Boolean).length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">País</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueCountries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {COMPETITION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueStates.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Divisão</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueDivisions.map((div) => (
                    <SelectItem key={div} value={div}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Visibilidade: {visibilityFilter[0]} - {visibilityFilter[1]}
              </Label>
              <div className="pt-2 px-1">
                <Slider
                  value={visibilityFilter}
                  onValueChange={(v) => setVisibilityFilter(v as [number, number])}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold">{competitions.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        {COMPETITION_TYPES.map((type) => (
          <div key={type.value} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${
              type.value === "league" ? "text-primary" :
              type.value === "cup" ? "text-amber-400" :
              type.value === "state_league" ? "text-emerald-400" : "text-purple-400"
            }`}>
              {competitions.filter(c => c.type === type.value).length}
            </p>
            <p className="text-sm text-muted-foreground">{type.label}s</p>
          </div>
        ))}
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
              : "Crie uma nova competição ou importe um arquivo CSV."
            }
          </p>
          <div className="flex gap-2 justify-center">
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
            ) : (
              <>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4" />
                  Nova Competição
                </Button>
                <Link to="/app/competitions/import">
                  <Button variant="outline">
                    <Upload className="w-4 h-4" />
                    Importar CSV
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Divisão</TableHead>
                <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 justify-center">
                          Tier
                          <HelpCircle className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Classificação automática:</p>
                          <ul className="text-xs space-y-0.5">
                            <li><span className="text-amber-400">S:</span> ≥ 1.10</li>
                            <li><span className="text-primary">A:</span> 0.80 – 1.09</li>
                            <li><span className="text-emerald-400">B:</span> 0.45 – 0.79</li>
                            <li><span className="text-muted-foreground">C:</span> &lt; 0.45</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 justify-center">
                          Base
                          <HelpCircle className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Coeficiente base definido manualmente.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 justify-center">
                          Final
                          <HelpCircle className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="mb-1">Coeficiente final usado em rankings e pontuações.</p>
                          <p className="text-xs text-muted-foreground">
                            Para partidas com fase, aplica-se: final × phase_weight
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Eye className="w-4 h-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visibilidade (0 = oculto, 100 = máximo)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompetitions.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.country}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(comp.type)}>
                        {getTypeLabel(comp.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{comp.display_name || comp.name}</p>
                        {comp.display_name && comp.name !== comp.display_name && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {comp.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {comp.state || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {comp.division || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={TIER_COLORS[comp.tier] || TIER_COLORS.C}>
                        Tier {comp.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm text-muted-foreground">
                        {Number(comp.base_coefficient).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              ×{Number(comp.final_coefficient).toFixed(2)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Coeficiente final (usado em rankings)</p>
                            {comp.has_phases && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Para partidas com fase: × phase_weight
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm ${(comp.visibility_score ?? 50) === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {(comp.visibility_score ?? 50) === 0 ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            Oculto
                          </Badge>
                        ) : (
                          comp.visibility_score ?? 50
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={comp.is_active ? "default" : "secondary"}>
                        {comp.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(comp)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeleteEntry(comp);
                                setDeleteSingleOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCompetition ? "Editar Competição" : "Nova Competição"}
            </DialogTitle>
            <DialogDescription>
              {editingCompetition 
                ? "Atualize os dados da competição." 
                : "Preencha os dados para criar uma nova competição."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Brasil – Campeonato X"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Nome de Exibição</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Campeonato X"
                />
              </div>

              <div className="space-y-2">
                <Label>País</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Brasil"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type === "state_league" && (
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Select 
                    value={formData.state || "NONE"} 
                    onValueChange={(v) => setFormData({ ...formData, state: v === "NONE" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Selecione...</SelectItem>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Divisão</Label>
                <Select 
                  value={formData.division || "NONE"} 
                  onValueChange={(v) => setFormData({ ...formData, division: v === "NONE" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhuma</SelectItem>
                    {DIVISIONS.map((div) => (
                      <SelectItem key={div} value={div}>{div}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Coeficiente Base</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">Valores de Referência:</p>
                        <ul className="text-xs space-y-0.5">
                          <li>Libertadores: 1.30</li>
                          <li>Série A: 1.00</li>
                          <li>Copa do Brasil: 0.85</li>
                          <li>Série B: 0.60</li>
                          <li>SP A1: 0.55</li>
                          <li>Outros estados A1: 0.35</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="2.50"
                  value={formData.base_coefficient}
                  onChange={(e) => setFormData({ ...formData, base_coefficient: parseFloat(e.target.value) || 1.0 })}
                  placeholder="0.05 - 2.50"
                />
                <p className="text-xs text-muted-foreground">
                  Define a força da competição (0.05 - 2.50)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">Coeficiente Final & Tier</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="mb-2">Calculados automaticamente a partir do base.</p>
                        <p className="font-semibold mb-1">Classificação:</p>
                        <ul className="text-xs space-y-0.5">
                          <li><span className="text-amber-400">S:</span> ≥ 1.10</li>
                          <li><span className="text-primary">A:</span> 0.80 – 1.09</li>
                          <li><span className="text-emerald-400">B:</span> 0.45 – 0.79</li>
                          <li><span className="text-muted-foreground">C:</span> &lt; 0.45</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={`×${formData.base_coefficient.toFixed(2)}`}
                    readOnly
                    disabled
                    className="bg-muted/50 text-muted-foreground font-mono cursor-not-allowed flex-1"
                  />
                  <Badge 
                    variant="outline" 
                    className={TIER_COLORS[
                      formData.base_coefficient >= 1.10 ? 'S' :
                      formData.base_coefficient >= 0.80 ? 'A' :
                      formData.base_coefficient >= 0.45 ? 'B' : 'C'
                    ]}
                  >
                    Tier {
                      formData.base_coefficient >= 1.10 ? 'S' :
                      formData.base_coefficient >= 0.80 ? 'A' :
                      formData.base_coefficient >= 0.45 ? 'B' : 'C'
                    }
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Somente leitura — calculado ao salvar
                </p>
              </div>

              <div className="col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Visibilidade: {formData.visibility_score}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p><strong>0:</strong> Oculto dos dropdowns públicos</p>
                        <p><strong>1-100:</strong> Visível, ordenado por prioridade</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Slider
                  value={[formData.visibility_score]}
                  onValueChange={([v]) => setFormData({ ...formData, visibility_score: v })}
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Oculto</span>
                  <span>Máxima visibilidade</span>
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Ativa
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="has_phases"
                    checked={formData.has_phases}
                    onChange={(e) => setFormData({ ...formData, has_phases: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="has_phases" className="cursor-pointer">
                    Possui fases (mata-mata)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCompetition ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Dialog */}
      <AlertDialog open={deleteSingleOpen} onOpenChange={setDeleteSingleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir competição?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteEntry?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSingle}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deduplication Dialog */}
      <Dialog open={dedupeDialogOpen} onOpenChange={setDedupeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Remover Duplicados
            </DialogTitle>
            <DialogDescription>
              {duplicates.length === 0 
                ? "Nenhum duplicado encontrado. Todas as competições são únicas."
                : `Encontrados ${duplicates.length} grupos de competições duplicadas.`
              }
            </DialogDescription>
          </DialogHeader>

          {duplicates.length > 0 && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Registros serão migrados para a competição canônica (primeiro registro) e os duplicados serão removidos.
              </p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {duplicates.map((group, idx) => (
                  <div key={idx} className="glass-card p-3 space-y-2">
                    <p className="font-medium text-sm">
                      {group.canonical.name}
                      {group.canonical.state && ` (${group.canonical.state})`}
                      {group.canonical.division && ` - ${group.canonical.division}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>{group.competitions.length}</strong> registros encontrados. 
                      Mantendo: <span className="text-primary">{group.canonical.id.slice(0, 8)}...</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDedupeDialogOpen(false)}>
              {duplicates.length === 0 ? "Fechar" : "Cancelar"}
            </Button>
            {duplicates.length > 0 && (
              <Button onClick={handleDeduplicate} disabled={isDeduping}>
                {isDeduping && <Loader2 className="w-4 h-4 animate-spin" />}
                Remover {duplicates.reduce((acc, g) => acc + g.competitions.length - 1, 0)} Duplicados
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Competitions;