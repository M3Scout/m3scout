import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCompetitionSelect } from "@/components/ui/searchable-competition-select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Target,
  Brain,
  Zap,
  Heart,
  TrendingUp,
  Sparkles,
  Activity
} from "lucide-react";
import { safeArray } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CategoryScoreInput } from "@/components/scouting/CategoryScoreInput";
import { ScoreBreakdownDisplay } from "@/components/scouting/ScoreBreakdownDisplay";
import { useScoreCalculation } from "@/hooks/useScoreCalculation";
import { CATEGORY_WEIGHTS } from "@/lib/scoring";

// Form validation schema
const reportSchema = z.object({
  playerId: z.string().min(1, "Selecione um atleta"),
  competitionId: z.string().min(1, "Selecione uma competição"),
  matchDate: z.string().min(1, "Informe a data da partida"),
  opponent: z.string().optional(),
  matchNotes: z.string().optional(),
  summary: z.string().optional(),
  recommendation: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface Player {
  id: string;
  full_name: string;
  position: string;
}

interface Competition {
  id: string;
  name: string;
  country: string;
  final_coefficient: number;
  has_phases: boolean;
  visibility_score: number | null;
}

interface CompetitionPhase {
  id: string;
  competition_id: string;
  phase_name: string;
  phase_order: number;
  phase_weight: number;
}

const NewScoutingReport = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionPhases, setCompetitionPhases] = useState<CompetitionPhase[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<CompetitionPhase | null>(null);
  const [categoryNotes, setCategoryNotes] = useState({
    technical: "",
    tactical: "",
    physical: "",
    mental: "",
    impact: "",
  });

  // Apply phase weight if selected, otherwise use final_coefficient
  const effectiveCoefficient = selectedPhase 
    ? (selectedCompetition?.final_coefficient || 1.0) * selectedPhase.phase_weight 
    : selectedCompetition?.final_coefficient || 1.0;

  const {
    scores,
    updateScore,
    potentialBonus,
    setPotentialBonus,
    consistencyModifier,
    setConsistencyModifier,
    breakdown,
  } = useScoreCalculation({
    competitionCoefficient: effectiveCoefficient,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      matchDate: new Date().toISOString().split("T")[0],
    },
  });

  // Fetch players and competitions
  useEffect(() => {
    const fetchData = async () => {
      const [playersRes, competitionsRes, phasesRes] = await Promise.all([
        supabase.from("players").select("id, full_name, position").order("full_name"),
        supabase.from("competitions")
          .select("id, name, country, final_coefficient, has_phases, visibility_score")
          .eq("is_active", true)
          .gt("visibility_score", 0) // Only visible competitions
          .order("visibility_score", { ascending: false })
          .order("name"),
        supabase.from("competition_phases").select("*").order("phase_order"),
      ]);

      if (playersRes.data) setPlayers(playersRes.data);
      if (competitionsRes.data) setCompetitions(competitionsRes.data);
      if (phasesRes.data) setCompetitionPhases(phasesRes.data);
    };

    fetchData();
  }, []);

  const handleCompetitionChange = (competitionId: string) => {
    setValue("competitionId", competitionId);
    const competition = competitions.find((c) => c.id === competitionId);
    setSelectedCompetition(competition || null);
    setSelectedPhase(null); // Reset phase when competition changes
  };

  const handlePhaseChange = (phaseId: string) => {
    const phase = competitionPhases.find((p) => p.id === phaseId);
    setSelectedPhase(phase || null);
  };

  // Get available phases for selected competition (only if has_phases = true)
  const availablePhases = selectedCompetition?.has_phases 
    ? competitionPhases.filter(p => p.competition_id === selectedCompetition.id)
    : [];

  const onSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Você precisa estar logado para criar um relatório");
        return;
      }

      const reportData = {
        player_id: data.playerId,
        competition_id: data.competitionId,
        scout_id: user.user.id,
        match_date: data.matchDate,
        opponent: data.opponent || null,
        match_notes: data.matchNotes || null,
        phase_id: selectedPhase?.id || null,
        
        technical_score: scores.technical,
        tactical_score: scores.tactical,
        physical_score: scores.physical,
        mental_score: scores.mental,
        impact_score: scores.impact,
        
        technical_notes: categoryNotes.technical || null,
        tactical_notes: categoryNotes.tactical || null,
        physical_notes: categoryNotes.physical || null,
        mental_notes: categoryNotes.mental || null,
        impact_notes: categoryNotes.impact || null,
        
        base_score: breakdown.baseScore,
        competition_coefficient: effectiveCoefficient,
        adjusted_score: breakdown.adjustedScore,
        potential_bonus: potentialBonus,
        consistency_modifier: consistencyModifier,
        final_score: breakdown.finalScore,
        rating: breakdown.rating,
        
        summary: data.summary || null,
        recommendation: data.recommendation || null,
      };

      const { error } = await supabase.from("scouting_reports").insert(reportData);

      if (error) throw error;

      toast.success("Relatório criado com sucesso!");
      navigate("/app/reports");
    } catch (error: any) {
      console.error("Error creating report:", error);
      toast.error(error.message || "Erro ao criar relatório");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryConfig = [
    {
      key: "technical" as const,
      label: "Técnico",
      description: "Controle, passes, finalização, dribles",
      icon: <Target className="w-5 h-5" />,
    },
    {
      key: "tactical" as const,
      label: "Tático",
      description: "Posicionamento, leitura de jogo, decisões",
      icon: <Brain className="w-5 h-5" />,
    },
    {
      key: "physical" as const,
      label: "Físico",
      description: "Velocidade, força, resistência, agilidade",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      key: "mental" as const,
      label: "Mental",
      description: "Concentração, liderança, resiliência",
      icon: <Heart className="w-5 h-5" />,
    },
    {
      key: "impact" as const,
      label: "Impacto / Produção",
      description: "Participações decisivas, gols, assistências",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/app/reports"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para relatórios
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">Novo Relatório de Scouting</h1>
        <p className="text-muted-foreground">
          Preencha as informações e avalie o atleta em cada categoria
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Match Info */}
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Informações da Partida</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="playerId">Atleta *</Label>
              <Select onValueChange={(v) => setValue("playerId", v)}>
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Selecione o atleta" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.full_name} ({player.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.playerId && (
                <p className="text-sm text-destructive">{errors.playerId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitionId">Competição *</Label>
              <SearchableCompetitionSelect
                competitions={competitions}
                value=""
                onValueChange={handleCompetitionChange}
                placeholder="Selecione a competição"
                triggerClassName="input-dark"
              />
              {errors.competitionId && (
                <p className="text-sm text-destructive">{errors.competitionId.message}</p>
              )}
              {selectedCompetition && (
                <p className="text-xs text-primary">
                  Coeficiente final: ×{selectedCompetition.final_coefficient.toFixed(2)}
                  {selectedPhase && ` × ${selectedPhase.phase_weight.toFixed(2)} (${selectedPhase.phase_name}) = ×${effectiveCoefficient.toFixed(2)}`}
                </p>
              )}
            </div>

            {/* Phase Selector - Only shown for competitions with phases */}
            {availablePhases.length > 0 && (
              <div className="space-y-2">
                <Label>Fase da Competição</Label>
                <Select onValueChange={handlePhaseChange}>
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Selecione a fase (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePhases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.phase_name} (×{phase.phase_weight.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Fases posteriores têm maior peso na avaliação
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="matchDate">Data da Partida *</Label>
              <Input
                id="matchDate"
                type="date"
                {...register("matchDate")}
                className="input-dark"
              />
              {errors.matchDate && (
                <p className="text-sm text-destructive">{errors.matchDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="opponent">Adversário</Label>
              <Input
                id="opponent"
                placeholder="Nome do adversário"
                {...register("opponent")}
                className="input-dark"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchNotes">Observações da Partida</Label>
            <Textarea
              id="matchNotes"
              placeholder="Contexto, condições, destaques do jogo..."
              {...register("matchNotes")}
              className="input-dark min-h-[80px]"
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Category Scores */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">Avaliação por Categoria</h2>
            
            {categoryConfig.map((cat) => (
              <CategoryScoreInput
                key={cat.key}
                category={cat.key}
                label={cat.label}
                description={cat.description}
                icon={cat.icon}
                value={scores[cat.key]}
                onChange={(v) => updateScore(cat.key, v)}
                notes={categoryNotes[cat.key]}
                onNotesChange={(n) => setCategoryNotes((prev) => ({ ...prev, [cat.key]: n }))}
                weight={CATEGORY_WEIGHTS[cat.key]}
              />
            ))}

            {/* Modifiers */}
            <div className="glass-card p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Modificadores
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Bônus de Potencial</Label>
                    <span className="text-lg font-bold text-accent">+{potentialBonus}</span>
                  </div>
                  <Slider
                    value={[potentialBonus]}
                    onValueChange={([v]) => setPotentialBonus(v)}
                    min={0}
                    max={8}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adicione pontos para atletas com alto potencial de evolução (0-8)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Modificador de Consistência</Label>
                    <span className={`text-lg font-bold ${consistencyModifier >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {consistencyModifier >= 0 ? '+' : ''}{consistencyModifier}
                    </span>
                  </div>
                  <Slider
                    value={[consistencyModifier + 5]}
                    onValueChange={([v]) => setConsistencyModifier(v - 5)}
                    min={0}
                    max={10}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Baseado nos últimos 5 relatórios (-5 a +5)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown - Sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ScoreBreakdownDisplay breakdown={breakdown} />
            </div>
          </div>
        </div>

        {/* Summary & Recommendation */}
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Conclusões</h2>

          <div className="space-y-2">
            <Label htmlFor="summary">Resumo do Relatório</Label>
            <Textarea
              id="summary"
              placeholder="Síntese da avaliação, pontos fortes e fracos..."
              {...register("summary")}
              className="input-dark min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendation">Recomendação</Label>
            <Textarea
              id="recommendation"
              placeholder="Sugestão de próximos passos, posição ideal, nível de clubes..."
              {...register("recommendation")}
              className="input-dark min-h-[100px]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link to="/app/reports">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Relatório
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewScoutingReport;
