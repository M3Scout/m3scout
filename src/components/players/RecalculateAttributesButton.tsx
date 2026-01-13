import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { recalculatePlayerAllAttributes } from "@/lib/attributeScores";

interface RecalculateAttributesButtonProps {
  playerId: string;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function RecalculateAttributesButton({
  playerId,
  onSuccess,
  variant = "outline",
  size = "sm",
}: RecalculateAttributesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRecalculate = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      const result = await recalculatePlayerAllAttributes(playerId);

      if (result.success) {
        setSuccess(true);
        toast.success(`Atributos recalculados (${result.count} registros)`);
        onSuccess?.();
        
        // Reset success state after 2 seconds
        setTimeout(() => setSuccess(false), 2000);
      } else {
        toast.error(`Erro ao recalcular: ${result.error}`);
      }
    } catch (error) {
      console.error("Error recalculating attributes:", error);
      toast.error("Erro ao recalcular atributos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRecalculate}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : success ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {loading ? "Calculando..." : success ? "Atualizado!" : "Recalcular Radar"}
    </Button>
  );
}
