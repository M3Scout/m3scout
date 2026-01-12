import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { safeArray } from "@/lib/utils";

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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="Buscar atleta por nome..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-12 bg-transparent border-zinc-800 text-white placeholder:text-zinc-500 rounded-none focus-visible:ring-0 focus-visible:border-zinc-600"
        />
      </div>

      {/* Position Filter */}
      <Select value={positionFilter} onValueChange={onPositionChange}>
        <SelectTrigger className="w-full md:w-[200px] h-12 bg-transparent border-zinc-800 text-white rounded-none focus:ring-0 focus:border-zinc-600">
          <SelectValue placeholder="Posição" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none">
          {safeArray(positions).map((pos) => (
            <SelectItem 
              key={pos} 
              value={pos.toLowerCase()}
              className="text-white focus:bg-zinc-800 focus:text-white rounded-none"
            >
              {pos}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Nationality Filter */}
      <Select value={nationalityFilter} onValueChange={onNationalityChange}>
        <SelectTrigger className="w-full md:w-[200px] h-12 bg-transparent border-zinc-800 text-white rounded-none focus:ring-0 focus:border-zinc-600">
          <SelectValue placeholder="Nacionalidade" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none">
          {safeArray(nationalities).map((nat) => (
            <SelectItem 
              key={nat} 
              value={nat.toLowerCase()}
              className="text-white focus:bg-zinc-800 focus:text-white rounded-none"
            >
              {nat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
