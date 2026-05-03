import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, Globe, MapPin } from "lucide-react";
import { TierBadge } from "./CompetitionVisuals";
import { cn } from "@/lib/utils";

const TIERS = ["S", "A", "B", "C", "D"] as const;

const COMPETITION_TYPES = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Copa" },
  { value: "state_league", label: "Estadual" },
  { value: "continental", label: "Continental" },
];

interface CompetitionFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  tierFilter: string;
  onTierChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  countryFilter: string;
  onCountryChange: (value: string) => void;
  stateFilter: string;
  onStateChange: (value: string) => void;
  visibilityFilter: [number, number];
  onVisibilityChange: (value: [number, number]) => void;
  countries: string[];
  states: string[];
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CompetitionFilters({
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierChange,
  typeFilter,
  onTypeChange,
  countryFilter,
  onCountryChange,
  stateFilter,
  onStateChange,
  visibilityFilter,
  onVisibilityChange,
  countries,
  states,
  onClear,
  hasActiveFilters,
}: CompetitionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* Quick Tier Filters + Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar competição..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* Quick Tier Chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mr-1">Tier</span>
          <button
            onClick={() => onTierChange("all")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full transition-all duration-200 font-medium",
              tierFilter === "all"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Todos
          </button>
          {TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => onTierChange(tier)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-all duration-200 font-semibold",
                tierFilter === tier
                  ? "ring-1 ring-offset-1 ring-offset-background"
                  : "opacity-70 hover:opacity-100"
              )}
            >
              <TierBadge tier={tier} size="sm" showTooltip={false} />
            </button>
          ))}
        </div>

        {/* Toggle Advanced */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn("rounded-full", showAdvanced && "bg-secondary")}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {[
                  tierFilter !== "all",
                  typeFilter !== "all",
                  countryFilter !== "all",
                  stateFilter !== "all",
                  visibilityFilter[0] > 0 || visibilityFilter[1] < 100,
                ].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear} className="rounded-full">
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 rounded-lg border border-border/50 bg-card/30 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in">
          {/* Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                <SelectItem value="all">Todos</SelectItem>
                {COMPETITION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">País</Label>
            <Select value={countryFilter} onValueChange={onCountryChange}>
              <SelectTrigger>
                <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                <SelectItem value="all">Todos</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={stateFilter} onValueChange={onStateChange}>
              <SelectTrigger>
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                <SelectItem value="all">Todos</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility Slider */}
          <div className="space-y-2 col-span-2 md:col-span-1 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Visibilidade: {visibilityFilter[0]} - {visibilityFilter[1]}
            </Label>
            <div className="pt-2 px-1">
              <Slider
                value={visibilityFilter}
                onValueChange={(v) => onVisibilityChange(v as [number, number])}
                min={0}
                max={100}
                step={10}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
