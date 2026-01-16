import { motion } from "framer-motion";
import { GitCompare, Plus, Users } from "lucide-react";

interface CompareHeroProps {
  playersCount: number;
  onAddClick?: () => void;
}

export function CompareHero({ playersCount, onAddClick }: CompareHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        {/* Radar-like pattern */}
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Pentagon shapes */}
          <g transform="translate(320, 100)">
            <polygon 
              points="0,-60 57,-19 35,49 -35,49 -57,-19" 
              fill="none" 
              stroke="url(#radar-gradient)" 
              strokeWidth="1"
            />
            <polygon 
              points="0,-45 43,-14 26,37 -26,37 -43,-14" 
              fill="none" 
              stroke="url(#radar-gradient)" 
              strokeWidth="1"
            />
            <polygon 
              points="0,-30 29,-9 18,24 -18,24 -29,-9" 
              fill="none" 
              stroke="url(#radar-gradient)" 
              strokeWidth="1"
            />
          </g>
          {/* Connection lines */}
          <line x1="50" y1="100" x2="150" y2="100" stroke="url(#radar-gradient)" strokeWidth="2" strokeDasharray="4,4" />
          <line x1="200" y1="100" x2="260" y2="100" stroke="url(#radar-gradient)" strokeWidth="2" />
        </svg>
      </div>

      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left side - Text */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 ring-1 ring-orange-500/30">
                <GitCompare className="w-5 h-5 text-orange-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Comparar Atletas
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-zinc-400 text-sm sm:text-base max-w-md"
            >
              Análise lado a lado baseada em dados reais de desempenho. 
              Compare até 4 atletas simultaneamente.
            </motion.p>

            {playersCount === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 text-xs text-zinc-500"
              >
                <Users className="w-4 h-4" />
                <span>Selecione de 2 a 4 atletas para iniciar</span>
              </motion.div>
            )}
          </div>

          {/* Right side - Stats or CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3"
          >
            {[0, 1, 2, 3].map((slot) => (
              <motion.div
                key={slot}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + slot * 0.05 }}
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center
                  ${slot < playersCount 
                    ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 ring-2 ring-orange-500/50' 
                    : 'bg-zinc-800/50 border-2 border-dashed border-zinc-700'
                  }
                  transition-all duration-300
                `}
              >
                {slot < playersCount ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                ) : (
                  <Plus className="w-4 h-4 text-zinc-600" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
