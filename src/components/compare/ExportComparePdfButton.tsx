import { useState, useRef } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportToPdf } from "@/lib/pdfExport";
import { ComparePdfTemplate } from "./ComparePdfTemplate";

interface PlayerData {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
  height?: number | null;
}

interface AggregatedStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots?: number;
  shots_on_target?: number;
  key_passes?: number;
  chances_created?: number;
  duels_won?: number;
  total_duels?: number;
  accurate_passes?: number;
  total_passes?: number;
  successful_dribbles?: number;
  total_dribbles?: number;
}

interface PlayerWithStats extends PlayerData {
  aggregatedStats: AggregatedStats | null;
}

interface ExportComparePdfButtonProps {
  players: PlayerWithStats[];
  disabled?: boolean;
}

export function ExportComparePdfButton({ players, disabled }: ExportComparePdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const templateRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!templateRef.current || players.length < 2) return;

    setIsExporting(true);
    setProgress(0);

    try {
      const playerNames = players
        .map((p) => p.full_name.split(" ")[0])
        .join("-vs-")
        .toLowerCase()
        .replace(/\s+/g, "-");
      
      const filename = `comparacao-${playerNames}-${new Date().toISOString().split("T")[0]}.pdf`;

      await exportToPdf(templateRef.current, {
        filename,
        onProgress: setProgress,
        outputResolution: 2,
      });

      toast.success("PDF exportado com sucesso!");
      setShowPreview(false);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  if (players.length < 2) {
    return null;
  }

  return (
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || players.length < 2}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Preview do Relatório de Comparação
          </DialogTitle>
        </DialogHeader>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-zinc-950 rounded-lg p-4">
          <div 
            className="mx-auto shadow-2xl"
            style={{ 
              transform: "scale(0.6)", 
              transformOrigin: "top center",
              width: "794px",
            }}
          >
            <ComparePdfTemplate ref={templateRef} players={players} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            {players.length} atletas • Relatório A4
          </p>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowPreview(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportando... {progress}%
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
