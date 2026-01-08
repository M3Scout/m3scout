import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical,
  Eye,
  FileText,
  Edit
} from "lucide-react";
import { RatingStars } from "@/components/players/RatingStars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const players = [
  {
    id: "1",
    name: "Gabriel Santos",
    position: "Meia Atacante",
    age: 22,
    nationality: "Brasil",
    currentClub: "EC Bahia",
    rating: 4,
    reportsCount: 8,
    lastReport: "2024-01-15",
    contractEnd: "2025-12-31",
    isPublic: true,
  },
  {
    id: "2",
    name: "Lucas Oliveira",
    position: "Zagueiro",
    age: 24,
    nationality: "Brasil",
    currentClub: "Cruzeiro EC",
    rating: 5,
    reportsCount: 12,
    lastReport: "2024-01-14",
    contractEnd: "2026-06-30",
    isPublic: true,
  },
  {
    id: "3",
    name: "Matheus Costa",
    position: "Centroavante",
    age: 20,
    nationality: "Brasil",
    currentClub: "Santos FC",
    rating: 4,
    reportsCount: 6,
    lastReport: "2024-01-10",
    contractEnd: "2025-06-30",
    isPublic: true,
  },
  {
    id: "4",
    name: "Pedro Almeida",
    position: "Volante",
    age: 23,
    nationality: "Brasil",
    currentClub: "Fluminense FC",
    rating: 3,
    reportsCount: 4,
    lastReport: "2024-01-13",
    contractEnd: "2024-12-31",
    isPublic: false,
  },
];

const AppPlayers = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Atletas</h1>
          <p className="text-muted-foreground">
            Gerencie todos os atletas da agência
          </p>
        </div>
        <Button variant="gradient">
          <Plus className="w-4 h-4" />
          Novo Atleta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-dark"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Atleta
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Posição
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Clube
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Rating
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Relatórios
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Contrato
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr 
                  key={player.id}
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.age} anos • {player.nationality}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="position-badge">{player.position}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {player.currentClub}
                  </td>
                  <td className="p-4">
                    <RatingStars rating={player.rating} size="sm" />
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {player.reportsCount}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(player.contractEnd).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      player.isPublic 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {player.isPublic ? "Público" : "Privado"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          Novo Relatório
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AppPlayers;
