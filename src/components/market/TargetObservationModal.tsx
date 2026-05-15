/**
 * Target Observation Modal
 * 
 * Add a new observation for a target
 */

import { useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/authContext";
import { format } from "date-fns";

const formSchema = z.object({
  observation_date: z.string().min(1, "Data é obrigatória"),
  match_context: z.string().max(200).optional(),
  opponent: z.string().max(100).optional(),
  competition: z.string().max(100).optional(),
  result: z.string().max(50).optional(),
  minutes_observed: z.coerce.number().min(0).max(120).nullable().optional(),
  performance_rating: z.coerce.number().min(1).max(10).nullable().optional(),
  qualitative_notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TargetObservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  onSuccess?: () => void;
}

export function TargetObservationModal({
  open,
  onOpenChange,
  targetId,
  onSuccess,
}: TargetObservationModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState<number>(5);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      observation_date: format(new Date(), "yyyy-MM-dd"),
      match_context: "",
      opponent: "",
      competition: "",
      result: "",
      minutes_observed: null,
      performance_rating: null,
      qualitative_notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        target_id: targetId,
        observation_date: data.observation_date,
        match_context: data.match_context || null,
        opponent: data.opponent || null,
        competition: data.competition || null,
        result: data.result || null,
        minutes_observed: data.minutes_observed || null,
        performance_rating: rating,
        qualitative_notes: data.qualitative_notes || null,
        created_by: user?.id,
      };

      const { error } = await supabase.from("target_observations").insert(payload);
      if (error) throw error;

      toast({ title: "Observação adicionada" });
      form.reset();
      setRating(5);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving observation:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a observação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Nova Observação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="observation_date">Data da observação *</Label>
            <Input
              id="observation_date"
              type="date"
              {...form.register("observation_date")}
            />
          </div>

          {/* Match Context */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="opponent">Adversário</Label>
              <Input
                id="opponent"
                {...form.register("opponent")}
                placeholder="Ex: Palmeiras"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="result">Resultado</Label>
              <Input
                id="result"
                {...form.register("result")}
                placeholder="Ex: 2x1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competition">Competição</Label>
            <Input
              id="competition"
              {...form.register("competition")}
              placeholder="Ex: Campeonato Paulista Sub-20"
            />
          </div>

          {/* Minutes + Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minutes_observed">Minutos observados</Label>
              <Input
                id="minutes_observed"
                type="number"
                {...form.register("minutes_observed")}
                placeholder="Ex: 45"
              />
            </div>
            <div className="space-y-2">
              <Label>Nota do desempenho ({rating}/10)</Label>
              <Slider
                value={[rating]}
                onValueChange={(v) => setRating(v[0])}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="qualitative_notes">Observações qualitativas</Label>
            <Textarea
              id="qualitative_notes"
              {...form.register("qualitative_notes")}
              placeholder="Pontos fortes, fracos, destaques da partida..."
              className="min-h-[100px]"
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
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
