/**
 * Target Form Modal
 * 
 * Comprehensive monitoring sheet for recruitment targets
 * Organized in logical sections for UX clarity
 */

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, Plus, User, MapPin, Eye, Target as TargetIcon, LineChart, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Target, TargetStatus, TargetPriority } from "@/types/marketScore";
import { useAuth } from "@/hooks/authContext";

// Form validation schema
const formSchema = z.object({
  // Identificação
  name: z.string().min(2, "Nome é obrigatório").max(100),
  position: z.string().min(1, "Posição é obrigatória"),
  secondary_position: z.string().optional(),
  age_estimate: z.coerce.number().min(10).max(50).nullable().optional(),
  dominant_foot: z.string().optional(),
  
  // Contexto Atual
  current_club: z.string().max(100).optional(),
  competition_id: z.string().optional(),
  league_competition: z.string().max(100).optional(), // Fallback for "Outro"
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  country: z.string().max(50).optional(),
  
  // Monitoramento
  observation_context: z.string().max(500).optional(),
  observation_type: z.string().optional(),
  games_observed: z.coerce.number().min(0).max(500).nullable().optional(),
  minutes_observed: z.coerce.number().min(0).max(50000).nullable().optional(),
  source: z.string().max(100).optional(),
  
  // Perfil Percebido
  perceived_profile: z.string().max(500).optional(),
  height: z.coerce.number().min(100).max(230).nullable().optional(),
  weight: z.coerce.number().min(30).max(150).nullable().optional(),
  
  // Estratégia
  status: z.enum(["MONITORING", "APPROACH", "NEGOTIATION", "DROPPED", "SIGNED"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  interest_reason: z.string().optional(),
  ideal_approach_window: z.string().optional(),
  market_strategy: z.string().max(1000).optional(),
  
  // Notas
  notes_internal: z.string().max(2000).optional(),
  highlight_video_url: z.string().url().max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

// Position options
const POSITIONS = [
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meia",
  "Meia Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
  "Centroavante",
  "Atacante",
  "Segundo Atacante",
];

// Observation type options
const OBSERVATION_TYPES = [
  { value: "video", label: "Vídeo" },
  { value: "in_person", label: "Presencial" },
  { value: "third_party_report", label: "Relatório de terceiro" },
  { value: "referral", label: "Indicação" },
];

// Interest reason options
const INTEREST_REASONS = [
  { value: "appreciation_potential", label: "Potencial de valorização" },
  { value: "market_opportunity", label: "Oportunidade de mercado" },
  { value: "rare_profile", label: "Perfil raro" },
  { value: "strategic_referral", label: "Indicação estratégica" },
];

// Approach window options
const APPROACH_WINDOWS = [
  { value: "now", label: "Agora" },
  { value: "3_6_months", label: "3–6 meses" },
  { value: "6_12_months", label: "6–12 meses" },
];

// Dominant foot options
const DOMINANT_FOOT_OPTIONS = [
  { value: "right", label: "Direito" },
  { value: "left", label: "Esquerdo" },
  { value: "both", label: "Ambos" },
];

interface TargetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: Target | null;
  onSuccess?: () => void;
}

// Section header component
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2 border-b border-white/[0.06]">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
    </div>
  );
}

export function TargetFormModal({
  open,
  onOpenChange,
  target,
  onSuccess,
}: TargetFormModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notableChars, setNotableChars] = useState<string[]>([]);
  const [charInput, setCharInput] = useState("");
  const [showOtherCompetition, setShowOtherCompetition] = useState(false);

  const isEditing = !!target;

  // Fetch competitions for dropdown
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      position: "",
      secondary_position: "",
      age_estimate: null,
      dominant_foot: "",
      current_club: "",
      competition_id: "",
      league_competition: "",
      city: "",
      state: "",
      country: "",
      observation_context: "",
      observation_type: "",
      games_observed: null,
      minutes_observed: null,
      source: "",
      perceived_profile: "",
      height: null,
      weight: null,
      status: "MONITORING",
      priority: "MEDIUM",
      interest_reason: "",
      ideal_approach_window: "",
      market_strategy: "",
      notes_internal: "",
      highlight_video_url: "",
    },
  });

  // Watch competition selection
  const selectedCompetitionId = form.watch("competition_id");

  // Handle "Outro" competition selection
  useEffect(() => {
    setShowOtherCompetition(selectedCompetitionId === "other");
  }, [selectedCompetitionId]);

  // Reset form when modal opens with target data
  useEffect(() => {
    if (open) {
      if (target) {
        const targetAny = target as any;
        const hasCompetitionId = targetAny.competition_id && competitions.some((c: any) => c.id === targetAny.competition_id);
        
        form.reset({
          name: target.name,
          position: target.position,
          secondary_position: targetAny.secondary_position ?? "",
          age_estimate: target.age_estimate ?? null,
          dominant_foot: target.dominant_foot ?? "",
          current_club: target.current_club ?? "",
          competition_id: hasCompetitionId ? targetAny.competition_id : (target.league_competition ? "other" : ""),
          league_competition: target.league_competition ?? "",
          city: target.city ?? "",
          state: target.state ?? "",
          country: target.country ?? "",
          observation_context: targetAny.observation_context ?? "",
          observation_type: targetAny.observation_type ?? "",
          games_observed: targetAny.games_observed ?? null,
          minutes_observed: targetAny.minutes_observed ?? null,
          source: target.source ?? "",
          perceived_profile: targetAny.perceived_profile ?? "",
          height: target.height ?? null,
          weight: target.weight ? Number(target.weight) : null,
          status: target.status,
          priority: target.priority,
          interest_reason: targetAny.interest_reason ?? "",
          ideal_approach_window: targetAny.ideal_approach_window ?? "",
          market_strategy: targetAny.market_strategy ?? "",
          notes_internal: target.notes_internal ?? "",
          highlight_video_url: target.highlight_video_url ?? "",
        });
        setTags(target.tags || []);
        setNotableChars(targetAny.notable_characteristics || []);
        setShowOtherCompetition(!hasCompetitionId && !!target.league_competition);
      } else {
        form.reset();
        setTags([]);
        setNotableChars([]);
        setShowOtherCompetition(false);
      }
    }
  }, [open, target, form, competitions]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addNotableChar = () => {
    const trimmed = charInput.trim();
    if (trimmed && !notableChars.includes(trimmed) && notableChars.length < 15) {
      setNotableChars([...notableChars, trimmed]);
      setCharInput("");
    }
  };

  const removeNotableChar = (char: string) => {
    setNotableChars(notableChars.filter(c => c !== char));
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      // Determine competition values
      const isOtherCompetition = data.competition_id === "other";
      const finalCompetitionId = isOtherCompetition ? null : (data.competition_id || null);
      const finalLeagueCompetition = isOtherCompetition 
        ? (data.league_competition || null)
        : (data.competition_id 
            ? competitions.find((c: any) => c.id === data.competition_id)?.name || null
            : null);

      const payload = {
        name: data.name,
        position: data.position,
        secondary_position: data.secondary_position || null,
        age_estimate: data.age_estimate || null,
        dominant_foot: data.dominant_foot || null,
        current_club: data.current_club || null,
        competition_id: finalCompetitionId,
        league_competition: finalLeagueCompetition,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        observation_context: data.observation_context || null,
        observation_type: data.observation_type || null,
        games_observed: data.games_observed || 0,
        minutes_observed: data.minutes_observed || null,
        source: data.source || null,
        perceived_profile: data.perceived_profile || null,
        height: data.height || null,
        weight: data.weight || null,
        status: data.status as TargetStatus,
        priority: data.priority as TargetPriority,
        interest_reason: data.interest_reason || null,
        ideal_approach_window: data.ideal_approach_window || null,
        market_strategy: data.market_strategy || null,
        notes_internal: data.notes_internal || null,
        highlight_video_url: data.highlight_video_url || null,
        tags,
        notable_characteristics: notableChars,
        ...(isEditing ? {} : { created_by: user?.id }),
      };

      if (isEditing && target) {
        const { error } = await supabase
          .from("targets")
          .update(payload)
          .eq("id", target.id);
        if (error) throw error;
        toast({ title: "Target atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("targets").insert(payload);
        if (error) throw error;
        toast({ title: "Target criado com sucesso" });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving target:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o target.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-white/[0.06]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEditing ? "Editar Target" : "Novo Target"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* ========== IDENTIFICAÇÃO ========== */}
          <SectionHeader icon={User} title="Identificação" />
          
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input 
              id="name" 
              {...form.register("name")} 
              placeholder="Nome do atleta"
              className="bg-zinc-800/50 border-white/[0.06]"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Position + Secondary Position + Age */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Posição *</Label>
              <Select
                value={form.watch("position")}
                onValueChange={(v) => form.setValue("position", v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Posição secundária</Label>
              <Select
                value={form.watch("secondary_position") || "_none"}
                onValueChange={(v) => form.setValue("secondary_position", v === "_none" ? "" : v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_estimate">Idade estimada</Label>
              <Input
                id="age_estimate"
                type="number"
                {...form.register("age_estimate")}
                placeholder="Ex: 19"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
          </div>

          {/* Dominant Foot */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pé dominante</Label>
              <Select
                value={form.watch("dominant_foot") || ""}
                onValueChange={(v) => form.setValue("dominant_foot", v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {DOMINANT_FOOT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ========== CONTEXTO ATUAL ========== */}
          <SectionHeader icon={MapPin} title="Contexto Atual" />

          {/* Club + Competition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="current_club">Clube atual</Label>
              <Input
                id="current_club"
                {...form.register("current_club")}
                placeholder="Nome do clube"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
            <div className="space-y-2">
              <Label>Competição / Liga</Label>
              <Select
                value={form.watch("competition_id") || "_none"}
                onValueChange={(v) => form.setValue("competition_id", v === "_none" ? "" : v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="_none">Não especificado</SelectItem>
                  {competitions.map((comp: any) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.display_name || comp.name} ({comp.country})
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Outro / Não listado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manual competition input when "other" selected */}
          {showOtherCompetition && (
            <div className="space-y-2">
              <Label htmlFor="league_competition">Nome da competição (manual)</Label>
              <Input
                id="league_competition"
                {...form.register("league_competition")}
                placeholder="Ex: Campeonato Regional Sub-20"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
          )}

          {/* Location */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                {...form.register("city")}
                placeholder="Cidade"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                {...form.register("state")}
                placeholder="UF"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                {...form.register("country")}
                placeholder="País"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
          </div>

          {/* ========== MONITORAMENTO ========== */}
          <SectionHeader icon={Eye} title="Monitoramento" />

          {/* Observation type + Games observed */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tipo de observação</Label>
              <Select
                value={form.watch("observation_type") || ""}
                onValueChange={(v) => form.setValue("observation_type", v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {OBSERVATION_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="games_observed">Jogos observados</Label>
              <Input
                id="games_observed"
                type="number"
                {...form.register("games_observed")}
                placeholder="0"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes_observed">Minutos aprox.</Label>
              <Input
                id="minutes_observed"
                type="number"
                {...form.register("minutes_observed")}
                placeholder="Opcional"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
          </div>

          {/* Observation context */}
          <div className="space-y-2">
            <Label htmlFor="observation_context">Contexto de observação</Label>
            <Textarea
              id="observation_context"
              {...form.register("observation_context")}
              placeholder="Descreva o contexto em que o atleta foi observado..."
              className="min-h-[60px] bg-zinc-800/50 border-white/[0.06]"
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Fonte / Origem</Label>
            <Input
              id="source"
              {...form.register("source")}
              placeholder="Ex: Scout parceiro, YouTube, Indicação de agente..."
              className="bg-zinc-800/50 border-white/[0.06]"
            />
          </div>

          {/* ========== PERFIL PERCEBIDO ========== */}
          <SectionHeader icon={TargetIcon} title="Perfil Percebido" />

          {/* Physical data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                {...form.register("height")}
                placeholder="Ex: 180"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                {...form.register("weight")}
                placeholder="Ex: 75"
                className="bg-zinc-800/50 border-white/[0.06]"
              />
            </div>
          </div>

          {/* Perceived profile */}
          <div className="space-y-2">
            <Label htmlFor="perceived_profile">Perfil percebido</Label>
            <Textarea
              id="perceived_profile"
              {...form.register("perceived_profile")}
              placeholder="Descrição do perfil do atleta: estilo de jogo, pontos fortes..."
              className="min-h-[60px] bg-zinc-800/50 border-white/[0.06]"
            />
          </div>

          {/* Notable characteristics (tags) */}
          <div className="space-y-2">
            <Label>Características notáveis</Label>
            <div className="flex gap-2">
              <Input
                value={charInput}
                onChange={(e) => setCharInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNotableChar())}
                placeholder="Ex: 1x1, força física, boa saída de bola..."
                className="flex-1 bg-zinc-800/50 border-white/[0.06]"
              />
              <Button type="button" variant="outline" size="icon" onClick={addNotableChar}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {notableChars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {notableChars.map((char) => (
                  <Badge key={char} variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    {char}
                    <button type="button" onClick={() => removeNotableChar(char)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="highlight_video_url">Link de vídeo (opcional)</Label>
            <Input
              id="highlight_video_url"
              {...form.register("highlight_video_url")}
              placeholder="https://youtube.com/..."
              className="bg-zinc-800/50 border-white/[0.06]"
            />
          </div>

          {/* ========== ESTRATÉGIA ========== */}
          <SectionHeader icon={LineChart} title="Estratégia" />

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as TargetStatus)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONITORING">Monitorando</SelectItem>
                  <SelectItem value="APPROACH">Abordagem</SelectItem>
                  <SelectItem value="NEGOTIATION">Negociação</SelectItem>
                  <SelectItem value="DROPPED">Descartado</SelectItem>
                  <SelectItem value="SIGNED">Contratado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade *</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v as TargetPriority)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="LOW">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interest reason + Approach window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Motivo do interesse</Label>
              <Select
                value={form.watch("interest_reason") || ""}
                onValueChange={(v) => form.setValue("interest_reason", v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {INTEREST_REASONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Janela ideal de abordagem</Label>
              <Select
                value={form.watch("ideal_approach_window") || ""}
                onValueChange={(v) => form.setValue("ideal_approach_window", v)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {APPROACH_WINDOWS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Market strategy */}
          <div className="space-y-2">
            <Label htmlFor="market_strategy">Estratégia de mercado (uso interno)</Label>
            <Textarea
              id="market_strategy"
              {...form.register("market_strategy")}
              placeholder="Descreva a estratégia de abordagem ou negociação..."
              className="min-h-[60px] bg-zinc-800/50 border-white/[0.06]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Adicionar tag..."
                className="flex-1 bg-zinc-800/50 border-white/[0.06]"
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* ========== NOTAS INTERNAS ========== */}
          <SectionHeader icon={FileText} title="Notas Internas" />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes_internal">Observações gerais</Label>
            <Textarea
              id="notes_internal"
              {...form.register("notes_internal")}
              placeholder="Anotações internas sobre o atleta..."
              className="min-h-[80px] bg-zinc-800/50 border-white/[0.06]"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? "Atualizar" : "Criar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
