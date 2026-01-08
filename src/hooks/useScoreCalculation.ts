import { useState, useEffect, useMemo } from "react";
import { 
  CategoryScores, 
  ScoreBreakdown, 
  calculateScoreBreakdown 
} from "@/lib/scoring";

interface UseScoreCalculationProps {
  competitionCoefficient: number;
}

export function useScoreCalculation({ competitionCoefficient }: UseScoreCalculationProps) {
  const [scores, setScores] = useState<CategoryScores>({
    technical: 50,
    tactical: 50,
    physical: 50,
    mental: 50,
    impact: 50,
  });

  const [potentialBonus, setPotentialBonus] = useState(0);
  const [consistencyModifier, setConsistencyModifier] = useState(0);

  const breakdown = useMemo<ScoreBreakdown>(() => {
    return calculateScoreBreakdown(
      scores,
      competitionCoefficient,
      potentialBonus,
      consistencyModifier
    );
  }, [scores, competitionCoefficient, potentialBonus, consistencyModifier]);

  const updateScore = (category: keyof CategoryScores, value: number) => {
    setScores((prev) => ({
      ...prev,
      [category]: Math.min(100, Math.max(0, value)),
    }));
  };

  return {
    scores,
    setScores,
    updateScore,
    potentialBonus,
    setPotentialBonus,
    consistencyModifier,
    setConsistencyModifier,
    breakdown,
  };
}
