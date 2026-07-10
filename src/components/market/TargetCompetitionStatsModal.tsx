import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Save, BarChart3, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TargetCompetitionStats } from "@/types/marketScore";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT  = "#ec4525";
const MUTED   = "#62616a";
const FG      = "#ededee";
const BDR     = "rgba(255,255,255,0.07)";
const INPUT_CLS = "h-9 bg-white/[0.04] border-white/[0.07] text-[13px] placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#ec4525]/40 focus-visible:border-[#ec4525]/40";
const SELECT_TRIGGER_CLS = "h-9 bg-white/[0.04] border-white/[0.07] text-[13px] focus:ring-1 focus:ring-[#ec4525]/40";

// Accent-insensitive, case-insensitive, whitespace-insensitive search matching
const normalizeSearch = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  competition_id: z.string().min(1, "Competição é obrigatória"),
  matches_played: z.coerce.number().min(0).max(200).nullable().optional(),
  minutes_played: z.coerce.number().min(0).max(20000).nullable().optional(),
  goals:          z.coerce.number().min(0).max(200).nullable().optional(),
  assists:        z.coerce.number().min(0).max(200).nullable().optional(),
  yellow_cards:   z.coerce.number().min(0).max(100).nullable().optional(),
  red_cards:      z.coerce.number().min(0).max(50).nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

const EMPTY: FormData = {
  competition_id: "", matches_played: null, minutes_played: null,
  goals: null, assists: null, yellow_cards: null, red_cards: null,
};

// ─── Main modal ───────────────────────────────────────────────────────────────

interface TargetCompetitionStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  editingRow?: TargetCompetitionStats | null;
  onSuccess?: () => void;
}

export function TargetCompetitionStatsModal({
  open, onOpenChange, targetId, editingRow, onSuccess,
}: TargetCompetitionStatsModalProps) {
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingRow;

  const { data: competitions = [] } = useQuery({
    queryKey: ["competitions-active-for-target-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name, display_name, country")
        .eq("is_active", true)
        .order("country")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [competitionSearch, setCompetitionSearch] = useState("");
  const filteredCompetitions = useMemo(() => {
    const q = normalizeSearch(competitionSearch);
    if (!q) return competitions;
    return competitions.filter(c =>
      normalizeSearch(`${c.display_name || c.name} ${c.country ?? ""}`).includes(q)
    );
  }, [competitions, competitionSearch]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (editingRow) {
      form.reset({
        competition_id: editingRow.competition_id,
        matches_played: editingRow.matches_played,
        minutes_played: editingRow.minutes_played,
        goals:          editingRow.goals,
        assists:        editingRow.assists,
        yellow_cards:   editingRow.yellow_cards,
        red_cards:      editingRow.red_cards,
      });
    } else {
      form.reset(EMPTY);
    }
    setCompetitionSearch("");
  }, [open, editingRow, form]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        target_id:      targetId,
        competition_id: data.competition_id,
        matches_played: data.matches_played ?? null,
        minutes_played: data.minutes_played ?? null,
        goals:          data.goals          ?? null,
        assists:        data.assists        ?? null,
        yellow_cards:   data.yellow_cards   ?? null,
        red_cards:      data.red_cards      ?? null,
      };

      if (isEditing && editingRow) {
        const { error } = await supabase.from("target_competition_stats").update(payload).eq("id", editingRow.id);
        if (error) throw error;
        toast({ title: "Estatísticas atualizadas" });
      } else {
        const { error } = await supabase.from("target_competition_stats").insert(payload);
        if (error) {
          if (error.code === "23505") {
            toast({ title: "Já existe um registro para essa competição", variant: "destructive" });
            return;
          }
          throw error;
        }
        toast({ title: "Estatísticas adicionadas" });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ maxWidth: 480, background: "#0a0a0d", border: `1px solid ${BDR}` }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: BDR }}>
          <DialogTitle className="flex items-center gap-2 font-display text-[17px] font-semibold" style={{ color: FG }}>
            <BarChart3 className="w-4 h-4" style={{ color: ACCENT }} />
            {isEditing ? "Editar Estatísticas" : "Estatísticas por Competição"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              Competição *
            </Label>
            <Select
              value={form.watch("competition_id") || ""}
              onValueChange={v => form.setValue("competition_id", v)}
              onOpenChange={o => { if (!o) setCompetitionSearch(""); }}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLS}>
                <SelectValue placeholder="Selecione a competição" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <div className="sticky -top-1 z-10 -mx-1 -mt-1 mb-1 bg-popover p-1.5 border-b border-white/[0.07]">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                    <input
                      value={competitionSearch}
                      onChange={e => setCompetitionSearch(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      placeholder="Buscar competição..."
                      autoFocus
                      className="w-full h-8 pl-7 pr-2 rounded-md bg-white/[0.04] border border-white/[0.07] text-[13px] text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#ec4525]/40"
                    />
                  </div>
                </div>
                {filteredCompetitions.map(c => {
                  const label = c.display_name || c.name;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {label}{c.country ? ` (${c.country})` : ""}
                    </SelectItem>
                  );
                })}
                {filteredCompetitions.length === 0 && (
                  <div className="py-3 text-center text-[12px] text-zinc-500">Nenhuma competição encontrada</div>
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.competition_id && (
              <p className="text-[11px] text-red-500">{form.formState.errors.competition_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Jogos</Label>
              <Input type="number" {...form.register("matches_played")} placeholder="Ex: 22" className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Minutos</Label>
              <Input type="number" {...form.register("minutes_played")} placeholder="Ex: 1780" className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Gols</Label>
              <Input type="number" {...form.register("goals")} placeholder="Ex: 5" className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Assist.</Label>
              <Input type="number" {...form.register("assists")} placeholder="Ex: 3" className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>C. Amarelos</Label>
              <Input type="number" {...form.register("yellow_cards")} placeholder="Ex: 4" className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>C. Vermelhos</Label>
              <Input type="number" {...form.register("red_cards")} placeholder="Ex: 0" className={INPUT_CLS} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[11px] tracking-wide px-4 py-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: MUTED }}
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={saving}
              className="font-mono text-[12px] tracking-wide"
              style={{ background: ACCENT, color: "#fff" }}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                : <><Save className="w-4 h-4 mr-2" />Salvar</>
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
