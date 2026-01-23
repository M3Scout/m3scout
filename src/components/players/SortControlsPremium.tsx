import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SortField = "full_name" | "position" | "current_club" | "avg_score" | "auto_rating" | "contract_end" | "is_public";
type SortDirection = "asc" | "desc";

interface SortControlsPremiumProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  isMobile?: boolean;
}

const sortOptions = [
  { value: "avg_score-desc", label: "Score ↓", field: "avg_score" as const, dir: "desc" as const },
  { value: "avg_score-asc", label: "Score ↑", field: "avg_score" as const, dir: "asc" as const },
  { value: "auto_rating-desc", label: "Nota Global ↓", field: "auto_rating" as const, dir: "desc" as const },
  { value: "auto_rating-asc", label: "Nota Global ↑", field: "auto_rating" as const, dir: "asc" as const },
  { value: "full_name-asc", label: "Nome A-Z", field: "full_name" as const, dir: "asc" as const },
  { value: "full_name-desc", label: "Nome Z-A", field: "full_name" as const, dir: "desc" as const },
  { value: "position-asc", label: "Posição A-Z", field: "position" as const, dir: "asc" as const },
  { value: "position-desc", label: "Posição Z-A", field: "position" as const, dir: "desc" as const },
];

const desktopButtons: Array<{ field: SortField; label: string }> = [
  { field: "avg_score", label: "Score" },
  { field: "auto_rating", label: "OVR" },
  { field: "full_name", label: "Nome" },
  { field: "position", label: "Posição" },
];

export function SortControlsPremium({
  sortField,
  sortDirection,
  onSort,
  onSortChange,
  isMobile = false,
}: SortControlsPremiumProps) {
  const handleMobileChange = (value: string) => {
    const option = sortOptions.find(o => o.value === value);
    if (option && onSortChange) {
      onSortChange(option.field, option.dir);
    }
  };

  if (isMobile) {
    return (
      <div className="flex items-center gap-2 w-full">
        <span className="text-[11px] uppercase tracking-wide text-zinc-600 font-medium shrink-0">
          Ordenar
        </span>
        <Select 
          value={`${sortField}-${sortDirection}`} 
          onValueChange={handleMobileChange}
        >
          <SelectTrigger className="flex-1 h-9 text-xs bg-zinc-900/60 border-zinc-800/50 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] uppercase tracking-wide text-zinc-600 font-medium mr-2">
        Ordenar
      </span>
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900/40">
        {desktopButtons.map(({ field, label }) => {
          const isActive = sortField === field;
          return (
            <button
              key={field}
              onClick={() => onSort(field)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                isActive 
                  ? "bg-zinc-800 text-zinc-100 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              {label}
              {isActive && (
                sortDirection === "asc" 
                  ? <ArrowUp className="w-3 h-3" /> 
                  : <ArrowDown className="w-3 h-3" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
