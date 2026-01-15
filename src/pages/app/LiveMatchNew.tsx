import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Radio, ArrowRight, MapPin, Clock, Trophy, Calendar } from "lucide-react";

export default function LiveMatchNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const currentYear = new Date().getFullYear();
  const [seasonYear, setSeasonYear] = useState(currentYear);
  const [competitionId, setCompetitionId] = useState<string>("");
  const [opponentName, setOpponentName] = useState("");
  const [venue, setVenue] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [notes, setNotes] = useState("");

  // Fetch active competitions
  const { data: competitions, isLoading: loadingCompetitions } = useQuery({
    queryKey: ["competitions-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name, display_name, type, tier")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Create match mutation
  const createMatch = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!competitionId) throw new Error("Selecione uma competição");
      if (!opponentName.trim()) throw new Error("Informe o adversário");

      const { data, error } = await supabase
        .from("matches")
        .insert({
          created_by: user.id,
          competition_id: competitionId,
          season_year: seasonYear,
          opponent_name: opponentName.trim(),
          venue: venue.trim() || null,
          duration_minutes: durationMinutes,
          notes: notes.trim() || null,
          status: "live",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Jogo criado! Modo ao vivo ativado.");
      navigate(`/app/live-match/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar jogo");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMatch.mutate();
  };

  const seasonOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Radio className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Novo Jogo Ao Vivo</h1>
          <p className="text-muted-foreground">
            Configure o jogo e comece a registrar estatísticas em tempo real
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Informações do Jogo
          </CardTitle>
          <CardDescription>
            Preencha os dados obrigatórios para iniciar o registro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="season" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Temporada *
                </Label>
                <Select
                  value={seasonYear.toString()}
                  onValueChange={(v) => setSeasonYear(parseInt(v))}
                >
                  <SelectTrigger id="season">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seasonOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competition" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Competição *
                </Label>
                <Select
                  value={competitionId}
                  onValueChange={setCompetitionId}
                  disabled={loadingCompetitions}
                >
                  <SelectTrigger id="competition">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions?.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.display_name || comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opponent">Adversário *</Label>
              <Input
                id="opponent"
                placeholder="Nome do time adversário"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                required
              />
            </div>

            {/* Optional fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Local
                </Label>
                <Input
                  id="venue"
                  placeholder="Estádio / Campo"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duração (min)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={150}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 90)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Notas sobre o jogo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={createMatch.isPending || !competitionId || !opponentName.trim()}
            >
              {createMatch.isPending ? (
                "Criando..."
              ) : (
                <>
                  Criar e Iniciar Jogo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
