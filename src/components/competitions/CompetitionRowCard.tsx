import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2,
  MapPin,
  Info
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TierBadge, CoefficientBar, TypeBadge, StatusBadge, VisibilityDisplay } from "./CompetitionVisuals";
import { getTierFromCoefficient } from "@/lib/tierClassification";

interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  competition_code?: string | null;
  country: string;
  state: string | null;
  type: string;
  division: string | null;
  phase?: string | null;
  base_coefficient: number;
  computed_coefficient?: number;
  final_coefficient: number;
  tier: string;
  visibility_score: number | null;
  is_active: boolean;
  is_unique?: boolean | null;
  has_phases?: boolean;
}

interface CompetitionRowCardProps {
  competition: Competition;
  isAdmin: boolean;
  onEdit: (comp: Competition) => void;
  onDelete: (comp: Competition) => void;
}

export function CompetitionRowCard({ competition, isAdmin, onEdit, onDelete }: CompetitionRowCardProps) {
  const tier = getTierFromCoefficient(competition.final_coefficient);

  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 hover:border-border transition-all duration-200">
      {/* Tier Badge - Most prominent */}
      <div className="shrink-0">
        <TierBadge tier={tier} size="lg" />
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground truncate">
            {competition.display_name || competition.name}
          </h3>
          {competition.display_name && competition.name !== competition.display_name && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{competition.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={competition.type} />
          {competition.state && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {competition.state}
            </span>
          )}
          {competition.division && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {competition.division}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{competition.country}</span>
        </div>
      </div>

      {/* Coefficient Bar */}
      <div className="hidden sm:block shrink-0">
        <CoefficientBar value={competition.final_coefficient} />
      </div>

      {/* Visibility */}
      <div className="hidden md:block shrink-0">
        <VisibilityDisplay score={competition.visibility_score} />
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge isActive={competition.is_active} />
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border">
              <DropdownMenuItem onClick={() => onEdit(competition)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(competition)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// Mobile Card version
export function CompetitionMobileCard({ competition, isAdmin, onEdit, onDelete }: CompetitionRowCardProps) {
  const tier = getTierFromCoefficient(competition.final_coefficient);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className="p-4 rounded-lg border border-border/50 bg-card/30 space-y-3"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {competition.display_name || competition.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={competition.type} />
            {competition.state && (
              <span className="text-xs text-muted-foreground">{competition.state}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier={tier} size="md" />
          <StatusBadge isActive={competition.is_active} />
        </div>
      </div>

      {/* Coefficient */}
      <CoefficientBar value={competition.final_coefficient} size="sm" />

      {/* Expanded Content */}
      {expanded && (
        <div className="pt-3 border-t border-border/30 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">País</p>
              <p className="font-medium">{competition.country}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Visibilidade</p>
              <p className="font-medium text-blue-400">{competition.visibility_score ?? 50}</p>
            </div>
            {competition.division && (
              <div>
                <p className="text-xs text-muted-foreground">Divisão</p>
                <p className="font-medium">{competition.division}</p>
              </div>
            )}
          </div>
          
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(competition);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(competition);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
