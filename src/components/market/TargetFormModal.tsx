/**
 * Target Form Modal
 * 
 * Create or edit a recruitment target
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2, Save, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Target, TargetStatus, TargetPriority } from "@/types/marketScore";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(100),
  position: z.string().min(1, "Posição é obrigatória"),
  age_estimate: z.coerce.number().min(10).max(50).nullable().optional(),
  current_club: z.string().max(100).optional(),
  league_competition: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  country: z.string().max(50).optional(),
  dominant_foot: z.string().optional(),
  height: z.coerce.number().min(100).max(230).nullable().optional(),
  weight: z.coerce.number().min(30).max(150).nullable().optional(),
  source: z.string().max(100).optional(),
  status: z.enum(["MONITORING", "APPROACH", "NEGOTIATION", "DROPPED", "SIGNED"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  notes_internal: z.string().max(2000).optional(),
  highlight_video_url: z.string().url().max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

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
];

interface TargetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: Target | null;
  onSuccess?: () => void;
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

  const isEditing = !!target;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      position: "",
      age_estimate: null,
      current_club: "",
      league_competition: "",
      city: "",
      state: "",
      country: "",
      dominant_foot: "",
      height: null,
      weight: null,
      source: "",
      status: "MONITORING",
      priority: "MEDIUM",
      notes_internal: "",
      highlight_video_url: "",
    },
  });

  // Reset form when modal opens with target data
  useEffect(() => {
    if (open) {
      if (target) {
        form.reset({
          name: target.name,
          position: target.position,
          age_estimate: target.age_estimate ?? null,
          current_club: target.current_club ?? "",
          league_competition: target.league_competition ?? "",
          city: target.city ?? "",
          state: target.state ?? "",
          country: target.country ?? "",
          dominant_foot: target.dominant_foot ?? "",
          height: target.height ?? null,
          weight: target.weight ? Number(target.weight) : null,
          source: target.source ?? "",
          status: target.status,
          priority: target.priority,
          notes_internal: target.notes_internal ?? "",
          highlight_video_url: target.highlight_video_url ?? "",
        });
        setTags(target.tags || []);
      } else {
        form.reset();
        setTags([]);
      }
    }
  }, [open, target, form]);

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

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        position: data.position,
        age_estimate: data.age_estimate || null,
        current_club: data.current_club || null,
        league_competition: data.league_competition || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        dominant_foot: data.dominant_foot || null,
        height: data.height || null,
        weight: data.weight || null,
        source: data.source || null,
        status: data.status as TargetStatus,
        priority: data.priority as TargetPriority,
        notes_internal: data.notes_internal || null,
        highlight_video_url: data.highlight_video_url || null,
        tags,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Target" : "Novo Target"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...form.register("name")} placeholder="Nome do atleta" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Position + Age */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Posição *</Label>
              <Select
                value={form.watch("position")}
                onValueChange={(v) => form.setValue("position", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
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
              />
            </div>
          </div>

          {/* Club + Competition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="current_club">Clube atual</Label>
              <Input
                id="current_club"
                {...form.register("current_club")}
                placeholder="Nome do clube"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="league_competition">Competição/Liga</Label>
              <Input
                id="league_competition"
                {...form.register("league_competition")}
                placeholder="Ex: Campeonato Paulista"
              />
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as TargetStatus)}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Fonte</Label>
            <Input
              id="source"
              {...form.register("source")}
              placeholder="Ex: Indicação, Vídeo, Campeonato..."
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
                className="flex-1"
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes_internal">Notas internas</Label>
            <Textarea
              id="notes_internal"
              {...form.register("notes_internal")}
              placeholder="Observações sobre o atleta..."
              className="min-h-[80px]"
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="highlight_video_url">Link de vídeo (opcional)</Label>
            <Input
              id="highlight_video_url"
              {...form.register("highlight_video_url")}
              placeholder="https://youtube.com/..."
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
