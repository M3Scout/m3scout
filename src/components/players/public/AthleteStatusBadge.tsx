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
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "text-xs font-medium",
        isContracted 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      )}
    >
      {isContracted ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <TrendingUp className="w-3.5 h-3.5" />
      )}
      <span>
        {isContracted ? "Contratado" : "Livre no Mercado"}
        {currentClub && isContracted && (
          <span className="text-emerald-400/70 ml-1">• {currentClub}</span>
        )}
      </span>
    </motion.div>
  );
}
