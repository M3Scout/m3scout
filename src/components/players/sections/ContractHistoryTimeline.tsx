import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Plus, 
  Building2, 
  Calendar, 
  ArrowRightLeft,
  Loader2,
  DollarSign,
  GraduationCap,
  Pencil,
  Star,
  GripVertical,
  Archive,
  Eye,
  EyeOff,
  Check,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/authContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { EditContractModal } from "./EditContractModal";
import { Reorder, useDragControls } from "framer-motion";

interface ContractHistoryRecord {
  id: string;
  club_name: string;
  club_country: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  transfer_fee: string | null;
  termination_fee: string | null;
  salary_info: string | null;
  notes: string | null;
  is_current: boolean;
  is_archived: boolean;
  sort_order: number;
}

interface ContractHistoryTimelineProps {
  playerId: string;
}

// Premium desaturated type config
const CONTRACT_TYPE_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
}> = {
  permanent: { 
    label: "Definitivo", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/8",
    borderColor: "border-emerald-500/20",
    icon: Building2 
  },
  loan: { 
    label: "Empréstimo", 
    color: "text-sky-400", 
    bgColor: "bg-sky-500/8",
    borderColor: "border-sky-500/20",
    icon: ArrowRightLeft 
  },
  youth: { 
    label: "Base/Formação", 
    color: "text-violet-400", 
    bgColor: "bg-violet-500/8",
    borderColor: "border-violet-500/20",
    icon: GraduationCap 
  },
};

const formatDate = (date: string): string => {
  return format(new Date(date), "MMM yyyy", { locale: ptBR });
};

const calculateDuration = (start: string, end: string | null): string => {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  
  const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  let duration = "";
  if (years > 0) duration += `${years}a`;
  if (months > 0) duration += `${years > 0 ? " " : ""}${months}m`;
  
  return duration || "< 1m";
};

