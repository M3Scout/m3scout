import { useState, useEffect } from "react";
import { Scale, Percent, Activity, Calculator, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";

interface AthleteBodyMetricsCardProps {
  athleteId: string;
}

interface BodyMetrics {
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  height: number | null;
}

function calculateBMI(weight: number | null, heightCm: number | null): number | null {
  if (!weight || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

function getBMIStatus(bmi: number | null): { label: string; color: string } {
  if (bmi === null) return { label: "—", color: "text-zinc-500" };
  if (bmi < 18.5) return { label: "Abaixo", color: "text-yellow-400" };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-400" };
  if (bmi < 30) return { label: "Sobrepeso", color: "text-amber-400" };
  return { label: "Obesidade", color: "text-red-400" };
}

export function AthleteBodyMetricsCard({ athleteId }: AthleteBodyMetricsCardProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BodyMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await supabase
          .from("players")
          .select("weight, body_fat_percentage, muscle_mass, height")
          .eq("id", athleteId)
          .limit(1);

        if (data && data.length > 0) {
          setMetrics(data[0]);
        }
      } catch (error) {
        console.error("Error fetching body metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [athleteId]);

  const bmi = calculateBMI(metrics?.weight ?? null, metrics?.height ?? null);
  const bmiStatus = getBMIStatus(bmi);

  const cards = [
    {
      icon: Scale,
      label: "Peso",
      value: metrics?.weight ?? null,
      unit: "kg",
      color: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
    },
    {
      icon: Percent,
      label: "% Gordura",
      value: metrics?.body_fat_percentage ?? null,
      unit: "%",
      color: "from-amber-500/20 to-amber-600/10",
      iconColor: "text-amber-400",
    },
    {
      icon: Activity,
      label: "% M. Muscular",
      value: metrics?.muscle_mass ?? null,
      unit: "%",
      color: "from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-400",
    },
    {
      icon: Calculator,
      label: "IMC",
      value: bmi,
      unit: bmiStatus.label,
      color: "from-violet-500/20 to-violet-600/10",
      iconColor: "text-violet-400",
      unitColor: bmiStatus.color,
    },
  ];

  if (loading) {
    return (
      <motion.div 
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex-1 flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.45 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col flex-1"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-cyan-500/20 to-teal-600/10 flex items-center justify-center">
          <Scale className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Medidas Corporais</h2>
          <p className="text-[10px] text-muted-foreground">Composição física</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4 flex-1 grid grid-cols-2 gap-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const hasValue = card.value !== null;
          
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`p-3 rounded-xl bg-gradient-to-br ${card.color} border border-white/5 flex flex-col items-center justify-center text-center min-h-[90px]`}
            >
              <div className={`w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              
              {hasValue ? (
                <>
                  <p className="text-lg font-bold text-foreground leading-none">
                    {typeof card.value === 'number' ? card.value.toFixed(1) : card.value}
                  </p>
                  <p className={`text-[10px] mt-1 ${card.unitColor || 'text-muted-foreground'}`}>
                    {card.unit}
                  </p>
                </>
              ) : (
                <p className="text-xs text-zinc-500">Não informado</p>
              )}
              
              <p className="text-[10px] text-zinc-500 mt-1">{card.label}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
