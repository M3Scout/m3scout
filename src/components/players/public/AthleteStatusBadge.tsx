import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AthleteStatusBadgeProps {
  contractStatus: string | null;
  currentClub: string | null;
}

export function AthleteStatusBadge({ contractStatus, currentClub }: AthleteStatusBadgeProps) {
  const isContracted = contractStatus === "contracted";
  
  if (!contractStatus) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "inline-flex items-center gap-2.5 px-4 py-2 rounded-full",
        "backdrop-blur-sm",
        isContracted 
          ? "bg-emerald-950/40 border border-emerald-500/30"
          : "bg-amber-950/40 border border-amber-500/30"
      )}
    >
      {/* Animated icon with subtle pulse */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "p-1 rounded-full",
          isContracted ? "bg-emerald-500/20" : "bg-amber-500/20"
        )}
      >
        {isContracted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
        )}
      </motion.div>
      
      {/* Text with hierarchy */}
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "text-xs font-semibold tracking-wide",
          isContracted ? "text-emerald-300" : "text-amber-300"
        )}>
          {isContracted ? "Contratado" : "Livre no Mercado"}
        </span>
        {currentClub && isContracted && (
          <>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-medium text-zinc-400">{currentClub}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
