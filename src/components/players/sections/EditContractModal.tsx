import { useState, useEffect } from "react";
import { Building2, Loader2, Archive, Star } from "lucide-react";

// ─── Currency helpers (BRL) ───────────────────────────────────────────────────
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** Converts any stored value to a BRL display string.
 *  Handles plain integers (stored as "3208000" → R$ 3.208.000,00)
 *  and already-formatted strings (kept as-is for re-display). */
function initBRL(stored: string | null | undefined): string {
  if (!stored) return "";
  // Already looks like currency — return it directly
  if (stored.includes("R$")) return stored;
  // Pure integer → treat as whole reais
  const n = parseInt(stored.replace(/\D/g, ""), 10);
  return isNaN(n) ? stored : formatBRL(n);
}

/** Real-time formatter: extracts digits from typed input and formats as BRL cents. */
function handleBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return formatBRL(parseInt(digits, 10) / 100);
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ContractData {
  id: string;
  club_name: string;
  club_country: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  transfer_fee: string | null;
  salary_info: string | null;
  notes: string | null;
  is_current: boolean;
  is_archived: boolean;
}

interface EditContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractData | null;
  playerId: string;
  onSuccess: () => void;
  canEdit: boolean;
}

export function EditContractModal({ 
  open, 
  onOpenChange, 
  contract, 
  playerId,
  onSuccess,
  canEdit 
}: EditContractModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    club_name: "",
    club_country: "",
    contract_type: "permanent",
    start_date: "",
    end_date: "",
    transfer_fee: "",
    salary_info: "",
    notes: "",
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        club_name: contract.club_name || "",
        club_country: contract.club_country || "",
        contract_type: contract.contract_type || "permanent",
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        transfer_fee: initBRL(contract.transfer_fee),
        salary_info: initBRL(contract.salary_info),
        notes: contract.notes || "",
      });
    }
  }, [contract]);

  const handleSave = async () => {
    if (!contract || !canEdit) return;
    
    if (!formData.club_name || !formData.start_date) {
      toast.error("Preencha pelo menos o nome do clube e a data de início");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("player_contract_history")
        .update({
          club_name: formData.club_name,
          club_country: formData.club_country || null,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          transfer_fee: formData.transfer_fee || null,
          salary_info: formData.salary_info || null,
          notes: formData.notes || null,
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Contrato atualizado com sucesso");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating contract:", error);
      toast.error("Erro ao atualizar contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetAsCurrent = async () => {
    if (!contract || !canEdit) return;

    setIsSubmitting(true);
    try {
      // The trigger will automatically set other contracts as not current
      const { error } = await supabase
        .from("player_contract_history")
        .update({ is_current: true })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Contrato definido como atual");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error setting current contract:", error);
      toast.error("Erro ao definir contrato como atual");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!contract || !canEdit) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("player_contract_history")
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString(),
          is_current: false
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Contrato arquivado");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error archiving contract:", error);
      toast.error("Erro ao arquivar contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnarchive = async () => {
    if (!contract || !canEdit) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("player_contract_history")
        .update({ 
          is_archived: false, 
          archived_at: null
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Contrato restaurado");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error unarchiving contract:", error);
      toast.error("Erro ao restaurar contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Editar Contrato
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Quick Actions */}
          {canEdit && (
            <div className="flex gap-2">
              {!contract.is_current && !contract.is_archived && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={handleSetAsCurrent}
                  disabled={isSubmitting}
                >
                  <Star className="w-3.5 h-3.5" />
                  Definir como Atual
                </Button>
              )}
              {!contract.is_archived ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                  onClick={handleArchive}
                  disabled={isSubmitting}
                >
                  <Archive className="w-3.5 h-3.5" />
                  Arquivar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={handleUnarchive}
                  disabled={isSubmitting}
                >
                  <Archive className="w-3.5 h-3.5" />
                  Restaurar
                </Button>
              )}
            </div>
          )}
          
          <Separator className="bg-zinc-800" />
          
          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit_club_name" className="text-xs text-zinc-400">Nome do Clube *</Label>
              <Input
                id="edit_club_name"
                placeholder="Ex: Flamengo"
                value={formData.club_name}
                onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_club_country" className="text-xs text-zinc-400">País</Label>
              <Input
                id="edit_club_country"
                placeholder="Brasil"
                value={formData.club_country}
                onChange={(e) => setFormData({ ...formData, club_country: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_contract_type" className="text-xs text-zinc-400">Tipo</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                disabled={!canEdit}
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
              <Label htmlFor="edit_start_date" className="text-xs text-zinc-400">Início *</Label>
              <Input
                id="edit_start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_end_date" className="text-xs text-zinc-400">Término</Label>
              <Input
                id="edit_end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_transfer_fee" className="text-xs text-zinc-400">Valor da Transferência</Label>
              <Input
                id="edit_transfer_fee"
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.transfer_fee}
                onChange={(e) => setFormData({ ...formData, transfer_fee: handleBRLInput(e.target.value) })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_salary_info" className="text-xs text-zinc-400">Salário</Label>
              <Input
                id="edit_salary_info"
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.salary_info}
                onChange={(e) => setFormData({ ...formData, salary_info: handleBRLInput(e.target.value) })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes" className="text-xs text-zinc-400">Observações</Label>
            <Textarea
              id="edit_notes"
              placeholder="Notas sobre o contrato..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-zinc-900/50 border-zinc-800 min-h-[80px]"
              disabled={!canEdit}
            />
          </div>

          {canEdit && (
            <Button 
              onClick={handleSave} 
              className="w-full h-11" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
