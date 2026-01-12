import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { safeArray } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Mail, 
  Phone, 
  Building2, 
  Search, 
  Eye, 
  Trash2,
  MessageSquare,
  ChevronRight,
  Loader2
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { AdminSkeletonTable } from "@/components/admin/AdminSkeleton";

type Lead = Tables<"leads">;

const statusOptions = [
  { value: "new", label: "Novo", className: "admin-badge-primary" },
  { value: "contacted", label: "Contatado", className: "admin-badge-warning" },
  { value: "qualified", label: "Qualificado", className: "admin-badge-success" },
  { value: "rejected", label: "Rejeitado", className: "admin-badge-default" },
];

const getStatusBadge = (status: string | null) => {
  const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
  return (
    <span className={statusConfig.className}>
      {statusConfig.label}
    </span>
  );
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar leads");
      console.error(error);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    }
    setIsUpdating(false);
  };

  const updateLeadNotes = async () => {
    if (!selectedLead) return;
    
    setIsUpdating(true);
    const { error } = await supabase
      .from("leads")
      .update({ notes })
      .eq("id", selectedLead.id);

    if (error) {
      toast.error("Erro ao salvar notas");
    } else {
      toast.success("Notas salvas");
      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, notes } : l));
      setSelectedLead({ ...selectedLead, notes });
    }
    setIsUpdating(false);
  };

  const deleteLead = async (leadId: string) => {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao excluir lead");
    } else {
      toast.success("Lead excluído");
      setLeads(leads.filter(l => l.id !== leadId));
      setIsViewOpen(false);
    }
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || "");
    setIsViewOpen(true);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.organization?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    qualified: leads.filter(l => l.status === "qualified").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="admin-header animate-fade-in">
        <div>
          <h1 className="admin-title">Leads</h1>
          <p className="admin-subtitle">Contatos recebidos pelo formulário público</p>
        </div>
      </header>

      {/* Stats - Condensed */}
      <div className="admin-card p-5 animate-fade-in delay-75">
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-white tabular-nums">{stats.total}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-primary tabular-nums">{stats.new}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Novos</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-amber-400 tabular-nums">{stats.contacted}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Contatados</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-emerald-400 tabular-nums">{stats.qualified}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Qualificados</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 animate-fade-in delay-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Buscar por nome, email, assunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-input pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="admin-input w-full md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {safeArray(statusOptions).map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      {loading ? (
        <AdminSkeletonTable rows={8} />
      ) : filteredLeads.length === 0 ? (
        <div className="admin-card animate-fade-in delay-150">
          <div className="admin-empty py-16">
            <MessageSquare className="admin-empty-icon" />
            <p className="admin-empty-title">Nenhum lead encontrado</p>
            <p className="admin-empty-desc">
              {searchTerm || statusFilter !== "all" 
                ? "Tente ajustar os filtros de busca" 
                : "Leads aparecerão aqui quando recebidos"}
            </p>
          </div>
        </div>
      ) : (
        <div className="admin-card overflow-hidden animate-fade-in delay-150">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Assunto</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {safeArray(filteredLeads).map((lead) => (
                <tr key={lead.id} onClick={() => openLeadDetails(lead)} className="cursor-pointer">
                  <td>{getStatusBadge(lead.status)}</td>
                  <td className="admin-table-cell-primary">{lead.name}</td>
                  <td className="admin-table-cell-muted">{lead.email}</td>
                  <td className="admin-table-cell-muted max-w-[200px] truncate">{lead.subject}</td>
                  <td className="admin-table-cell-muted tabular-nums">
                    {format(new Date(lead.created_at), "dd MMM", { locale: ptBR })}
                  </td>
                  <td className="text-right">
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Lead</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Visualize e gerencie as informações do contato
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Nome</p>
                  <p className="text-sm text-white font-medium">{selectedLead.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Email</p>
                  <a 
                    href={`mailto:${selectedLead.email}`} 
                    className="text-sm text-primary hover:underline flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {selectedLead.email}
                  </a>
                </div>
                {selectedLead.phone && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Telefone</p>
                    <a 
                      href={`tel:${selectedLead.phone}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {selectedLead.phone}
                    </a>
                  </div>
                )}
                {selectedLead.organization && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Organização</p>
                    <p className="text-sm text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      {selectedLead.organization}
                    </p>
                  </div>
                )}
              </div>

              {/* Subject & Message */}
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Assunto</p>
                <p className="text-sm text-white font-medium">{selectedLead.subject}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Mensagem</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap rounded-lg bg-zinc-800/50 p-3 border border-zinc-800">
                  {selectedLead.message}
                </p>
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</p>
                <Select
                  value={selectedLead.status || "new"}
                  onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="admin-input w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Notas Internas</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione notas sobre este lead..."
                  rows={3}
                  className="admin-input resize-none"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={updateLeadNotes}
                  disabled={isUpdating || notes === (selectedLead.notes || "")}
                  className="admin-btn-outline text-xs"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Salvar Notas
                </Button>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLead(selectedLead.id)}
                  className="text-xs"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Excluir
                </Button>
                <p className="text-[10px] text-zinc-600">
                  {format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}