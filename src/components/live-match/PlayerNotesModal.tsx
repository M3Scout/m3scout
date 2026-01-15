import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MatchPlayer } from "@/hooks/useLiveMatch";
import { MessageSquare, Save, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerNotesModalProps {
  matchPlayer: MatchPlayer;
  onSaveNotes: (notes: string) => Promise<void>;
  disabled?: boolean;
}

export function PlayerNotesModal({
  matchPlayer,
  onSaveNotes,
  disabled,
}: PlayerNotesModalProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(matchPlayer.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveNotes(notes);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const hasNotes = matchPlayer.notes && matchPlayer.notes.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasNotes ? "default" : "ghost"}
          size="icon"
          className={`h-8 w-8 ${hasNotes ? "bg-amber-600 hover:bg-amber-700" : ""}`}
          disabled={disabled}
          title="Notas do jogador"
        >
          <MessageSquare className="h-4 w-4" />
          {hasNotes && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border border-background" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notas: {matchPlayer.player?.full_name}
          </DialogTitle>
          <DialogDescription>
            Adicione observações sobre o desempenho do jogador neste jogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Bom posicionamento defensivo, fez 2 cortes importantes no 2ºT..."
            className="min-h-[150px] resize-none"
            autoFocus
          />
          
          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-2">Sugestões:</span>
            {[
              "Destaque positivo",
              "Precisa melhorar",
              "Lesão/dor",
              "Cansaço",
              "Boa liderança",
              "Irregular",
            ].map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-muted text-xs"
                onClick={() => setNotes((prev) => prev ? `${prev}\n• ${suggestion}` : `• ${suggestion}`)}
              >
                + {suggestion}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Notas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
