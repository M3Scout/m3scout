import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  Loader2,
  Calendar,
  Crown,
  Clock,
  FileText,
  Database,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";

interface MarketValueTabProps {
  playerId: string;
  marketValue: number | null;
  marketValueCurrency: string | null;
  marketValueTrend: string | null;
  onValueChange?: () => void;
}

interface ValueHistoryEntry {
  id: string;
  value: number;
  currency: string;
  note: string | null;
  source: string | null;
  recorded_at: string;
}

const CURRENCIES = [
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "BRL", label: "BRL (R$)", symbol: "R$" },
];

function formatValue(value: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "";
  
  if (value >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}K`;
  }
  return `${symbol}${value.toLocaleString()}`;
}

function formatFullValue(value: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "";
  return `${symbol}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTrendIcon(trend: string | null) {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-5 h-5" />;
    case "down":
      return <TrendingDown className="w-5 h-5" />;
    default:
      return <Minus className="w-5 h-5" />;
  }
}

function getTrendColor(trend: string | null): string {
  switch (trend) {
    case "up":
      return "text-emerald-400";
    case "down":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}

function getTrendBgColor(trend: string | null): string {
  switch (trend) {
    case "up":
      return "bg-emerald-500/10 border-emerald-500/20";
    case "down":
      return "bg-red-500/10 border-red-500/20";
    default:
      return "bg-secondary border-border";
  }
}

export function MarketValueTab({
  playerId,
  marketValue,
  marketValueCurrency,
  marketValueTrend,
  onValueChange,
}: MarketValueTabProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;

  const [history, setHistory] = useState<ValueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formValue, setFormValue] = useState<string>("");
  const [formCurrency, setFormCurrency] = useState<string>("EUR");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formNote, setFormNote] = useState<string>("");
  const [formSource, setFormSource] = useState<string>("");

  // Edit/Delete state
  const [editEntry, setEditEntry] = useState<ValueHistoryEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<ValueHistoryEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Edit form state
  const [editFormValue, setEditFormValue] = useState<string>("");
  const [editFormCurrency, setEditFormCurrency] = useState<string>("EUR");
  const [editFormDate, setEditFormDate] = useState<string>("");
  const [editFormNote, setEditFormNote] = useState<string>("");
  const [editFormSource, setEditFormSource] = useState<string>("");

  // Computed values
  const [highestValue, setHighestValue] = useState<{ value: number; currency: string; date: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [playerId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("player_market_value_history")
      .select("*")
      .eq("player_id", playerId)
      .is("deleted_at", null)
      .order("recorded_at", { ascending: true });

    if (data && data.length > 0) {
      setHistory(data);
      
      // Calculate highest value
      const highest = data.reduce((max, entry) => 
        entry.value > max.value ? entry : max, data[0]
      );
      setHighestValue({
        value: highest.value,
        currency: highest.currency,
        date: highest.recorded_at,
      });
      
      // Get last updated
      const latest = data[data.length - 1];
      setLastUpdated(latest.recorded_at);
    } else {
      setHistory([]);
      setHighestValue(null);
      setLastUpdated(null);
    }
    
    if (error) {
      console.error("Error fetching market value history:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const value = parseFloat(formValue);
    if (isNaN(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("update_player_market_value", {
      p_player_id: playerId,
      p_value: value,
      p_currency: formCurrency,
      p_note: formNote || null,
      p_source: formSource || null,
      p_recorded_at: new Date(formDate).toISOString(),
    });

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar valor de mercado", { description: error.message });
      return;
    }

    toast.success("Valor de mercado atualizado!");
    
    // Reset form
    setFormValue("");
    setFormNote("");
    setFormSource("");
    setFormDate(new Date().toISOString().split("T")[0]);
    
    // Recalculate summary
    await supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId });
    
    fetchHistory();
    onValueChange?.();
  };

  // Open edit dialog
  const handleEditClick = (entry: ValueHistoryEntry) => {
    setEditEntry(entry);
    setEditFormValue(entry.value.toString());
    setEditFormCurrency(entry.currency);
    setEditFormDate(new Date(entry.recorded_at).toISOString().split("T")[0]);
    setEditFormNote(entry.note || "");
    setEditFormSource(entry.source || "");
    setEditDialogOpen(true);
  };

  // Save edit
  const handleEditSave = async () => {
    if (!editEntry) return;

    const value = parseFloat(editFormValue);
    if (isNaN(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }

    setEditSaving(true);

    const { error } = await supabase
      .from("player_market_value_history")
      .update({
        value,
        currency: editFormCurrency,
        recorded_at: new Date(editFormDate).toISOString(),
        note: editFormNote || null,
        source: editFormSource || null,
      })
      .eq("id", editEntry.id);

    if (error) {
      toast.error("Erro ao editar entrada", { description: error.message });
      setEditSaving(false);
      return;
    }

    // Recalculate summary
    await supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId });

    toast.success("Entrada atualizada!");
    setEditDialogOpen(false);
    setEditEntry(null);
    setEditSaving(false);
    
    fetchHistory();
    onValueChange?.();
  };

  // Open delete dialog
  const handleDeleteClick = (entry: ValueHistoryEntry) => {
    setDeleteEntry(entry);
    setDeleteDialogOpen(true);
  };

  // Confirm delete (soft delete)
  const handleDeleteConfirm = async () => {
    if (!deleteEntry) return;

    setDeleteSaving(true);

    const { error } = await supabase
      .from("player_market_value_history")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteEntry.id);

    if (error) {
      toast.error("Erro ao excluir entrada", { description: error.message });
      setDeleteSaving(false);
      return;
    }

    // Recalculate summary
    await supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId });

    toast.success("Entrada excluída!");
    setDeleteDialogOpen(false);
    setDeleteEntry(null);
    setDeleteSaving(false);
    
    fetchHistory();
    onValueChange?.();
  };

  // Chart data
  const chartData = history.map((entry) => ({
    date: new Date(entry.recorded_at).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    fullDate: new Date(entry.recorded_at).toLocaleDateString("pt-BR"),
    value: entry.value / 1000000,
    rawValue: entry.value,
    currency: entry.currency,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs text-muted-foreground mb-1">{data.fullDate}</p>
          <p className="text-lg font-bold text-primary">
            {formatValue(data.rawValue, data.currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Value */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor Atual</p>
                {marketValue !== null ? (
                  <p className="text-3xl font-bold text-primary">
                    {formatValue(marketValue, marketValueCurrency || "EUR")}
                  </p>
                ) : (
                  <p className="text-xl text-muted-foreground">Não definido</p>
                )}
              </div>
              <div className={`p-2 rounded-lg border ${getTrendBgColor(marketValueTrend)}`}>
                <span className={getTrendColor(marketValueTrend)}>
                  {getTrendIcon(marketValueTrend)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Highest Value */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor Máximo</p>
                {highestValue ? (
                  <>
                    <p className="text-3xl font-bold text-amber-400">
                      {formatValue(highestValue.value, highestValue.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(highestValue.date).toLocaleDateString("pt-BR")}
                    </p>
                  </>
                ) : (
                  <p className="text-xl text-muted-foreground">—</p>
                )}
              </div>
              <div className="p-2 rounded-lg border bg-amber-500/10 border-amber-500/20">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Updated */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Última Atualização</p>
                {lastUpdated ? (
                  <p className="text-xl font-semibold">
                    {new Date(lastUpdated).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : (
                  <p className="text-xl text-muted-foreground">—</p>
                )}
              </div>
              <div className="p-2 rounded-lg border bg-secondary">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-5 h-5 text-primary" />
                Atualizar Valor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="1000000"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      required
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select value={formCurrency} onValueChange={setFormCurrency}>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data
                    </Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Fonte (opcional)
                    </Label>
                    <Input
                      placeholder="Ex: Transfermarkt, Scout"
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Nota (opcional)
                    </Label>
                    <Textarea
                      placeholder="Observações sobre a atualização..."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      rows={2}
                      className="bg-secondary/50"
                    />
                  </div>

                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Apenas administradores e scouts podem atualizar o valor.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-primary" />
                Evolução do Valor de Mercado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length >= 2 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="hsl(var(--border))" 
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorValue)"
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : chartData.length === 1 ? (
                <div className="flex items-center justify-center h-40 text-center">
                  <div>
                    <p className="text-muted-foreground mb-2">Apenas 1 registro</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatValue(chartData[0].rawValue, chartData[0].currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">{chartData[0].fullDate}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <div className="text-center">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhum histórico disponível</p>
                    <p className="text-sm">Adicione o primeiro valor de mercado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History Table */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-primary" />
              Histórico de Valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Nota</TableHead>
                    {canEdit && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...history].reverse().map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {new Date(entry.recorded_at).toLocaleDateString("pt-BR")}
                        {index === 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Atual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {formatFullValue(entry.value, entry.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.currency}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.source || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {entry.note || "—"}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(entry)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(entry)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
            <DialogDescription>
              Atualize os dados desta entrada do histórico de valor de mercado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editFormValue}
                onChange={(e) => setEditFormValue(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={editFormCurrency} onValueChange={setEditFormCurrency}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={editFormDate}
                onChange={(e) => setEditFormDate(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Fonte (opcional)</Label>
              <Input
                placeholder="Ex: Transfermarkt, Scout"
                value={editFormSource}
                onChange={(e) => setEditFormSource(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                placeholder="Observações..."
                value={editFormNote}
                onChange={(e) => setEditFormNote(e.target.value)}
                rows={2}
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir a entrada de valor de mercado de{" "}
              <span className="font-semibold text-foreground">
                {deleteEntry && formatFullValue(deleteEntry.value, deleteEntry.currency)}
              </span>{" "}
              do dia{" "}
              <span className="font-semibold text-foreground">
                {deleteEntry && new Date(deleteEntry.recorded_at).toLocaleDateString("pt-BR")}
              </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}