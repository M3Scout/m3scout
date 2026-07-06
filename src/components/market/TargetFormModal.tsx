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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Star, X, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Target, TargetStatus, TargetPriority } from "@/types/marketScore";
import { useAuth } from "@/hooks/authContext";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIONS = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia", "Meia Atacante", "Ponta Direita", "Ponta Esquerda",
  "Centroavante", "Atacante", "Segundo Atacante",
];

const TACTICAL_FUNCTIONS = [
  "Zagueiro Construtor", "Zagueiro Combativo", "Lateral Ofensivo", "Lateral Defensivo",
  "Volante Box-to-Box", "Volante Destruidor", "Meia Organizador", "Meia de Ligação",
  "Meia Criativo", "Extremo de Ruptura", "Extremo de Apoio",
  "Falso 9", "Centroavante Referência", "Segundo Atacante", "Goleiro Líbero",
];

const SOURCES = [
  { value: "indicacao",   label: "Indicação" },
  { value: "youtube",     label: "YouTube" },
  { value: "wyscout",     label: "Wyscout" },
  { value: "inloco",      label: "Observação In Loco" },
  { value: "sofascore",   label: "Sofascore / Stats" },
  { value: "agente",      label: "Agente / Empresário" },
  { value: "outro",       label: "Outro" },
];

// Accent-insensitive, case-insensitive, whitespace-insensitive search matching
const normalizeSearch = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

const AGENCY_OPTIONS = [
  { value: "free",          label: "Livre (sem representação)" },
  { value: "known_agency",  label: "Agência Conhecida" },
  { value: "unknown",       label: "Desconhecido" },
];

const GRADES = [
  { value: "A", label: "A — Contratar Imediatamente",   color: "#22c55e" },
  { value: "B", label: "B — Ótimo Potencial / Secundário", color: "#3b82f6" },
  { value: "C", label: "C — Continuar Observando",      color: "#f59e0b" },
  { value: "D", label: "D — Descartado",                color: "#ef4444" },
];

const PRESET_TAGS = [
  "Bola Parada", "Líder", "Bom no 1x1", "Forte no Jogo Aéreo",
  "Velocidade", "Cobrador de Pênalti", "Suscetível a Lesões",
  "Boa Saída de Bola", "Pressing Alto", "Dribling", "Visão de Jogo",
  "Finalização", "Posicionamento", "Agressividade",
];

const GRADE_TO_STATUS: Record<string, { status: TargetStatus; priority: TargetPriority }> = {
  A: { status: "APPROACH",   priority: "HIGH" },
  B: { status: "MONITORING", priority: "HIGH" },
  C: { status: "MONITORING", priority: "MEDIUM" },
  D: { status: "DROPPED",    priority: "LOW" },
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  // 1. Identificação
  name:               z.string().min(2, "Nome é obrigatório").max(100),
  position:           z.string().min(1, "Posição é obrigatória"),
  secondary_position: z.string().optional(),
  tactical_function:  z.string().max(100).optional(),
  age_estimate:       z.coerce.number().min(10).max(50).nullable().optional(),
  height:             z.coerce.number().min(100).max(230).nullable().optional(),
  weight:             z.coerce.number().min(30).max(150).nullable().optional(),
  dominant_foot:      z.string().optional(),

  // 2. Mercado e Contrato
  current_club:       z.string().max(100).optional(),
  league_competition: z.string().max(100).optional(),
  contract_end_date:  z.string().optional(),
  agency_situation:   z.string().optional(),
  source:             z.string().optional(),

  // 5. Veredito
  recommendation_grade: z.enum(["A", "B", "C", "D"]).optional(),
  highlight_video_url:  z.string().url("URL inválida").optional().or(z.literal("")),
  notes_internal:       z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ number, title, children }: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0d0c10] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05]">
        <span className="font-mono text-[10px] font-semibold text-[#ec4525] tracking-wider">{number}</span>
        <div className="h-px w-6 bg-white/10" />
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#62616a]">{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={cn("grid gap-3", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-mono tracking-[0.12em] uppercase text-[#62616a]">
        {label}
      </Label>
      {children}
    </div>
  );
}

