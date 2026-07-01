import { useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function handleBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return formatBRL(parseInt(digits, 10) / 100);
}

interface AddContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  onSuccess: () => void;
}

export function AddContractModal({ open, onOpenChange, playerId, onSuccess }: AddContractModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    club_name: "",
    club_country: "",
    contract_type: "permanent",
    start_date: "",
    end_date: "",
    transfer_fee: "",
    salary_info: "",
    termination_fee: "",
    notes: "",
  });

  const reset = () => setFormData({
    club_name: "",
    club_country: "",
    contract_type: "permanent",
    start_date: "",
    end_date: "",
    transfer_fee: "",
    salary_info: "",
    termination_fee: "",
    notes: "",
  });

  const handleSave = async () => {
    if (!formData.club_name || !formData.start_date) {
      toast.error("Preencha pelo menos o nome do clube e a data de início");
      return;
    }
    setIsSubmitting(true);
    try {
      // Fetch existing contracts to determine sort_order
      const { data: existing } = await supabase
        .from("player_contract_history")
        .select("id, sort_order")
        .eq("player_id", playerId)
        .eq("is_archived", false);

      const rows = existing ?? [];

      // Sort existing by start_date DESC to find the right position for the new contract
      const sorted = [...rows].sort((a, b) =>
        new Date(b.start_date ?? 0).getTime() - new Date(a.start_date ?? 0).getTime()
      );

      // Ensure all existing have sort_order; assign by date position if missing
      const needsOrder = sorted.filter(r => r.sort_order === null);
      if (needsOrder.length > 0) {
        await Promise.all(
          sorted.map((r, i) =>
            r.sort_order === null
              ? supabase.from("player_contract_history").update({ sort_order: i * 10 }).eq("id", r.id)
              : Promise.resolve()
          )
        );
        sorted.forEach((r, i) => { if (r.sort_order === null) r.sort_order = i * 10; });
      }

      // Position new contract based on its start_date relative to existing ones
      const newDate = new Date(formData.start_date).getTime();
      const insertIdx = sorted.findIndex(r => new Date(r.start_date ?? 0).getTime() < newDate);

      let newSortOrder: number;
      if (sorted.length === 0) {
        newSortOrder = 0;
      } else if (insertIdx === 0) {
        // Most recent → goes first
        newSortOrder = (sorted[0].sort_order ?? 0) - 10;
      } else if (insertIdx === -1) {
        // Oldest → goes last
        newSortOrder = (sorted[sorted.length - 1].sort_order ?? (sorted.length - 1) * 10) + 10;
      } else {
        // Middle — interpolate between neighbours
        const prev = sorted[insertIdx - 1].sort_order ?? (insertIdx - 1) * 10;
        const next = sorted[insertIdx].sort_order ?? insertIdx * 10;
        newSortOrder = Math.floor((prev + next) / 2);
      }

      const { error } = await supabase
        .from("player_contract_history")
        .insert({
          player_id: playerId,
          club_name: formData.club_name,
          club_country: formData.club_country || null,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          transfer_fee: formData.transfer_fee || null,
          salary_info: formData.salary_info || null,
          termination_fee: formData.termination_fee || null,
          notes: formData.notes || null,
          is_current: false,
          is_archived: false,
          sort_order: newSortOrder,
        });
      if (error) throw error;

      // Sync players.current_club so all views (header, grid, public) reflect the new club
      await supabase
        .from("players")
        .update({ current_club: formData.club_name })
        .eq("id", playerId);

      toast.success("Contrato adicionado com sucesso");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Erro ao adicionar contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Adicionar Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label className="text-xs text-zinc-400">Nome do Clube *</Label>
              <Input
                placeholder="Ex: Flamengo"
                value={formData.club_name}
                onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">País</Label>
              <Input
                placeholder="Brasil"
                value={formData.club_country}
                onChange={(e) => setFormData({ ...formData, club_country: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Tipo</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
              >
                <SelectTrigger className="h-11 bg-zinc-900/50 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Definitivo</SelectItem>
                  <SelectItem value="loan">Empréstimo</SelectItem>
                  <SelectItem value="youth">Base/Formação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Início *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Término</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Valor da Transferência</Label>
              <Input
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.transfer_fee}
                onChange={(e) => setFormData({ ...formData, transfer_fee: handleBRLInput(e.target.value) })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Salário</Label>
              <Input
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.salary_info}
                onChange={(e) => setFormData({ ...formData, salary_info: handleBRLInput(e.target.value) })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-xs text-zinc-400">Multa Rescisória</Label>
              <Input
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.termination_fee}
                onChange={(e) => setFormData({ ...formData, termination_fee: handleBRLInput(e.target.value) })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Observações</Label>
            <Textarea
              placeholder="Notas sobre o contrato..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-zinc-900/50 border-zinc-800 min-h-[56px]"
            />
          </div>

          <Button onClick={handleSave} className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : "Adicionar Contrato"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
