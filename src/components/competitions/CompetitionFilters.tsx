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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar competição..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Tier Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Tier:</span>
          <Button
            variant={tierFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onTierChange("all")}
            className="h-8 px-3"
          >
            Todos
          </Button>
          {TIERS.map((tier) => (
            <Button
              key={tier}
              variant={tierFilter === tier ? "default" : "outline"}
              size="sm"
              onClick={() => onTierChange(tier)}
              className={cn(
                "h-8 w-8 p-0",
                tierFilter === tier && "ring-2 ring-offset-2 ring-offset-background"
              )}
            >
              <TierBadge tier={tier} size="sm" showTooltip={false} />
            </Button>
          ))}
        </div>

        {/* Toggle Advanced */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(showAdvanced && "bg-secondary")}
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
            <Button variant="ghost" size="sm" onClick={onClear}>
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
