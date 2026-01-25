import { 
  Target, 
  Footprints, 
  Shield, 
  Crosshair,
  AlertTriangle 
} from "lucide-react";
import { StatCard, StatGroup } from "./StatCard";

interface PlayerStatsData {
  // General
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  // Passing & Creation
  accurate_passes: number;
  total_passes: number;
  key_passes: number;
  chances_created: number;
  long_passes_accurate: number;
  long_passes_total: number;
  // Shooting
  shots: number;
  shots_on_target: number;
  shots_blocked: number;
  offsides: number;
  // Defense & Duels
  tackles: number;
  interceptions: number;
  clearances: number;
  recoveries: number;
  ground_duels_won: number;
  ground_duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  // Ball control & Discipline
  successful_dribbles: number;
  total_dribbles: number;
  possession_lost: number;
  fouls_drawn: number;
  fouls_committed: number;
  times_dribbled_past: number;
}

interface OutfieldPlayerStatsProps {
  stats: PlayerStatsData;
}

/**
 * Stats display for outfield (non-goalkeeper) players
 * Shows: General, Passing, Shooting, Defense, and Discipline stats
 */
export function OutfieldPlayerStats({ stats }: OutfieldPlayerStatsProps) {
  // Ensure all values are safe (never undefined/NaN)
  const safe = (val: number | undefined | null): number => 
    typeof val === "number" && !isNaN(val) ? val : 0;

  return (
    <div className="space-y-6">
      {/* A) ATAQUE - Finalizações e gols */}
      <StatGroup title="Ataque" icon={<Crosshair className="w-4 h-4" />}>
        <StatCard 
          label="Jogos" 
          value={safe(stats.matches)} 
          highlight 
        />
        <StatCard 
          label="Minutos" 
          value={safe(stats.minutes)} 
        />
        <StatCard 
          label="Gols" 
          value={safe(stats.goals)} 
          variant="success"
          highlight
        />
        <StatCard 
          label="Finalizações" 
          value={safe(stats.shots)} 
        />
        <StatCard 
          label="No Gol" 
          value={safe(stats.shots_on_target)} 
          total={safe(stats.shots) || undefined}
          showPercentage={safe(stats.shots) > 0}
        />
        <StatCard 
          label="Fora" 
          value={Math.max(0, safe(stats.shots) - safe(stats.shots_on_target))} 
        />
        <StatCard 
          label="Bloqueados" 
          value={safe(stats.shots_blocked)} 
        />
        <StatCard 
          label="Impedimentos" 
          value={safe(stats.offsides)} 
        />
      </StatGroup>

      {/* B) PASSES - Assistências, passes decisivos e criação */}
      <StatGroup title="Passes" icon={<Footprints className="w-4 h-4" />}>
        <StatCard 
          label="Assistências" 
          value={safe(stats.assists)} 
          variant="success"
        />
        <StatCard 
          label="Passes Decisivos" 
          value={safe(stats.key_passes)} 
        />
        <StatCard 
          label="Chances Criadas" 
          value={safe(stats.chances_created)} 
        />
        <StatCard 
          label="Passes Certos" 
          value={safe(stats.accurate_passes)} 
          total={safe(stats.total_passes)}
        />
        <StatCard 
          label="Passes Longos" 
          value={safe(stats.long_passes_accurate)} 
          total={safe(stats.long_passes_total) || undefined}
          showPercentage={safe(stats.long_passes_total) > 0}
        />
      </StatGroup>

      {/* C) DRIBLES / POSSE - Controle de bola */}
      <StatGroup title="Dribles / Posse" icon={<Target className="w-4 h-4" />}>
        <StatCard 
          label="Dribles Certos" 
          value={safe(stats.successful_dribbles)} 
          total={safe(stats.total_dribbles) || undefined}
          showPercentage={safe(stats.total_dribbles) > 0}
        />
        <StatCard 
          label="Dribles Errados" 
          value={Math.max(0, safe(stats.total_dribbles) - safe(stats.successful_dribbles))} 
        />
        <StatCard 
          label="Faltas Sofridas" 
          value={safe(stats.fouls_drawn)} 
        />
        <StatCard 
          label="Perda de Posse" 
          value={safe(stats.possession_lost)} 
        />
      </StatGroup>

      {/* D) DEFESA - Ações defensivas, duelos e disciplina */}
      <StatGroup title="Defesa" icon={<Shield className="w-4 h-4" />}>
        <StatCard 
          label="Desarmes" 
          value={safe(stats.tackles)} 
        />
        <StatCard 
          label="Interceptações" 
          value={safe(stats.interceptions)} 
        />
        <StatCard 
          label="Cortes" 
          value={safe(stats.clearances)} 
        />
        <StatCard 
          label="Recuperações" 
          value={safe(stats.recoveries)} 
        />
      </StatGroup>

      {/* Duelos */}
      <StatGroup title="Duelos" icon={<Target className="w-4 h-4" />}>
        <StatCard 
          label="Duelos no Chão" 
          value={safe(stats.ground_duels_won)} 
          total={safe(stats.ground_duels_total) || undefined}
          showPercentage={safe(stats.ground_duels_total) > 0}
        />
        <StatCard 
          label="% Chão" 
          value={safe(stats.ground_duels_total) > 0 
            ? Math.round((safe(stats.ground_duels_won) / safe(stats.ground_duels_total)) * 100) 
            : 0}
        />
        <StatCard 
          label="Duelos Aéreos" 
          value={safe(stats.aerial_duels_won)} 
          total={safe(stats.aerial_duels_total) || undefined}
          showPercentage={safe(stats.aerial_duels_total) > 0}
        />
        <StatCard 
          label="% Aéreo" 
          value={safe(stats.aerial_duels_total) > 0 
            ? Math.round((safe(stats.aerial_duels_won) / safe(stats.aerial_duels_total)) * 100) 
            : 0}
        />
        <StatCard 
          label="Duelos Ganhos" 
          value={safe(stats.ground_duels_won) + safe(stats.aerial_duels_won)} 
        />
        <StatCard 
          label="Duelos Totais" 
          value={safe(stats.ground_duels_total) + safe(stats.aerial_duels_total)} 
        />
        <StatCard 
          label="Driblado" 
          value={safe(stats.times_dribbled_past)} 
        />
      </StatGroup>

      {/* Disciplina (sub-seção dentro de Defesa) */}
      <StatGroup title="Disciplina" icon={<AlertTriangle className="w-4 h-4" />}>
        <StatCard 
          label="Faltas Cometidas" 
          value={safe(stats.fouls_committed)} 
          variant={safe(stats.fouls_committed) > 10 ? "warning" : "default"}
        />
        <StatCard 
          label="Amarelos" 
          value={safe(stats.yellow_cards)} 
          variant="warning"
        />
        <StatCard 
          label="Vermelhos" 
          value={safe(stats.red_cards)} 
          variant="danger"
        />
      </StatGroup>
    </div>
  );
}
