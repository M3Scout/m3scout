import { useState, useEffect, useRef } from "react";
import { Building2, Loader2, Archive, Star, Upload, FileText, ExternalLink } from "lucide-react";

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
  club_logo_url?: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  transfer_fee: string | null;
  salary_info: string | null;
  termination_fee: string | null;
  termination_fee_international: string | null;
  notes: string | null;
  is_current: boolean;
  is_archived: boolean;
  contract_file_url?: string | null;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    club_name: "",
    club_country: "",
    club_logo_url: "",
    contract_type: "permanent",
    start_date: "",
    end_date: "",
    transfer_fee: "",
    salary_info: "",
    termination_fee: "",
    termination_fee_international: "",
    notes: "",
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        club_name: contract.club_name || "",
        club_country: contract.club_country || "",
        club_logo_url: contract.club_logo_url || "",
        contract_type: contract.contract_type || "permanent",
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        transfer_fee: initBRL(contract.transfer_fee),
        salary_info: initBRL(contract.salary_info),
        termination_fee: initBRL(contract.termination_fee),
        termination_fee_international: initBRL(contract.termination_fee_international),
        notes: contract.notes || "",
      });
      setFileUrl(contract.contract_file_url ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contract) return;

    const ext = file.name.split(".").pop() ?? "pdf";
    const storagePath = `${playerId}/${contract.id}.${ext}`;

    setIsUploading(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from("player_contract_history")
        .update({ contract_file_url: storagePath })
        .eq("id", contract.id);
      if (dbErr) throw dbErr;

      setFileUrl(storagePath);
      toast.success("Contrato enviado com sucesso");
      onSuccess();
    } catch {
      toast.error("Erro ao enviar o contrato");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleViewFile = async () => {
    if (!fileUrl) return;
    const { data, error } = await supabase.storage
      .from("contracts")
      .createSignedUrl(fileUrl, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao abrir o arquivo");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

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
          club_logo_url: formData.club_logo_url || null,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          transfer_fee: formData.transfer_fee || null,
          salary_info: formData.salary_info || null,
          termination_fee: formData.termination_fee || null,
          termination_fee_international: formData.termination_fee_international || null,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contract) return;
    const ext = file.name.split(".").pop() ?? "png";
    const storagePath = `logos/${contract.id}.${ext}`;
    setIsLogoUploading(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(storagePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // signed URL válida por 10 anos
      const { data: signed, error: signErr } = await supabase.storage
        .from("contracts")
        .createSignedUrl(storagePath, 315360000);
      if (signErr || !signed?.signedUrl) throw signErr;
      const logoUrl = signed.signedUrl;
      setFormData(f => ({ ...f, club_logo_url: logoUrl }));
      const { error: dbErr } = await supabase
        .from("player_contract_history")
        .update({ club_logo_url: logoUrl })
        .eq("id", contract.id);
      if (dbErr) throw dbErr;
      toast.success("Logo enviada com sucesso");
      onSuccess();
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setIsLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
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
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Editar Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 max-h-[75vh] overflow-y-auto pr-1">
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

          {/* Arquivo do contrato */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Arquivo do Contrato</Label>
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enviando...</>
                      : <><Upload className="w-3.5 h-3.5" />{fileUrl ? "Substituir arquivo" : "Enviar contrato"}</>
                    }
                  </Button>
                </>
              )}
              {fileUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={handleViewFile}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visualizar
                </Button>
              )}
            </div>
            {fileUrl && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">Arquivo anexado</span>
              </div>
            )}
          </div>

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
            <div className="space-y-2 col-span-2">
              <Label className="text-xs text-zinc-400">Logo do Clube</Label>
              <div className="flex gap-2 items-center">
                {/* Preview */}
                <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 shrink-0 overflow-hidden flex items-center justify-center">
                  {formData.club_logo_url ? (
                    <img src={formData.club_logo_url} alt="logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-zinc-600 text-[10px]">—</span>
                  )}
                </div>
                {canEdit && (
                  <>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isLogoUploading}
                    >
                      {isLogoUploading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enviando...</>
                        : <><Upload className="w-3.5 h-3.5" />{formData.club_logo_url ? "Trocar logo" : "Enviar logo"}</>
                      }
                    </Button>
                  </>
                )}
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="edit_termination_fee" className="text-xs text-zinc-400">Multa Rescisória (Nacional)</Label>
              <Input
                id="edit_termination_fee"
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.termination_fee}
                onChange={(e) => setFormData({ ...formData, termination_fee: handleBRLInput(e.target.value) })}
                className="h-11 bg-zinc-900/50 border-zinc-800"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_termination_fee_international" className="text-xs text-zinc-400">Multa Rescisória (Internacional)</Label>
              <Input
                id="edit_termination_fee_international"
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={formData.termination_fee_international}
                onChange={(e) => setFormData({ ...formData, termination_fee_international: handleBRLInput(e.target.value) })}
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
              className="bg-zinc-900/50 border-zinc-800 min-h-[56px]"
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