// Contract card content (shared between reorder and static modes)
function ContractCardContent({ 
  contract, 
  isReordering, 
  canEdit,
  onEdit,
  dragControls
}: { 
  contract: ContractHistoryRecord;
  isReordering: boolean;
  canEdit: boolean;
  onEdit: (contract: ContractHistoryRecord) => void;
  dragControls?: ReturnType<typeof useDragControls>;
}) {
  const typeConfig = CONTRACT_TYPE_CONFIG[contract.contract_type] || CONTRACT_TYPE_CONFIG.permanent;
  const TypeIcon = typeConfig.icon;

  return (
    <>
      {/* Timeline dot */}
      <div className={cn(
        "absolute left-2 top-4 w-5 h-5 rounded-full border flex items-center justify-center z-10",
        contract.is_current 
          ? "bg-amber-500/20 border-amber-500/50" 
          : contract.is_archived
            ? "bg-zinc-700/30 border-zinc-600/30"
            : "bg-zinc-800/60 border-zinc-700/30"
      )}>
        <div className={cn(
          "w-2 h-2 rounded-full",
          contract.is_current 
            ? "bg-amber-400" 
            : contract.is_archived
              ? "bg-zinc-600"
              : "bg-zinc-600"
        )} />
      </div>
      
      {/* Contract card - premium style */}
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        "hover:bg-zinc-900/70",
        contract.is_archived 
          ? "bg-zinc-900/30 border-zinc-800/30 opacity-60" 
          : contract.is_current 
            ? "bg-zinc-900/60 border-amber-500/30 ring-1 ring-amber-500/10" 
            : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50",
        isReordering && "cursor-grab active:cursor-grabbing"
      )}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Drag handle */}
            {isReordering && dragControls && (
              <button
                className="touch-none p-1 -ml-1 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TypeIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="font-semibold text-white truncate">{contract.club_name}</span>
                {contract.is_current && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                    <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-400" />
                    Atual
                  </Badge>
                )}
                {contract.is_archived && (
                  <Badge variant="outline" className="bg-zinc-700/30 text-zinc-500 border-zinc-600/30 text-[10px] px-1.5 py-0">
                    <Archive className="w-2.5 h-2.5 mr-0.5" />
                    Arquivado
                  </Badge>
                )}
              </div>
              {contract.club_country && (
                <p className="text-xs text-zinc-500 ml-6">{contract.club_country}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Type badge - premium discrete */}
            <span className={cn(
              "flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium border",
              typeConfig.bgColor,
              typeConfig.color,
              typeConfig.borderColor
            )}>
              {typeConfig.label}
            </span>
            
            {/* Actions */}
            {!isReordering && canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                onClick={() => onEdit(contract)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Date and duration row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="w-3 h-3 text-zinc-600" />
            <span>
              {formatDate(contract.start_date)} — {contract.end_date ? formatDate(contract.end_date) : "Atual"}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-500 text-[10px] font-medium">
            {calculateDuration(contract.start_date, contract.end_date)}
          </span>
        </div>
        
        {/* Financial info - highlighted */}
        {contract.transfer_fee && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/50">
            <DollarSign className="w-3.5 h-3.5 text-amber-500/70" />
            <span className="text-sm font-semibold text-amber-400">{contract.transfer_fee}</span>
          </div>
        )}
        
        {/* Notes */}
        {contract.notes && (
          <div className="mt-3 p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/20">
            <p className="text-xs text-zinc-400 leading-relaxed">
              {contract.notes}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Draggable contract card (used inside Reorder.Group)
function ReorderableContractCard({ 
  contract, 
  canEdit,
  onEdit
}: { 
  contract: ContractHistoryRecord;
  canEdit: boolean;
  onEdit: (contract: ContractHistoryRecord) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={contract}
      id={contract.id}
      dragListener={false}
      dragControls={dragControls}
      className="relative pl-11"
    >
      <ContractCardContent
        contract={contract}
        isReordering={true}
        canEdit={canEdit}
        onEdit={onEdit}
        dragControls={dragControls}
      />
    </Reorder.Item>
  );
}

// Static contract card (used outside Reorder.Group)
function StaticContractCard({ 
  contract, 
  canEdit,
  onEdit
}: { 
  contract: ContractHistoryRecord;
  canEdit: boolean;
  onEdit: (contract: ContractHistoryRecord) => void;
}) {
  return (
    <div className="relative pl-11">
      <ContractCardContent
        contract={contract}
        isReordering={false}
        canEdit={canEdit}
        onEdit={onEdit}
      />
    </div>
  );
}

export const ContractHistoryTimeline = ({ playerId }: ContractHistoryTimelineProps) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedItems, setReorderedItems] = useState<ContractHistoryRecord[]>([]);
  const [editingContract, setEditingContract] = useState<ContractHistoryRecord | null>(null);
  const [newContract, setNewContract] = useState({
    club_name: "",
    club_country: "",
    contract_type: "permanent",
    start_date: "",
    end_date: "",
    transfer_fee: "",
    salary_info: "",
    notes: "",
  });

  // RBAC: Check if user can edit
  const canEdit = can("players", "edit");

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ["player-contract-history", playerId, showArchived],
    queryFn: async () => {
      let query = supabase
        .from("player_contract_history")
        .select("*")
        .eq("player_id", playerId);
      
      if (!showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });

      if (error) throw error;
      
      // Sort: current first, then by sort_order, then by start_date desc
      const sorted = (data as ContractHistoryRecord[]).sort((a, b) => {
        // Current contract always first
        if (a.is_current && !b.is_current) return -1;
        if (!a.is_current && b.is_current) return 1;
        // Then by sort_order if defined
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        // Then by start_date desc
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
      
      return sorted;
    },
  });

  const handleAddContract = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!newContract.club_name || !newContract.start_date) {
      toast.error("Preencha pelo menos o nome do clube e a data de início");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("player_contract_history").insert({
        player_id: playerId,
        club_name: newContract.club_name,
        club_country: newContract.club_country || null,
        contract_type: newContract.contract_type,
        start_date: newContract.start_date,
        end_date: newContract.end_date || null,
        transfer_fee: newContract.transfer_fee || null,
        salary_info: newContract.salary_info || null,
        notes: newContract.notes || null,
        created_by: user.id,
        sort_order: (history?.length || 0) + 1,
      });

      if (error) throw error;

      toast.success("Contrato adicionado com sucesso");
      setIsAddDialogOpen(false);
      setNewContract({
        club_name: "",
        club_country: "",
        contract_type: "permanent",
        start_date: "",
        end_date: "",
        transfer_fee: "",
        salary_info: "",
        notes: "",
      });
      refetch();
    } catch (error) {
      console.error("Error adding contract:", error);
      toast.error("Erro ao adicionar contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetAsCurrent = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from("player_contract_history")
        .update({ is_current: true })
        .eq("id", contractId);

      if (error) throw error;

      toast.success("Contrato definido como atual");
      refetch();
    } catch (error) {
      console.error("Error setting current contract:", error);
      toast.error("Erro ao definir contrato como atual");
    }
  };

  const enterReorderMode = () => {
    if (history) {
      setReorderedItems([...history]);
      setIsReorderMode(true);
    }
  };

  const cancelReorder = () => {
    setIsReorderMode(false);
    setReorderedItems([]);
  };

  const saveReorder = async () => {
    setIsSubmitting(true);
    try {
      // Update sort_order for all items
      const updates = reorderedItems.map((item, index) => 
        supabase
          .from("player_contract_history")
          .update({ sort_order: index + 1 })
          .eq("id", item.id)
      );

      await Promise.all(updates);

      toast.success("Ordem salva com sucesso");
      setIsReorderMode(false);
      setReorderedItems([]);
      refetch();
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Erro ao salvar ordem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasHistory = history && history.length > 0;
  const displayItems = isReorderMode ? reorderedItems : (history || []);

  return (
    <>
      <Card className="border-zinc-800/50 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
              <History className="w-4 h-4 text-zinc-400" />
            </div>
            Histórico de Contratos
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Toggle archived */}
            <div className="flex items-center gap-2 mr-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
                className="data-[state=checked]:bg-zinc-600"
              />
              <Label htmlFor="show-archived" className="text-xs text-zinc-500 cursor-pointer">
                {showArchived ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </Label>
            </div>
            
            {/* Reorder controls */}
            {canEdit && hasHistory && !isReorderMode && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700"
                onClick={enterReorderMode}
              >
                <GripVertical className="w-3.5 h-3.5" />
                Reordenar
              </Button>
            )}
            
            {isReorderMode && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5 text-xs text-zinc-400 hover:text-zinc-300"
                  onClick={cancelReorder}
                  disabled={isSubmitting}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-1.5 text-xs"
                  onClick={saveReorder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Salvar
                </Button>
              </>
            )}
            
            {/* Add contract */}
            {canEdit && !isReorderMode && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Novo Contrato
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="club_name" className="text-xs text-zinc-400">Nome do Clube *</Label>
                        <Input
                          id="club_name"
                          placeholder="Ex: Flamengo"
                          value={newContract.club_name}
                          onChange={(e) => setNewContract({ ...newContract, club_name: e.target.value })}
                          className="h-11 bg-zinc-900/50 border-zinc-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="club_country" className="text-xs text-zinc-400">País</Label>
                        <Input
                          id="club_country"
                          placeholder="Brasil"
                          value={newContract.club_country}
                          onChange={(e) => setNewContract({ ...newContract, club_country: e.target.value })}
                          className="h-11 bg-zinc-900/50 border-zinc-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contract_type" className="text-xs text-zinc-400">Tipo</Label>
                        <Select
                          value={newContract.contract_type}
                          onValueChange={(value) => setNewContract({ ...newContract, contract_type: value })}
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
                        <Label htmlFor="start_date" className="text-xs text-zinc-400">Início *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={newContract.start_date}
                          onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                          className="h-11 bg-zinc-900/50 border-zinc-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date" className="text-xs text-zinc-400">Término</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={newContract.end_date}
                          onChange={(e) => setNewContract({ ...newContract, end_date: e.target.value })}
                          className="h-11 bg-zinc-900/50 border-zinc-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transfer_fee" className="text-xs text-zinc-400">Valor da Transferência</Label>
                        <Input
                          id="transfer_fee"
                          placeholder="€ 5M"
                          value={newContract.transfer_fee}
                          onChange={(e) => setNewContract({ ...newContract, transfer_fee: e.target.value })}
                          className="h-11 bg-zinc-900/50 border-zinc-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salary_info" className="text-xs text-zinc-400">Salário</Label>
                        <Input
                          id="salary_info"
                          placeholder="€ 50k/mês"
                          value={newContract.salary_info}
                          onChange={(e) => setNewContract({ ...newContract, salary_info: e.target.value })}
                          className="h-11 bg-zinc-900/50 border-zinc-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs text-zinc-400">Observações</Label>
                      <Textarea
                        id="notes"
                        placeholder="Notas sobre o contrato..."
                        value={newContract.notes}
                        onChange={(e) => setNewContract({ ...newContract, notes: e.target.value })}
                        className="bg-zinc-900/50 border-zinc-800 min-h-[80px]"
                      />
                    </div>

                    <Button 
                      onClick={handleAddContract} 
                      className="w-full h-11" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Contrato"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : !hasHistory ? (
            /* Empty state - institutional */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-zinc-700/20 blur-xl scale-150" />
                <div className="relative w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
                  <History className="w-5 h-5 text-zinc-600" />
                </div>
              </div>
              <p className="font-medium text-zinc-400 mb-1">Nenhum histórico disponível</p>
              <p className="text-xs text-zinc-600">Adicione contratos anteriores para construir o histórico</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line - subtle */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />
              
              {/* Timeline items with reorder support */}
              {isReorderMode ? (
                <Reorder.Group
                  axis="y"
                  values={reorderedItems}
                  onReorder={setReorderedItems}
                  className="space-y-4"
                >
                  {reorderedItems.map((contract) => (
                    <ReorderableContractCard
                      key={contract.id}
                      contract={contract}
                      canEdit={canEdit}
                      onEdit={setEditingContract}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="space-y-4">
                  {displayItems.map((contract) => (
                    <StaticContractCard
                      key={contract.id}
                      contract={contract}
                      canEdit={canEdit}
                      onEdit={setEditingContract}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <EditContractModal
        open={!!editingContract}
        onOpenChange={(open) => !open && setEditingContract(null)}
        contract={editingContract}
        playerId={playerId}
        onSuccess={refetch}
        canEdit={canEdit}
      />
    </>
  );
};
