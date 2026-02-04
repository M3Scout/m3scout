import { motion } from "framer-motion";
import { 
  Ruler, 
  Scale, 
  Percent, 
  Dumbbell,
  Zap,
  Timer,
  Heart,
  X,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFixed } from "@/lib/formatters";

interface AthletePhysicalSectionProps {
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
}

// Animated metric card with premium styling
function PhysicalMetric({ 
  label, 
  value, 
  unit, 
  icon: Icon,
  reference,
  index = 0,
}: { 
  label: string;
  value: number | null;
  unit: string;
  icon: React.ElementType;
  reference?: string;
  index?: number;
}) {
  const hasValue = value !== null && value !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -3 }}
      className={cn(
        "relative p-4 rounded-2xl transition-all duration-300 cursor-default overflow-hidden group",
        "bg-gradient-to-br from-zinc-800/40 via-zinc-900/30 to-transparent",
        "border border-zinc-800/30",
        "hover:border-zinc-700/40 hover:from-zinc-800/50"
      )}
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-zinc-800/60 group-hover:bg-zinc-700/60 transition-colors">
            <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        
        {hasValue ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {formatFixed(value, 1)}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
            {reference && (
              <motion.span 
                className="text-[9px] text-muted-foreground/50 mt-1.5 block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Ref: {reference}
              </motion.span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/40 flex items-center justify-center">
              <X className="w-4 h-4" />
            </div>
            <span className="text-sm italic">Não informado</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function AthletePhysicalSection({
  height,
  weight,
  wingspan,
  body_fat_percentage,
  muscle_mass,
  max_speed,
  sprint_30m,
  vo2_max,
}: AthletePhysicalSectionProps) {
  // Only show section if there's any physical data
  const hasAnyData = height || weight || wingspan || body_fat_percentage || muscle_mass || max_speed || sprint_30m || vo2_max;
  
  if (!hasAnyData) return null;

  return (
    <motion.section 
      className="mb-10 md:mb-14"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {/* Section Header */}
      <motion.div 
        className="flex items-center gap-3 mb-6 md:mb-8"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="p-2 rounded-xl bg-emerald-500/10">
          <Activity className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Dados Físicos</h2>
          <p className="text-xs text-muted-foreground">Métricas corporais e performance</p>
        </div>
      </motion.div>

      {/* Primary metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <PhysicalMetric label="Altura" value={height} unit="cm" icon={Ruler} reference="175-185" index={0} />
        <PhysicalMetric label="Peso" value={weight} unit="kg" icon={Scale} reference="70-80" index={1} />
        <PhysicalMetric label="Envergadura" value={wingspan} unit="cm" icon={Ruler} index={2} />
        <PhysicalMetric label="% Gordura" value={body_fat_percentage} unit="%" icon={Percent} reference="8-12%" index={3} />
        <PhysicalMetric label="Massa Musc." value={muscle_mass} unit="kg" icon={Dumbbell} index={4} />
      </div>

      {/* Performance metrics grid */}
      {(max_speed || sprint_30m || vo2_max) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mt-4">
          <PhysicalMetric label="Vel. Máx" value={max_speed} unit="km/h" icon={Zap} reference="32+" index={5} />
          <PhysicalMetric label="Sprint 30m" value={sprint_30m} unit="s" icon={Timer} reference="< 4.0" index={6} />
          <PhysicalMetric label="VO2 Máx" value={vo2_max} unit="ml/kg" icon={Heart} reference="55+" index={7} />
        </div>
      )}
    </motion.section>
  );
}
