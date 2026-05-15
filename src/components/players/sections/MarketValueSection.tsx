import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/authContext";
import { cn, safeArray } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MarketValueSectionProps {
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
  recorded_at: string;
}

const CURRENCIES = [
  { value: "EUR", label: "€ EUR", symbol: "€" },
  { value: "USD", label: "$ USD", symbol: "$" },
  { value: "BRL", label: "R$ BRL", symbol: "R$" },
];

function formatValue(value: number | null | undefined, currency: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "";
  
  if (n >= 1000000) {
    return `${symbol}${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${symbol}${(n / 1000).toFixed(0)}K`;
  }
  return `${symbol}${n.toLocaleString()}`;
}

function getTrendIcon(trend: string | null) {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-3.5 h-3.5" />;
    case "down":
      return <TrendingDown className="w-3.5 h-3.5" />;
    default:
      return <Minus className="w-3.5 h-3.5" />;
  }
}

function getTrendLabel(trend: string | null): string {
  switch (trend) {
    case "up":
      return "Em Alta";
    case "down":
      return "Em Baixa";
    default:
      return "Estável";
  }
}

function getTrendStyles(trend: string | null): string {
  switch (trend) {
    case "up":
      return "bg-emerald-500/[0.08] text-emerald-400/90 border-emerald-500/20";
    case "down":
      return "bg-rose-500/[0.08] text-rose-400/90 border-rose-500/20";
    default:
      return "bg-zinc-800/60 text-zinc-400 border-zinc-700/40";
  }
}

export function MarketValueSection({
  playerId,
  marketValue,
  marketValueCurrency,
  marketValueTrend,
  onValueChange,
}: MarketValueSectionProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;

  const [history, setHistory] = useState<ValueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newValue, setNewValue] = useState<string>(marketValue?.toString() || "");
  const [newCurrency, setNewCurrency] = useState<string>(marketValueCurrency || "EUR");
  const [newNote, setNewNote] = useState<string>("");

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

    if (data) {
      setHistory(data);
    }
    if (error) {
      console.error("Error fetching market value history:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("update_player_market_value", {
      p_player_id: playerId,
      p_value: value,
      p_currency: newCurrency,
      p_note: newNote || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Erro ao atualizar valor de mercado", { description: error.message });
      return;
    }

    toast.success("Valor de mercado atualizado!");
    setDialogOpen(false);
    setNewNote("");
    fetchHistory();
    onValueChange?.();
  };

  const chartData = safeArray(history).map((entry) => ({
    date: new Date(entry.recorded_at).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    value: entry.value / 1000000,
    fullValue: entry.value,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900/95 border border-zinc-800/60 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{data.date}</p>
          <p className="text-lg font-bold text-white">
            {formatValue(data.fullValue, marketValueCurrency || "EUR")}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-400/80" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Valor de Mercado
          </span>
        </CardTitle>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            className="h-7 px-2 text-zinc-500 hover:text-zinc-300"
          >
            <Pencil className="w-3 h-3 mr-1" />
            <span className="text-xs">Editar</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value - Headline weight */}
        {marketValue !== null ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-bold text-white tracking-tight">
                  {formatValue(marketValue, marketValueCurrency || "EUR")}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider border backdrop-blur-sm",
                  getTrendStyles(marketValueTrend)
                )}
              >
                {getTrendIcon(marketValueTrend)}
                <span className="ml-1">{getTrendLabel(marketValueTrend)}</span>
              </Badge>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-900/60 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600 mb-3">Valor não definido</p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="border-zinc-700/50 text-zinc-400 hover:text-zinc-300"
              >
                Definir Valor
              </Button>
            )}
          </div>
        )}

        {/* Chart - Sophisticated, focus on curve */}
        {!loading && (history?.length ?? 0) >= 2 && (
          <div className="h-32 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="marketValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(240,5%,45%)" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}M`}
                  tick={{ fill: "hsl(240,5%,45%)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#marketValueGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History - More readable */}
        {!loading && (history?.length ?? 0) > 0 && (
          <div className="pt-3 border-t border-zinc-800/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
                Histórico Recente
              </p>
            </div>
            <div className="space-y-1.5">
              {[...safeArray(history)].reverse().slice(0, 3).map((entry, idx) => (
                <div 
                  key={entry.id} 
                  className={cn(
                    "flex items-center justify-between py-1.5 px-2 rounded-lg",
                    idx === 0 ? "bg-zinc-900/40" : "bg-transparent"
                  )}
                >
                  <span className="text-xs text-zinc-500">
                    {new Date(entry.recorded_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {formatValue(entry.value, entry.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">Atualizar Valor de Mercado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Valor</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="1000000"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                  className="bg-zinc-900/50 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Moeda</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {safeArray(CURRENCIES).map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Nota (opcional)</Label>
              <Textarea
                placeholder="Motivo da atualização..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="bg-zinc-900/50 border-zinc-800"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
