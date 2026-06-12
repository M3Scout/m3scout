import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Hexagon, Loader2, Info, ChevronDown, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { recalculatePlayerScores } from "@/lib/recalculatePlayerScores";

interface AthleteRadarCardProps {
  athleteId: string;
  athletePosition: string;
}

interface AttributeScores {
  ata: number | null;
  tec: number | null;
  tat: number | null;
  def: number | null;
  cri: number | null;
  confidence: number | null;
}

const ATTRIBUTES = [
  { key: "ata", label: "ATA", fullLabel: "Ataque",      angle: -90  },
  { key: "tec", label: "TÉC", fullLabel: "Técnica",     angle: -18  },
  { key: "tat", label: "TÁT", fullLabel: "Tática",      angle: 54   },
  { key: "def", label: "DEF", fullLabel: "Defesa",      angle: 126  },
  { key: "cri", label: "CRI", fullLabel: "Criatividade",angle: 198  },
];

const getConfidenceLabel = (confidence: number | null): { label: string; variant: "default" | "secondary" | "outline" } => {
  if (confidence === null) return { label: "Sem dados", variant: "outline" };
  if (confidence >= 0.7)   return { label: "Alta Confiança",  variant: "default"   };
  if (confidence >= 0.4)   return { label: "Média Confiança", variant: "secondary" };
  return { label: "Baixa Confiança", variant: "outline" };
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function AthleteRadarCard({ athleteId, athletePosition }: AthleteRadarCardProps) {
  const [loading, setLoading]               = useState(true);
  const [scores, setScores]                 = useState<AttributeScores | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  // 1. Busca temporadas disponíveis e seleciona a mais recente
  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from("player_attribute_scores")
        .select("season_year")
        .eq("player_id", athleteId)
        .not("season_year", "is", null)
        .order("season_year", { ascending: false });

      if (data && data.length > 0) {
        const seasons = [...new Set(data.map((r) => r.season_year as number))].sort((a, b) => b - a);
        setAvailableSeasons(seasons);
        setSelectedSeason(seasons[0]); // mais recente por padrão
      } else {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, [athleteId]);

  // 2. Busca scores da temporada selecionada (auto-recalcula se engine antigo)
  useEffect(() => {
    if (selectedSeason === null) return;

    const fetchScores = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("player_attribute_scores")
          .select("ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, attr_confidence, details")
          .eq("player_id", athleteId)
          .eq("season_year", selectedSeason)
          .order("updated_at", { ascending: false })
          .limit(1);

        const row = data?.[0] ?? null;
        const engineVersion = (row?.details as any)?.engine_version ?? "";
        const needsRecalc = !row || !engineVersion.startsWith("v25");

        if (needsRecalc) {
          await recalculatePlayerScores(athleteId, selectedSeason);
          const { data: fresh } = await supabase
            .from("player_attribute_scores")
            .select("ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, attr_confidence")
            .eq("player_id", athleteId)
            .eq("season_year", selectedSeason)
            .order("updated_at", { ascending: false })
            .limit(1);
          const freshRow = fresh?.[0] ?? null;
          setScores(freshRow ? {
            ata: freshRow.ata_score_100, tec: freshRow.tec_score_100,
            tat: freshRow.tat_score_100, def: freshRow.def_score_100,
            cri: freshRow.cri_score_100, confidence: freshRow.attr_confidence,
          } : null);
          return;
        }

        if (row) {
          setScores({
            ata:        row.ata_score_100,
            tec:        row.tec_score_100,
            tat:        row.tat_score_100,
            def:        row.def_score_100,
            cri:        row.cri_score_100,
            confidence: row.attr_confidence,
          });
        } else {
          setScores(null);
        }
      } catch (error) {
        console.error("Error fetching attribute scores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [athleteId, selectedSeason]);

  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!selectedSeason || recalculating) return;
    setRecalculating(true);
    try {
      await recalculatePlayerScores(athleteId, selectedSeason);
      const { data } = await supabase
        .from("player_attribute_scores")
        .select("ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, attr_confidence")
        .eq("player_id", athleteId)
        .eq("season_year", selectedSeason)
        .order("updated_at", { ascending: false })
        .limit(1);
      const row = data?.[0];
      if (row) setScores({ ata: row.ata_score_100, tec: row.tec_score_100, tat: row.tat_score_100,
                           def: row.def_score_100, cri: row.cri_score_100, confidence: row.attr_confidence });
    } finally {
      setRecalculating(false);
    }
  };

  const hasData = scores && Object.values(scores).some((v) => v !== null && v > 0);
  const confidenceInfo = getConfidenceLabel(scores?.confidence ?? null);

  const size       = 180;
  const center     = size / 2;
  const maxRadius  = 65;
  const gridLevels = [0.33, 0.66, 1];

  const getPolygonPoints = () => {
    if (!scores) return "";
    return ATTRIBUTES.map((attr) => {
      const value = (scores[attr.key as keyof AttributeScores] as number) || 0;
      const normalizedValue = Math.min(value / 100, 1);
      const point = polarToCartesian(center, center, maxRadius * normalizedValue, attr.angle);
      return `${point.x},${point.y}`;
    }).join(" ");
  };

  if (loading) {
    return (
      <motion.div
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex-1 flex items-center justify-center min-h-[280px]"
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      {...fadeInUp}
      transition={{ delay: 0.4 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col flex-1"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-violet-500/20 to-purple-600/10 flex items-center justify-center">
            <Hexagon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Radar de Atributos</h2>
            <p className="text-[10px] text-muted-foreground">Perfil técnico-tático</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão recalcular */}
          {selectedSeason && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating || loading}
              title="Recalcular atributos"
              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
            </button>
          )}
          {/* Seletor de temporada */}
          {availableSeasons.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-zinc-800/60">
                  {selectedSeason ?? "—"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {availableSeasons.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    className={`text-xs ${year === selectedSeason ? "text-primary font-semibold" : ""}`}
                    onSelect={() => setSelectedSeason(year)}
                  >
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={confidenceInfo.variant} className="text-[10px] cursor-help">
                {confidenceInfo.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px]">
              <p className="text-xs">
                Confiança baseada na quantidade de minutos jogados e partidas analisadas
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Radar SVG */}
      <div className="px-6 py-6 flex-1 flex items-center justify-center">
        {hasData ? (
          <div className="relative">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <defs>
                <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(270, 70%, 60%)"  stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {gridLevels.map((level, i) => {
                const points = ATTRIBUTES.map((attr) => {
                  const point = polarToCartesian(center, center, maxRadius * level, attr.angle);
                  return `${point.x},${point.y}`;
                }).join(" ");
                return (
                  <polygon
                    key={i}
                    points={points}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.08}
                    strokeWidth={1}
                  />
                );
              })}

              {ATTRIBUTES.map((attr) => {
                const point = polarToCartesian(center, center, maxRadius, attr.angle);
                return (
                  <line
                    key={attr.key}
                    x1={center} y1={center}
                    x2={point.x} y2={point.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.06}
                    strokeWidth={1}
                  />
                );
              })}

              <polygon
                points={getPolygonPoints()}
                fill="url(#radarGradient)"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {ATTRIBUTES.map((attr) => {
                const value = (scores?.[attr.key as keyof AttributeScores] as number) || 0;
                const normalizedValue = Math.min(value / 100, 1);
                const point = polarToCartesian(center, center, maxRadius * normalizedValue, attr.angle);
                return (
                  <circle
                    key={attr.key}
                    cx={point.x} cy={point.y}
                    r={3}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                  />
                );
              })}
            </svg>

            {ATTRIBUTES.map((attr) => {
              const labelRadius = maxRadius + 28;
              const point = polarToCartesian(center, center, labelRadius, attr.angle);
              const value = (scores?.[attr.key as keyof AttributeScores] as number) || 0;
              return (
                <Tooltip key={attr.key}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute flex flex-col items-center justify-center cursor-help"
                      style={{
                        left: point.x,
                        top: point.y,
                        transform: "translate(-50%, -50%)",
                        minWidth: 36,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span className="text-[11px] font-semibold text-foreground leading-none tracking-wide" style={{ whiteSpace: "nowrap" }}>
                        {attr.label}
                      </span>
                      <span className="text-[10px] font-medium text-primary leading-none mt-0.5">
                        {Math.round(value)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {attr.fullLabel}: {Math.round(value)}/100
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Hexagon className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Jogue mais partidas para gerar seu radar
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800/30 bg-zinc-900/30 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Calculado das estatísticas</span>
        </div>
        <Link
          to={`/dashboard/atletas/${athleteId}?tab=technical`}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes →
        </Link>
      </div>
    </motion.div>
  );
}
