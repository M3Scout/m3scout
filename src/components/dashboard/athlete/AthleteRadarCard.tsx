import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Hexagon, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

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

// Fixed positions for 5-point radar (pentagon)
// Order: ATA (top), TÉC (right), TÁT (bottom-right), DEF (bottom-left), CRI (left)
const ATTRIBUTES = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", angle: -90 },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", angle: -18 },
  { key: "tat", label: "TÁT", fullLabel: "Tática", angle: 54 },
  { key: "def", label: "DEF", fullLabel: "Defesa", angle: 126 },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", angle: 198 },
];

const getConfidenceLabel = (confidence: number | null): { label: string; variant: "default" | "secondary" | "outline" } => {
  if (confidence === null) return { label: "Sem dados", variant: "outline" };
  if (confidence >= 0.7) return { label: "Alta Confiança", variant: "default" };
  if (confidence >= 0.4) return { label: "Média Confiança", variant: "secondary" };
  return { label: "Baixa Confiança", variant: "outline" };
};

// Convert polar to cartesian coordinates
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function AthleteRadarCard({ athleteId, athletePosition }: AthleteRadarCardProps) {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<AttributeScores | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const { data } = await supabase
          .from("player_attribute_scores")
          .select("ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, attr_confidence")
          .eq("player_id", athleteId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setScores({
            ata: data[0].ata_score_100,
            tec: data[0].tec_score_100,
            tat: data[0].tat_score_100,
            def: data[0].def_score_100,
            cri: data[0].cri_score_100,
            confidence: data[0].attr_confidence,
          });
        }
      } catch (error) {
        console.error("Error fetching attribute scores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [athleteId]);

  const hasData = scores && Object.values(scores).some((v) => v !== null && v > 0);
  const confidenceInfo = getConfidenceLabel(scores?.confidence ?? null);

  // SVG dimensions
  const size = 180;
  const center = size / 2;
  const maxRadius = 65;
  const gridLevels = [0.33, 0.66, 1]; // 3 grid lines only

  // Calculate polygon points based on scores
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

      {/* Custom SVG Radar Chart */}
      <div className="px-6 py-6 flex-1 flex items-center justify-center">
        {hasData ? (
          <div className="relative">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <defs>
                {/* Gradient for polygon fill */}
                <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(270, 70%, 60%)" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {/* Grid circles (low opacity) */}
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

              {/* Axis lines (very subtle) */}
              {ATTRIBUTES.map((attr) => {
                const point = polarToCartesian(center, center, maxRadius, attr.angle);
                return (
                  <line
                    key={attr.key}
                    x1={center}
                    y1={center}
                    x2={point.x}
                    y2={point.y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.06}
                    strokeWidth={1}
                  />
                );
              })}

              {/* Data polygon */}
              <polygon
                points={getPolygonPoints()}
                fill="url(#radarGradient)"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {/* Data points */}
              {ATTRIBUTES.map((attr) => {
                const value = (scores?.[attr.key as keyof AttributeScores] as number) || 0;
                const normalizedValue = Math.min(value / 100, 1);
                const point = polarToCartesian(center, center, maxRadius * normalizedValue, attr.angle);
                
                return (
                  <circle
                    key={attr.key}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                  />
                );
              })}
            </svg>

            {/* Labels positioned outside the radar */}
            {ATTRIBUTES.map((attr) => {
              const labelRadius = maxRadius + 28;
              const point = polarToCartesian(center, center, labelRadius, attr.angle);
              const value = (scores?.[attr.key as keyof AttributeScores] as number) || 0;
              
              return (
                <Tooltip key={attr.key}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute flex flex-col items-center cursor-help"
                      style={{
                        left: point.x,
                        top: point.y,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span className="text-[11px] font-semibold text-foreground">
                        {attr.label}
                      </span>
                      <span className="text-[10px] font-medium text-primary">
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
          to={`/app/players/${athleteId}?tab=technical`}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes →
        </Link>
      </div>
    </motion.div>
  );
}
