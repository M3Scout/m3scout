import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, Calendar, Loader2, List, Trash2, Pencil, FileDown } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/authContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { parseDateSafe, formatDateShortBR, formatDateForDB } from "@/lib/dateUtils";

interface PhysicalHistoryRecord {
  id: string;
  recorded_at: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
  notes: string | null;
}

interface PhysicalEvolutionChartProps {
  playerId: string;
  playerName?: string;
  currentData?: {
    weight?: number | null;
    body_fat_percentage?: number | null;
    muscle_mass?: number | null;
    max_speed?: number | null;
    sprint_30m?: number | null;
    vo2_max?: number | null;
  };
}

const METRIC_CONFIG = {
  weight: { label: "Peso (kg)", color: "hsl(217, 91%, 60%)", unit: "kg" },
  body_fat_percentage: { label: "% Gordura", color: "hsl(0, 84%, 60%)", unit: "%" },
  muscle_mass: { label: "Massa Muscular (kg)", color: "hsl(142, 76%, 36%)", unit: "kg" },
  max_speed: { label: "Vel. Máx (km/h)", color: "hsl(45, 93%, 47%)", unit: "km/h" },
  sprint_30m: { label: "Sprint 30m (s)", color: "hsl(280, 65%, 60%)", unit: "s" },
  vo2_max: { label: "VO2 Máx", color: "hsl(180, 70%, 45%)", unit: "ml/kg/min" },
};

type MetricKey = keyof typeof METRIC_CONFIG;

