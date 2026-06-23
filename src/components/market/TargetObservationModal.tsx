import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Calendar, Search, Star, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/authContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT  = "#ec4525";
const MUTED   = "#62616a";
const FG      = "#ededee";
const BDR     = "rgba(255,255,255,0.07)";
const INPUT_CLS = "h-9 bg-white/[0.04] border-white/[0.07] text-[13px] placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#ec4525]/40 focus-visible:border-[#ec4525]/40";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  observation_date:  z.string().min(1, "Data é obrigatória"),
  opponent:          z.string().max(100).optional(),
  result:            z.string().max(50).optional(),
  minutes_observed:  z.coerce.number().min(0).max(200).nullable().optional(),
  qualitative_notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Star Rating (1–10, half steps) ──────────────────────────────────────────

function StarIcon({ fill }: { fill: "empty" | "half" | "full" }) {
  if (fill === "full") return <Star className="w-6 h-6 fill-[#ec4525] text-[#ec4525]" />;
  if (fill === "empty") return <Star className="w-6 h-6 text-zinc-700" />;
  return (
    <div className="relative w-6 h-6">
      <Star className="absolute inset-0 w-6 h-6 text-zinc-700" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
        <Star className="w-6 h-6 fill-[#ec4525] text-[#ec4525]" />
      </div>
    </div>
  );
}

function StarRating10({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  // 10-point scale displayed as 5 stars (each star = 2 points, half = 1 point)
  const getFill = (star: number): "empty" | "half" | "full" => {
    const threshold = star * 2;
    if (display >= threshold) return "full";
    if (display >= threshold - 1) return "half";
    return "empty";
  };

  const resolve = (e: React.MouseEvent<HTMLDivElement>, star: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? star * 2 - 1 : star * 2;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <div
            key={star}
            className="w-8 h-8 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
            onMouseMove={e => setHover(resolve(e, star))}
            onMouseLeave={() => setHover(null)}
            onClick={e => {
              const v = resolve(e, star);
              onChange(v === value ? 0 : v);
            }}
          >
            <StarIcon fill={getFill(star)} />
          </div>
        ))}
        <span className="ml-2 font-mono text-[14px] font-semibold tabular-nums" style={{ color: value > 0 ? ACCENT : MUTED }}>
          {value > 0 ? `${value}/10` : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Competition picker ───────────────────────────────────────────────────────

function CompetitionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: competitions = [] } = useQuery({
    queryKey: ["competitions-active-for-obs"],
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return competitions.filter((c: any) =>
      (c.display_name || c.name).toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q)
    );
  }, [competitions, search]);

  const selected = competitions.find((c: any) => c.id === value || (c.display_name || c.name) === value) as any;
  const displayName = selected ? (selected.display_name || selected.name) : value || "";

  const select = (comp: any) => {
    onChange(comp.display_name || comp.name);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full h-9 px-3 flex items-center justify-between rounded-md border text-[13px] text-left transition-colors",
          open ? "border-[#ec4525]/50 ring-1 ring-[#ec4525]/30" : "border-white/[0.07]"
        )}
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <span style={{ color: displayName ? FG : MUTED }}>
          {displayName || "Selecionar competição..."}
        </span>
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: MUTED }} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "#141318", border: `1px solid ${BDR}` }}
        >
          {/* Search input */}
          <div className="p-2 border-b" style={{ borderColor: BDR }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: MUTED }} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar competição..."
                className="flex-1 bg-transparent text-[12px] font-mono outline-none placeholder:text-zinc-600"
                style={{ color: FG }}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {/* Clear option */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-mono hover:bg-white/[0.04] transition-colors"
                style={{ color: MUTED }}
              >
                — Nenhuma
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] font-mono" style={{ color: MUTED }}>
                Nenhuma encontrada
              </p>
            ) : (
              filtered.map((comp: any) => {
                const name = comp.display_name || comp.name;
                const isSelected = displayName === name;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => select(comp)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-[12px]" style={{ color: isSelected ? ACCENT : FG }}>{name}</p>
                      {comp.country && (
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: MUTED }}>{comp.country}</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />}
                  </button>
                );
              })
            )}
          </div>

          {/* Type custom */}
          {search && !filtered.some((c: any) => (c.display_name || c.name).toLowerCase() === search.toLowerCase()) && (
            <div className="border-t p-2" style={{ borderColor: BDR }}>
              <button
                type="button"
                onClick={() => { onChange(search); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-mono transition-colors hover:bg-white/[0.04]"
                style={{ color: ACCENT }}
              >
                <span style={{ color: MUTED }}>Usar:</span> "{search}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface TargetObservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  onSuccess?: () => void;
}

export function TargetObservationModal({ open, onOpenChange, targetId, onSuccess }: TargetObservationModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [rating, setRating]           = useState(0);
  const [competition, setCompetition] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      observation_date:  format(new Date(), "yyyy-MM-dd"),
      opponent:          "",
      result:            "",
      minutes_observed:  null,
      qualitative_notes: "",
    },
  });

  const reset = () => {
    form.reset({
      observation_date: format(new Date(), "yyyy-MM-dd"),
      opponent: "", result: "", minutes_observed: null, qualitative_notes: "",
    });
    setRating(0);
    setCompetition("");
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("target_observations").insert({
        target_id:         targetId,
        observation_date:  data.observation_date,
        opponent:          data.opponent          || null,
        competition:       competition            || null,
        result:            data.result            || null,
        minutes_observed:  data.minutes_observed  || null,
        performance_rating: rating > 0 ? rating : null,
        qualitative_notes: data.qualitative_notes || null,
        created_by:        user?.id,
      });
      if (error) throw error;
      toast({ title: "Observação adicionada" });
      reset();
      onSuccess?.();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ maxWidth: 480, background: "#0a0a0d", border: `1px solid ${BDR}` }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: BDR }}>
          <DialogTitle className="flex items-center gap-2 font-display text-[17px] font-semibold" style={{ color: FG }}>
            <Calendar className="w-4 h-4" style={{ color: ACCENT }} />
            Nova Observação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Data */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              Data da observação *
            </Label>
            <Input type="date" {...form.register("observation_date")} className={INPUT_CLS} />
            {form.formState.errors.observation_date && (
              <p className="text-[11px] text-red-500">{form.formState.errors.observation_date.message}</p>
            )}
          </div>

          {/* Adversário + Resultado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Adversário</Label>
              <Input {...form.register("opponent")} placeholder="Ex: Palmeiras" className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Resultado</Label>
              <Input {...form.register("result")} placeholder="Ex: 2x1" className={INPUT_CLS} />
            </div>
          </div>

          {/* Competição */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Competição</Label>
            <CompetitionPicker value={competition} onChange={setCompetition} />
          </div>

          {/* Minutos */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>Minutos observados</Label>
            <Input type="number" {...form.register("minutes_observed")} placeholder="Ex: 90" className={cn(INPUT_CLS, "w-36")} />
          </div>

          {/* Nota de desempenho */}
          <div className="space-y-2">
            <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              Nota de desempenho
            </Label>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BDR}` }}>
              <StarRating10 value={rating} onChange={setRating} />
            </div>
          </div>

          {/* Observações qualitativas */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              Observações qualitativas
            </Label>
            <Textarea
              {...form.register("qualitative_notes")}
              placeholder="Pontos fortes, fracos, destaques da partida..."
              className={cn("min-h-[90px] resize-none text-[13px]", INPUT_CLS, "h-auto")}
            />
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false); }}
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
