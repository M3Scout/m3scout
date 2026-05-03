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
    { key: "expired", label: "Vencidos", count: counts.expired },
    { key: "expiring", label: "Expirando", count: counts.expiring },
    { key: "active", label: "Ativos", count: counts.active },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((filter) => {
        const isActive = currentStatus === filter.key;
        return (
          <button
            key={filter.key ?? "all"}
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {filter.label}
            <span className={cn(
              "tabular-nums text-[10px]",
              isActive ? "text-zinc-400" : "text-zinc-600"
            )}>
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
