import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Ruler,
  User,
  Flag,
  MapPin,
  Building2,
  Phone,
  Play,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Clock,
  DollarSign,
  StickyNote,
} from "lucide-react";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";

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
  contract_end: string | null;
  contract_notes: string | null;
  salary_info: string | null;
  internal_notes: string | null;
  agent_name: string | null;
  agent_contact: string | null;
  created_at: string;
  updated_at: string;
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
  const { isAdmin } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [playerRes, reportsRes] = await Promise.all([
        supabase
          .from("players")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("scouting_reports")
          .select("id, match_date, final_score, rating, competition:competitions(name)")
          .eq("player_id", id)
          .order("match_date", { ascending: false })
          .limit(5),
      ]);

      if (playerRes.data) {
        setPlayer(playerRes.data);
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
                {player.secondary_positions?.map((pos) => (
                  <Badge key={pos} variant="outline" className="opacity-70">
                    {pos}
                  </Badge>
                ))}
              </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {player.age && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Idade</p>
                      <p className="font-medium">{player.age} anos</p>
                    </div>
                  </div>
                )}
                {player.birth_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nascimento</p>
                      <p className="font-medium">
                        {new Date(player.birth_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nacionalidade</p>
                    <p className="font-medium">{player.nationality}</p>
                  </div>
                </div>
                {player.height && (
                  <div className="flex items-center gap-3">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Altura</p>
                      <p className="font-medium">{player.height} cm</p>
                    </div>
                  </div>
                )}
                {player.dominant_foot && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pé Dominante</p>
                      <p className="font-medium">{player.dominant_foot}</p>
                    </div>
                  </div>
                )}
                {player.current_club && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Clube Atual</p>
                      <p className="font-medium">{player.current_club}</p>
                    </div>
                  </div>
                )}
                {player.country && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">País de Atuação</p>
                      <p className="font-medium">{player.country}</p>
                    </div>
                  </div>
                )}
              </div>

              {player.bio_public && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Biografia</p>
                    <p className="text-sm">{player.bio_public}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Private Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Informações Privadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {player.contract_end && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fim do Contrato</p>
                      <p className="font-medium">
                        {new Date(player.contract_end).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}
                {player.agent_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Agente</p>
                      <p className="font-medium">{player.agent_name}</p>
                    </div>
                  </div>
                )}
                {player.agent_contact && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contato do Agente</p>
                      <p className="font-medium">{player.agent_contact}</p>
                    </div>
                  </div>
                )}
              </div>

              {player.salary_info && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Informações Salariais</p>
                      <p className="text-sm">{player.salary_info}</p>
                    </div>
                  </div>
                </>
              )}

              {player.contract_notes && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-start gap-3">
                    <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notas de Contrato</p>
                      <p className="text-sm">{player.contract_notes}</p>
                    </div>
                  </div>
                </>
              )}

              {player.internal_notes && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-start gap-3">
                    <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notas Internas</p>
                      <p className="text-sm">{player.internal_notes}</p>
                    </div>
                  </div>
                </>
              )}

              {!player.contract_end && !player.agent_name && !player.salary_info && !player.contract_notes && !player.internal_notes && (
                <p className="text-muted-foreground text-sm">Nenhuma informação privada cadastrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Video */}
          {player.highlight_video_url && (
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
                    src={player.highlight_video_url}
                    title="Player Highlights"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                  {reports.map((report) => (
                    <Link
                      key={report.id}
                      to={`/app/reports/${report.id}`}
                      className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {report.competition?.name || "Competição"}
                        </span>
                        <Badge variant="outline">{report.final_score.toFixed(1)}</Badge>
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
