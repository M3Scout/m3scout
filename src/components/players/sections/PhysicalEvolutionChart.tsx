import { useQuery } from "@tanstack/react-query";
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
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";

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
        const firstDate = format(new Date(history[0].recorded_at), "dd/MM/yyyy");
        const lastDate = format(new Date(history[history.length - 1].recorded_at), "dd/MM/yyyy");
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

      const sortedHistory = [...history].sort((a, b) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
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
        const rowData = [
          format(new Date(record.recorded_at), "dd/MM/yyyy"),
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

  const chartData = (history || []).map((record) => ({
    date: format(new Date(record.recorded_at), "dd/MM/yy"),
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução Física
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* History Button */}
            {history && history.length > 0 && (
              <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <List className="w-3 h-3" />
                    Histórico
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <List className="w-5 h-5" />
                      Histórico de Avaliações
                    </DialogTitle>
                    <DialogDescription>
                      {history.length} {history.length === 1 ? "avaliação registrada" : "avaliações registradas"}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-2">
                      {historyReversed.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {format(new Date(record.recorded_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {formatRecordSummary(record)}
                            </p>
                            {record.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                "{record.notes}"
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => handleOpenEdit(record)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                  <div className="pt-4 border-t border-border/50">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={handleExportPDF}
                    >
                      <FileDown className="w-4 h-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Add Button */}
            {canEdit && (
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
                      <Calendar className="w-5 h-5" />
                      Nova Avaliação Física
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="recorded_at">Data da Avaliação</Label>
                      <Input
                        id="recorded_at"
                        type="date"
                        value={newRecord.recorded_at}
                        onChange={(e) => setNewRecord({ ...newRecord, recorded_at: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="weight">Peso (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          placeholder="75.5"
                          value={newRecord.weight}
                          onChange={(e) => setNewRecord({ ...newRecord, weight: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="body_fat">% Gordura</Label>
                        <Input
                          id="body_fat"
                          type="number"
                          step="0.1"
                          placeholder="12.5"
                          value={newRecord.body_fat_percentage}
                          onChange={(e) => setNewRecord({ ...newRecord, body_fat_percentage: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="muscle_mass">Massa Muscular (kg)</Label>
                        <Input
                          id="muscle_mass"
                          type="number"
                          step="0.1"
                          placeholder="38.0"
                          value={newRecord.muscle_mass}
                          onChange={(e) => setNewRecord({ ...newRecord, muscle_mass: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_speed">Vel. Máx (km/h)</Label>
                        <Input
                          id="max_speed"
                          type="number"
                          step="0.1"
                          placeholder="32.5"
                          value={newRecord.max_speed}
                          onChange={(e) => setNewRecord({ ...newRecord, max_speed: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sprint_30m">Sprint 30m (s)</Label>
                        <Input
                          id="sprint_30m"
                          type="number"
                          step="0.01"
                          placeholder="4.25"
                          value={newRecord.sprint_30m}
                          onChange={(e) => setNewRecord({ ...newRecord, sprint_30m: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vo2_max">VO2 Máx</Label>
                        <Input
                          id="vo2_max"
                          type="number"
                          step="0.1"
                          placeholder="55.0"
                          value={newRecord.vo2_max}
                          onChange={(e) => setNewRecord({ ...newRecord, vo2_max: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        placeholder="Notas sobre a avaliação..."
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                      />
                    </div>

                    <Button onClick={handleAddRecord} className="w-full" disabled={isSubmitting}>
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
          {/* Metric selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(METRIC_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => toggleMetric(key as MetricKey)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  selectedMetrics.includes(key as MetricKey)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
              <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma avaliação registrada</p>
              <p className="text-xs mt-1">Adicione avaliações físicas para ver a evolução</p>
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(label) => `Data: ${label}`}
                    formatter={(value: number, name: string) => {
                      const config = METRIC_CONFIG[name as MetricKey];
                      return [`${value?.toFixed(1)} ${config?.unit || ""}`, config?.label || name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    formatter={(value) => METRIC_CONFIG[value as MetricKey]?.label || value}
                  />
                  {selectedMetrics.map((metric) => (
                    <Line
                      key={metric}
                      type="monotone"
                      dataKey={metric}
                      stroke={METRIC_CONFIG[metric].color}
                      strokeWidth={2}
                      dot={{ fill: METRIC_CONFIG[metric].color, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* History count */}
          {history && history.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {history.length} {history.length === 1 ? "avaliação registrada" : "avaliações registradas"}
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