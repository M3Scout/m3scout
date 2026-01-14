import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
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
import { Search, Trophy, Filter, X, Eye, EyeOff, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeArray } from "@/lib/utils";

interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  country: string;
  state: string | null;
  type: string;
  division: string | null;
  base_coefficient: number;
  final_coefficient: number;
  tier: string;
  visibility_score: number | null;
  is_active: boolean;
}

import { TIER_COLORS, getTierThresholdsTooltip } from "@/lib/tierClassification";

const COMPETITION_TYPES = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Copa" },
  { value: "state_league", label: "Estadual" },
  { value: "continental", label: "Continental" },
];

const CompetitionRanking = () => {
  const { isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("visible");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .eq("is_active", true)
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

  // Unique values for filters
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    competitions.forEach((c) => c.country && countries.add(c.country));
    return Array.from(countries).sort();
  }, [competitions]);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    competitions.forEach((c) => c.state && states.add(c.state));
    return Array.from(states).sort();
  }, [competitions]);

  const uniqueDivisions = useMemo(() => {
    const divs = new Set<string>();
    competitions.forEach((c) => c.division && divs.add(c.division));
    return Array.from(divs).sort();
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      // Public: only visibility > 0
      if (!isAdmin && (comp.visibility_score ?? 0) <= 0) return false;

      const searchLower = (searchQuery || "").toLowerCase();
      const matchesSearch =
        (comp.name || "").toLowerCase().includes(searchLower) ||
        ((comp.display_name || "").toLowerCase().includes(searchLower));
      const matchesCountry = countryFilter === "all" || comp.country === countryFilter;
      const matchesType = typeFilter === "all" || comp.type === typeFilter;
      const matchesState = stateFilter === "all" || comp.state === stateFilter;
      const matchesDivision = divisionFilter === "all" || comp.division === divisionFilter;
      const matchesTier = tierFilter === "all" || comp.tier === tierFilter;
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && (comp.visibility_score ?? 0) > 0) ||
        (visibilityFilter === "hidden" && (comp.visibility_score ?? 0) === 0);

      return matchesSearch && matchesCountry && matchesType && matchesState && matchesDivision && matchesTier && matchesVisibility;
    });
  }, [competitions, searchQuery, countryFilter, typeFilter, stateFilter, divisionFilter, tierFilter, visibilityFilter, isAdmin]);

  const getTypeLabel = (type: string) => {
    const found = COMPETITION_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCountryFilter("all");
    setTypeFilter("all");
    setStateFilter("all");
    setDivisionFilter("all");
    setTierFilter("all");
    setVisibilityFilter("visible");
  };

  const hasActiveFilters =
    searchQuery ||
    countryFilter !== "all" ||
    typeFilter !== "all" ||
    stateFilter !== "all" ||
    divisionFilter !== "all" ||
    tierFilter !== "all" ||
    visibilityFilter !== "visible";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Ranking de Competições
          </h1>
          <p className="text-muted-foreground mt-1">
            Competições ordenadas por coeficiente final
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
              <p className="font-semibold mb-1">Coeficiente Final</p>
              <p className="text-sm text-muted-foreground">
                Usado para ranking e scoring. Calculado automaticamente a partir do coeficiente base.
              </p>
              <div className="text-sm mt-2 space-y-0.5">
                {getTierThresholdsTooltip().map(({ tier, range, colorClass }) => (
                  <p key={tier}><span className={`font-medium ${colorClass}`}>Tier {tier}:</span> {range}</p>
                ))}
              </div>
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
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 rounded-full px-1.5">
                !
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-card/50 rounded-lg border">
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
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueStates.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Divisão</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueDivisions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
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
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div>
                <Label className="text-xs text-muted-foreground">Visibilidade</Label>
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="visible">Visíveis</SelectItem>
                    <SelectItem value="hidden">Ocultas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
              <TableHead>Estado / Divisão</TableHead>
              <TableHead className="text-center">Tier</TableHead>
              {isAdmin && <TableHead className="text-center">Base</TableHead>}
              <TableHead className="text-center">Final</TableHead>
              {isAdmin && <TableHead className="text-center">Visib.</TableHead>}
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
                  {isAdmin && <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  {isAdmin && <TableCell><Skeleton className="h-4 w-10 mx-auto" /></TableCell>}
                </TableRow>
              ))
            ) : filteredCompetitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 6} className="text-center py-12 text-muted-foreground">
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
                  {isAdmin && (
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {Number.isFinite(comp.base_coefficient) ? comp.base_coefficient.toFixed(2) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-center font-mono font-medium">
                    ×{Number.isFinite(comp.final_coefficient) ? comp.final_coefficient.toFixed(2) : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      {(comp.visibility_score ?? 0) > 0 ? (
                        <Eye className="w-4 h-4 text-primary inline-block" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground inline-block" />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        {filteredCompetitions.length} competição(ões) exibida(s)
      </div>
    </div>
  );
};
const CompetitionRankingPage = () => (
  <ErrorBoundary fallbackMessage="Erro ao carregar ranking de competições. Por favor, tente novamente.">
    <CompetitionRanking />
  </ErrorBoundary>
);

export default CompetitionRankingPage;
