import * as React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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

const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";
const ACCENT      = "#ec4525";

const TIERS = ["S", "A", "B", "C", "D"] as const;
const COMPETITION_TYPES = [
  { value: "league",      label: "Liga"        },
  { value: "cup",         label: "Copa"        },
  { value: "state_league",label: "Estadual"    },
  { value: "continental", label: "Continental" },
];
const COEF_MIN = 0;
const COEF_MAX = 1.20;

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
  coefficientFilter: [number, number];
  onCoefficientChange: (value: [number, number]) => void;
  countries: string[];
  states: string[];
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CompetitionFilters({
  searchQuery, onSearchChange,
  tierFilter, onTierChange,
  typeFilter, onTypeChange,
  countryFilter, onCountryChange,
  stateFilter, onStateChange,
  visibilityFilter, onVisibilityChange,
  coefficientFilter, onCoefficientChange,
  countries, states,
  onClear, hasActiveFilters,
}: CompetitionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(searchQuery);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => { setInputValue(searchQuery); }, [searchQuery]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 350);
  };

  React.useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const [coefMinRaw, setCoefMinRaw] = React.useState(String(coefficientFilter[0]));
  const [coefMaxRaw, setCoefMaxRaw] = React.useState(String(coefficientFilter[1]));

  React.useEffect(() => {
    setCoefMinRaw(String(coefficientFilter[0]));
    setCoefMaxRaw(String(coefficientFilter[1]));
  }, [coefficientFilter[0], coefficientFilter[1]]);

  const commitCoefMin = (raw: string) => {
    const parsed = parseFloat(raw);
    const value = isNaN(parsed) ? COEF_MIN : Math.min(Math.max(parsed, COEF_MIN), coefficientFilter[1]);
    setCoefMinRaw(value.toFixed(2));
    onCoefficientChange([value, coefficientFilter[1]]);
  };

  const commitCoefMax = (raw: string) => {
    const parsed = parseFloat(raw);
    const value = isNaN(parsed) ? COEF_MAX : Math.max(Math.min(parsed, COEF_MAX), coefficientFilter[0]);
    setCoefMaxRaw(value.toFixed(2));
    onCoefficientChange([coefficientFilter[0], value]);
  };

  const activeCount = [
    tierFilter !== "all",
    typeFilter !== "all",
    countryFilter !== "all",
    stateFilter !== "all",
    visibilityFilter[0] > 0 || visibilityFilter[1] < 100,
    coefficientFilter[0] > COEF_MIN || coefficientFilter[1] < COEF_MAX,
  ].filter(Boolean).length;

  const selectStyle = {
    background: CARD_BG,
    border: `1px solid ${CARD_BORDER}`,
    color: TEXT,
  };

  return (
    <div className="space-y-3">
      {/* Row 1: search + tier pills + toggle */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <Input
            type="text"
            placeholder="Buscar competição..."
            value={inputValue}
            onChange={handleSearchInput}
            className="pl-9 rounded-lg h-9 text-[12px] border-0 focus-visible:ring-0"
            style={selectStyle}
          />
        </div>

        {/* Tier pills */}
        <div className="flex items-center gap-1.5">
          <span className="font-editorial-mono text-[9px] uppercase tracking-wider mr-1" style={{ color: MUTED }}>Tier</span>
          <button
            onClick={() => onTierChange("all")}
            className="font-editorial-mono text-[10px] px-3 py-1.5 rounded-lg border transition-colors duration-150"
            style={{
              background: tierFilter === "all" ? "rgba(255,255,255,0.08)" : "transparent",
              borderColor: tierFilter === "all" ? "rgba(255,255,255,0.2)" : CARD_BORDER,
              color: tierFilter === "all" ? TEXT : MUTED,
            }}
          >
            Todos
          </button>
          {TIERS.map(tier => (
            <button
              key={tier}
              onClick={() => onTierChange(tier)}
              className="rounded-lg px-1.5 py-1 transition-all duration-150"
              style={{ opacity: tierFilter === tier ? 1 : 0.55 }}
            >
              <TierBadge tier={tier} size="sm" showTooltip={false} />
            </button>
          ))}
        </div>

        {/* Toggle advanced */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-editorial-mono text-[10px] uppercase tracking-wider border transition-colors duration-150"
            style={{
              background: showAdvanced ? "rgba(255,255,255,0.06)" : "transparent",
              borderColor: activeCount > 0 ? ACCENT : CARD_BORDER,
              color: activeCount > 0 ? ACCENT : MUTED,
            }}
          >
            <Filter className="w-3 h-3" />
            Filtros
            {activeCount > 0 && (
              <span
                className="font-editorial-mono text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: ACCENT, color: "#fff" }}
              >
                {activeCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-editorial-mono text-[10px] uppercase tracking-wider transition-colors duration-150"
              style={{ color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div
          className="p-4 rounded-xl border grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}
        >
          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>Tipo</label>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="rounded-lg h-8 text-[11px] border-0 focus:ring-0" style={selectStyle}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
                <SelectItem value="all">Todos</SelectItem>
                {COMPETITION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* País */}
          <div className="space-y-1.5">
            <label className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>País</label>
            <Select value={countryFilter} onValueChange={onCountryChange}>
              <SelectTrigger className="rounded-lg h-8 text-[11px] border-0 focus:ring-0" style={selectStyle}>
                <Globe className="w-3 h-3 mr-1.5 shrink-0" style={{ color: MUTED }} />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
                <SelectItem value="all">Todos</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <label className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>Estado</label>
            <Select value={stateFilter} onValueChange={onStateChange}>
              <SelectTrigger className="rounded-lg h-8 text-[11px] border-0 focus:ring-0" style={selectStyle}>
                <MapPin className="w-3 h-3 mr-1.5 shrink-0" style={{ color: MUTED }} />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
                <SelectItem value="all">Todos</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Coeficiente */}
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <label className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>Coeficiente</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number" min={COEF_MIN} max={COEF_MAX} step={0.01}
                value={coefMinRaw}
                onChange={e => setCoefMinRaw(e.target.value)}
                onBlur={() => commitCoefMin(coefMinRaw)}
                onKeyDown={e => e.key === "Enter" && commitCoefMin(coefMinRaw)}
                className="w-[60px] text-center text-[11px] tabular-nums px-1 rounded-lg h-8 border-0 focus-visible:ring-0"
                style={selectStyle}
              />
              <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>–</span>
              <Input
                type="number" min={COEF_MIN} max={COEF_MAX} step={0.01}
                value={coefMaxRaw}
                onChange={e => setCoefMaxRaw(e.target.value)}
                onBlur={() => commitCoefMax(coefMaxRaw)}
                onKeyDown={e => e.key === "Enter" && commitCoefMax(coefMaxRaw)}
                className="w-[60px] text-center text-[11px] tabular-nums px-1 rounded-lg h-8 border-0 focus-visible:ring-0"
                style={selectStyle}
              />
            </div>
          </div>

          {/* Visibilidade */}
          <div className="space-y-1.5 col-span-2 lg:col-span-2">
            <label className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
              Visibilidade: {visibilityFilter[0]} – {visibilityFilter[1]}
            </label>
            <div className="pt-2 px-1">
              <Slider
                value={visibilityFilter}
                onValueChange={v => onVisibilityChange(v as [number, number])}
                min={0} max={100} step={10}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
