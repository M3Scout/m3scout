import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, Star, ChevronRight, Filter, Crown, Medal, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFixed } from "@/lib/formatters";
import { motion } from "framer-motion";
import { fadeInUp, cardHover, cardTap } from "@/lib/animations";

interface RankedPlayer {
  id: string;
  full_name: string;
  position: string;
  auto_rating: number | null;
  current_club: string | null;
  age: number | null;
}

const POSITIONS = [
  { value: "all", label: "Todas" },
  { value: "Goleiro", label: "GOL" },
  { value: "Zagueiro", label: "ZAG" },
  { value: "Lateral Direito", label: "LD" },
  { value: "Lateral Esquerdo", label: "LE" },
  { value: "Volante", label: "VOL" },
  { value: "Meia", label: "MEI" },
  { value: "Meia Atacante", label: "MEA" },
  { value: "Ponta Direita", label: "PD" },
  { value: "Ponta Esquerda", label: "PE" },
  { value: "Centroavante", label: "CA" },
  { value: "Atacante", label: "ATA" },
];

const getMedalIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-4 h-4 text-yellow-400" />;
    case 2:
      return <Medal className="w-4 h-4 text-zinc-400" />;
    case 3:
      return <Award className="w-4 h-4 text-amber-600" />;
    default:
      return null;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10";
    case 2:
      return "bg-gradient-to-r from-zinc-400/10 to-zinc-500/5";
    case 3:
      return "bg-gradient-to-r from-amber-600/15 to-orange-500/5";
    default:
      return "bg-zinc-800/30";
  }
};

const getRatingColor = (rating: number | null) => {
  if (!rating) return "bg-zinc-800 text-zinc-500";
  if (rating >= 4.5) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (rating >= 4.0) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (rating >= 3.0) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-zinc-800 text-zinc-400";
};

export const TopPlayersCard = () => {
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState("all");

  useEffect(() => {
    const fetchRankedPlayers = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("players")
          .select("id, full_name, position, auto_rating, current_club, age")
          .not("auto_rating", "is", null)
          .or("is_archived.is.null,is_archived.eq.false")
          .order("auto_rating", { ascending: false })
          .limit(8);

        if (positionFilter !== "all") {
          query = query.eq("position", positionFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPlayers(data || []);
      } catch (error) {
        console.error("Error fetching ranked players:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankedPlayers();
  }, [positionFilter]);

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.2 }}
      className="w-full max-w-full h-full flex flex-col rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-primary/20 to-red-600/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Top Atletas</h2>
              <p className="text-[10px] text-muted-foreground">Ranking por nota automática</p>
            </div>
          </div>
          
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-24 h-8 text-xs bg-zinc-800/50 border-zinc-700 rounded-[var(--radius-button)]">
              <Filter className="w-3 h-3 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent className="rounded-[var(--radius-button)]">
              {POSITIONS.map((pos) => (
                <SelectItem key={pos.value} value={pos.value} className="text-xs">
                  {pos.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content - flex-1 to fill available height */}
      <div className="p-3 flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex flex-col justify-between h-full gap-1.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 min-h-[52px] bg-zinc-800/30 rounded-[var(--radius-button)] animate-pulse" />
            ))}
          </div>
        ) : players.length > 0 ? (
          <div className="flex flex-col justify-between h-full gap-1.5">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <Link
                  to={`/app/players/${player.id}`}
                  className={`group flex items-center gap-3 p-3 flex-1 min-h-[52px] rounded-[var(--radius-button)] transition-all duration-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 w-full max-w-full overflow-hidden ${getRankBg(index + 1)}`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    index < 3 ? '' : 'bg-zinc-800 text-muted-foreground'
                  }`}>
                    {getMedalIcon(index + 1) || (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {player.full_name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-medium">{player.position}</span>
                      {player.age && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span>{player.age}a</span>
                        </>
                      )}
                      {player.current_club && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span className="truncate max-w-[80px]">{player.current_club}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <Badge 
                    variant="outline" 
                    className={`${getRatingColor(player.auto_rating)} border font-semibold text-xs px-2 py-0.5 rounded-full`}
                  >
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {formatFixed(player.auto_rating, 1, "-")}
                  </Badge>

                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Nenhum atleta com nota</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {players.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-t border-zinc-800/40 bg-zinc-900/30">
          <Link 
            to="/app/players"
            className="text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 font-medium transition-colors"
          >
            Ver todos os atletas
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </motion.div>
  );
};
