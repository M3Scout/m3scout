import { getPositionGroup, type PositionGroupKey } from "@/lib/positionGroups";

// Real European elite averages by position group. Shared between the athlete
// "Performance vs Elite" panel and the platform insights engine, so both
// features agree on the same reference numbers.
export const ELITE_PHYSICAL_BENCHMARKS: Record<PositionGroupKey, { altura: number; peso: number; imc: number; gordura: number; label: string }> = {
  goleiro:             { altura: 191, peso: 84, imc: 23.0, gordura: 10.5, label: "Goleiros" },
  zagueiro:            { altura: 189, peso: 82, imc: 22.9, gordura: 9.5,  label: "Zagueiros" },
  lateral:             { altura: 178, peso: 72, imc: 22.7, gordura: 8.0,  label: "Laterais/Alas" },
  volante_meia:        { altura: 181, peso: 75, imc: 22.8, gordura: 9.0,  label: "Meio-Campistas" },
  ponta_meia_atacante: { altura: 175, peso: 70, imc: 22.8, gordura: 8.5,  label: "Pontas/Meias Ofensivos" },
  centroavante:        { altura: 185, peso: 80, imc: 23.3, gordura: 9.0,  label: "Centroavantes" },
};

export const getEliteBenchmark = (position?: string | null) =>
  ELITE_PHYSICAL_BENCHMARKS[getPositionGroup(position)];
