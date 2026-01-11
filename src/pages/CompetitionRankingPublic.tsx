import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Trophy, Filter, X, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  country: string;
  state: string | null;
  type: string;
  division: string | null;
  final_coefficient: number;
  tier: string;
  visibility_score: number | null;
}

const TIER_COLORS: Record<string, string> = {
  S: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  A: "bg-primary/20 text-primary border-primary/50",
  B: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  C: "bg-muted text-muted-foreground border-border",
  D: "bg-destructive/20 text-destructive border-destructive/50",
};

const COMPETITION_TYPES = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Copa" },
  { value: "state_league", label: "Estadual" },
  { value: "continental", label: "Continental" },
];

const CompetitionRankingPublic = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("id, name, display_name, country, state, type, division, final_coefficient, tier, visibility_score")
      .eq("is_active", true)
      .gt("visibility_score", 0)
      .order("final_coefficient", { ascending: false })
      .order("name", { ascending: true });

    if (data) {
      setCompetitions(data);
    }
    if (error) {
      console.error("Error fetching competitions:", error);
    }
    setLoading(false);
  };

  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    competitions.forEach((c) => c.country && countries.add(c.country));
    return Array.from(countries).sort();
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      const matchesSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCountry = countryFilter === "all" || comp.country === countryFilter;
      const matchesType = typeFilter === "all" || comp.type === typeFilter;
      const matchesTier = tierFilter === "all" || comp.tier === tierFilter;

      return matchesSearch && matchesCountry && matchesType && matchesTier;
    });
  }, [competitions, searchQuery, countryFilter, typeFilter, tierFilter]);

  const getTypeLabel = (type: string) => {
    const found = COMPETITION_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCountryFilter("all");
    setTypeFilter("all");
    setTierFilter("all");
  };

  const hasActiveFilters = searchQuery || countryFilter !== "all" || typeFilter !== "all" || tierFilter !== "all";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Ranking de Competições
          </h1>
          <p className="text-muted-foreground mt-2">
            Competições ordenadas por nível de dificuldade e prestígio
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="font-semibold mb-1">Sistema de Tiers</p>
              <p className="text-sm text-muted-foreground mb-2">
                Competições são classificadas automaticamente baseado no coeficiente final.
              </p>
              <p className="text-sm space-y-1">
                <span className="block"><span className="text-amber-400 font-medium">S:</span> Elite (≥1.90)</span>
                <span className="block"><span className="text-primary font-medium">A:</span> Alto (1.60-1.89)</span>
                <span className="block"><span className="text-emerald-400 font-medium">B:</span> Médio (1.30-1.59)</span>
                <span className="block"><span className="text-muted-foreground font-medium">C:</span> Base (1.00-1.29)</span>
                <span className="block"><span className="text-destructive font-medium">D:</span> Inferior (&lt;1.00)</span>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar competição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card/50 rounded-lg border">
            <div>
              <Label className="text-xs text-muted-foreground">País</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueCountries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {COMPETITION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Tier</Label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="S">Tier S</SelectItem>
                  <SelectItem value="A">Tier A</SelectItem>
                  <SelectItem value="B">Tier B</SelectItem>
                  <SelectItem value="C">Tier C</SelectItem>
                  <SelectItem value="D">Tier D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead>Competição</TableHead>
              <TableHead>País / Tipo</TableHead>
              <TableHead>Região / Divisão</TableHead>
              <TableHead className="text-center">Tier</TableHead>
              <TableHead className="text-center">Coeficiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-10 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredCompetitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhuma competição encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredCompetitions.map((comp, index) => (
                <TableRow key={comp.id} className="hover:bg-muted/20">
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {comp.display_name || comp.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{comp.country}</span>
                      <span className="text-xs text-muted-foreground">{getTypeLabel(comp.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {comp.state || comp.division ? (
                      <div className="flex flex-col gap-0.5">
                        {comp.state && <span className="text-sm">{comp.state}</span>}
                        {comp.division && (
                          <span className="text-xs text-muted-foreground">{comp.division}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={TIER_COLORS[comp.tier] || TIER_COLORS.C}>
                      {comp.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-medium">
                    ×{Number.isFinite(comp.final_coefficient) ? comp.final_coefficient.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        {filteredCompetitions.length} competição(ões)
      </div>
    </div>
  );
};

export default CompetitionRankingPublic;
