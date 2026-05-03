import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CompetitionOption {
  id: string;
  name: string;
  display_name?: string | null;
  final_coefficient?: number;
}

interface SearchableCompetitionSelectProps {
  competitions: CompetitionOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Render label for each item. Defaults to display_name || name */
  renderLabel?: (comp: CompetitionOption) => React.ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/** Normalize string for accent-insensitive fuzzy matching */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_\s]+/g, "");
}

export function SearchableCompetitionSelect({
  competitions,
  value,
  onValueChange,
  placeholder = "Selecione uma competição...",
  renderLabel,
  disabled,
  className,
  triggerClassName,
}: SearchableCompetitionSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = competitions.find((c) => c.id === value);

  const getLabel = (comp: CompetitionOption): string =>
    comp.display_name || comp.name;

  const filtered = useMemo(() => {
    if (!query.trim()) return competitions;
    const normalizedQuery = normalize(query);
    return competitions.filter((c) =>
      normalize(getLabel(c)).includes(normalizedQuery)
    );
  }, [competitions, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      // Focus input after popover opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
            "bg-zinc-900/80 border-zinc-800/60 text-foreground",
            "hover:border-zinc-700/60 hover:bg-zinc-900/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-150",
            triggerClassName,
            className
          )}
        >
          <span className={cn("truncate", !selected && "text-zinc-500")}>
            {selected
              ? renderLabel
                ? renderLabel(selected)
                : getLabel(selected)
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-zinc-900 border-zinc-800"
        align="start"
      >
        {/* Search input - fixed at top */}
        <div className="flex items-center border-b border-zinc-800 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar competição..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex h-10 w-full bg-transparent py-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
          />
        </div>

        {/* Options list */}
        <div className="max-h-[220px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              Nenhuma competição encontrada
            </div>
          ) : (
            filtered.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => {
                  onValueChange(comp.id === value ? "" : comp.id);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  "text-zinc-300 hover:bg-white/5 hover:text-white",
                  comp.id === value && "bg-primary/10 text-white"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    comp.id === value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">
                  {renderLabel ? renderLabel(comp) : getLabel(comp)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
