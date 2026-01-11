import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl, safeArray } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Flag,
  MapPin,
  Play,
  Eye,
  EyeOff,
  Loader2,
  Activity,
  Target,
  Stethoscope,
  FileText as ContractIcon,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { PhysicalDataSection } from "@/components/players/sections/PhysicalDataSection";
import { TechnicalProfileSection } from "@/components/players/sections/TechnicalProfileSection";
import { InjuryHistorySection } from "@/components/players/sections/InjuryHistorySection";
import { ContractSection } from "@/components/players/sections/ContractSection";
import { InternalEvaluationSection } from "@/components/players/sections/InternalEvaluationSection";
import { PlayerStatsSection } from "@/components/players/sections/PlayerStatsSection";
import { PlayerRatingBadge } from "@/components/players/PlayerRatingBadge";
import { RatingEvolutionChart } from "@/components/players/sections/RatingEvolutionChart";
import { PersonalDataCard } from "@/components/players/sections/PersonalDataCard";
import { ContractInfoCard } from "@/components/players/sections/ContractInfoCard";
import { TacticalProfileCard } from "@/components/players/sections/TacticalProfileCard";
import { SeasonSummaryCard } from "@/components/players/sections/SeasonSummaryCard";
import { OverallRatingCard } from "@/components/players/sections/OverallRatingCard";
import { MarketValueSection } from "@/components/players/sections/MarketValueSection";
import { MarketValueTab } from "@/components/players/sections/MarketValueTab";

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[] | null;
  age: number | null;
  birth_date: string | null;
  nationality: string;
  current_club: string | null;
  country: string | null;
  height: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  bio_public: string | null;
  highlight_video_url: string | null;
  is_public: boolean | null;
  // Contract
  contract_start: string | null;
  contract_end: string | null;
  contract_notes: string | null;
  salary_info: string | null;
  release_clause: string | null;
  contract_status: string | null;
  passports: string[] | null;
  agent_name: string | null;
  agent_contact: string | null;
  // Physical
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  wingspan: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
  last_physical_evaluation: string | null;
  // Technical
  playing_height_preference: string | null;
  play_style: string | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
  strengths: string[] | null;
  areas_to_develop: string[] | null;
  // Medical
  physical_status: string | null;
  medical_notes: string | null;
  // Internal Evaluation
  overall_rating: number | null;
  potential_rating: number | null;
  ready_to_compete: boolean | null;
  estimated_level: string | null;
  internal_evaluation_notes: string | null;
  internal_notes: string | null;
  // Auto Rating
  auto_rating: number | null;
  rating_updated_at: string | null;
  auto_rating_details: Record<string, unknown> | null;
  // Market Value
  market_value: number | null;
  market_value_currency: string | null;
  market_value_trend: string | null;
  // Metadata
  created_at: string;
  updated_at: string;
}

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface ScoutingReport {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  competition: {
    name: string;
  } | null;
}

const PlayerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isScout } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canViewPrivate = isAdmin || isScout;

  // Refetch player to get updated auto_rating after stats change
  const refetchPlayer = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setPlayer(data as Player);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [playerRes, injuriesRes, reportsRes] = await Promise.all([
        supabase
          .from("players")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("player_injuries")
          .select("*")
          .eq("player_id", id)
          .order("start_date", { ascending: false }),
        supabase
          .from("scouting_reports")
          .select("id, match_date, final_score, rating, competition:competitions(name)")
          .eq("player_id", id)
          .order("match_date", { ascending: false })
          .limit(5),
      ]);

      if (playerRes.data) {
        setPlayer(playerRes.data as Player);
      }
      if (injuriesRes.data) {
        setInjuries(injuriesRes.data);
      }
      if (reportsRes.data) {
        setReports(reportsRes.data as ScoutingReport[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleDeleteSuccess = () => {
    navigate("/app/players");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Atleta não encontrado</h2>
        <Button onClick={() => navigate("/app/players")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/players")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary/50 flex-shrink-0">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{player.full_name}</h1>
                <Badge variant={player.is_public ? "default" : "secondary"}>
                  {player.is_public ? (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Público
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" />
                      Privado
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{player.position}</Badge>
                {safeArray(player.secondary_positions).map((pos) => (
                  <Badge key={pos} variant="outline" className="opacity-70">
                    {pos}
                  </Badge>
                ))}
              </div>
              {/* Player Rating */}
              {player.auto_rating !== null && player.auto_rating !== undefined && (
                <div className="mt-2">
                  <PlayerRatingBadge
                    rating={player.auto_rating}
                    size="md"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 ml-14 md:ml-0">
          <Button variant="outline" asChild>
            <Link to={`/app/reports/new?player=${player.id}`}>
              <FileText className="w-4 h-4" />
              Novo Relatório
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/app/players/${player.id}/edit`}>
              <Edit className="w-4 h-4" />
              Editar
            </Link>
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="overview" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Estatísticas</span>
          </TabsTrigger>
          <TabsTrigger value="market" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Valor de Mercado</span>
          </TabsTrigger>
          <TabsTrigger value="physical" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Físico</span>
          </TabsTrigger>
          <TabsTrigger value="technical" className="gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Técnico</span>
          </TabsTrigger>
          <TabsTrigger value="medical" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            <span className="hidden sm:inline">Médico</span>
          </TabsTrigger>
          <TabsTrigger value="contract" className="gap-2">
            <ContractIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Contrato</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Data */}
              <PersonalDataCard
                fullName={player.full_name}
                age={player.age}
                birthDate={player.birth_date}
                height={player.height}
                dominantFoot={player.dominant_foot}
                nationality={player.nationality}
              />

              {/* Contract Info */}
              <ContractInfoCard
                currentClub={player.current_club}
                country={player.country}
                agentName={player.agent_name}
                agentContact={player.agent_contact}
                contractEnd={player.contract_end}
                contractStatus={player.contract_status}
              />

              {/* Tactical Profile */}
              <TacticalProfileCard
                position={player.position}
                secondaryPositions={player.secondary_positions}
                primaryTacticalRole={player.primary_tactical_role}
                secondaryTacticalRole={player.secondary_tactical_role}
                playStyle={player.play_style}
                strengths={player.strengths}
                areasToDevelope={player.areas_to_develop}
              />

              {/* Season Summary */}
              <SeasonSummaryCard playerId={player.id} />

              {/* Video */}
              {player.highlight_video_url && (() => {
                const embedUrl = getYouTubeEmbedUrl(player.highlight_video_url);
                if (!embedUrl) return null;
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Vídeo de Destaque
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={embedUrl}
                          title="Player Highlights"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Internal Evaluation (visible only to Admin/Scout) */}
              {canViewPrivate && (
                <InternalEvaluationSection data={player} />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Overall Rating Card */}
              <OverallRatingCard
                autoRating={player.auto_rating}
                overallRating={player.overall_rating}
                potentialRating={player.potential_rating}
                ratingUpdatedAt={player.rating_updated_at}
                ratingDetails={player.auto_rating_details as any}
                playerId={player.id}
                isAdmin={isAdmin}
                onRatingRecalculated={refetchPlayer}
              />

              {/* Market Value */}
              <MarketValueSection
                playerId={player.id}
                marketValue={player.market_value}
                marketValueCurrency={player.market_value_currency}
                marketValueTrend={player.market_value_trend}
                onValueChange={refetchPlayer}
              />

              {/* Rating Evolution Chart */}
              <RatingEvolutionChart
                playerId={player.id}
                currentRating={player.auto_rating}
              />
              {/* Recent Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Relatórios Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reports.length > 0 ? (
                    <div className="space-y-3">
                      {safeArray(reports).map((report) => (
                        <Link
                          key={report.id}
                          to={`/app/reports/${report.id}`}
                          className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {report.competition?.name || "Competição"}
                            </span>
                            <Badge variant="outline">{Number.isFinite(report.final_score) ? report.final_score.toFixed(1) : "—"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.match_date).toLocaleDateString("pt-BR")}
                          </p>
                        </Link>
                      ))}
                      <Button variant="ghost" className="w-full" asChild>
                        <Link to={`/app/reports?player=${player.id}`}>
                          Ver todos os relatórios
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm mb-3">
                        Nenhum relatório encontrado
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/app/reports/new?player=${player.id}`}>
                          <FileText className="w-4 h-4" />
                          Criar Relatório
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metadados</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>ID:</strong>{" "}
                    <code className="text-xs bg-secondary px-1 py-0.5 rounded">{player.id}</code>
                  </p>
                  <p>
                    <strong>Slug:</strong> {player.slug}
                  </p>
                  <p>
                    <strong>Criado em:</strong>{" "}
                    {new Date(player.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p>
                    <strong>Atualizado em:</strong>{" "}
                    {new Date(player.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <PlayerStatsSection 
            playerId={player.id}
            playerPosition={player.position}
            onStatsChange={refetchPlayer}
          />
        </TabsContent>

        {/* Market Value Tab */}
        <TabsContent value="market">
          <MarketValueTab
            playerId={player.id}
            marketValue={player.market_value}
            marketValueCurrency={player.market_value_currency}
            marketValueTrend={player.market_value_trend}
            onValueChange={refetchPlayer}
          />
        </TabsContent>

        {/* Physical Tab */}
        <TabsContent value="physical">
          <PhysicalDataSection data={player} />
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical">
          <TechnicalProfileSection data={player} />
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical">
          <InjuryHistorySection 
            injuries={injuries} 
            physicalStatus={player.physical_status}
            medicalNotes={player.medical_notes}
          />
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract">
          <ContractSection data={player} />
        </TabsContent>
      </Tabs>

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={player ? { id: player.id, full_name: player.full_name } : null}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default PlayerDetail;
