import { Search, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "draft" | "published";
type SortOption = "newest" | "oldest" | "updated";

interface NewsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

const statusLabels: Record<StatusFilter, string> = {
  all: "Todas",
  draft: "Rascunho",
  published: "Publicadas",
};

const sortLabels: Record<SortOption, string> = {
  newest: "Mais recentes",
  oldest: "Mais antigas",
  updated: "Atualizadas",
};

export function NewsFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
}: NewsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notícias..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Status:</span>
              <span className="font-medium">{statusLabels[statusFilter]}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
              <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="draft">Rascunho</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="published">Publicadas</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
            >
              <span className="hidden xs:inline">Ordenar:</span>
              <span className="font-medium">{sortLabels[sortBy]}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
              <DropdownMenuRadioItem value="newest">Mais recentes</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">Mais antigas</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updated">Atualizadas</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export type { StatusFilter, SortOption };
