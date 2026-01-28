import { 
  Target, 
  Footprints, 
  Shield, 
  Crosshair,
  AlertTriangle 
} from "lucide-react";
import { StatCard, StatGroup } from "./StatCard";
import { normalizePlayerStats } from "@/lib/normalizePlayerStats";

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
  crosses_success?: number;
  crosses_failed?: number;
  // Shooting (Attack)
  shots: number;
  shots_on_target: number;
  shots_blocked: number; // Offensive - our shot was blocked
  offsides: number;
  // Defense & Duels
  tackles: number;
  interceptions: number;
  clearances: number;
  recoveries: number;
  blocked_shots?: number; // Defensive - blocking opponent's shot
  was_dribbled?: number;
  ground_duels_won: number;
  ground_duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  // Ball control & Discipline (Dribles/Posse)
  ball_actions?: number;
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
export function OutfieldPlayerStats({ stats: rawStats }: OutfieldPlayerStatsProps) {
  // CRITICAL: Normalize stats to ensure consistency (total >= sum of parts)
  const normalized = normalizePlayerStats(rawStats as any);
  
  // Ensure all values are safe (never undefined/NaN)
  const safe = (val: number | undefined | null): number => 
    typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;

  return (
    <div className="space-y-6">
      {/* A) ATAQUE - Finalizações e gols */}
      <StatGroup title="Ataque" icon={<Crosshair className="w-4 h-4" />}>
        <StatCard 
          label="Jogos" 
          value={safe(rawStats.matches)} 
          highlight 
        />
        <StatCard 
          label="Minutos" 
          value={safe(rawStats.minutes)} 
        />
        <StatCard 
          label="Gols" 
          value={safe(rawStats.goals)} 
          variant="success"
          highlight
        />
        {/* CRITICAL: Use normalized shots_total_derived to ensure total >= on_target + blocked */}
        <StatCard 
          label="Finalizações" 
          value={normalized.shots_total_derived} 
        />
        <StatCard 
          label="No Gol" 
          value={safe(rawStats.shots_on_target)} 
          total={normalized.shots_total_derived || undefined}
          showPercentage={normalized.shots_total_derived > 0}
        />
        {/* Use derived shots_off_target for consistency */}
        <StatCard 
          label="Fora" 
          value={normalized.shots_off_target} 
        />
        <StatCard 
          label="Bloqueados" 
          value={safe(rawStats.shots_blocked)} 
        />
        <StatCard 
          label="Impedimentos" 
          value={safe(rawStats.offsides)} 
        />
      </StatGroup>

      {/* B) PASSES - Assistências, passes decisivos e criação */}
      <StatGroup title="Passes" icon={<Footprints className="w-4 h-4" />}>
        <StatCard 
          label="Assistências" 
          value={safe(rawStats.assists)} 
          variant="success"
        />
        <StatCard 
          label="Passes Decisivos" 
          value={safe(rawStats.key_passes)} 
        />
        <StatCard 
          label="Chances Criadas" 
          value={safe(rawStats.chances_created)} 
        />
        <StatCard 
          label="Passes Certos" 
          value={safe(rawStats.accurate_passes)} 
          total={normalized.passes_total_derived}
        />
        <StatCard 
          label="Cruzamentos Certos" 
          value={safe(rawStats.crosses_success)} 
          total={normalized.crosses_total || undefined}
          showPercentage={normalized.crosses_total > 0}
        />
        <StatCard 
          label="Cruzamentos Errados" 
          value={safe(rawStats.crosses_failed)} 
        />
      </StatGroup>

      {/* C) DRIBLES / POSSE - Controle de bola */}
      <StatGroup title="Dribles / Posse" icon={<Target className="w-4 h-4" />}>
        <StatCard 
          label="Ações com a Bola" 
          value={safe(rawStats.ball_actions)} 
        />
        <StatCard 
          label="Dribles Certos" 
          value={safe(rawStats.successful_dribbles)} 
          total={normalized.dribbles_total_derived || undefined}
          showPercentage={normalized.dribbles_total_derived > 0}
        />
        <StatCard 
          label="Dribles Errados" 
          value={Math.max(0, normalized.dribbles_total_derived - safe(rawStats.successful_dribbles))} 
        />
        <StatCard 
          label="Faltas Sofridas" 
          value={safe(rawStats.fouls_drawn)} 
        />
        <StatCard 
          label="Perda de Posse" 
          value={safe(rawStats.possession_lost)} 
        />
      </StatGroup>

      {/* D) DEFESA - Ações defensivas, duelos e disciplina */}
      <StatGroup title="Defesa" icon={<Shield className="w-4 h-4" />}>
        <StatCard 
          label="Desarmes" 
          value={safe(rawStats.tackles)} 
        />
        <StatCard 
          label="Interceptações" 
          value={safe(rawStats.interceptions)} 
        />
        <StatCard 
          label="Cortes" 
          value={safe(rawStats.clearances)} 
        />
        <StatCard 
          label="Recuperações" 
          value={safe(rawStats.recoveries)} 
        />
        <StatCard 
          label="Chutes Bloqueados" 
          value={safe(rawStats.blocked_shots)} 
        />
        <StatCard 
          label="Driblado" 
          value={safe(rawStats.was_dribbled)} 
        />
      </StatGroup>

      {/* Duelos */}
      <StatGroup title="Duelos" icon={<Target className="w-4 h-4" />}>
        <StatCard 
          label="Duelos no Chão" 
          value={safe(rawStats.ground_duels_won)} 
          total={safe(rawStats.ground_duels_total) || undefined}
          showPercentage={safe(rawStats.ground_duels_total) > 0}
        />
        <StatCard 
          label="% Chão" 
          value={safe(rawStats.ground_duels_total) > 0 
            ? Math.round((safe(rawStats.ground_duels_won) / safe(rawStats.ground_duels_total)) * 100) 
            : 0}
        />
        <StatCard 
          label="Duelos Aéreos" 
          value={safe(rawStats.aerial_duels_won)} 
          total={normalized.aerial_duels_total_derived || undefined}
          showPercentage={normalized.aerial_duels_total_derived > 0}
        />
        <StatCard 
          label="% Aéreo" 
          value={normalized.aerial_duels_total_derived > 0 
            ? Math.round((safe(rawStats.aerial_duels_won) / normalized.aerial_duels_total_derived) * 100) 
            : 0}
        />
        <StatCard 
          label="Duelos Ganhos" 
          value={safe(rawStats.ground_duels_won) + safe(rawStats.aerial_duels_won)} 
        />
        <StatCard 
          label="Duelos Totais" 
          value={safe(rawStats.ground_duels_total) + normalized.aerial_duels_total_derived} 
        />
      </StatGroup>

      {/* Disciplina (sub-seção dentro de Defesa) */}
      <StatGroup title="Disciplina" icon={<AlertTriangle className="w-4 h-4" />}>
        <StatCard 
          label="Faltas Cometidas" 
          value={safe(rawStats.fouls_committed)} 
          variant={safe(rawStats.fouls_committed) > 10 ? "warning" : "default"}
        />
        <StatCard 
          label="Amarelos" 
          value={safe(rawStats.yellow_cards)} 
          variant="warning"
        />
        <StatCard 
          label="Vermelhos" 
          value={safe(rawStats.red_cards)} 
          variant="danger"
        />
      </StatGroup>
    </div>
  );
}
