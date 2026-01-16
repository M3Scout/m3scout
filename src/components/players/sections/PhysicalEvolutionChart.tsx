import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, Calendar, Loader2, List, Trash2 } from "lucide-react";
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

export const PhysicalEvolutionChart = ({ playerId, currentData }: PhysicalEvolutionChartProps) => {
  const { user, isAdmin, isScout } = useAuth();
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["weight", "body_fat_percentage"]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<PhysicalHistoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newRecord, setNewRecord] = useState({
    recorded_at: format(new Date(), "yyyy-MM-dd"),
    weight: "",
    body_fat_percentage: "",
    muscle_mass: "",
    max_speed: "",
    sprint_30m: "",
    vo2_max: "",
    notes: "",
  });

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
      setNewRecord({
        recorded_at: format(new Date(), "yyyy-MM-dd"),
        weight: "",
        body_fat_percentage: "",
        muscle_mass: "",
        max_speed: "",
        sprint_30m: "",
        vo2_max: "",
        notes: "",
      });
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

  // Prepare chart data
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteRecord(record)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
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
    </>
  );
};