/**
 * WhatsAppSummaryButton
 *
 * Botão que gera um resumo consolidado dos principais números do atleta
 * (com totais recalculados quando incoerentes) e oferece duas ações:
 *  - Compartilhar direto no WhatsApp (abre wa.me com o texto pré-preenchido)
 *  - Copiar para a área de transferência
 *
 * Usa `unified_player_season_stats` como fonte (LIVE > MANUAL por contexto),
 * idêntico ao restante do perfil do atleta.
 */

import { useState } from "react";
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
import { Loader2, MessageCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  fetchUnifiedPlayerStats,
  aggregateUnifiedStats,
} from "@/hooks/useUnifiedPlayerStats";
import { buildPlayerWhatsAppSummary } from "@/lib/playerWhatsAppSummary";

interface WhatsAppSummaryButtonProps {
  playerId: string;
  fullName: string;
  position?: string | null;
  age?: number | null;
  currentClub?: string | null;
  /** Variantes para o botão trigger. */
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

  const generate = async () => {
    setLoading(true);
    try {
      const rows = await fetchUnifiedPlayerStats(playerId);
      const aggregated = aggregateUnifiedStats(rows);
      const text = buildPlayerWhatsAppSummary({
        fullName,
        position,
        age,
        currentClub,
        stats: aggregated,
        positionHint: position,
      });
      setSummary(text);
    } catch (err) {
      console.error("[WhatsAppSummary] Erro ao gerar resumo", err);
      toast.error("Não foi possível gerar o resumo");
      setSummary("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !summary) {
      void generate();
    }
    if (!next) {
      setCopied(false);
    }
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
            Principais números consolidados (totais recalculados automaticamente).
            Edite livremente antes de enviar.
          </DialogDescription>
        </DialogHeader>

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
