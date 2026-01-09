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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  Loader2,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

function formatValue(value: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "";
  
  if (value >= 1000000) {
    return `${symbol} ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${symbol} ${(value / 1000).toFixed(0)}K`;
  }
  return `${symbol} ${value.toLocaleString()}`;
}

function getTrendIcon(trend: string | null) {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case "down":
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
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

function getTrendColor(trend: string | null): string {
  switch (trend) {
    case "up":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "down":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-secondary text-muted-foreground";
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

  const chartData = history.map((entry) => ({
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
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.date}</p>
          <p className="text-sm text-primary">
            {formatValue(data.fullValue, marketValueCurrency || "EUR")}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="w-5 h-5 text-primary" />
          Valor de Mercado
        </CardTitle>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value */}
        {marketValue !== null ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">
                {formatValue(marketValue, marketValueCurrency || "EUR")}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getTrendColor(marketValueTrend)}>
                  {getTrendIcon(marketValueTrend)}
                  <span className="ml-1">{getTrendLabel(marketValueTrend)}</span>
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <DollarSign className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Valor não definido</p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Definir Valor
              </Button>
            )}
          </div>
        )}

        {/* Chart */}
        {!loading && history.length >= 2 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History Table */}
        {!loading && history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <History className="w-3 h-3" />
              Histórico de Alterações
            </p>
            <div className="max-h-40 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs">Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...history].reverse().slice(0, 5).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs py-2">
                        {new Date(entry.recorded_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs py-2 font-medium">
                        {formatValue(entry.value, entry.currency)}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">
                        {entry.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Valor de Mercado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="1000000"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                placeholder="Motivo da atualização..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
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
