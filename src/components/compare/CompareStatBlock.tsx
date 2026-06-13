import { motion } from "framer-motion";
import { LucideIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAYER_COLORS } from "@/components/players/ComparisonRadarOverlay";

interface StatValue {
  playerId: string;
  playerName: string;
  position: string;
  value: number | string | null;
  per90?: number | null;
}

interface CompareStatRowProps {
  label: string;
  values: StatValue[];
  higherIsBetter?: boolean;
  format?: "number" | "percent" | "decimal";
  showPer90?: boolean;
  per90Mode?: boolean;
}

export function CompareStatRow({
  label,
  values,
  higherIsBetter = true,
  format = "number",
  showPer90 = false,
  per90Mode = false,
}: CompareStatRowProps) {
  // Find best value
  const numericValues = values
    .map((v, idx) => ({ value: typeof v.value === 'number' ? v.value : null, idx }))
    .filter((v) => v.value !== null);

  const bestIdx = numericValues.length > 0
    ? numericValues.reduce((a, b) => {
        if (a.value === null) return b;
        if (b.value === null) return a;
        return higherIsBetter 
          ? (a.value > b.value ? a : b)
          : (a.value < b.value ? a : b);
      }).idx
    : null;

  // Check if all values are equal
  const allEqual = numericValues.length > 1 && 
    numericValues.every((v) => v.value === numericValues[0].value);

  const formatValue = (val: number | string | null): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percent':
        return `${Math.round(val)}%`;
      case 'decimal':
        return val.toFixed(1);
      default:
        return Math.round(val).toString();
    }
  };

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
      {values.map((stat, idx) => {
        const isBest = !allEqual && bestIdx === idx && numericValues.length > 1;
        const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];

        return (
          <motion.div
            key={stat.playerId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative p-3 rounded-lg text-center transition-all"
            style={isBest ? {
              background: color.fill,
              outline: `1px solid ${color.stroke}`,
            } : { background: "rgba(24,24,27,0.5)" }}
          >
            {isBest && (
              <div className="absolute top-1 right-1">
                <TrendingUp className="w-3 h-3" style={{ color: color.stroke }} />
              </div>
            )}

            <p
              className="text-xl font-bold tabular-nums"
              style={{ color: isBest ? color.stroke : "#d4d4d8" }}
            >
              {per90Mode && stat.per90 !== undefined && stat.per90 !== null
                ? formatValue(stat.per90)
                : formatValue(stat.value)
              }
            </p>

            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
              {label}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

interface CompareStatBlockProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function CompareStatBlock({ title, icon: Icon, children, className }: CompareStatBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50 bg-zinc-900">
        <Icon className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {children}
      </div>
    </motion.div>
  );
}

// Horizontal bar comparison
interface CompareBarRowProps {
  label: string;
  values: StatValue[];
  maxValue?: number;
  higherIsBetter?: boolean;
}

export function CompareBarRow({ label, values, maxValue: customMax, higherIsBetter = true }: CompareBarRowProps) {
  const numericValues = values
    .map((v) => typeof v.value === 'number' ? v.value : 0);
  
  const maxValue = customMax || Math.max(...numericValues, 1);

  // Find best
  const bestIdx = numericValues.length > 0
    ? numericValues.reduce((bestI, val, i, arr) => {
        return higherIsBetter 
          ? (val > arr[bestI] ? i : bestI)
          : (val < arr[bestI] ? i : bestI);
      }, 0)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      
      <div className="space-y-2">
        {values.map((stat, idx) => {
          const numValue = typeof stat.value === 'number' ? stat.value : 0;
          const percentage = Math.min((numValue / maxValue) * 100, 100);
          const isBest = bestIdx === idx && values.length > 1;
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          return (
            <div key={stat.playerId} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-20 truncate">
                {stat.playerName.split(' ')[0]}
              </span>

              <div className="flex-1 h-5 bg-zinc-800/50 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: color.stroke,
                    boxShadow: isBest ? `0 0 12px ${color.stroke}` : undefined,
                  }}
                />
              </div>

              <span
                className="text-sm font-bold tabular-nums w-10 text-right"
                style={{ color: isBest ? color.stroke : "#a1a1aa" }}
              >
                {Math.round(numValue)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
