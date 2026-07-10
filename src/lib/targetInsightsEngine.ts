// Parallel to insightsEngine.ts (which is tightly typed to Players) — Targets
// have a different shape and a much simpler output (a single badge per card,
// not a modal/list), so a dedicated lightweight engine is lower-risk than
// threading Target rules into the player engine.

export type TargetAlertSeverity = "critical" | "alert";

export interface TargetAlert {
  severity: TargetAlertSeverity;
  reason: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY_MS;

interface TargetForAlert {
  status: string;
  created_at: string;
  updated_at: string;
}

// `lastObservationDate` is the most recent target_observations.observation_date
// for this target, or null if none was ever logged.
export function getTargetAlertSeverity(
  target: TargetForAlert,
  lastObservationDate: string | null,
): TargetAlert | null {
  // Signed/dropped targets are no longer being actively monitored — no noise.
  if (target.status === "SIGNED" || target.status === "DROPPED") return null;

  if (lastObservationDate) {
    const days = daysSince(lastObservationDate);
    if (days > 60) return { severity: "critical", reason: `Sem observação há ${Math.floor(days)} dias` };
    if (days > 30) return { severity: "alert", reason: `Sem observação há ${Math.floor(days)} dias` };
  } else {
    const daysOpen = daysSince(target.created_at);
    if (daysOpen > 30) return { severity: "critical", reason: `Nenhuma observação registrada (criado há ${Math.floor(daysOpen)} dias)` };
  }

  if (target.status === "NEGOTIATION") {
    const daysStalled = daysSince(target.updated_at);
    if (daysStalled > 21) return { severity: "alert", reason: `Negociação sem atualização há ${Math.floor(daysStalled)} dias` };
  }

  return null;
}