const INPUT_CLS = "h-9 bg-white/[0.04] border-white/[0.07] text-[13px] placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#ec4525]/40 focus-visible:border-[#ec4525]/40";
const SELECT_TRIGGER_CLS = "h-9 bg-white/[0.04] border-white/[0.07] text-[13px] focus:ring-1 focus:ring-[#ec4525]/40";

// Renders one star: empty, half-filled (left 50%), or full
function StarIcon({ fill }: { fill: "empty" | "half" | "full" }) {
  if (fill === "full") {
    return <Star className="w-5 h-5 fill-[#ec4525] text-[#ec4525]" />;
  }
  if (fill === "empty") {
    return <Star className="w-5 h-5 text-zinc-700" />;
  }
  // Half: clip filled star to left 50%
  return (
    <div className="relative w-5 h-5">
      <Star className="absolute inset-0 w-5 h-5 text-zinc-700" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
        <Star className="w-5 h-5 fill-[#ec4525] text-[#ec4525]" />
      </div>
    </div>
  );
}

function StarRating({ value, onChange, label, sub }: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
  sub: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  const getFill = (star: number): "empty" | "half" | "full" => {
    if (display >= star) return "full";
    if (display >= star - 0.5) return "half";
    return "empty";
  };

  const resolveValue = (e: React.MouseEvent<HTMLDivElement>, star: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star;
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div>
        <p className="text-[13px] font-medium text-[#ededee] leading-tight">{label}</p>
        <p className="text-[10px] text-[#62616a] mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className="w-6 h-6 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
            onMouseMove={(e) => setHover(resolveValue(e, star))}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => {
              const v = resolveValue(e, star);
              onChange(v === value ? 0 : v);
            }}
          >
            <StarIcon fill={getFill(star)} />
          </div>
        ))}
        {value !== null && value > 0 && (
          <span className="ml-2 font-mono text-[12px] text-[#ec4525] w-6 text-center tabular-nums">
            {value % 1 === 0 ? value : value.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TargetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: Target | null;
  onSuccess?: () => void;
}

export function TargetFormModal({ open, onOpenChange, target, onSuccess }: TargetFormModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Section 3 — pillar scores
  const [scorePhysical,  setScorePhysical]  = useState<number | null>(null);
  const [scoreTechnical, setScoreTechnical] = useState<number | null>(null);
  const [scoreTactical,  setScoreTactical]  = useState<number | null>(null);
  const [scoreMental,    setScoreMental]    = useState<number | null>(null);

  // Section 4 — tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");

  const isEditing = !!target;

  const { data: competitions = [] } = useQuery({
    queryKey: ["competitions-active-for-targets"],
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
    defaultValues: {
      name: "", position: "", secondary_position: "", tactical_function: "",
      age_estimate: null, height: null, weight: null, dominant_foot: "",
      current_club: "", league_competition: "", contract_end_date: "",
      agency_situation: "", source: "",
      recommendation_grade: undefined, highlight_video_url: "", notes_internal: "",
    },
  });

  // Populate on edit
  useEffect(() => {
    if (!open) return;
    if (target) {
      const t = target as any;
      form.reset({
        name:               target.name,
        position:           target.position,
        secondary_position: t.secondary_position ?? "",
        tactical_function:  t.tactical_function  ?? "",
        age_estimate:       target.age_estimate   ?? null,
        height:             target.height         ?? null,
        weight:             target.weight ? Number(target.weight) : null,
        dominant_foot:      target.dominant_foot  ?? "",
        current_club:       target.current_club   ?? "",
        league_competition: target.league_competition ?? "",
        contract_end_date:  t.contract_end_date   ?? "",
        agency_situation:   t.agency_situation    ?? "",
        source:             target.source         ?? "",
        recommendation_grade: t.recommendation_grade ?? undefined,
        highlight_video_url:  target.highlight_video_url ?? "",
        notes_internal:       target.notes_internal ?? "",
      });
      setScorePhysical(t.score_physical   ?? null);
      setScoreTechnical(t.score_technical ?? null);
      setScoreTactical(t.score_tactical   ?? null);
      setScoreMental(t.score_mental       ?? null);
      const chars = t.notable_characteristics ?? [];
      const tags  = target.tags ?? [];
      setSelectedTags(Array.from(new Set([...chars, ...tags])));
    } else {
      form.reset();
      setScorePhysical(null); setScoreTechnical(null);
      setScoreTactical(null); setScoreMental(null);
      setSelectedTags([]);
    }
    setCustomTagInput("");
  }, [open, target, form]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const v = customTagInput.trim();
    if (v && !selectedTags.includes(v) && selectedTags.length < 20) {
      setSelectedTags(prev => [...prev, v]);
      setCustomTagInput("");
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const grade  = data.recommendation_grade ?? "C";
      const mapped = GRADE_TO_STATUS[grade] ?? { status: "MONITORING" as TargetStatus, priority: "MEDIUM" as TargetPriority };

      // Resolve competition name from select if a known competition_id was previously stored
      const payload: Record<string, unknown> = {
        name:               data.name,
        position:           data.position,
        secondary_position: data.secondary_position || null,
        tactical_function:  data.tactical_function  || null,
        age_estimate:       data.age_estimate        || null,
        height:             data.height              || null,
        weight:             data.weight              || null,
        dominant_foot:      data.dominant_foot       || null,
        current_club:       data.current_club        || null,
        league_competition: data.league_competition  || null,
        contract_end_date:  data.contract_end_date   || null,
        agency_situation:   data.agency_situation    || null,
        source:             data.source              || null,
        score_physical:     scorePhysical,
        score_technical:    scoreTechnical,
        score_tactical:     scoreTactical,
        score_mental:       scoreMental,
        recommendation_grade: grade,
        status:             mapped.status,
        priority:           mapped.priority,
        highlight_video_url: data.highlight_video_url || null,
        notes_internal:     data.notes_internal      || null,
        notable_characteristics: selectedTags,
        tags:               selectedTags,
        // Clear legacy free-text fields replaced by structured data
        perceived_profile:  null,
        ...(isEditing ? {} : { created_by: user?.id }),
      };

      if (isEditing && target) {
        const { error } = await supabase.from("targets").update(payload).eq("id", target.id);
        if (error) throw error;
        toast({ title: "Target atualizado" });
      } else {
        const { error } = await supabase.from("targets").insert(payload as any);
        if (error) throw error;
        toast({ title: "Target criado" });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const grade = form.watch("recommendation_grade");
  const gradeCfg = GRADES.find(g => g.value === grade);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0a0a0d] border-white/[0.07] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <DialogTitle className="font-display text-[18px] font-semibold text-[#ededee]">
            {isEditing ? "Editar Target" : "Novo Target"}
          </DialogTitle>
          <p className="text-[11px] font-mono text-[#62616a] mt-0.5 tracking-wide">
            Dados estruturados para monitoramento e cruzamento por IA
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* ══ 1. IDENTIFICAÇÃO E PERFIL TÁTICO ══════════════════════════ */}
          <SectionCard number="01" title="Identificação e Perfil Tático">

            {/* Nome */}
            <Field label="Nome do Atleta *">
              <Input
                {...form.register("name")}
                placeholder="Nome completo ou apelido"
                className={INPUT_CLS}
              />
              {form.formState.errors.name && (
                <p className="text-[11px] text-red-500 mt-1">{form.formState.errors.name.message}</p>
              )}
            </Field>

            {/* Posição | Posição Secundária | Função Tática */}
            <FieldRow cols={3}>
              <Field label="Posição *">
                <Select
                  value={form.watch("position") || ""}
                  onValueChange={v => form.setValue("position", v)}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Pos. Secundária">
                <Select
                  value={form.watch("secondary_position") || "_none"}
                  onValueChange={v => form.setValue("secondary_position", v === "_none" ? "" : v)}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Função Tática">
                <Select
                  value={form.watch("tactical_function") || "_none"}
                  onValueChange={v => form.setValue("tactical_function", v === "_none" ? "" : v)}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    <SelectItem value="_none">—</SelectItem>
                    {TACTICAL_FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FieldRow>

            {/* Idade | Altura | Peso */}
            <FieldRow cols={3}>
              <Field label="Idade">
                <Input type="number" {...form.register("age_estimate")} placeholder="Ex: 19" className={INPUT_CLS} />
              </Field>
              <Field label="Altura (cm)">
                <Input type="number" {...form.register("height")} placeholder="Ex: 180" className={INPUT_CLS} />
              </Field>
              <Field label="Peso (kg)">
                <Input type="number" {...form.register("weight")} placeholder="Ex: 75" className={INPUT_CLS} />
              </Field>
            </FieldRow>

            {/* Pé dominante */}
            <div className="w-1/3">
              <Field label="Pé Dominante">
                <Select
                  value={form.watch("dominant_foot") || "_none"}
                  onValueChange={v => form.setValue("dominant_foot", v === "_none" ? "" : v)}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="right">Direito</SelectItem>
                    <SelectItem value="left">Esquerdo</SelectItem>
                    <SelectItem value="both">Ambidestro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          {/* ══ 2. DADOS DE MERCADO E CONTRATO ════════════════════════════ */}
          <SectionCard number="02" title="Dados de Mercado e Contrato">

            <FieldRow>
              <Field label="Clube Atual">
                <Input {...form.register("current_club")} placeholder="Nome do clube" className={INPUT_CLS} />
              </Field>
              <Field label="Competição / Liga">
                <Select
                  value={form.watch("league_competition") || "_none"}
                  onValueChange={v => form.setValue("league_competition", v === "_none" ? "" : v)}
                  onOpenChange={open => { if (!open) setCompetitionSearch(""); }}
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
                    <SelectItem value="_none">—</SelectItem>
                    {filteredCompetitions.map(c => {
                      const label = c.display_name || c.name;
                      return (
                        <SelectItem key={c.id} value={label}>
                          {label}{c.country ? ` (${c.country})` : ""}
                        </SelectItem>
                      );
                    })}
                    {filteredCompetitions.length === 0 && (
                      <div className="py-3 text-center text-[12px] text-zinc-500">Nenhuma competição encontrada</div>
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="Fim do Contrato">
                <Input
                  type="month"
                  {...form.register("contract_end_date")}
                  className={cn(INPUT_CLS, "text-[12px]")}
                />
              </Field>
              <Field label="Situação de Agenciamento">
                <Select
                  value={form.watch("agency_situation") || "_none"}
                  onValueChange={v => form.setValue("agency_situation", v === "_none" ? "" : v)}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {AGENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FieldRow>

            <div className="w-1/2">
              <Field label="Fonte / Origem">
                <Select
                  value={form.watch("source") || "_none"}
                  onValueChange={v => form.setValue("source", v === "_none" ? "" : v)}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder="Como chegou até você?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          {/* ══ 3. MATRIZ DE AVALIAÇÃO ════════════════════════════════════ */}
          <SectionCard number="03" title="Matriz de Avaliação — 4 Pilares">
            <div className="space-y-2">
              <StarRating value={scorePhysical}  onChange={setScorePhysical}  label="Físico"   sub="Força, velocidade, stamina" />
              <StarRating value={scoreTechnical} onChange={setScoreTechnical} label="Técnico"  sub="Passe, domínio, finalização" />
              <StarRating value={scoreTactical}  onChange={setScoreTactical}  label="Tático"   sub="Posicionamento, leitura de jogo" />
              <StarRating value={scoreMental}    onChange={setScoreMental}    label="Mental"   sub="Liderança, frieza, agressividade" />
            </div>
            {(scorePhysical || scoreTechnical || scoreTactical || scoreMental) && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-[#62616a] tracking-wider uppercase">Média</span>
                <span className="font-display text-[15px] font-semibold text-[#ec4525]">
                  {(
                    [scorePhysical, scoreTechnical, scoreTactical, scoreMental]
                      .filter(Boolean)
                      .reduce((a, b) => a! + b!, 0)! /
                    [scorePhysical, scoreTechnical, scoreTactical, scoreMental].filter(Boolean).length
                  ).toFixed(1)}
                </span>
                <span className="text-[10px] text-[#62616a]">/ 5</span>
              </div>
            )}
          </SectionCard>

          {/* ══ 4. CARACTERÍSTICAS NOTÁVEIS ═══════════════════════════════ */}
          <SectionCard number="04" title="Características Notáveis">

            {/* Preset pills */}
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map(tag => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-mono tracking-wide border transition-all",
                      active
                        ? "bg-[#ec4525]/15 border-[#ec4525]/40 text-[#ec4525]"
                        : "bg-white/[0.03] border-white/[0.08] text-[#62616a] hover:border-white/20 hover:text-[#9c9ba3]"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom tag input */}
            <div className="flex gap-2 pt-1">
              <Input
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                placeholder="Tag personalizada... (Enter para adicionar)"
                className={cn(INPUT_CLS, "flex-1")}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addCustomTag}
                className="h-9 w-9 border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07]"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Custom tags (non-preset) */}
            {selectedTags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#ec4525]/10 border border-[#ec4525]/30 text-[#ec4525]"
                  >
                    {tag}
                    <button type="button" onClick={() => toggleTag(tag)} className="ml-0.5 opacity-70 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {selectedTags.length > 0 && (
              <p className="text-[10px] font-mono text-[#62616a]">
                {selectedTags.length} característica{selectedTags.length !== 1 ? "s" : ""} selecionada{selectedTags.length !== 1 ? "s" : ""}
              </p>
            )}
          </SectionCard>

          {/* ══ 5. VEREDITO E ESTRATÉGIA ══════════════════════════════════ */}
          <SectionCard number="05" title="Veredito e Estratégia">

            {/* Grau de Recomendação */}
            <Field label="Grau de Recomendação">
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(g => {
                  const active = grade === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => form.setValue("recommendation_grade", g.value as "A" | "B" | "C" | "D")}
                      className={cn(
                        "rounded-lg border py-3 px-2 text-center transition-all",
                        active
                          ? "border-current"
                          : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                      )}
                      style={active ? { borderColor: g.color, background: `${g.color}18` } : {}}
                    >
                      <p
                        className="font-display text-[22px] font-bold leading-none"
                        style={{ color: active ? g.color : "#62616a" }}
                      >
                        {g.value}
                      </p>
                      <p className="text-[9px] font-mono tracking-wide mt-1.5 leading-tight"
                         style={{ color: active ? g.color : "#4a4a55" }}>
                        {g.label.replace(/^[A-D] — /, "")}
                      </p>
                    </button>
                  );
                })}
              </div>
              {gradeCfg && (
                <p className="text-[11px] font-mono text-[#62616a] mt-2">
                  Grau <span style={{ color: gradeCfg.color }} className="font-semibold">{gradeCfg.value}</span>
                  {" "}— {gradeCfg.label.replace(/^[A-D] — /, "")}
                </p>
              )}
            </Field>

            {/* Link de vídeo */}
            <Field label="Link de Vídeo">
              <Input
                {...form.register("highlight_video_url")}
                placeholder="https://youtube.com/..."
                className={INPUT_CLS}
              />
              {form.formState.errors.highlight_video_url && (
                <p className="text-[11px] text-red-500 mt-1">{form.formState.errors.highlight_video_url.message}</p>
              )}
            </Field>

            {/* Notas finais */}
            <Field label="Notas Finais do Scout">
              <Textarea
                {...form.register("notes_internal")}
                placeholder="Detalhes que não se encaixam nos filtros acima..."
                className={cn("min-h-[72px] resize-none text-[13px]", INPUT_CLS, "h-auto")}
              />
            </Field>
          </SectionCard>

          {/* Footer */}
          <DialogFooter className="pt-2 pb-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[#62616a] hover:text-[#ededee]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#ec4525] hover:bg-[#d63d20] text-white font-mono text-[12px] tracking-wide"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />{isEditing ? "Atualizar Target" : "Criar Target"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
