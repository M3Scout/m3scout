import { Link } from "react-router-dom";
import { User, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeInUp, cardHover, cardTap } from "@/lib/animations";

interface AthleteHeroProps {
  athleteName: string;
  athletePosition: string;
  athleteClub?: string | null;
  athleteId: string;
}

export function AthleteHero({ athleteName, athletePosition, athleteClub, athleteId }: AthleteHeroProps) {
  return (
    <motion.div 
      {...fadeInUp}
      className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-glass)] backdrop-blur-sm border border-[var(--border-glass)] w-full max-w-full"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvZz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative px-[var(--padding-mobile)] sm:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Painel do Atleta</p>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight">
              {athleteName}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {athletePosition}
              </span>
              {athleteClub && (
                <span className="text-zinc-500">{athleteClub}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <motion.div whileHover={cardHover} whileTap={cardTap}>
              <Link to={`/app/players/${athleteId}`}>
                <Button 
                  variant="glass" 
                  size="sm"
                  className="min-h-[var(--tap-target)] rounded-[var(--radius-button)]"
                >
                  <User className="w-4 h-4 mr-2" />
                  Meu Perfil
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={cardHover} whileTap={cardTap}>
              <Link to="/app/my-games">
                <Button 
                  variant="glass" 
                  size="sm"
                  className="min-h-[var(--tap-target)] rounded-[var(--radius-button)]"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Meus Jogos
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={cardHover} whileTap={cardTap}>
              <Link to={`/app/players/${athleteId}?tab=stats`}>
                <Button 
                  size="sm"
                  className="min-h-[var(--tap-target)] rounded-[var(--radius-button)] bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ver Estatísticas
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
