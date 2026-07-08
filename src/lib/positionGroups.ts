// Canonical 6-way position grouping used wherever we need position-aware
// benchmarks (physical composition, performance thresholds, etc). Keeping
// this in one place means every feature that groups players by position
// agrees on the same buckets.

export const POSITION_GROUPS = [
  "goleiro",
  "zagueiro",
  "lateral",
  "volante_meia",
  "ponta_meia_atacante",
  "centroavante",
] as const;

export type PositionGroupKey = typeof POSITION_GROUPS[number];

export const POSITION_GROUP_LABELS: Record<PositionGroupKey, string> = {
  goleiro:             "Goleiros",
  zagueiro:            "Zagueiros",
  lateral:             "Laterais/Alas",
  volante_meia:        "Meio-Campistas",
  ponta_meia_atacante: "Pontas/Meias Ofensivos",
  centroavante:        "Centroavantes",
};

// Maps the raw `position` string stored on the player record to one of the
// groups above. Falls back to the mid-field group when the position is
// missing/unrecognized, since it sits closest to the overall mean.
const POSITION_TO_GROUP: Record<string, PositionGroupKey> = {
  "Goleiro":          "goleiro",
  "Zagueiro":         "zagueiro",
  "Lateral Direito":  "lateral",
  "Lateral Esquerdo": "lateral",
  "Volante":          "volante_meia",
  "Meia":             "volante_meia",
  "Meia Atacante":    "ponta_meia_atacante",
  "Ponta Direita":    "ponta_meia_atacante",
  "Ponta Esquerda":   "ponta_meia_atacante",
  "Segundo Atacante": "ponta_meia_atacante",
  "Centroavante":     "centroavante",
  "Atacante":         "centroavante",
};

export const getPositionGroup = (position?: string | null): PositionGroupKey =>
  POSITION_TO_GROUP[position ?? ""] ?? "volante_meia";