export const PhysicalEvolutionChart = ({ playerId, playerName = "Atleta", currentData }: PhysicalEvolutionChartProps) => {
  const queryClient = useQueryClient();
  const { user, isAdmin, isScout } = useAuth();
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["weight", "body_fat_percentage"]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<PhysicalHistoryRecord | null>(null);
  const [editRecord, setEditRecord] = useState<PhysicalHistoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const emptyFormState = {
    recorded_at: format(new Date(), "yyyy-MM-dd"),
    weight: "",
    body_fat_percentage: "",
    muscle_mass: "",
    max_speed: "",
    sprint_30m: "",
    vo2_max: "",
    notes: "",
  };
  
  const [newRecord, setNewRecord] = useState(emptyFormState);
  const [editFormData, setEditFormData] = useState(emptyFormState);

  const canEdit = isAdmin || isScout;

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ["player-physical-history", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_physical_history")
        .select("*")
        .eq("player_id", playerId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return data as PhysicalHistoryRecord[];
    },
  });

  const toggleMetric = (metric: MetricKey) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), metric];
      }
      return [...prev, metric];
    });
  };

  const handleAddRecord = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para adicionar registros");
      return;
    }

    setIsSubmitting(true);
    try {
      const recordData = {
        player_id: playerId,
        recorded_at: newRecord.recorded_at,
        weight: newRecord.weight ? parseFloat(newRecord.weight) : null,
        body_fat_percentage: newRecord.body_fat_percentage ? parseFloat(newRecord.body_fat_percentage) : null,
        muscle_mass: newRecord.muscle_mass ? parseFloat(newRecord.muscle_mass) : null,
        max_speed: newRecord.max_speed ? parseFloat(newRecord.max_speed) : null,
        sprint_30m: newRecord.sprint_30m ? parseFloat(newRecord.sprint_30m) : null,
        vo2_max: newRecord.vo2_max ? parseFloat(newRecord.vo2_max) : null,
        notes: newRecord.notes || null,
        created_by: user.id,
      };

      const { error } = await supabase.from("player_physical_history").insert(recordData);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um registro para esta data");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Registro adicionado com sucesso");
      setIsAddDialogOpen(false);
      setNewRecord(emptyFormState);
      refetch();
      // Invalidate latest-physical-evaluation so PhysicalDataSection cards update
      queryClient.invalidateQueries({ queryKey: ["latest-physical-evaluation", playerId] });
    } catch (error) {
      console.error("Error adding physical record:", error);
      toast.error("Erro ao adicionar registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteRecord || !user) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("player_physical_history")
        .delete()
        .eq("id", deleteRecord.id);

      if (error) throw error;

      toast.success("Avaliação excluída com sucesso");
      setDeleteRecord(null);
      refetch();
      // Invalidate latest-physical-evaluation so PhysicalDataSection cards update
      queryClient.invalidateQueries({ queryKey: ["latest-physical-evaluation", playerId] });
    } catch (error) {
      console.error("Error deleting physical record:", error);
      toast.error("Erro ao excluir avaliação");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit dialog with record data
  const handleOpenEdit = (record: PhysicalHistoryRecord) => {
    setEditRecord(record);
    setEditFormData({
      recorded_at: record.recorded_at,
      weight: record.weight?.toString() || "",
      body_fat_percentage: record.body_fat_percentage?.toString() || "",
      muscle_mass: record.muscle_mass?.toString() || "",
      max_speed: record.max_speed?.toString() || "",
      sprint_30m: record.sprint_30m?.toString() || "",
      vo2_max: record.vo2_max?.toString() || "",
      notes: record.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle edit submission
  const handleEditRecord = async () => {
    if (!editRecord || !user) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        recorded_at: editFormData.recorded_at,
        weight: editFormData.weight ? parseFloat(editFormData.weight) : null,
        body_fat_percentage: editFormData.body_fat_percentage ? parseFloat(editFormData.body_fat_percentage) : null,
        muscle_mass: editFormData.muscle_mass ? parseFloat(editFormData.muscle_mass) : null,
        max_speed: editFormData.max_speed ? parseFloat(editFormData.max_speed) : null,
        sprint_30m: editFormData.sprint_30m ? parseFloat(editFormData.sprint_30m) : null,
        vo2_max: editFormData.vo2_max ? parseFloat(editFormData.vo2_max) : null,
        notes: editFormData.notes || null,
      };

      const { error } = await supabase
        .from("player_physical_history")
        .update(updateData)
        .eq("id", editRecord.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um registro para esta data");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Avaliação atualizada com sucesso");
      setIsEditDialogOpen(false);
      setEditRecord(null);
      refetch();
      // Invalidate latest-physical-evaluation so PhysicalDataSection cards update
      queryClient.invalidateQueries({ queryKey: ["latest-physical-evaluation", playerId] });
    } catch (error) {
      console.error("Error updating physical record:", error);
      toast.error("Erro ao atualizar avaliação");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format record summary for display
  const formatRecordSummary = (record: PhysicalHistoryRecord) => {
    const metrics: string[] = [];
    if (record.weight) metrics.push(`${record.weight}kg`);
    if (record.body_fat_percentage) metrics.push(`${record.body_fat_percentage}% gordura`);
    if (record.muscle_mass) metrics.push(`${record.muscle_mass}kg massa`);
    if (record.vo2_max) metrics.push(`VO2: ${record.vo2_max}`);
    if (record.max_speed) metrics.push(`${record.max_speed}km/h`);
    if (record.sprint_30m) metrics.push(`30m: ${record.sprint_30m}s`);
    return metrics.length > 0 ? metrics.join(" • ") : "Sem dados registrados";
  };

  // Export physical history to PDF
  const handleExportPDF = () => {
    if (!history || history.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Avaliações Físicas", margin, yPos);
      yPos += 10;

      // Player name
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(playerName, margin, yPos);
      yPos += 8;

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPos);
      doc.setTextColor(0);
      yPos += 15;

      // Summary
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo", margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de avaliações: ${history.length}`, margin, yPos);
      yPos += 5;
      
      if (history.length > 0) {
        // Use timezone-safe date formatting
        const firstDate = formatDateShortBR(history[0].recorded_at);
        const lastDate = formatDateShortBR(history[history.length - 1].recorded_at);
        doc.text(`Período: ${firstDate} a ${lastDate}`, margin, yPos);
      }
      yPos += 15;

      // Table header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, 8, "F");
      
      const colWidths = [28, 22, 22, 28, 25, 22, 23];
      const headers = ["Data", "Peso", "% Gord.", "Massa Musc.", "Vel. Máx", "Sprint", "VO2"];
      let xPos = margin;
      
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, yPos);
        xPos += colWidths[i];
      });
      yPos += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Use timezone-safe sorting
      const sortedHistory = [...history].sort((a, b) => 
        parseDateSafe(b.recorded_at).getTime() - parseDateSafe(a.recorded_at).getTime()
      );

      sortedHistory.forEach((record, index) => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 4, pageWidth - margin * 2, 7, "F");
        }

        xPos = margin;
        // Use timezone-safe date formatting
        const rowData = [
          formatDateShortBR(record.recorded_at),
          record.weight ? `${record.weight} kg` : "-",
          record.body_fat_percentage ? `${record.body_fat_percentage}%` : "-",
          record.muscle_mass ? `${record.muscle_mass} kg` : "-",
          record.max_speed ? `${record.max_speed} km/h` : "-",
          record.sprint_30m ? `${record.sprint_30m}s` : "-",
          record.vo2_max ? `${record.vo2_max}` : "-",
        ];

        rowData.forEach((data, i) => {
          doc.text(data, xPos + 2, yPos);
          xPos += colWidths[i];
        });

        // Add notes if present
        if (record.notes) {
          yPos += 5;
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`Obs: ${record.notes}`, margin + 2, yPos, { maxWidth: pageWidth - margin * 2 - 4 });
          doc.setTextColor(0);
          doc.setFontSize(9);
        }

        yPos += 7;
      });

      // Evolution summary (if more than 1 record)
      if (history.length >= 2) {
        yPos += 10;
        
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Evolução", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const first = history[0];
        const last = history[history.length - 1];

        const metrics = [
          { key: "weight", label: "Peso", unit: "kg" },
          { key: "body_fat_percentage", label: "% Gordura", unit: "%" },
          { key: "muscle_mass", label: "Massa Muscular", unit: "kg" },
          { key: "vo2_max", label: "VO2 Máx", unit: "ml/kg/min" },
        ];

        metrics.forEach(({ key, label, unit }) => {
          const firstVal = first[key as keyof PhysicalHistoryRecord] as number | null;
          const lastVal = last[key as keyof PhysicalHistoryRecord] as number | null;
          
          if (firstVal !== null && lastVal !== null) {
            const diff = lastVal - firstVal;
            const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
            doc.text(`${label}: ${firstVal} → ${lastVal} ${unit} (${diffStr})`, margin, yPos);
            yPos += 5;
          }
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("M3 Scouting - Relatório Médico/Físico", margin, doc.internal.pageSize.getHeight() - 10);

      // Save
      const fileName = `avaliacao-fisica-${playerName.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF exportado com sucesso");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  // Use timezone-safe date parsing for chart display
  const chartData = (history || []).map((record) => ({
    date: format(parseDateSafe(record.recorded_at), "dd/MM/yy"),
    fullDate: record.recorded_at,
    weight: record.weight,
    body_fat_percentage: record.body_fat_percentage,
    muscle_mass: record.muscle_mass,
    max_speed: record.max_speed,
    sprint_30m: record.sprint_30m,
    vo2_max: record.vo2_max,
  }));

  // Add current data as latest point if exists and different from last record
  if (currentData && chartData.length > 0) {
    const lastRecord = chartData[chartData.length - 1];
    const hasNewData = Object.keys(METRIC_CONFIG).some((key) => {
      const currentValue = currentData[key as MetricKey];
      const lastValue = lastRecord[key as MetricKey];
      return currentValue !== undefined && currentValue !== null && currentValue !== lastValue;
    });

    if (hasNewData) {
      chartData.push({
        date: "Atual",
        fullDate: format(new Date(), "yyyy-MM-dd"),
        weight: currentData.weight ?? null,
        body_fat_percentage: currentData.body_fat_percentage ?? null,
        muscle_mass: currentData.muscle_mass ?? null,
        max_speed: currentData.max_speed ?? null,
        sprint_30m: currentData.sprint_30m ?? null,
        vo2_max: currentData.vo2_max ?? null,
      });
    }
  }

  const hasData = chartData.length > 0;
  const historyReversed = [...(history || [])].reverse(); // Most recent first for list

  return (
    <>
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-cyan-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Evolução Física
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* History Button - Discrete */}
            {history && history.length > 0 && (
              <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400"
                  >
                    <List className="w-3 h-3" />
                    Histórico
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-zinc-200">
                      <List className="w-5 h-5 text-cyan-400/80" />
                      Histórico de Avaliações
                    </DialogTitle>
                    <DialogDescription className="text-zinc-600">
                      {history.length} {history.length === 1 ? "avaliação registrada" : "avaliações registradas"}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-2">
                      {historyReversed.map((record, idx) => (
                        <div
                          key={record.id}
                          className={cn(
                            "flex items-start justify-between gap-3 p-3 rounded-xl border transition-colors",
                            "border-zinc-800/40 hover:border-zinc-700/50",
                            idx % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-300">
                              {format(new Date(record.recorded_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-zinc-600 mt-0.5 truncate">
                              {formatRecordSummary(record)}
                            </p>
                            {record.notes && (
                              <p className="text-xs text-zinc-700 mt-1 italic">
                                "{record.notes}"
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-600 hover:text-primary hover:bg-primary/10"
                                onClick={() => handleOpenEdit(record)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10"
                                onClick={() => setDeleteRecord(record)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {/* Export PDF Button */}
                  <div className="pt-4 border-t border-zinc-800/50">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-zinc-800 hover:bg-zinc-800/50" 
                      onClick={handleExportPDF}
                    >
                      <FileDown className="w-4 h-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Add Button - Discrete */}
            {canEdit && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 border border-zinc-800/50 hover:border-zinc-700/60"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-zinc-200">
                      <Calendar className="w-5 h-5 text-cyan-400/80" />
                      Nova Avaliação Física
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="recorded_at" className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Data da Avaliação
                      </Label>
                      <Input
                        id="recorded_at"
                        type="date"
                        value={newRecord.recorded_at}
                        onChange={(e) => setNewRecord({ ...newRecord, recorded_at: e.target.value })}
                        className="h-11 bg-zinc-900/50 border-zinc-800/60"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="weight" className="text-[10px] uppercase tracking-wider text-zinc-500">Peso (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          placeholder="75.5"
                          value={newRecord.weight}
                          onChange={(e) => setNewRecord({ ...newRecord, weight: e.target.value })}
                          className="h-10 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="body_fat" className="text-[10px] uppercase tracking-wider text-zinc-500">% Gordura</Label>
                        <Input
                          id="body_fat"
                          type="number"
                          step="0.1"
                          placeholder="12.5"
                          value={newRecord.body_fat_percentage}
                          onChange={(e) => setNewRecord({ ...newRecord, body_fat_percentage: e.target.value })}
                          className="h-10 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="muscle_mass" className="text-[10px] uppercase tracking-wider text-zinc-500">Massa Musc. (kg)</Label>
                        <Input
                          id="muscle_mass"
                          type="number"
                          step="0.1"
                          placeholder="38.0"
                          value={newRecord.muscle_mass}
                          onChange={(e) => setNewRecord({ ...newRecord, muscle_mass: e.target.value })}
                          className="h-10 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_speed" className="text-[10px] uppercase tracking-wider text-zinc-500">Vel. Máx (km/h)</Label>
                        <Input
                          id="max_speed"
                          type="number"
                          step="0.1"
                          placeholder="32.5"
                          value={newRecord.max_speed}
                          onChange={(e) => setNewRecord({ ...newRecord, max_speed: e.target.value })}
                          className="h-10 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sprint_30m" className="text-[10px] uppercase tracking-wider text-zinc-500">Sprint 30m (s)</Label>
                        <Input
                          id="sprint_30m"
                          type="number"
                          step="0.01"
                          placeholder="4.25"
                          value={newRecord.sprint_30m}
                          onChange={(e) => setNewRecord({ ...newRecord, sprint_30m: e.target.value })}
                          className="h-10 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vo2_max" className="text-[10px] uppercase tracking-wider text-zinc-500">VO2 Máx</Label>
                        <Input
                          id="vo2_max"
                          type="number"
                          step="0.1"
                          placeholder="55.0"
                          value={newRecord.vo2_max}
                          onChange={(e) => setNewRecord({ ...newRecord, vo2_max: e.target.value })}
                          className="h-10 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-[10px] uppercase tracking-wider text-zinc-500">Observações</Label>
                      <Textarea
                        id="notes"
                        placeholder="Notas sobre a avaliação..."
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                        className="bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700 resize-none"
                      />
                    </div>

                    <Button onClick={handleAddRecord} className="w-full h-11" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Avaliação"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Premium Metric Selector - Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(METRIC_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => toggleMetric(key as MetricKey)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider rounded-full border transition-all duration-150",
                  selectedMetrics.includes(key as MetricKey)
                    ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_-3px_hsl(var(--primary)/0.4)]"
                    : "border-zinc-800/50 bg-zinc-900/30 text-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-400"
                )}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : !hasData ? (
            /* Premium Empty State */
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <div className="relative mb-4">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-cyan-500/5 border border-cyan-500/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/15" />
                <div className="relative z-10 w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-zinc-800/50">
                  <TrendingUp className="w-5 h-5 text-zinc-600" />
                </div>
              </div>
              <p className="text-sm text-zinc-500 mb-1">Nenhuma avaliação registrada</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-700 max-w-[200px]">
                Adicione avaliações físicas para visualizar a evolução do atleta
              </p>
            </div>
          ) : (() => {
            // Determine which selected metrics actually have at least one numeric data point
            const metricsWithData = selectedMetrics.filter((metric) =>
              chartData.some((d) => d[metric] !== null && d[metric] !== undefined && !Number.isNaN(d[metric] as number))
            );
            const metricsWithoutData = selectedMetrics.filter((m) => !metricsWithData.includes(m));

            return (
              <>
                <div className="h-[250px] w-full -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="hsl(240,5%,20%)"
                        strokeOpacity={0.4}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(240,5%,40%)", fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      {/* One independent (hidden) YAxis per metric so kg/% /s don't crush each other */}
                      {metricsWithData.map((metric, idx) => (
                        <YAxis
                          key={metric}
                          yAxisId={metric}
                          orientation={idx === 0 ? "left" : "right"}
                          hide={idx > 0}
                          domain={["auto", "auto"]}
                          tick={{ fill: "hsl(240,5%,40%)", fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          width={35}
                        />
                      ))}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(240,6%,10%)",
                          border: "1px solid hsl(240,5%,20%)",
                          borderRadius: 12,
                          fontSize: 12,
                          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                        }}
                        labelStyle={{ color: "hsl(240,5%,70%)", marginBottom: 4 }}
                        labelFormatter={(label) => `Data: ${label}`}
                        formatter={(value: number, name: string) => {
                          const config = METRIC_CONFIG[name as MetricKey];
                          return [
                            <span key={name} className="font-bold">{value?.toFixed(1)} {config?.unit || ""}</span>,
                            config?.label || name,
                          ];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
                        formatter={(value) => (
                          <span style={{ color: METRIC_CONFIG[value as MetricKey]?.color }}>
                            {METRIC_CONFIG[value as MetricKey]?.label || value}
                          </span>
                        )}
                      />
                      {metricsWithData.map((metric) => (
                        <Line
                          key={metric}
                          yAxisId={metric}
                          type="monotone"
                          dataKey={metric}
                          name={metric}
                          stroke={METRIC_CONFIG[metric].color}
                          strokeWidth={2.5}
                          dot={{ fill: METRIC_CONFIG[metric].color, strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 6, strokeWidth: 0, fill: METRIC_CONFIG[metric].color }}
                          connectNulls
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {metricsWithoutData.length > 0 && (
                  <p className="text-[10px] text-zinc-600 text-center mt-2">
                    Sem dados para: {metricsWithoutData.map((m) => METRIC_CONFIG[m].label).join(", ")}
                  </p>
                )}
              </>
            );
          })()}

          {/* History count - Discrete footer */}
          {history && history.length > 0 && (
            <p className="text-[10px] text-zinc-700 text-center mt-3 uppercase tracking-wider">
              {history.length} {history.length === 1 ? "avaliação" : "avaliações"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Avaliação Física</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir a avaliação de{" "}
                <span className="font-medium text-foreground">
                  {deleteRecord && format(new Date(deleteRecord.recorded_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                ?
              </p>
              <p className="text-destructive font-medium">
                Esta ação não poderá ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false);
          setEditRecord(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Avaliação Física
            </DialogTitle>
            <DialogDescription>
              {editRecord && format(new Date(editRecord.recorded_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit_recorded_at">Data da Avaliação</Label>
              <Input
                id="edit_recorded_at"
                type="date"
                value={editFormData.recorded_at}
                onChange={(e) => setEditFormData({ ...editFormData, recorded_at: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_weight">Peso (kg)</Label>
                <Input
                  id="edit_weight"
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={editFormData.weight}
                  onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_body_fat">% Gordura</Label>
                <Input
                  id="edit_body_fat"
                  type="number"
                  step="0.1"
                  placeholder="12.5"
                  value={editFormData.body_fat_percentage}
                  onChange={(e) => setEditFormData({ ...editFormData, body_fat_percentage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_muscle_mass">Massa Muscular (kg)</Label>
                <Input
                  id="edit_muscle_mass"
                  type="number"
                  step="0.1"
                  placeholder="38.0"
                  value={editFormData.muscle_mass}
                  onChange={(e) => setEditFormData({ ...editFormData, muscle_mass: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_max_speed">Vel. Máx (km/h)</Label>
                <Input
                  id="edit_max_speed"
                  type="number"
                  step="0.1"
                  placeholder="32.5"
                  value={editFormData.max_speed}
                  onChange={(e) => setEditFormData({ ...editFormData, max_speed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_sprint_30m">Sprint 30m (s)</Label>
                <Input
                  id="edit_sprint_30m"
                  type="number"
                  step="0.01"
                  placeholder="4.25"
                  value={editFormData.sprint_30m}
                  onChange={(e) => setEditFormData({ ...editFormData, sprint_30m: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_vo2_max">VO2 Máx</Label>
                <Input
                  id="edit_vo2_max"
                  type="number"
                  step="0.1"
                  placeholder="55.0"
                  value={editFormData.vo2_max}
                  onChange={(e) => setEditFormData({ ...editFormData, vo2_max: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Observações</Label>
              <Textarea
                id="edit_notes"
                placeholder="Notas sobre a avaliação..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditRecord(null);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleEditRecord} className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};