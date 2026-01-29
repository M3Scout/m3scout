/**
 * Manual Stats Form Dialog
 * 
 * Form for adding/editing manual stats (external games not tracked via Live Match).
 * Includes duplication warning and preview of combined totals.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  AlertTriangle, 
  FileEdit, 
  Zap, 
  Layers,
  Plus,
  Equal,
} from "lucide-react";
import { checkDuplicationWarning, type ManualStatsInput } from "@/hooks/useManualPlayerStats";
import { cn } from "@/lib/utils";

interface Competition {
  id: string;
  name: string;
}

interface LiveStats {
  games: number;
  minutes: number;
  goals: number;
  assists: number;
  shots?: number;
  tackles?: number;
}

interface ManualStatsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ManualStatsInput) => Promise<void>;
  playerId: string;
  competitions: Competition[];
  // For edit mode
  existingManualStats?: Partial<ManualStatsInput> | null;
  // Live stats for the same season/competition (for preview)
  liveStats?: LiveStats | null;
  // Preselected values
  defaultSeasonYear?: number;
  defaultCompetitionId?: string;
  isSubmitting?: boolean;
}

const currentYear = new Date().getFullYear();
const seasonOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export function ManualStatsFormDialog({
  open,
  onOpenChange,
  onSubmit,
  playerId,
  competitions,
  existingManualStats,
  liveStats,
  defaultSeasonYear,
  defaultCompetitionId,
  isSubmitting = false,
}: ManualStatsFormDialogProps) {
  const isEdit = !!existingManualStats;
  
  // Form state - starts ZEROED for new entries
  const [formData, setFormData] = useState({
    season_year: defaultSeasonYear || currentYear,
    competition_id: defaultCompetitionId || "",
    games: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    shots_on_target: 0,
    tackles: 0,
    interceptions: 0,
    recoveries: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    goals_conceded: 0,
    clean_sheets: 0,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (existingManualStats) {
        // Edit mode: load existing manual values
        setFormData({
          season_year: existingManualStats.season_year ?? defaultSeasonYear ?? currentYear,
          competition_id: existingManualStats.competition_id ?? defaultCompetitionId ?? "",
          games: existingManualStats.games ?? 0,
          minutes: existingManualStats.minutes ?? 0,
          goals: existingManualStats.goals ?? 0,
          assists: existingManualStats.assists ?? 0,
          shots: existingManualStats.shots ?? 0,
          shots_on_target: existingManualStats.shots_on_target ?? 0,
          tackles: existingManualStats.tackles ?? 0,
          interceptions: existingManualStats.interceptions ?? 0,
          recoveries: existingManualStats.recoveries ?? 0,
          yellow_cards: existingManualStats.yellow_cards ?? 0,
          red_cards: existingManualStats.red_cards ?? 0,
          saves: existingManualStats.saves ?? 0,
          goals_conceded: existingManualStats.goals_conceded ?? 0,
          clean_sheets: existingManualStats.clean_sheets ?? 0,
        });
      } else {
        // New entry: start with ZEROS (never seed from live)
        setFormData({
          season_year: defaultSeasonYear || currentYear,
          competition_id: defaultCompetitionId || "",
          games: 0,
          minutes: 0,
          goals: 0,
          assists: 0,
          shots: 0,
          shots_on_target: 0,
          tackles: 0,
          interceptions: 0,
          recoveries: 0,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          goals_conceded: 0,
          clean_sheets: 0,
        });
      }
    }
  }, [open, existingManualStats, defaultSeasonYear, defaultCompetitionId]);

  // Check for duplication warning
  const duplicationCheck = checkDuplicationWarning(
    formData.games,
    liveStats?.games ?? 0,
    formData.goals,
    liveStats?.goals ?? 0,
    formData.assists,
    liveStats?.assists ?? 0
  );

  const [confirmDuplication, setConfirmDuplication] = useState(false);

  // Reset confirmation when form changes
  useEffect(() => {
    setConfirmDuplication(false);
  }, [formData.games, formData.goals, formData.assists]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.competition_id) {
      return;
    }

    // Check for duplication warning
    if (duplicationCheck.isDuplicate && !confirmDuplication) {
      return;
    }

    await onSubmit({
      player_id: playerId,
      season_year: formData.season_year,
      competition_id: formData.competition_id,
      games: formData.games,
      minutes: formData.minutes,
      goals: formData.goals,
      assists: formData.assists,
      shots: formData.shots,
      shots_on_target: formData.shots_on_target,
      tackles: formData.tackles,
      interceptions: formData.interceptions,
      recoveries: formData.recoveries,
      yellow_cards: formData.yellow_cards,
      red_cards: formData.red_cards,
      saves: formData.saves,
      goals_conceded: formData.goals_conceded,
      clean_sheets: formData.clean_sheets,
    });

    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: number | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Preview combined totals
  const previewGames = (liveStats?.games ?? 0) + formData.games;
  const previewMinutes = (liveStats?.minutes ?? 0) + formData.minutes;
  const previewGoals = (liveStats?.goals ?? 0) + formData.goals;
  const previewAssists = (liveStats?.assists ?? 0) + formData.assists;

  const hasLiveStats = (liveStats?.games ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-amber-400" />
            {isEdit ? "Editar Estatísticas Manuais" : "Adicionar Jogos Externos"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Registre jogos que <strong>não foram acompanhados via Live Match</strong> (amistosos, 
            torneios externos, jogos anteriores à temporada).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Season & Competition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Temporada</Label>
              <Select
                value={String(formData.season_year)}
                onValueChange={(v) => handleInputChange("season_year", Number(v))}
                disabled={isEdit}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasonOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Competição</Label>
              <Select
                value={formData.competition_id}
                onValueChange={(v) => handleInputChange("competition_id", v)}
                disabled={isEdit}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-zinc-800/50" />

          {/* Required Context: Games & Minutes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                Obrigatório
              </Badge>
              <span className="text-xs text-zinc-400">Contexto dos Jogos Externos</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Jogos</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.games}
                  onChange={(e) => handleInputChange("games", Number(e.target.value))}
                  className="h-9"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Minutos</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.minutes}
                  onChange={(e) => handleInputChange("minutes", Number(e.target.value))}
                  className="h-9"
                  required
                />
              </div>
            </div>
          </div>

          {/* Core Stats */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Estatísticas Principais</Label>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Gols</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.goals}
                  onChange={(e) => handleInputChange("goals", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Assistências</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.assists}
                  onChange={(e) => handleInputChange("assists", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Chutes</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.shots}
                  onChange={(e) => handleInputChange("shots", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">No Gol</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.shots_on_target}
                  onChange={(e) => handleInputChange("shots_on_target", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Defense Stats */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Defesa</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Desarmes</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.tackles}
                  onChange={(e) => handleInputChange("tackles", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Interceptações</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.interceptions}
                  onChange={(e) => handleInputChange("interceptions", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Recuperações</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.recoveries}
                  onChange={(e) => handleInputChange("recoveries", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Discipline */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Disciplina</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Amarelos</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.yellow_cards}
                  onChange={(e) => handleInputChange("yellow_cards", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Vermelhos</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.red_cards}
                  onChange={(e) => handleInputChange("red_cards", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-800/50" />

          {/* Preview: Live + Manual = Combined */}
          {hasLiveStats && formData.games > 0 && (
            <div className="bg-zinc-900/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span>Preview do Total Combinado</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-zinc-400">Live</span>
                  <span className="text-zinc-300 font-medium">{liveStats?.games} jogos</span>
                </div>
                <Plus className="w-3 h-3 text-zinc-600" />
                <div className="flex items-center gap-1.5">
                  <FileEdit className="w-3 h-3 text-amber-400" />
                  <span className="text-zinc-400">Manual</span>
                  <span className="text-zinc-300 font-medium">{formData.games} jogos</span>
                </div>
                <Equal className="w-3 h-3 text-zinc-600" />
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-violet-400" />
                  <span className="text-violet-300 font-semibold">{previewGames} jogos</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
                <div className="text-center">
                  <span className="text-zinc-500">Minutos</span>
                  <p className="text-zinc-300 font-medium">{previewMinutes}</p>
                </div>
                <div className="text-center">
                  <span className="text-zinc-500">Gols</span>
                  <p className="text-zinc-300 font-medium">{previewGoals}</p>
                </div>
                <div className="text-center">
                  <span className="text-zinc-500">Assistências</span>
                  <p className="text-zinc-300 font-medium">{previewAssists}</p>
                </div>
              </div>
            </div>
          )}

          {/* Duplication Warning */}
          {duplicationCheck.isDuplicate && (
            <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-400">Possível Duplicação Detectada</AlertTitle>
              <AlertDescription className="text-amber-300/80 text-xs">
                {duplicationCheck.message}
                <div className="mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmDuplication}
                      onChange={(e) => setConfirmDuplication(e.target.checked)}
                      className="rounded border-amber-500/50"
                    />
                    <span className="text-xs">
                      Confirmo que estes são jogos externos reais, não duplicação do Live Match
                    </span>
                  </label>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || 
                !formData.competition_id || 
                (duplicationCheck.isDuplicate && !confirmDuplication)
              }
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileEdit className="w-4 h-4" />
              )}
              {isEdit ? "Atualizar" : "Salvar Jogos Externos"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
