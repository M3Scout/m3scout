import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl, safeArray } from "@/lib/utils";
import { isGoalkeeper } from "@/lib/positionUtils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
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
import { GoalkeeperStatsSection } from "@/components/players/sections/GoalkeeperStatsSection";
import { PlayerRatingBadge } from "@/components/players/PlayerRatingBadge";
import { RatingEvolutionChart } from "@/components/players/sections/RatingEvolutionChart";
import { MatchRatingEvolutionChart } from "@/components/players/sections/MatchRatingEvolutionChart";
import { PlayerOverviewSection } from "@/components/players/sections/PlayerOverviewSection";
import { SeasonSummaryCard } from "@/components/players/sections/SeasonSummaryCard";
import { OverallRatingCard } from "@/components/players/sections/OverallRatingCard";
import { MarketValueSection } from "@/components/players/sections/MarketValueSection";
import { MarketValueTab } from "@/components/players/sections/MarketValueTab";
import { DataQualityPanel } from "@/components/players/DataQualityPanel";
import { RecentReportsCard } from "@/components/players/sections/RecentReportsCard";
import { MetadataCard } from "@/components/players/sections/MetadataCard";


import { UnifiedRadarCard } from "@/components/players/UnifiedRadarCard";

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
      .limit(1);
    const playerRow = Array.isArray(data) ? data[0] ?? null : null;
    if (playerRow) {
      setPlayer(playerRow as Player);
    }
  };

  // Refetch injuries after adding new one
  const refetchInjuries = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("player_injuries")
      .select("*")
      .eq("player_id", id)
      .order("start_date", { ascending: false });
    if (data) {
      setInjuries(data);
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
          .limit(1),
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

      const playerRow = Array.isArray(playerRes.data) ? playerRes.data[0] ?? null : null;

      if (import.meta.env.DEV) {
        console.log("[BREAKDOWN] fetched payload", {
          playerId: id,
          hasAutoRatingDetails: Boolean(playerRow?.auto_rating_details),
          autoRating: playerRow?.auto_rating,
          position: playerRow?.position,
          competitionsInDetails: Array.isArray((playerRow as any)?.auto_rating_details?.competitions)
            ? (playerRow as any).auto_rating_details.competitions.map((c: any) => ({
                competition_id: c?.competition_id,
                season_year: c?.season_year,
                stat_breakdown_len: Array.isArray(c?.stat_breakdown) ? c.stat_breakdown.length : 0,
              }))
            : [],
        });
      }

      if (playerRow) {
        setPlayer(playerRow as Player);
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
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Header - Mobile-first redesign */}
      <div className="flex flex-col gap-4 w-full min-w-0">
        {/* Row 1: Back button + Menu (if needed) */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/players")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Row 2: Photo + Name/Position/Rating */}
        <div className="flex items-start gap-4 w-full min-w-0">
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
          
          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h1 className="text-xl md:text-2xl font-bold truncate">{player.full_name}</h1>
            
            {/* Positions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-muted-foreground">
              <Badge variant="outline" className="text-xs">{player.position}</Badge>
              {safeArray(player.secondary_positions).slice(0, 2).map((pos) => (
                <Badge key={pos} variant="outline" className="opacity-70 text-xs">
                  {pos}
                </Badge>
              ))}
            </div>
            
            {/* Rating */}
            {player.auto_rating !== null && player.auto_rating !== undefined && (
              <div className="mt-2">
                <PlayerRatingBadge
                  rating={player.auto_rating}
                  playerPosition={player.position}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Row 3: Badge - compact */}
        <div className="flex items-center">
          <Badge variant={player.is_public ? "default" : "secondary"} className="text-xs">
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

        {/* Row 4: Actions - stacked on mobile */}
        <div className="flex flex-col gap-2 w-full">
          <Button variant="outline" asChild className="w-full justify-center">
            <Link to={`/app/reports/new?player=${player.id}`}>
              <FileText className="w-4 h-4 mr-2" />
              Novo Relatório
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild className="justify-center">
              <Link to={`/app/players/${player.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </Button>
            {isAdmin && (
              <PermissionGate module="players" action="delete">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 w-full min-w-0">
        {/* Premium Tab Navigation */}
        <TabsList>
          <TabsTrigger value="overview">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Estatísticas</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="market">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Valor de Mercado</span>
            <span className="sm:hidden">Valor</span>
          </TabsTrigger>
          <TabsTrigger value="physical">
            <Activity className="w-4 h-4" />
            <span>Físico</span>
          </TabsTrigger>
          <TabsTrigger value="technical">
            <Target className="w-4 h-4" />
            <span>Técnico</span>
          </TabsTrigger>
          <TabsTrigger value="medical">
            <Stethoscope className="w-4 h-4" />
            <span>Médico</span>
          </TabsTrigger>
          <TabsTrigger value="contract">
            <ContractIcon className="w-4 h-4" />
            <span>Contrato</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Executive Summary - All key info in one organized card */}
              <PlayerOverviewSection
                fullName={player.full_name}
                age={player.age}
                height={player.height}
                dominantFoot={player.dominant_foot}
                nationality={player.nationality}
                currentClub={player.current_club}
                country={player.country}
                contractStatus={player.contract_status}
                position={player.position}
                secondaryPositions={player.secondary_positions}
                primaryTacticalRole={player.primary_tactical_role}
                secondaryTacticalRole={player.secondary_tactical_role}
                playStyle={player.play_style}
                strengths={player.strengths}
                areasToDevelope={player.areas_to_develop}
              />

              {/* Season Summary */}
              <SeasonSummaryCard playerId={player.id} playerPosition={player.position} />

              {/* Video */}
              {player.highlight_video_url && (() => {
                const embedUrl = getYouTubeEmbedUrl(player.highlight_video_url);
                if (!embedUrl) return null;
                return (
                  <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
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
                playerPosition={player.position}
                isAdmin={isAdmin}
                onRatingRecalculated={refetchPlayer}
              />

              {/* Attribute Radar - automatically switches for GK */}
              <UnifiedRadarCard playerId={player.id} playerPosition={player.position} showFilters={true} />

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

              {/* Data Quality Panel */}
              <DataQualityPanel
                playerId={player.id}
                position={player.position}
              />
              {/* Recent Reports */}
              <RecentReportsCard reports={reports} playerId={player.id} />

              {/* Metadata */}
              <MetadataCard 
                id={player.id} 
                slug={player.slug} 
                createdAt={player.created_at} 
                updatedAt={player.updated_at} 
              />
            </div>
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          {/* Match Rating Evolution Chart */}
          <MatchRatingEvolutionChart 
            playerId={player.id} 
            playerName={player.full_name}
          />
          
          <PlayerStatsSection 
            playerId={player.id}
            playerPosition={player.position}
            onStatsChange={refetchPlayer}
          />
          {/* GK detailed stats section (only for goalkeepers) */}
          {isGoalkeeper(player.position) && (
            <GoalkeeperStatsSection playerId={player.id} />
          )}
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
          <PhysicalDataSection data={player} playerId={player.id} playerName={player.full_name} />
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
            playerId={player.id}
            onInjuryAdded={refetchInjuries}
            player={{
              full_name: player.full_name,
              position: player.position,
              age: player.age,
              birth_date: player.birth_date,
              nationality: player.nationality,
              current_club: player.current_club,
              photo_url: player.photo_url,
            }}
          />
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract">
          <ContractSection data={player} playerId={player.id} />
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
