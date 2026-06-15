import * as React from "react";
import { Edit, Trash2, MoreHorizontal, MapPin, Info } from "lucide-react";
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
import { PermissionGate } from "@/components/auth/PermissionGate";

const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";

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
    <div
      className="group relative flex items-center gap-4 p-3.5 rounded-xl border transition-colors duration-[250ms] hover:bg-zinc-800/30"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* Tier */}
      <div className="shrink-0">
        <TierBadge tier={tier} size="lg" />
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>
            {competition.display_name || competition.name}
          </h3>
          {competition.display_name && competition.name !== competition.display_name && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 shrink-0" style={{ color: MUTED }} />
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
            <span className="flex items-center gap-1 font-editorial-mono text-[10px]" style={{ color: MUTED }}>
              <MapPin className="w-2.5 h-2.5" />
              {competition.state}
            </span>
          )}
          {competition.division && (
            <span
              className="font-editorial-mono text-[9px] uppercase px-1.5 py-0.5 rounded-md"
              style={{ border: `1px solid ${CARD_BORDER}`, color: MUTED }}
            >
              {competition.division}
            </span>
          )}
          <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
            {competition.country}
          </span>
        </div>
      </div>

      {/* Coefficient */}
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
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: MUTED }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ background: "#111113", borderColor: CARD_BORDER }}>
              <DropdownMenuItem onClick={() => onEdit(competition)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <PermissionGate module="competitions" action="delete">
                <DropdownMenuItem
                  onClick={() => onDelete(competition)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function CompetitionMobileCard({ competition, isAdmin, onEdit, onDelete }: CompetitionRowCardProps) {
  const tier = getTierFromCoefficient(competition.final_coefficient);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className="p-4 rounded-xl border space-y-3 cursor-pointer transition-colors duration-[250ms]"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[13px] truncate mb-1" style={{ color: TEXT }}>
            {competition.display_name || competition.name}
          </h3>
          <div className="flex items-center gap-2">
            <TypeBadge type={competition.type} />
            {competition.state && (
              <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>{competition.state}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TierBadge tier={tier} size="md" />
          <StatusBadge isActive={competition.is_active} />
        </div>
      </div>

      <CoefficientBar value={competition.final_coefficient} size="sm" />

      {expanded && (
        <div className="pt-3 space-y-3" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-editorial-mono text-[9px] uppercase mb-1" style={{ color: MUTED }}>País</p>
              <p className="font-display text-[12px]" style={{ color: TEXT }}>{competition.country}</p>
            </div>
            <div>
              <p className="font-editorial-mono text-[9px] uppercase mb-1" style={{ color: MUTED }}>Visibilidade</p>
              <p className="font-display text-[12px] text-blue-400">{competition.visibility_score ?? 50}</p>
            </div>
            {competition.division && (
              <div>
                <p className="font-editorial-mono text-[9px] uppercase mb-1" style={{ color: MUTED }}>Divisão</p>
                <p className="font-display text-[12px]" style={{ color: TEXT }}>{competition.division}</p>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-editorial-mono text-[10px] uppercase tracking-wider transition-colors"
                style={{ border: `1px solid ${CARD_BORDER}`, color: TEXT }}
                onClick={e => { e.stopPropagation(); onEdit(competition); }}
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
              <PermissionGate module="competitions" action="delete">
                <button
                  className="flex items-center justify-center p-2 rounded-lg transition-colors"
                  style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                  onClick={e => { e.stopPropagation(); onDelete(competition); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </PermissionGate>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
