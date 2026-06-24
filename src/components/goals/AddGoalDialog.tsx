import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Config ───────────────────────────────────────────────────────────────────

interface GoalTypeCfg {
  label: string; icon: string;
  minValue: number; maxValue: number; step: number;
  unit?: string;
  type: "accumulation" | "limit";
  description: string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeCfg> = {
  goals:                      { label: "Gols",                     icon: "⚽", minValue: 1,   maxValue: 50,   step: 1,  type: "accumulation", description: "Quantidade de gols marcados" },
  assists:                    { label: "Assistências",              icon: "🅰️", minValue: 1,   maxValue: 30,   step: 1,  type: "accumulation", description: "Passes decisivos para gols" },
  matches:                    { label: "Partidas",                  icon: "🏟️", minValue: 5,   maxValue: 60,   step: 5,  type: "accumulation", description: "Total de jogos disputados" },
  minutes:                    { label: "Minutos",                   icon: "⏱️", minValue: 250, maxValue: 5000, step: 50, unit: "min", type: "accumulation", description: "Tempo total em campo" },
  shots:                      { label: "Finalizações",              icon: "🎯", minValue: 10,  maxValue: 150,  step: 5,  type: "accumulation", description: "Chutes a gol na temporada" },
  tackles:                    { label: "Desarmes",                  icon: "🦵", minValue: 10,  maxValue: 150,  step: 5,  type: "accumulation", description: "Recuperações com sucesso" },
  interceptions:              { label: "Interceptações",            icon: "🧲", minValue: 1,   maxValue: 200,  step: 5,  type: "accumulation", description: "Interceptações na temporada" },
  pass_accuracy:              { label: "Aproveitamento de Passe",   icon: "📊", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de acerto de passe" },
  dribble_accuracy:           { label: "Aproveitamento de Dribles", icon: "🏃", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de acerto de dribles" },
  yellow_cards_max:           { label: "Amarelos",                  icon: "🟨", minValue: 1,   maxValue: 15,   step: 1,  type: "limit", description: "Limite máximo de cartões amarelos" },
  saves:                      { label: "Defesas Totais",            icon: "🧤", minValue: 1,   maxValue: 300,  step: 10, type: "accumulation", description: "Total de defesas na temporada" },
  saves_difficult:            { label: "Defesas Difíceis",          icon: "🦸", minValue: 1,   maxValue: 120,  step: 5,  type: "accumulation", description: "Defesas difíceis na temporada" },
  clean_sheets:               { label: "Clean Sheets",              icon: "🛡️", minValue: 1,   maxValue: 30,   step: 1,  type: "accumulation", description: "Jogos sem sofrer gols" },
  goals_conceded_max:         { label: "Gols Sofridos",             icon: "🥅", minValue: 0,   maxValue: 80,   step: 1,  type: "limit", description: "Limite máximo de gols sofridos" },
  goalkeeper_claims_accuracy: { label: "Saídas Corretas",           icon: "🧤", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de saídas bem-sucedidas" },
  penalty_save_rate:          { label: "Pênaltis Defendidos",       icon: "🥊", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de pênaltis defendidos" },
};

const OUTFIELD_TYPES = ["goals","assists","matches","minutes","shots","tackles","interceptions","pass_accuracy","dribble_accuracy","yellow_cards_max"];
const GK_TYPES       = ["saves","saves_difficult","clean_sheets","matches","minutes","interceptions","pass_accuracy","dribble_accuracy","yellow_cards_max","goals_conceded_max","goalkeeper_claims_accuracy","penalty_save_rate"];

// ─── Design tokens ────────────────────────────────────────────────────────────

const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";
const AMBER       = "#f59e0b";
const RED         = "#ec4525";
const INPUT_BG    = "#0c0b0d";
const INPUT_BORDER = "rgba(255,255,255,0.12)";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerId: string;
  isGoalkeeper?: boolean;
  existingGoalTypes?: string[];
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddGoalDialog({ open, onOpenChange, playerId, isGoalkeeper = false, existingGoalTypes = [], onSuccess }: AddGoalDialogProps) {
  const [saving, setSaving]         = useState(false);
  const [newGoalType, setNewGoalType] = useState("");
  const [newGoalValue, setNewGoalValue] = useState(0);

  const currentYear = new Date().getFullYear();

  const allowedTypes = isGoalkeeper ? GK_TYPES : OUTFIELD_TYPES;

  const availableToAdd = useMemo(() =>
    allowedTypes.filter(t => !existingGoalTypes.includes(t)),
    [allowedTypes, existingGoalTypes]
  );

  const handleAdd = async () => {
    if (!newGoalType || newGoalValue <= 0) {
      toast({ title: "Selecione um tipo e valor válido", variant: "destructive" });
      return;
    }
    const cfg = GOAL_TYPE_CONFIG[newGoalType];
    if (newGoalValue < cfg.minValue || newGoalValue > cfg.maxValue) {
      toast({ title: `Valor entre ${cfg.minValue} e ${cfg.maxValue}`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("player_season_goals").upsert({
        player_id: playerId, season_year: currentYear,
        goal_type: newGoalType, target_value: newGoalValue,
      }, { onConflict: "player_id,season_year,goal_type" });
      if (error) throw error;
      toast({ title: "Meta criada!" });
      setNewGoalType(""); setNewGoalValue(0);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setNewGoalType(""); setNewGoalValue(0); } onOpenChange(v); }}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-xl"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <DialogTitle className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
            // Nova Meta — {currentYear}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px]" style={{ color: MUTED }}>
            Defina uma meta pessoal para acompanhar na temporada.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
              Tipo de meta
            </label>
            <Select value={newGoalType} onValueChange={v => {
              setNewGoalType(v);
              setNewGoalValue(GOAL_TYPE_CONFIG[v]?.minValue ?? 0);
            }}>
              <SelectTrigger className="font-mono text-[11px] h-auto py-2.5"
                style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}>
                <SelectValue placeholder="Selecione o tipo de meta">
                  {newGoalType && GOAL_TYPE_CONFIG[newGoalType] && (
                    <div className="flex items-center gap-2">
                      <span>{GOAL_TYPE_CONFIG[newGoalType].icon}</span>
                      <span>{GOAL_TYPE_CONFIG[newGoalType].label}</span>
                      {GOAL_TYPE_CONFIG[newGoalType].type === "limit" && (
                        <span className="text-[9px]" style={{ color: AMBER }}>(limite)</span>
                      )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]" style={{ background: "#111", border: `1px solid ${CARD_BORDER}` }}>
                {availableToAdd.map(type => {
                  const cfg = GOAL_TYPE_CONFIG[type];
                  return (
                    <SelectItem key={type} value={type} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{cfg.icon}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold" style={{ color: TEXT }}>{cfg.label}</span>
                            {cfg.type === "limit" && (
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border" style={{ color: AMBER, borderColor: AMBER }}>limite</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] mt-0.5" style={{ color: MUTED }}>{cfg.description}</p>
                          <p className="font-mono text-[9px] mt-0.5" style={{ color: MUTED }}>
                            {cfg.type === "limit" ? "Quanto menos, melhor" : `${cfg.minValue} – ${cfg.maxValue}`}
                            {cfg.unit ? ` ${cfg.unit}` : ""}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          {newGoalType && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-2 p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                  Valor alvo
                </label>
                <span className="font-mono text-[9px]" style={{ color: MUTED }}>
                  {GOAL_TYPE_CONFIG[newGoalType].minValue} – {GOAL_TYPE_CONFIG[newGoalType].maxValue}
                  {GOAL_TYPE_CONFIG[newGoalType].unit ? ` ${GOAL_TYPE_CONFIG[newGoalType].unit}` : ""}
                </span>
              </div>
              <input
                type="number"
                value={newGoalValue}
                onChange={e => setNewGoalValue(Number(e.target.value))}
                min={GOAL_TYPE_CONFIG[newGoalType].minValue}
                max={GOAL_TYPE_CONFIG[newGoalType].maxValue}
                step={GOAL_TYPE_CONFIG[newGoalType].step}
                className="w-full font-display font-bold text-center text-[32px] py-3 rounded-xl outline-none"
                style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
                onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)}
              />
              <p className="font-mono text-[10px] text-center" style={{ color: MUTED }}>
                {GOAL_TYPE_CONFIG[newGoalType].type === "limit"
                  ? `⚠ Meta de limite: ficar abaixo de ${newGoalValue} ${GOAL_TYPE_CONFIG[newGoalType].label.toLowerCase()}`
                  : newGoalType === "minutes"
                    ? `${newGoalValue} minutos totais em campo`
                    : `Alcançar ${newGoalValue} ${GOAL_TYPE_CONFIG[newGoalType].label.toLowerCase()}`}
              </p>
            </motion.div>
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 border-t" style={{ borderColor: CARD_BORDER }}>
          <button
            onClick={() => { setNewGoalType(""); setNewGoalValue(0); onOpenChange(false); }}
            className="flex-1 font-mono text-[10px] uppercase tracking-[0.18em] py-2.5 border rounded-lg transition-colors"
            style={{ borderColor: CARD_BORDER, color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = CARD_BORDER)}
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || !newGoalType || newGoalValue <= 0}
            className="flex-[2] flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] py-2.5 rounded-lg transition-opacity"
            style={{ background: RED, color: "#fff", opacity: (saving || !newGoalType || newGoalValue <= 0) ? 0.5 : 1 }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Criar Meta
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
