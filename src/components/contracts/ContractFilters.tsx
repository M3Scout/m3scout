import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContractFiltersProps {
  currentStatus: string | null;
  counts: {
    total: number;
    expired: number;
    expiring: number;
    active: number;
  };
  onFilterChange: (status: string | null) => void;
}

export function ContractFilters({ currentStatus, counts, onFilterChange }: ContractFiltersProps) {
  const filters = [
    { key: null, label: "Todos", count: counts.total },
    { key: "expired", label: "Vencidos", count: counts.expired, badgeVariant: "error" as const },
    { key: "expiring", label: "Expirando", count: counts.expiring, badgeVariant: "warning" as const },
    { key: "active", label: "Ativos", count: counts.active, badgeVariant: "success" as const },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = currentStatus === filter.key;
        return (
          <button
            key={filter.key ?? "all"}
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              "border",
              isActive
                ? "bg-zinc-800 border-white/[0.08] text-foreground shadow-sm"
                : "bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300"
            )}
          >
            {filter.label}
            <Badge
              variant={isActive ? "secondary" : (filter.badgeVariant || "glass")}
              size="sm"
              className={cn(
                !isActive && !filter.badgeVariant && "bg-zinc-800/60 text-zinc-500 border-transparent"
              )}
            >
              {filter.count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
