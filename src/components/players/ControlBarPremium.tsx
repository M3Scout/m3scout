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

interface ControlBarPremiumProps {
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

export function ControlBarPremium({
  searchQuery,
  onSearchChange,
  positionFilter,
  onPositionChange,
  nationalityFilter,
  onNationalityChange,
}: ControlBarPremiumProps) {
  return (
    <div 
      className="flex flex-col lg:flex-row gap-3 p-1.5 rounded-lg"
      style={{ 
        fontFamily: "'Poppins', sans-serif",
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}
    >
      {/* Search - Takes most space */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          type="text"
          placeholder="Buscar atleta..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-11 bg-transparent border-0 text-white placeholder:text-neutral-500 rounded-md focus-visible:ring-1 focus-visible:ring-white/10 transition-all duration-200"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        />
      </div>

      {/* Filters row - mobile stacked, desktop inline */}
      <div className="flex flex-col sm:flex-row gap-3 lg:gap-2">
        {/* Position Filter */}
        <Select value={positionFilter} onValueChange={onPositionChange}>
          <SelectTrigger 
            className="w-full sm:w-[160px] h-11 bg-transparent border-0 text-white rounded-md focus:ring-1 focus:ring-white/10 hover:bg-white/5 transition-all duration-200"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <SelectValue placeholder="Posição" />
          </SelectTrigger>
          <SelectContent 
            className="bg-[#0f0f0f] border-white/10 rounded-lg"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {safeArray(positions).map((pos) => (
              <SelectItem 
                key={pos} 
                value={pos.toLowerCase()}
                className="text-white focus:bg-white/10 focus:text-white rounded-md"
              >
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Nationality Filter */}
        <Select value={nationalityFilter} onValueChange={onNationalityChange}>
          <SelectTrigger 
            className="w-full sm:w-[160px] h-11 bg-transparent border-0 text-white rounded-md focus:ring-1 focus:ring-white/10 hover:bg-white/5 transition-all duration-200"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <SelectValue placeholder="Nacionalidade" />
          </SelectTrigger>
          <SelectContent 
            className="bg-[#0f0f0f] border-white/10 rounded-lg"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {safeArray(nationalities).map((nat) => (
              <SelectItem 
                key={nat} 
                value={nat.toLowerCase()}
                className="text-white focus:bg-white/10 focus:text-white rounded-md"
              >
                {nat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
