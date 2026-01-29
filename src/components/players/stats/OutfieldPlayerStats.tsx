import { 
  Target, 
  Footprints, 
  Shield, 
  Crosshair,
  AlertTriangle 
} from "lucide-react";
import { StatCard, StatGroup } from "./StatCard";
import { calculateXYMetric, debugValidateStats } from "@/lib/statsSemantics";
import { useEffect } from "react";

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
  total_passes: number; // SEMANTIC: This is FAILED passes count
  key_passes: number;
  chances_created: number;
  long_passes_accurate: number;
  long_passes_total: number;
  crosses_success?: number;
  crosses_failed?: number;
  // Shooting (Attack)
  shots: number; // SEMANTIC: OFF-TARGET shots
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
  ground_duels_total: number; // SEMANTIC: LOST ground duels
  aerial_duels_won: number;
  aerial_duels_total: number; // SEMANTIC: LOST aerial duels
  // Ball control & Discipline (Dribles/Posse)
  ball_actions?: number;
  successful_dribbles: number;
  total_dribbles: number; // SEMANTIC: FAILED dribbles count
  possession_lost: number;
  fouls_drawn: number;
  fouls_committed: number;
  times_dribbled_past: number;
  // Player ID for validation
  player_id?: string;
}

interface OutfieldPlayerStatsProps {
  stats: PlayerStatsData;
  playerId?: string;
}

/**
 * Stats display for outfield (non-goalkeeper) players
 * Shows: General, Passing, Shooting, Defense, and Discipline stats
 * 
 * REGRA MATEMÁTICA CANÔNICA (statsSemantics.ts):
 * - Database "*_total" fields store FAILED/LOST counts, NOT actual totals
 * - X = success count
 * - Y = success + failed (derived)
 * - percentage = (X / Y) * 100, capped at 100%
 */
export function OutfieldPlayerStats({ stats: rawStats, playerId }: OutfieldPlayerStatsProps) {
  // Ensure all values are safe (never undefined/NaN)
  const safe = (val: number | undefined | null): number => 
    typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;
  
  // === CANONICAL X/Y CALCULATIONS ===
  // Using statsSemantics.ts calculateXYMetric for all X/Y metrics
  
  // PASSES: passes_completed (success) + total_passes (FAILED) = real total
  const passesMetric = calculateXYMetric(rawStats.accurate_passes, rawStats.total_passes);
  
  // DRIBBLES: successful_dribbles (success) + total_dribbles (FAILED) = real total
  const dribblesMetric = calculateXYMetric(rawStats.successful_dribbles, rawStats.total_dribbles);
  
  // CROSSES: crosses_success + crosses_failed = real total
  const crossesMetric = calculateXYMetric(rawStats.crosses_success, rawStats.crosses_failed);
  
  // SHOTS: Calculate total = on_target + off_target + blocked
  const shotsOnTarget = safe(rawStats.shots_on_target);
  const shotsOffTarget = safe(rawStats.shots); // 'shots' field = off-target
  const shotsBlocked = safe(rawStats.shots_blocked);
  const shotsTotal = shotsOnTarget + shotsOffTarget + shotsBlocked;
  
  // GROUND DUELS: won + total (LOST) = real total
  const groundDuelsMetric = calculateXYMetric(rawStats.ground_duels_won, rawStats.ground_duels_total);
  
  // AERIAL DUELS: won + total (LOST) = real total
  const aerialDuelsMetric = calculateXYMetric(rawStats.aerial_duels_won, rawStats.aerial_duels_total);
  
  // TOTAL DUELS: aggregate of ground + aerial
  const totalDuelsWon = groundDuelsMetric.success + aerialDuelsMetric.success;
  const totalDuelsTotal = groundDuelsMetric.total + aerialDuelsMetric.total;
  
  // Debug validation in development
  useEffect(() => {
    if (playerId || rawStats.player_id) {
      debugValidateStats(
        {
          passes_completed: rawStats.accurate_passes,
          passes_total: rawStats.total_passes,
          dribbles_success: rawStats.successful_dribbles,
          dribbles_total: rawStats.total_dribbles,
          crosses_success: rawStats.crosses_success,
          crosses_failed: rawStats.crosses_failed,
          aerial_duels_won: rawStats.aerial_duels_won,
          aerial_duels_total: rawStats.aerial_duels_total,
          ground_duels_won: rawStats.ground_duels_won,
          ground_duels_total: rawStats.ground_duels_total,
        },
        playerId || rawStats.player_id || "unknown",
        "seasonal",
        "OutfieldPlayerStats"
      );
    }
  }, [rawStats, playerId]);

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
        {/* CANONICAL: Total shots = on_target + off_target + blocked */}
        <StatCard 
          label="Finalizações" 
          value={shotsTotal} 
        />
        <StatCard 
          label="No Gol" 
          value={shotsOnTarget} 
          total={shotsTotal || undefined}
          showPercentage={shotsTotal > 0}
        />
        <StatCard 
          label="Fora" 
          value={shotsOffTarget} 
        />
        <StatCard 
          label="Bloqueados" 
          value={shotsBlocked} 
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
        {/* CANONICAL: X/Y where X=passes_completed, Y=completed+failed */}
        <StatCard 
          label="Passes Certos" 
          value={passesMetric.success} 
          total={passesMetric.total}
          showPercentage={passesMetric.total > 0}
        />
        {/* CANONICAL: X/Y where X=crosses_success, Y=success+failed */}
        <StatCard 
          label="Cruzamentos Certos" 
          value={crossesMetric.success} 
          total={crossesMetric.total || undefined}
          showPercentage={crossesMetric.total > 0}
        />
        <StatCard 
          label="Cruzamentos Errados" 
          value={crossesMetric.fail} 
        />
      </StatGroup>

      {/* C) DRIBLES / POSSE - Controle de bola */}
      <StatGroup title="Dribles / Posse" icon={<Target className="w-4 h-4" />}>
        <StatCard 
          label="Ações com a Bola" 
          value={safe(rawStats.ball_actions)} 
        />
        {/* CANONICAL: X/Y where X=dribbles_success, Y=success+failed */}
        <StatCard 
          label="Dribles Certos" 
          value={dribblesMetric.success} 
          total={dribblesMetric.total || undefined}
          showPercentage={dribblesMetric.total > 0}
        />
        <StatCard 
          label="Dribles Errados" 
          value={dribblesMetric.fail} 
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

      {/* Duelos - CANONICAL: total = won + lost (where "total" field = lost) */}
      <StatGroup title="Duelos" icon={<Target className="w-4 h-4" />}>
        {/* CANONICAL: Ground duels X/Y where Y = won + lost */}
        <StatCard 
          label="Duelos no Chão" 
          value={groundDuelsMetric.success} 
          total={groundDuelsMetric.total || undefined}
          showPercentage={groundDuelsMetric.total > 0}
        />
        <StatCard 
          label="% Chão" 
          value={groundDuelsMetric.percentage}
        />
        {/* CANONICAL: Aerial duels X/Y where Y = won + lost */}
        <StatCard 
          label="Duelos Aéreos" 
          value={aerialDuelsMetric.success} 
          total={aerialDuelsMetric.total || undefined}
          showPercentage={aerialDuelsMetric.total > 0}
        />
        <StatCard 
          label="% Aéreo" 
          value={aerialDuelsMetric.percentage}
        />
        <StatCard 
          label="Duelos Ganhos" 
          value={totalDuelsWon} 
        />
        <StatCard 
          label="Duelos Totais" 
          value={totalDuelsTotal} 
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
