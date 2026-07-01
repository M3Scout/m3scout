import { Star } from "lucide-react";
import type { TacticalFormation } from "./types";

interface FormationVariationTabsProps {
  formation: TacticalFormation;
  selectedVariationKey: string;
  accent: string;
  onSelect: (key: string) => void;
}

export function FormationVariationTabs({
  formation,
  selectedVariationKey,
  accent,
  onSelect,
}: FormationVariationTabsProps) {
  const entries = Object.entries(formation.variations);

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, variation]) => {
        const isActive = key === selectedVariationKey;
        const isRecommended = key === formation.recommendedVariation;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-archivo font-semibold text-[13.5px] transition-all duration-200"
            style={{
              background: isActive ? `${accent}1e` : "#0f1311",
              border: `1px solid ${isActive ? `${accent}70` : "#1c2120"}`,
              color: isActive ? accent : "#9aa49d",
            }}
          >
            {isRecommended && (
              <Star className="w-3.5 h-3.5 shrink-0" fill={isActive ? accent : "none"} strokeWidth={2} />
            )}
            {variation.label}
          </button>
        );
      })}
    </div>
  );
}
