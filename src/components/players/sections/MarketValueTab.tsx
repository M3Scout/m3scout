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
  Coins,
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
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

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

function formatValue(value: number | null | undefined, currency: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "";
  
  if (n >= 1000000) {
    return `${symbol}${(n / 1000000).toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `${symbol}${(n / 1000).toFixed(0)}K`;
  }
  return `${symbol}${n.toLocaleString()}`;
}

function formatFullValue(value: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "";
  return `${symbol}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTrendInfo(trend: string | null) {
  switch (trend) {
    case "up":
      return {
        icon: TrendingUp,
        color: "text-emerald-400/90",
        bg: "bg-emerald-500/[0.08] border-emerald-500/20",
        label: "Em alta",
      };
    case "down":
      return {
        icon: TrendingDown,
        color: "text-rose-400/90",
        bg: "bg-rose-500/[0.08] border-rose-500/20",
        label: "Em baixa",
      };
    default:
      return {
        icon: Minus,
        color: "text-zinc-500",
        bg: "bg-zinc-800/40 border-zinc-700/40",
        label: "Estável",
      };
  }
}

// Premium Summary Card Component
const SummaryCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon: React.ElementType;
  variant?: "primary" | "gold" | "default";
}) => {
  const variantStyles = {
    primary: {
      card: "from-primary/[0.08] via-zinc-900/80 to-zinc-950/90 border-primary/15",
      glow: "via-primary/40",
      icon: "bg-primary/10 text-primary",
    },
    gold: {
      card: "from-amber-500/[0.08] via-zinc-900/80 to-zinc-950/90 border-amber-500/15",
      glow: "via-amber-400/40",
      icon: "bg-amber-500/10 text-amber-400/90",
    },
    default: {
      card: "from-zinc-900/80 to-zinc-950/90 border-zinc-800/40",
      glow: "via-zinc-700/30",
      icon: "bg-zinc-800/60 text-zinc-500",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn(
      "relative overflow-hidden border backdrop-blur-sm",
      "bg-gradient-to-br",
      "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]",
      "transition-all duration-200 hover:border-white/[0.08]",
      styles.card
    )}>
      {/* Top glow line */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px",
        "bg-gradient-to-r from-transparent to-transparent",
        styles.glow
      )} />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-2">
              {label}
            </p>
            <div className="text-3xl font-bold text-white leading-none tracking-tight">
              {value}
            </div>
            {subValue && (
              <div className="mt-2 text-xs text-zinc-600">
                {subValue}
              </div>
            )}
          </div>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            styles.icon
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Premium Tooltip
const PremiumTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-900/95 border border-zinc-800/60 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        <p className="text-3xl font-bold text-primary mb-1">
          {formatValue(data.rawValue, data.currency)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
          {data.fullDate}
        </p>
      </div>
    );
  }
  return null;
};

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

    if (Array.isArray(data) && data.length > 0) {
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
      const lastIndex = data.length > 0 ? data.length - 1 : 0;
      const latest = data[lastIndex];
      setLastUpdated(latest?.recorded_at ?? null);
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

  const trendInfo = getTrendInfo(marketValueTrend);
  const TrendIcon = trendInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Value - Primary Focus */}
        <SummaryCard
          label="Valor Atual"
          value={
            marketValue !== null ? (
              <span className="text-primary">
                {formatValue(marketValue, marketValueCurrency || "EUR")}
              </span>
            ) : (
              <span className="text-zinc-600">Não definido</span>
            )
          }
          subValue={
            marketValue !== null && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-medium border backdrop-blur-sm px-2 py-0.5",
                  trendInfo.bg,
                  trendInfo.color
                )}
              >
                <TrendIcon className="w-3 h-3 mr-1" />
                {trendInfo.label}
              </Badge>
            )
          }
          icon={Coins}
          variant="primary"
        />

        {/* Highest Value */}
        <SummaryCard
          label="Valor Máximo"
          value={
            highestValue ? (
              <span className="text-amber-400/90">
                {formatValue(highestValue.value, highestValue.currency)}
              </span>
            ) : (
              <span className="text-zinc-600">—</span>
            )
          }
          subValue={
            highestValue && (
              <span className="text-zinc-600">
                {new Date(highestValue.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )
          }
          icon={Crown}
          variant="gold"
        />

        {/* Last Updated */}
        <SummaryCard
          label="Última Atualização"
          value={
            lastUpdated ? (
              <span className="text-xl text-zinc-300">
                {new Date(lastUpdated).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            ) : (
              <span className="text-zinc-600">—</span>
            )
          }
          icon={Clock}
          variant="default"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Premium Form */}
        <div className="lg:col-span-1">
          <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Atualizar Valor
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Value Input - Premium Style */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Valor
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="1.000.000"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      required
                      className="h-12 text-lg font-bold bg-zinc-900/50 border-zinc-800/60 focus:border-primary/40 placeholder:text-zinc-700"
                    />
                  </div>

                  {/* Currency Select */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Moeda
                    </Label>
                    <Select value={formCurrency} onValueChange={setFormCurrency}>
                      <SelectTrigger className="h-11 bg-zinc-900/50 border-zinc-800/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      Data
                    </Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="h-11 bg-zinc-900/50 border-zinc-800/60"
                    />
                  </div>

                  {/* Source Input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Database className="w-3 h-3" />
                      Fonte <span className="text-zinc-700">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="Ex: Transfermarkt, Scout"
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="h-11 bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700"
                    />
                  </div>

                  {/* Note Input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Nota <span className="text-zinc-700">(opcional)</span>
                    </Label>
                    <Textarea
                      placeholder="Observações sobre a atualização..."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      rows={2}
                      className="bg-zinc-900/50 border-zinc-800/60 placeholder:text-zinc-700 resize-none"
                    />
                  </div>

                  {/* Premium Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={saving} 
                    className={cn(
                      "w-full h-12 font-semibold",
                      "bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90",
                      "border border-primary/20",
                      "shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.4)]",
                      "transition-all duration-200"
                    )}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Atualização
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-900/60 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-zinc-700" />
                  </div>
                  <p className="text-sm text-zinc-600">
                    Apenas administradores e scouts podem atualizar o valor.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Premium Chart */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400/80" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Evolução do Valor de Mercado
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(chartData?.length ?? 0) >= 2 ? (
                <div className="h-64 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="marketValueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      
                      <XAxis
                        dataKey="date"
                        stroke="transparent"
                        tick={{ fontSize: 9, fill: "hsl(240,5%,40%)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="transparent"
                        tick={{ fontSize: 9, fill: "hsl(240,5%,40%)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}M`}
                      />
                      
                      <Tooltip content={<PremiumTooltip />} />
                      
                      {/* Subtle reference lines */}
                      {chartData.length > 0 && (
                        <ReferenceLine 
                          y={chartData[chartData.length - 1].value} 
                          stroke="hsl(var(--primary))" 
                          strokeDasharray="6 4" 
                          strokeWidth={1}
                          opacity={0.4}
                        />
                      )}
                      
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        fill="url(#marketValueGradient)"
                        dot={(props: any) => {
                          const { cx, cy, index } = props;
                          const isLast = index === chartData.length - 1;
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={isLast ? 6 : 4} 
                              fill={isLast ? "hsl(var(--primary))" : "hsl(var(--background))"}
                              stroke="hsl(var(--primary))"
                              strokeWidth={isLast ? 0 : 2}
                            />
                          );
                        }}
                        activeDot={{ 
                          r: 7, 
                          fill: "hsl(var(--primary))", 
                          stroke: "hsl(var(--background))", 
                          strokeWidth: 3 
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (chartData?.length ?? 0) === 1 ? (
                /* Single entry - Timeline start state */
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="relative mb-4">
                    {/* Timeline visual */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-primary/5 border border-primary/10" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/10 border border-primary/20" />
                    <div className="relative z-10 w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <Coins className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-primary mb-1">
                    {formatValue(chartData[0].rawValue, chartData[0].currency)}
                  </p>
                  <p className="text-xs text-zinc-600 mb-4">{chartData[0].fullDate}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 max-w-[200px]">
                    Início da linha do tempo. Adicione mais registros para visualizar a evolução.
                  </p>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-14 h-14 rounded-xl bg-zinc-900/60 flex items-center justify-center mb-4">
                    <DollarSign className="w-7 h-7 text-zinc-700" />
                  </div>
                  <p className="text-sm text-zinc-500 mb-1">Nenhum histórico disponível</p>
                  <p className="text-xs text-zinc-700">
                    Adicione o primeiro valor de mercado para iniciar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Premium History Table */}
      {(history?.length ?? 0) > 0 && (
        <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                <FileText className="w-4 h-4 text-zinc-500" />
              </div>
              <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Histórico de Valores
              </span>
              <Badge variant="outline" className="ml-auto text-[10px] bg-zinc-900/60 border-zinc-800/50 text-zinc-500">
                {history.length} registro{history.length > 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: Card layout (no horizontal scroll) */}
            <div className="sm:hidden space-y-3">
              {[...history].reverse().map((entry, index) => {
                const isLatest = index === 0;
                return (
                  <div 
                    key={entry.id}
                    className={cn(
                      "rounded-xl border border-zinc-800/40 p-4 transition-all duration-150",
                      isLatest ? "bg-primary/[0.03] border-primary/20" : "bg-zinc-900/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        {/* Date + Current badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-zinc-300 font-medium">
                            {new Date(entry.recorded_at).toLocaleDateString("pt-BR")}
                          </span>
                          {isLatest && (
                            <Badge 
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                            >
                              Atual
                            </Badge>
                          )}
                        </div>
                        
                        {/* Value - prominent */}
                        <div className={cn(
                          "font-bold tabular-nums text-xl",
                          isLatest ? "text-primary" : "text-zinc-200"
                        )}>
                          {formatFullValue(entry.value, entry.currency)}
                        </div>
                        
                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Moeda</span>
                            <div className="mt-0.5">
                              <Badge variant="outline" className="text-[10px] bg-zinc-900/60 border-zinc-800/50 text-zinc-500">
                                {entry.currency}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Fonte</span>
                            <div className="mt-0.5 text-zinc-400">
                              {entry.source || "—"}
                            </div>
                          </div>
                          {entry.note && (
                            <div className="col-span-2">
                              <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Nota</span>
                              <div className="mt-0.5 text-zinc-400 break-words">
                                {entry.note}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem 
                              onClick={() => handleEditClick(entry)}
                              className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(entry)}
                              className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden sm:block">
              <div className="border border-zinc-800/40 rounded-xl overflow-hidden bg-zinc-900/30">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-800/40 bg-zinc-900/50">
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500">Data</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500">Valor</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500">Moeda</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500">Fonte</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500">Nota</TableHead>
                      {canEdit && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...history].reverse().map((entry, index) => {
                      const isLatest = index === 0;
                      return (
                        <TableRow 
                          key={entry.id}
                          className={cn(
                            "transition-all duration-150",
                            "hover:bg-zinc-800/30",
                            index % 2 === 0 ? "bg-transparent" : "bg-zinc-900/20",
                            "border-b border-zinc-800/20",
                            isLatest && "bg-primary/[0.03]"
                          )}
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-300 font-medium">
                                {new Date(entry.recorded_at).toLocaleDateString("pt-BR")}
                              </span>
                              {isLatest && (
                                <Badge 
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5",
                                    "bg-primary/10 text-primary border-primary/20"
                                  )}
                                >
                                  Atual
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={cn(
                            "py-4 font-bold tabular-nums",
                            isLatest ? "text-primary text-lg" : "text-zinc-200"
                          )}>
                            {formatFullValue(entry.value, entry.currency)}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge 
                              variant="outline" 
                              className="text-[10px] bg-zinc-900/60 border-zinc-800/50 text-zinc-500"
                            >
                              {entry.currency}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-sm text-zinc-600">
                            {entry.source || "—"}
                          </TableCell>
                          <TableCell className="py-4 text-sm text-zinc-600 max-w-xs truncate">
                            {entry.note || "—"}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                  <DropdownMenuItem 
                                    onClick={() => handleEditClick(entry)}
                                    className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(entry)}
                                    className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog - Premium Style */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">Editar Entrada</DialogTitle>
            <DialogDescription className="text-zinc-600">
              Atualize os dados desta entrada do histórico de valor de mercado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Valor</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editFormValue}
                onChange={(e) => setEditFormValue(e.target.value)}
                className="h-11 bg-zinc-900/50 border-zinc-800/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Moeda</Label>
              <Select value={editFormCurrency} onValueChange={setEditFormCurrency}>
                <SelectTrigger className="h-11 bg-zinc-900/50 border-zinc-800/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Data</Label>
              <Input
                type="date"
                value={editFormDate}
                onChange={(e) => setEditFormDate(e.target.value)}
                className="h-11 bg-zinc-900/50 border-zinc-800/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Fonte (opcional)</Label>
              <Input
                placeholder="Ex: Transfermarkt, Scout"
                value={editFormSource}
                onChange={(e) => setEditFormSource(e.target.value)}
                className="h-11 bg-zinc-900/50 border-zinc-800/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Nota (opcional)</Label>
              <Textarea
                placeholder="Observações..."
                value={editFormNote}
                onChange={(e) => setEditFormNote(e.target.value)}
                rows={2}
                className="bg-zinc-900/50 border-zinc-800/60 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              className="border-zinc-800 hover:bg-zinc-800/50"
            >
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
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-200">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              Esta ação irá excluir a entrada de valor de mercado de{" "}
              <span className="font-semibold text-zinc-300">
                {deleteEntry && formatFullValue(deleteEntry.value, deleteEntry.currency)}
              </span>{" "}
              do dia{" "}
              <span className="font-semibold text-zinc-300">
                {deleteEntry && new Date(deleteEntry.recorded_at).toLocaleDateString("pt-BR")}
              </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-800 hover:bg-zinc-800/50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSaving}
              className="bg-rose-600 text-white hover:bg-rose-700"
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
