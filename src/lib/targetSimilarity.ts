import type { Target } from "@/types/marketScore";

// Target-vs-target similarity only (not vs. signed players — different data
// shapes: targets only ever have the 1-5 star evaluation matrix, never the
// full ATA/TEC/DEF/TAT/CRI radar computed from match stats). Deterministic
// scoring instead of an LLM call: cheap, instant, and explainable with only
// 4 pillar scores + position + tags to compare.

export interface SimilarTargetResult {
  target: Target;
  score: number; // 0-100
  matchedOn: string[];
}

type ScorableTarget = Pick<Target, "id" | "status" | "position" | "score_physical" | "score_technical" | "score_tactical" | "score_mental" | "tags"> & {
  secondary_position?: string | null;
  notable_characteristics?: string[] | null;
};

const PILLARS = ["score_physical", "score_technical", "score_tactical", "score_mental"] as const;

function pillarValues(t: ScorableTarget): number[] {
  return PILLARS.map(p => (t as any)[p]).filter((v): v is number => v != null);
}

function tagSet(t: ScorableTarget): Set<string> {
  return new Set([...(t.tags || []), ...(t.notable_characteristics || [])].map(s => s.toLowerCase()));
}

export function findSimilarTargets(
  target: ScorableTarget,
  allTargets: ScorableTarget[],
  limit = 5,
): SimilarTargetResult[] {
  const candidates = allTargets.filter(t => t.id !== target.id && t.status !== "DROPPED");
  const targetPillars = pillarValues(target);
  const targetTags = tagSet(target);
  const hasTargetPillars = targetPillars.length > 0;

  const results = candidates.map(candidate => {
    const matchedOn: string[] = [];
    let score = 0;

    // Position match — highest signal, always evaluated.
    const positionWeight = hasTargetPillars ? 25 : 55;
    if (candidate.position === target.position) {
      score += positionWeight;
      matchedOn.push("Mesma posição");
    } else if (
      (candidate as any).secondary_position === target.position ||
      candidate.position === (target as any).secondary_position
    ) {
      score += positionWeight * 0.5;
      matchedOn.push("Posição secundária compatível");
    }

    // Pillar similarity — only meaningful when both sides have at least one score in common.
    const candidatePillars = pillarValues(candidate);
    if (hasTargetPillars && candidatePillars.length > 0) {
      const commonIdx = PILLARS.map((p, i) => i).filter(i => (target as any)[PILLARS[i]] != null && (candidate as any)[PILLARS[i]] != null);
      if (commonIdx.length > 0) {
        const sqDiffs = commonIdx.map(i => {
          const a = (target as any)[PILLARS[i]] as number;
          const b = (candidate as any)[PILLARS[i]] as number;
          return ((a - b) / 5) ** 2; // normalize 0-5 scale to 0-1
        });
        const rmse = Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / sqDiffs.length);
        const pillarScore = Math.max(0, 1 - rmse) * 60;
        score += pillarScore;
        if (pillarScore > 42) matchedOn.push("Perfil de avaliação muito parecido");
        else if (pillarScore > 24) matchedOn.push("Perfil de avaliação parecido");
      }
    }

    // Tag / characteristic overlap.
    const candidateTags = tagSet(candidate);
    const overlap = [...targetTags].filter(tag => candidateTags.has(tag));
    if (targetTags.size > 0 && candidateTags.size > 0 && overlap.length > 0) {
      const jaccard = overlap.length / new Set([...targetTags, ...candidateTags]).size;
      const tagWeight = hasTargetPillars ? 15 : 45;
      score += jaccard * tagWeight;
      matchedOn.push(`${overlap.length} característica${overlap.length > 1 ? "s" : ""} em comum`);
    }

    return { target: candidate as Target, score: Math.round(Math.min(100, score)), matchedOn };
  });

  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
