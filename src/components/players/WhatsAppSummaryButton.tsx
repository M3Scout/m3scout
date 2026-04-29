/**
 * WhatsAppSummaryButton
 *
 * Botão que gera um resumo consolidado dos principais números do atleta com
 * seletor de janela (carreira, temporada X, últimos 3 meses, últimos 5 jogos,
 * última partida). Os totais são recalculados quando incoerentes.
 *
 * Fontes:
 *  - Carreira / Temporada YYYY → `unified_player_season_stats` (LIVE > MANUAL).
 *  - Últimos 3 meses / N jogos / última partida → `match_player_stats` (LIVE only,
 *    pois MANUAL não tem granularidade por jogo).
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageCircle, Copy, Check, Info } from "lucide-react";
import { toast } from "sonner";
import {
  fetchUnifiedPlayerStats,
  aggregateUnifiedStats,
  getAvailableYears,
} from "@/hooks/useUnifiedPlayerStats";
import { buildPlayerWhatsAppSummary } from "@/lib/playerWhatsAppSummary";
import {
  buildDefaultWindowOptions,
  fetchLiveAggregateForWindow,
  type SummaryWindowOption,
} from "@/lib/playerSummaryWindow";
import { loadSummary, loadYears } from "@/lib/playerSummaryCache";

interface WhatsAppSummaryButtonProps {
  playerId: string;
  fullName: string;
  position?: string | null;
  age?: number | null;
  currentClub?: string | null;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function WhatsAppSummaryButton({
  playerId,
  fullName,
  position,
  age,
  currentClub,
  variant = "outline",
  size = "sm",
  className,
}: WhatsAppSummaryButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [windowOptions, setWindowOptions] = useState<SummaryWindowOption[]>(() =>
    buildDefaultWindowOptions([]),
  );
  const [selectedWindowId, setSelectedWindowId] = useState<string>("career");
  const [emptyForWindow, setEmptyForWindow] = useState(false);

  const selectedWindow = useMemo(
    () => windowOptions.find((o) => o.id === selectedWindowId) ?? windowOptions[0],
    [windowOptions, selectedWindowId],
  );

  // Carrega anos disponíveis (cache por playerId) para popular o select.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const years = await loadYears(playerId, async () => {
          const rows = await fetchUnifiedPlayerStats(playerId);
          return getAvailableYears(rows);
        });
        if (!cancelled) setWindowOptions(buildDefaultWindowOptions(years));
      } catch (err) {
        console.error("[WhatsAppSummary] anos disponíveis", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, playerId]);

  // Gera/regenera o resumo quando a janela muda. Usa cache por (playerId, windowId)
  // com TTL curto + dedupe de promises in-flight.
  useEffect(() => {
    if (!open || !selectedWindow) return;
    let cancelled = false;
    setLoading(true);
    setEmptyForWindow(false);
    (async () => {
      try {
        const { stats: aggregated, matchesCount } = await loadSummary(
          playerId,
          selectedWindow.id,
          async () => {
            const w = selectedWindow.value;
            if (w.kind === "career") {
              const rows = await fetchUnifiedPlayerStats(playerId);
              const agg = aggregateUnifiedStats(rows);
              return { stats: agg, matchesCount: agg?.matches ?? 0 };
            }
            if (w.kind === "season") {
              const rows = await fetchUnifiedPlayerStats(playerId, w.year);
              const agg = aggregateUnifiedStats(rows);
              return { stats: agg, matchesCount: agg?.matches ?? 0 };
            }
            return fetchLiveAggregateForWindow(playerId, w);
          },
        );

        if (cancelled) return;

        if (!aggregated || matchesCount === 0) {
          setEmptyForWindow(true);
        }

        const text = buildPlayerWhatsAppSummary({
          fullName,
          position,
          age,
          currentClub,
          stats: aggregated,
          positionHint: position,
          windowLabel: selectedWindow.shortLabel,
        });
        setSummary(text);
      } catch (err) {
        console.error("[WhatsAppSummary] erro ao gerar", err);
        toast.error("Não foi possível gerar o resumo");
        setSummary("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedWindow, playerId, fullName, position, age, currentClub]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Resumo copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          aria-label="Gerar resumo para WhatsApp"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Resumo WhatsApp
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resumo para WhatsApp</DialogTitle>
          <DialogDescription>
            Escolha a janela. Totais são recalculados automaticamente quando
            incoerentes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Janela</Label>
          <Select
            value={selectedWindowId}
            onValueChange={setSelectedWindowId}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma janela..." />
            </SelectTrigger>
            <SelectContent>
              {windowOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedWindow &&
            (selectedWindow.value.kind === "last3m" ||
              selectedWindow.value.kind === "lastN" ||
              selectedWindow.value.kind === "lastMatch") && (
              <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                Janelas por jogo usam apenas dados do scout ao vivo.
              </p>
            )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Gerando resumo...
          </div>
        ) : (
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={16}
            className="font-mono text-xs leading-relaxed"
            aria-label="Texto do resumo"
          />
        )}

        {emptyForWindow && !loading && (
          <p className="text-xs text-amber-600">
            Nenhum dado encontrado para esta janela.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={loading || !summary}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={loading || !summary}
            className="bg-[#25D366] hover:bg-[#1da851] text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
