import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Plus, 
  Building2, 
  Calendar, 
  ArrowRightLeft,
  Loader2,
  DollarSign,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ContractHistoryRecord {
  id: string;
  club_name: string;
  club_country: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  transfer_fee: string | null;
  salary_info: string | null;
  notes: string | null;
}

interface ContractHistoryTimelineProps {
  playerId: string;
}

const CONTRACT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  permanent: { label: "Definitivo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: Building2 },
  loan: { label: "Empréstimo", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: ArrowRightLeft },
  youth: { label: "Base/Formação", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: GraduationCap },
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

export const ContractHistoryTimeline = ({ playerId }: ContractHistoryTimelineProps) => {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ["player-contract-history", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_contract_history")
        .select("*")
        .eq("player_id", playerId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as ContractHistoryRecord[];
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

  const hasHistory = history && history.length > 0;

  return (
    <Card className="border-border/30 bg-secondary/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4 text-primary" />
          Histórico de Contratos
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Novo Contrato
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="club_name">Nome do Clube *</Label>
                  <Input
                    id="club_name"
                    placeholder="Ex: Flamengo"
                    value={newContract.club_name}
                    onChange={(e) => setNewContract({ ...newContract, club_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club_country">País</Label>
                  <Input
                    id="club_country"
                    placeholder="Brasil"
                    value={newContract.club_country}
                    onChange={(e) => setNewContract({ ...newContract, club_country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Tipo</Label>
                  <Select
                    value={newContract.contract_type}
                    onValueChange={(value) => setNewContract({ ...newContract, contract_type: value })}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="start_date">Início *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newContract.start_date}
                    onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Término</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newContract.end_date}
                    onChange={(e) => setNewContract({ ...newContract, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer_fee">Valor da Transferência</Label>
                  <Input
                    id="transfer_fee"
                    placeholder="€ 5M"
                    value={newContract.transfer_fee}
                    onChange={(e) => setNewContract({ ...newContract, transfer_fee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary_info">Salário</Label>
                  <Input
                    id="salary_info"
                    placeholder="€ 50k/mês"
                    value={newContract.salary_info}
                    onChange={(e) => setNewContract({ ...newContract, salary_info: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas sobre o contrato..."
                  value={newContract.notes}
                  onChange={(e) => setNewContract({ ...newContract, notes: e.target.value })}
                />
              </div>

              <Button onClick={handleAddContract} className="w-full" disabled={isSubmitting}>
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasHistory ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <History className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum histórico disponível</p>
            <p className="text-xs mt-1">Adicione contratos anteriores</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/50" />
            
            {/* Timeline items */}
            <div className="space-y-4">
              {history.map((contract, index) => {
                const typeConfig = CONTRACT_TYPE_CONFIG[contract.contract_type] || CONTRACT_TYPE_CONFIG.permanent;
                const TypeIcon = typeConfig.icon;
                const isFirst = index === 0;
                
                return (
                  <div key={contract.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={cn(
                      "absolute left-2 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      isFirst ? "bg-primary border-primary" : "bg-secondary border-border"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isFirst ? "bg-white" : "bg-muted-foreground"
                      )} />
                    </div>
                    
                    {/* Contract card */}
                    <div className={cn(
                      "p-3 rounded-lg border",
                      isFirst ? "bg-secondary/60 border-primary/30" : "bg-secondary/30 border-border/30"
                    )}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">{contract.club_name}</span>
                          {contract.club_country && (
                            <span className="text-xs text-muted-foreground">({contract.club_country})</span>
                          )}
                        </div>
                        <Badge variant="outline" className={cn("text-[10px]", typeConfig.color)}>
                          {typeConfig.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDate(contract.start_date)} — {contract.end_date ? formatDate(contract.end_date) : "Atual"}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50">
                          {calculateDuration(contract.start_date, contract.end_date)}
                        </span>
                      </div>
                      
                      {(contract.transfer_fee || contract.salary_info) && (
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {contract.transfer_fee && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="w-3 h-3" />
                              <span>{contract.transfer_fee}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {contract.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {contract.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
