import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/players/RatingStars";
import { ScoreBreakdownDisplay } from "@/components/scouting/ScoreBreakdownDisplay";
import { 
  ArrowLeft, 
  Calendar, 
  Trophy, 
  User,
  Target,
  Brain,
  Zap,
  Heart,
  TrendingUp,
  FileText,
  Edit,
  Share2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, safeArray } from "@/lib/utils";
import { getScoreColor, getRatingLabel, CATEGORY_WEIGHTS, ScoreBreakdown } from "@/lib/scoring";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface ReportDetail {
  id: string;
  match_date: string;
  opponent: string | null;
  match_notes: string | null;
  technical_score: number;
  tactical_score: number;
  physical_score: number;
  mental_score: number;
  impact_score: number;
  technical_notes: string | null;
  tactical_notes: string | null;
  physical_notes: string | null;
  mental_notes: string | null;
  impact_notes: string | null;
  base_score: number;
  competition_coefficient: number;
  adjusted_score: number;
  potential_bonus: number;
  consistency_modifier: number;
  final_score: number;
  rating: number;
  summary: string | null;
  recommendation: string | null;
  created_at: string;
  players: {
    id: string;
    full_name: string;
    position: string;
    photo_url: string | null;
    current_club: string | null;
    nationality: string;
  } | null;
  competitions: {
    name: string;
    country: string;
    division: string | null;
    phase: string | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

const categoryConfig = [
  { key: "technical", label: "Técnico", icon: Target, color: "#10b981" },
  { key: "tactical", label: "Tático", icon: Brain, color: "#3b82f6" },
  { key: "physical", label: "Físico", icon: Zap, color: "#f59e0b" },
  { key: "mental", label: "Mental", icon: Heart, color: "#ec4899" },
  { key: "impact", label: "Impacto", icon: TrendingUp, color: "#8b5cf6" },
];

const ReportDetail = () => {
  const { id } = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) {
        setError("ID do relatório não fornecido");
        setLoading(false);
        return;
      }

      try {
        const { data, error: queryError } = await supabase
          .from("scouting_reports")
          .select(`
            *,
            players (id, full_name, position, photo_url, current_club, nationality),
            competitions (name, country, division, phase),
            profiles:scout_id (full_name)
          `)
          .eq("id", id)
          .maybeSingle();

        if (queryError) {
          console.error("Error fetching report:", queryError);
          setError(queryError.message);
        } else if (data) {
          setReport(data as any);
        } else {
          setError("Relatório não encontrado ou sem permissão de acesso");
        }
      } catch (err: any) {
        console.error("Exception fetching report:", err);
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report || error) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Relatório não encontrado</h2>
        {error && (
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Link to="/app/reports">
            <Button variant="outline">Ver lista de relatórios</Button>
          </Link>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const radarData = safeArray(categoryConfig).map((cat) => ({
    category: cat.label,
    score: report[`${cat.key}_score` as keyof ReportDetail] as number,
    fullMark: 100,
  }));

  const barData = safeArray(categoryConfig).map((cat) => ({
    name: cat.label,
    score: report[`${cat.key}_score` as keyof ReportDetail] as number,
    weight: CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100,
    color: cat.color,
  }));

  const breakdown: ScoreBreakdown = {
    baseScore: Number(report.base_score),
    competitionCoefficient: Number(report.competition_coefficient),
    adjustedScore: Number(report.adjusted_score),
    potentialBonus: report.potential_bonus || 0,
    consistencyModifier: report.consistency_modifier || 0,
    finalScore: Number(report.final_score),
    rating: report.rating,
  };

  const competitionLabel = [
    report.competitions?.name,
    report.competitions?.division,
    report.competitions?.phase,
  ].filter(Boolean).join(" - ");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link
            to="/app/reports"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para relatórios
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Relatório de Scouting
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(report.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              {competitionLabel}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {report.profiles?.full_name || "Scout"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4" />
            Compartilhar
          </Button>
          <Link to={`/app/reports/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Player Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {report.players?.photo_url && (
            <img
              src={report.players.photo_url}
              alt={report.players.full_name}
              className="w-24 h-24 rounded-xl object-cover"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{report.players?.full_name}</h2>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="position-badge">{report.players?.position}</span>
              <span className="text-muted-foreground">
                {report.players?.current_club} • {report.players?.nationality}
              </span>
            </div>
            {report.opponent && (
              <p className="text-sm text-muted-foreground">
                Partida contra: <strong>{report.opponent}</strong>
              </p>
            )}
          </div>
          <div className="text-center sm:text-right">
            <div className={cn("text-5xl font-bold mb-2", getScoreColor(Number(report.final_score)))}>
              {Number.isFinite(Number(report.final_score)) ? Number(report.final_score).toFixed(1) : "—"}
            </div>
            <RatingStars rating={report.rating} size="lg" />
            <p className="text-sm font-medium text-accent mt-1">
              {getRatingLabel(report.rating)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Scores */}
        <div className="lg:col-span-2 space-y-6">
          {/* Radar Chart */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Perfil de Desempenho</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Scores por Categoria</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (Peso: ${props.payload.weight}%)`,
                      "Score"
                    ]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {safeArray(barData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Details */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Detalhamento por Categoria</h3>
            <div className="space-y-4">
              {safeArray(categoryConfig).map((cat) => {
                const score = report[`${cat.key}_score` as keyof ReportDetail] as number;
                const notes = report[`${cat.key}_notes` as keyof ReportDetail] as string | null;
                const Icon = cat.icon;

                return (
                  <div key={cat.key} className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        </div>
                        <span className="font-medium">{cat.label}</span>
                        <span className="text-xs text-muted-foreground">
                          (Peso: {CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100}%)
                        </span>
                      </div>
                      <span className={cn("text-xl font-bold", getScoreColor(score))}>
                        {score}
                      </span>
                    </div>
                    {notes && (
                      <p className="text-sm text-muted-foreground pl-11">{notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary & Recommendation */}
          {(report.summary || report.recommendation) && (
            <div className="glass-card p-6 space-y-4">
              {report.summary && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Resumo</h3>
                  <p className="text-muted-foreground">{report.summary}</p>
                </div>
              )}
              {report.recommendation && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recomendação</h3>
                  <p className="text-muted-foreground">{report.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Match Notes */}
          {report.match_notes && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-2">Observações da Partida</h3>
              <p className="text-muted-foreground">{report.match_notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Score Breakdown */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <ScoreBreakdownDisplay breakdown={breakdown} showExplanation={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
