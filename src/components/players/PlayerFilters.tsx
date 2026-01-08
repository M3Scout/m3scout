import { Search, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  positionFilter: string;
  onPositionChange: (value: string) => void;
  nationalityFilter: string;
  onNationalityChange: (value: string) => void;
}

const positions = [
  "Todos",
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meio-campo",
  "Meia Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
  "Centroavante",
];

const nationalities = [
  "Todos",
  "Brasil",
  "Argentina",
  "Portugal",
  "Espanha",
  "Colômbia",
  "Uruguai",
];

export function PlayerFilters({
  searchQuery,
  onSearchChange,
  positionFilter,
  onPositionChange,
  nationalityFilter,
  onNationalityChange,
}: PlayerFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar atleta por nome..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 input-dark"
        />
      </div>

      {/* Position Filter */}
      <Select value={positionFilter} onValueChange={onPositionChange}>
        <SelectTrigger className="w-full md:w-[180px] input-dark">
          <SelectValue placeholder="Posição" />
        </SelectTrigger>
        <SelectContent>
          {positions.map((pos) => (
            <SelectItem key={pos} value={pos.toLowerCase()}>
              {pos}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Nationality Filter */}
      <Select value={nationalityFilter} onValueChange={onNationalityChange}>
        <SelectTrigger className="w-full md:w-[180px] input-dark">
          <SelectValue placeholder="Nacionalidade" />
        </SelectTrigger>
        <SelectContent>
          {nationalities.map((nat) => (
            <SelectItem key={nat} value={nat.toLowerCase()}>
              {nat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
