import * as React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Pencil, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const injuryFormSchema = z.object({
  injury_type: z.string().min(1, "Tipo de lesão é obrigatório"),
  severity: z.enum(["leve", "media", "grave"], {
    required_error: "Gravidade é obrigatória",
  }),
  start_date: z.date({
    required_error: "Data de início é obrigatória",
  }),
  return_date: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type InjuryFormValues = z.infer<typeof injuryFormSchema>;

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface EditInjuryModalProps {
  injury: Injury;
  onInjuryUpdated: () => void;
  trigger: React.ReactNode;
}

const COMMON_INJURIES = [
  "Distensão muscular",
  "Entorse de tornozelo",
  "Lesão no joelho",
  "Contusão",
  "Fratura",
  "Tendinite",
  "Pubalgia",
  "Lesão no ombro",
  "Lombalgia",
  "Fadiga muscular",
];

const normalizeSeverity = (severity: string): "leve" | "media" | "grave" => {
  const s = severity.toLowerCase();
  if (s === "mild" || s === "leve") return "leve";
  if (s === "medium" || s === "media" || s === "média") return "media";
  if (s === "severe" || s === "grave") return "grave";
  return "leve";
};

export function EditInjuryModal({ injury, onInjuryUpdated, trigger }: EditInjuryModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customInjury, setCustomInjury] = useState(false);

  const form = useForm<InjuryFormValues>({
    resolver: zodResolver(injuryFormSchema),
    defaultValues: {
      injury_type: injury.injury_type,
      severity: normalizeSeverity(injury.severity),
      start_date: new Date(injury.start_date),
      return_date: injury.return_date ? new Date(injury.return_date) : null,
      notes: injury.notes || "",
    },
  });

  // Check if the injury type is a custom one
  useEffect(() => {
    if (!COMMON_INJURIES.includes(injury.injury_type)) {
      setCustomInjury(true);
    }
  }, [injury.injury_type]);

  // Reset form when injury changes
  useEffect(() => {
    form.reset({
      injury_type: injury.injury_type,
      severity: normalizeSeverity(injury.severity),
      start_date: new Date(injury.start_date),
      return_date: injury.return_date ? new Date(injury.return_date) : null,
      notes: injury.notes || "",
    });
  }, [injury, form]);

  const onSubmit = async (data: InjuryFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("player_injuries")
        .update({
          injury_type: data.injury_type,
          severity: data.severity,
          start_date: format(data.start_date, "yyyy-MM-dd"),
          return_date: data.return_date ? format(data.return_date, "yyyy-MM-dd") : null,
          notes: data.notes || null,
        })
        .eq("id", injury.id);

      if (error) throw error;

      toast.success("Lesão atualizada com sucesso");
      setOpen(false);
      onInjuryUpdated();
    } catch (error) {
      console.error("Error updating injury:", error);
      toast.error("Erro ao atualizar lesão");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Editar Lesão
          </DialogTitle>
          <DialogDescription>
            Atualize os dados da lesão.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de Lesão */}
            <FormField
              control={form.control}
              name="injury_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Lesão</FormLabel>
                  {customInjury ? (
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Digite o tipo de lesão"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomInjury(false);
                          field.onChange("");
                        }}
                      >
                        Lista
                      </Button>
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setCustomInjury(true);
                          field.onChange("");
                        } else {
                          field.onChange(value);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de lesão" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_INJURIES.map((inj) => (
                          <SelectItem key={inj} value={inj}>
                            {inj}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          <span className="text-primary">+ Outro tipo</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gravidade */}
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gravidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a gravidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="leve">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Leve
                        </span>
                      </SelectItem>
                      <SelectItem value="media">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Média
                        </span>
                      </SelectItem>
                      <SelectItem value="grave">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Grave
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="return_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Retorno</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Em tratamento</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const startDate = form.getValues("start_date");
                            return date < startDate || date > new Date();
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre a lesão..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
