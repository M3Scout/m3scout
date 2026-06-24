import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronLeft, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Position groups ──────────────────────────────────────────────────────────

type PosGroup = "cb" | "lb" | "dm" | "cam" | "winger" | "st" | "unknown";

function getPosGroup(position: string = ""): PosGroup {
  const p = position.toLowerCase();
  if (p.includes("zagueiro") || p === "cb" || p.includes("zagueiro central")) return "cb";
  if (p.includes("lateral")) return "lb";
  if (p.includes("volante") || (p.includes("meia") && p.includes("central")) || p === "cdm" || p === "dm") return "dm";
  if (p.includes("meia ofensivo") || p.includes("camisa 10") || p === "cam" || p.includes("enganche")) return "cam";
  if (p.includes("meia")) return "cam";
  if (p.includes("ponta") || p.includes("extremo") || p === "rw" || p === "lw") return "winger";
  if (p.includes("centroavante") || p.includes("atacante") || p === "st" || p === "cf") return "st";
  return "unknown";
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface GoalTypeCfg {
  label: string; icon: string; hex: string;
  minValue: number; maxValue: number; step: number;
  unit?: string;
  type: "accumulation" | "limit";
  description: string;
  benchmark: (pos: PosGroup) => string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeCfg> = {
  goals: {
    label: "Gols", icon: "⚽", hex: "#22c55e",
    minValue: 1, maxValue: 50, step: 1,
    type: "accumulation",
    description: "Quantidade de gols marcados na temporada",
    benchmark: () => "Referência: atacantes buscam 10+ gols por temporada",
  },
  assists: {
    label: "Assistências", icon: "🅰️", hex: "#3b82f6",
    minValue: 1, maxValue: 30, step: 1,
    type: "accumulation",
    description: "Passes decisivos que resultam em gol",
    benchmark: () => "Referência: meias e pontas buscam 6–12 assistências",
  },
  matches: {
    label: "Partidas", icon: "🏟️", hex: "#8b5cf6",
    minValue: 5, maxValue: 60, step: 5,
    type: "accumulation",
    description: "Total de jogos disputados na temporada",
    benchmark: () => "Referência: 20 a 45 jogos — titulares absolutos chegam a 40+",
  },
  minutes: {
    label: "Minutos", icon: "⏱️", hex: "#f59e0b",
    minValue: 250, maxValue: 5000, step: 50, unit: "min",
    type: "accumulation",
    description: "Minutagem total acumulada na temporada",
    benchmark: () => "Protagonista: 2500 – 4200 min · Regular: 1200 – 2499 min",
  },
  shots: {
    label: "Finalizações", icon: "🎯", hex: "#f97316",
    minValue: 10, maxValue: 200, step: 5,
    type: "accumulation",
    description: "Total de finalizações a gol na temporada",
    benchmark: (pos) => ({
      cb:      "Zagueiros: 20 – 35 finalizações",
      lb:      "Laterais: 25 – 45 finalizações",
      dm:      "Volantes e Meias Centrais: 40 – 65 finalizações",
      cam:     "Meias Ofensivos: 65 – 95 finalizações",
      winger:  "Pontas / Extremos: 80 – 120 finalizações",
      st:      "Centroavantes: 110 – 160+ finalizações",
      unknown: "Varia conforme posição: 20 (zagueiro) a 160+ (centroavante)",
    }[pos]),
  },
  tackles: {
    label: "Desarmes", icon: "🦵", hex: "#06b6d4",
    minValue: 10, maxValue: 180, step: 5,
    type: "accumulation",
    description: "Recuperações de bola com sucesso na temporada",
    benchmark: (pos) => ({
      cb:      "Zagueiros: 40 – 60 desarmes",
      lb:      "Laterais: 80 – 120 desarmes",
      dm:      "Volantes e Meias Centrais: 75 – 140 desarmes",
      cam:     "Meias Ofensivos: 25 – 45 desarmes",
      winger:  "Pontas / Extremos: 40 – 60 desarmes",
      st:      "Centroavantes: 15 – 30 desarmes",
      unknown: "Varia por posição: 15 (atacante) a 140 (volante)",
    }[pos]),
  },
  interceptions: {
    label: "Interceptações", icon: "🧲", hex: "#6366f1",
    minValue: 1, maxValue: 150, step: 5,
    type: "accumulation",
    description: "Passes adversários interceptados na temporada",
    benchmark: (pos) => ({
      cb:      "Zagueiros: 60 – 80 interceptações",
      lb:      "Laterais: 40 – 60 interceptações",
      dm:      "Volantes e Meias Centrais: 60 – 90 interceptações",
      cam:     "Meias Ofensivos: 20 – 35 interceptações",
      winger:  "Pontas / Extremos: 20 – 40 interceptações",
      st:      "Centroavantes: 10 – 20 interceptações",
      unknown: "Varia por posição: 10 (atacante) a 90 (volante)",
    }[pos]),
  },
  clearances: {
    label: "Cortes", icon: "🛡️", hex: "#64748b",
    minValue: 5, maxValue: 300, step: 5,
    type: "accumulation",
    description: "Cortes defensivos realizados na temporada",
    benchmark: (pos) => ({
      cb:      "Zagueiros: 160 – 240 cortes — é a essência do zagueiro",
      lb:      "Laterais: 60 – 120 cortes",
      dm:      "Volantes e Meias Centrais: 20 – 60 cortes",
      cam:     "Meias Ofensivos: 10 – 20 cortes",
      winger:  "Pontas / Extremos: 10 – 20 cortes",
      st:      "Centroavantes: 20 – 40 cortes",
      unknown: "Varia por posição: 10 (ponta) a 240 (zagueiro)",
    }[pos]),
  },
  pass_accuracy: {
    label: "Passe %", icon: "📊", hex: "#14b8a6",
    minValue: 1, maxValue: 100, step: 1, unit: "%",
    type: "accumulation",
    description: "Percentual de passes certos acumulado na temporada",
    benchmark: (pos) => ({
      cb:      "Zagueiros: 88% – 93% — precisão na saída de bola é essencial",
      lb:      "Laterais: 75% – 85%",
      dm:      "Volantes e Meias: 85% – 92% — quem mais toca na bola",
      cam:     "Meias Ofensivos: 75% – 82% — tentam o passe difícil",
      winger:  "Pontas / Extremos: 70% – 80%",
      st:      "Centroavantes: 65% – 75%",
      unknown: "Varia por posição: 65% (atacante) a 93% (zagueiro)",
    }[pos]),
  },
  dribble_accuracy: {
    label: "Dribles %", icon: "🏃", hex: "#a855f7",
    minValue: 1, maxValue: 100, step: 1, unit: "%",
    type: "accumulation",
    description: "Percentual de dribles bem-sucedidos na temporada",
    benchmark: (pos) => ({
      cb:      "Zagueiros: 75% – 85%",
      lb:      "Laterais: 55% – 65%",
      dm:      "Volantes e Meias Centrais: 65% – 75%",
      cam:     "Meias Ofensivos: 50% – 60%",
      winger:  "Pontas / Extremos: 45% – 55%",
      st:      "Centroavantes: 45% – 55%",
      unknown: "Varia por posição: 45% (atacante) a 85% (zagueiro)",
    }[pos]),
  },
  yellow_cards_max: {
    label: "Amarelos", icon: "🟨", hex: "#eab308",
    minValue: 1, maxValue: 15, step: 1,
    type: "limit",
    description: "Limite máximo de cartões amarelos aceitos",
    benchmark: () => "Referência: acima de 8 amarelos é sinal de alerta disciplinar",
  },
  saves: {
    label: "Defesas Totais", icon: "🧤", hex: "#06b6d4",
    minValue: 1, maxValue: 300, step: 10,
    type: "accumulation",
    description: "Total de defesas realizadas na temporada",
    benchmark: () => "Referência: goleiros ativos fazem 80–150 defesas por temporada",
  },
  saves_difficult: {
    label: "Defesas Difíceis", icon: "🦸", hex: "#f43f5e",
    minValue: 1, maxValue: 120, step: 5,
    type: "accumulation",
    description: "Defesas classificadas como difíceis ou milagrosas",
    benchmark: () => "Referência: 20–50 defesas difíceis por temporada",
  },
  clean_sheets: {
    label: "Clean Sheets", icon: "🛡️", hex: "#22c55e",
    minValue: 1, maxValue: 30, step: 1,
    type: "accumulation",
    description: "Partidas encerradas sem sofrer gols",
    benchmark: () => "Referência: goleiros de elite fazem 10–18 clean sheets por temporada",
  },
  goals_conceded_max: {
    label: "Gols Sofridos", icon: "🥅", hex: "#ef4444",
    minValue: 0, maxValue: 80, step: 1,
    type: "limit",
    description: "Limite máximo de gols sofridos na temporada",
    benchmark: () => "Referência: menos de 30 gols sofridos em 30+ jogos é excelente",
  },
  goalkeeper_claims_accuracy: {
    label: "Saídas %", icon: "🧤", hex: "#14b8a6",
    minValue: 1, maxValue: 100, step: 1, unit: "%",
    type: "accumulation",
    description: "Percentual de saídas de área bem-sucedidas",
    benchmark: () => "Referência: acima de 70% é considerado bom para goleiros",
  },
  penalty_save_rate: {
    label: "Pênaltis %", icon: "🥊", hex: "#a855f7",
    minValue: 1, maxValue: 100, step: 1, unit: "%",
    type: "accumulation",
    description: "Percentual de pênaltis defendidos na temporada",
    benchmark: () => "Referência: média mundial ~30% — acima de 40% é elite",
  },
};

const OUTFIELD_TYPES = [
  "goals", "assists", "matches", "minutes", "shots",
  "tackles", "interceptions", "clearances",
  "pass_accuracy", "dribble_accuracy", "yellow_cards_max",
];
const GK_TYPES = [
  "saves", "saves_difficult", "clean_sheets", "matches", "minutes",
  "interceptions", "pass_accuracy", "dribble_accuracy", "yellow_cards_max",
  "goals_conceded_max", "goalkeeper_claims_accuracy", "penalty_save_rate",
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG       = "#0a0a0d";
const BG2      = "#111116";
const BDR      = "rgba(255,255,255,0.07)";
const MUTED    = "#62616a";
const TEXT     = "#ededee";
const RED      = "#ec4525";
const INPUT_BG = "#0c0b0d";
const INPUT_BDR = "rgba(255,255,255,0.12)";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerId: string;
  isGoalkeeper?: boolean;
  playerPosition?: string;
  existingGoalTypes?: string[];
  onSuccess?: () => void;
}

// ─── Goal type card ───────────────────────────────────────────────────────────

function GoalTypeCard({
  type, cfg, posGroup, selected, onClick,
}: {
  type: string; cfg: GoalTypeCfg; posGroup: PosGroup;
  selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left rounded-xl p-3.5 transition-all duration-150 flex items-start gap-3.5 relative overflow-hidden"
      style={{
        background: selected ? `${cfg.hex}12` : BG2,
        border: `1.5px solid ${selected ? cfg.hex : BDR}`,
        outline: "none",
      }}
    >
      {/* Colored icon chip */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] flex-none mt-0.5"
        style={{ background: `${cfg.hex}18`, border: `1px solid ${cfg.hex}30` }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-display font-semibold text-[13px] leading-tight" style={{ color: TEXT }}>
            {cfg.label}
          </span>
          {cfg.type === "limit" && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border leading-none"
              style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)" }}>
              limite
            </span>
          )}
          {cfg.unit && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border leading-none"
              style={{ color: cfg.hex, borderColor: `${cfg.hex}40`, background: `${cfg.hex}10` }}>
              {cfg.unit}
            </span>
          )}
        </div>
        <p className="font-mono text-[10.5px] leading-snug" style={{ color: MUTED }}>
          {cfg.benchmark(posGroup)}
        </p>
      </div>

      {/* Selected check */}
      {selected && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none"
          style={{ background: cfg.hex }}>
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </motion.button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddGoalDialog({
  open, onOpenChange, playerId, isGoalkeeper = false,
  playerPosition = "", existingGoalTypes = [], onSuccess,
}: AddGoalDialogProps) {
  const [saving, setSaving]             = useState(false);
  const [newGoalType, setNewGoalType]   = useState("");
  const [newGoalValue, setNewGoalValue] = useState(0);

  const currentYear = new Date().getFullYear();
  const posGroup    = getPosGroup(playerPosition);
  const allowedTypes = isGoalkeeper ? GK_TYPES : OUTFIELD_TYPES;

  const availableToAdd = useMemo(() =>
    allowedTypes.filter(t => !existingGoalTypes.includes(t)),
    [allowedTypes, existingGoalTypes]
  );

  const selectedCfg = newGoalType ? GOAL_TYPE_CONFIG[newGoalType] : null;

  const reset = () => { setNewGoalType(""); setNewGoalValue(0); };

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
      toast({ title: "Meta criada com sucesso!" });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden flex flex-col"
        style={{
          maxWidth: "min(460px, 96vw)",
          height: "min(680px, 92vh)",
          background: BG,
          border: `1px solid ${BDR}`,
          borderRadius: 16,
        }}
      >
        <DialogTitle className="sr-only">Nova Meta — {currentYear}</DialogTitle>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${BDR}` }}>
          <div className="flex items-center gap-3">
            {newGoalType && (
              <button onClick={reset} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
                style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
                // Nova Meta — {currentYear}
              </p>
              <p className="font-mono text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                {newGoalType ? selectedCfg?.description : `${availableToAdd.length} metas disponíveis`}
              </p>
            </div>
          </div>
          {playerPosition && (
            <span className="font-mono text-[9.5px] px-2.5 py-1 rounded-full border" style={{ color: MUTED, borderColor: BDR }}>
              {playerPosition}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            {!newGoalType ? (
              /* ── STEP 1: Type selection ── */
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-2"
              >
                {availableToAdd.map(type => (
                  <GoalTypeCard
                    key={type}
                    type={type}
                    cfg={GOAL_TYPE_CONFIG[type]}
                    posGroup={posGroup}
                    selected={false}
                    onClick={() => {
                      setNewGoalType(type);
                      setNewGoalValue(GOAL_TYPE_CONFIG[type].minValue);
                    }}
                  />
                ))}
                {availableToAdd.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="font-mono text-[12px]" style={{ color: MUTED }}>
                      Todas as metas disponíveis já foram adicionadas
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── STEP 2: Value input ── */
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="p-4 flex flex-col gap-4"
              >
                {/* Selected type recap */}
                <GoalTypeCard
                  type={newGoalType}
                  cfg={selectedCfg!}
                  posGroup={posGroup}
                  selected
                  onClick={() => {}}
                />

                {/* Value input */}
                <div className="rounded-2xl p-5 space-y-4" style={{ background: BG2, border: `1px solid ${BDR}` }}>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                      Valor alvo
                    </p>
                    <span className="font-mono text-[10px]" style={{ color: MUTED }}>
                      {selectedCfg!.minValue} – {selectedCfg!.maxValue}{selectedCfg!.unit ? ` ${selectedCfg!.unit}` : ""}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      value={newGoalValue}
                      onChange={e => setNewGoalValue(Number(e.target.value))}
                      min={selectedCfg!.minValue}
                      max={selectedCfg!.maxValue}
                      step={selectedCfg!.step}
                      className="w-full font-display font-bold text-center rounded-xl outline-none py-4"
                      style={{
                        fontSize: 40,
                        background: INPUT_BG,
                        border: `1.5px solid ${INPUT_BDR}`,
                        color: selectedCfg!.hex,
                        letterSpacing: "-0.02em",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = `${selectedCfg!.hex}60`)}
                      onBlur={e => (e.currentTarget.style.borderColor = INPUT_BDR)}
                    />
                    {selectedCfg!.unit && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-display font-bold text-[20px]"
                        style={{ color: `${selectedCfg!.hex}60` }}>
                        {selectedCfg!.unit}
                      </span>
                    )}
                  </div>

                  {/* Quick values */}
                  <div className="grid grid-cols-4 gap-2">
                    {getQuickValues(newGoalType, selectedCfg!, posGroup).map(v => (
                      <button
                        key={v}
                        onClick={() => setNewGoalValue(v)}
                        className="py-2 rounded-xl font-mono text-[11px] font-medium transition-all"
                        style={{
                          background: newGoalValue === v ? `${selectedCfg!.hex}20` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${newGoalValue === v ? selectedCfg!.hex : BDR}`,
                          color: newGoalValue === v ? selectedCfg!.hex : MUTED,
                        }}
                      >
                        {v}{selectedCfg!.unit ?? ""}
                      </button>
                    ))}
                  </div>

                  <p className="font-mono text-[10px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {selectedCfg!.type === "limit"
                      ? `⚠ Meta de limite — manter abaixo de ${newGoalValue}${selectedCfg!.unit ?? ""}`
                      : `Alcançar ${newGoalValue}${selectedCfg!.unit ?? ""} de ${selectedCfg!.label.toLowerCase()} na temporada`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — only on step 2 */}
        {newGoalType && (
          <div className="px-4 py-4 shrink-0 flex gap-2.5" style={{ borderTop: `1px solid ${BDR}` }}>
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-xl font-mono text-[11px] uppercase tracking-wide transition-colors border"
              style={{ borderColor: BDR, color: MUTED, background: "transparent" }}
            >
              Voltar
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || newGoalValue <= 0}
              className="flex-[2.5] flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-[11px] uppercase tracking-wide text-white transition-all"
              style={{
                background: saving || newGoalValue <= 0 ? "rgba(236,69,37,0.3)" : RED,
                cursor: saving || newGoalValue <= 0 ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                : <>Criar meta — {newGoalValue}{selectedCfg?.unit ?? ""}</>}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick value suggestions (position-aware) ─────────────────────────────────

function getQuickValues(type: string, cfg: GoalTypeCfg, pos: PosGroup): number[] {
  const posQuicks: Partial<Record<string, Partial<Record<PosGroup, number[]>>>> = {
    shots:           { cb: [20,25,30,35], lb: [25,30,40,45], dm: [40,50,60,65], cam: [65,75,90,95], winger: [80,95,110,120], st: [110,130,150,160] },
    tackles:         { cb: [40,50,55,60], lb: [80,90,100,120], dm: [75,100,120,140], cam: [25,30,35,45], winger: [40,45,55,60], st: [15,20,25,30] },
    interceptions:   { cb: [60,65,70,80], lb: [40,45,50,60], dm: [60,70,80,90], cam: [20,25,30,35], winger: [20,25,30,40], st: [10,12,15,20] },
    clearances:      { cb: [160,180,200,240], lb: [60,80,100,120], dm: [20,30,45,60], cam: [10,12,15,20], winger: [10,12,15,20], st: [20,25,30,40] },
    pass_accuracy:   { cb: [88,90,91,93], lb: [75,78,82,85], dm: [85,88,90,92], cam: [75,78,80,82], winger: [70,74,77,80], st: [65,68,72,75] },
    dribble_accuracy:{ cb: [75,78,80,85], lb: [55,58,62,65], dm: [65,68,72,75], cam: [50,54,57,60], winger: [45,48,52,55], st: [45,48,52,55] },
  };

  const forPos = posQuicks[type]?.[pos];
  if (forPos) return forPos;

  // Generic fallback: 4 evenly spaced values in the valid range
  const min = cfg.minValue, max = cfg.maxValue;
  const step = Math.max(cfg.step, Math.round((max - min) / 3));
  return [min, min + step, min + step * 2, Math.min(max, min + step * 3)];
}
