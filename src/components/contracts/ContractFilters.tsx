import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    { key: "expired", label: "Vencidos", count: counts.expired, variant: "error" as const },
    { key: "expiring", label: "Expirando", count: counts.expiring, variant: "warning" as const },
    { key: "active", label: "Ativos", count: counts.active, variant: "success" as const },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.key ?? "all"}
          variant={currentStatus === filter.key ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className="gap-2"
        >
          {filter.label}
          <Badge
            variant={currentStatus === filter.key ? "secondary" : (filter.variant || "glass")}
            size="sm"
          >
            {filter.count}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
