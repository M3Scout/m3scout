import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Hexagon, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
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

const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", color: "hsl(var(--primary))" },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", color: "hsl(217, 91%, 60%)" },
  { key: "tat", label: "TÁT", fullLabel: "Tática", color: "hsl(142, 71%, 45%)" },
  { key: "def", label: "DEF", fullLabel: "Defesa", color: "hsl(45, 93%, 47%)" },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", color: "hsl(280, 87%, 60%)" },
];

const getConfidenceLabel = (confidence: number | null): { label: string; variant: "default" | "secondary" | "outline" } => {
  if (confidence === null) return { label: "Sem dados", variant: "outline" };
  if (confidence >= 0.7) return { label: "Alta Confiança", variant: "default" };
  if (confidence >= 0.4) return { label: "Média Confiança", variant: "secondary" };
  return { label: "Baixa Confiança", variant: "outline" };
};

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

  const chartData = scores
    ? ATTRIBUTE_CONFIG.map((attr) => ({
        attribute: attr.label,
        fullLabel: attr.fullLabel,
        value: scores[attr.key as keyof AttributeScores] ?? 0,
        fullMark: 100,
      }))
    : [];

  const hasData = scores && chartData.some((d) => d.value > 0);
  const confidenceInfo = getConfidenceLabel(scores?.confidence ?? null);

  if (loading) {
    return (
      <motion.div 
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex-1 flex items-center justify-center min-h-[300px]"
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

      {/* Radar Chart */}
      <div className="px-4 py-4 flex-1 flex items-center justify-center">
        {hasData ? (
          <div className="w-full h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                />
                <Radar
                  name="Atributos"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Value badges around chart */}
            <div className="absolute inset-0 pointer-events-none">
              {chartData.map((item, index) => {
                const angle = (index / chartData.length) * 2 * Math.PI - Math.PI / 2;
                const radius = 85;
                const x = 50 + Math.cos(angle) * (radius / 2.5);
                const y = 50 + Math.sin(angle) * (radius / 2.5);
                
                return (
                  <div
                    key={item.attribute}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <span className="text-[10px] font-bold text-foreground bg-zinc-900/80 px-1.5 py-0.5 rounded">
                      {Math.round(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Hexagon className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
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
          <span>Calculado a partir das estatísticas de jogo</span>
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
