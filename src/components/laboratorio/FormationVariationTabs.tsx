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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] font-archivo font-medium text-[13.5px] transition-colors duration-200"
            style={{
              background: isActive ? "rgba(255,255,255,0.06)" : "#141318",
              border: `1px solid ${isActive ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.075)"}`,
              color: isActive ? "#ededee" : "#62616a",
              boxShadow: isActive ? `inset 0 -2px 0 ${accent}` : "none",
            }}
          >
            {isRecommended && (
              <Star className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? accent : "#62616a" }} fill={isActive ? accent : "none"} strokeWidth={2} />
            )}
            {variation.label}
          </button>
        );
      })}
    </div>
  );
}
