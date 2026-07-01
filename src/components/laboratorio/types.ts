export interface HeatZone {
  x: number;
  y: number;
  r: number;
  intensity: number;
}

export interface MovementPath {
  /** Points in the 1000x660 pitch SVG coordinate space (2 = straight line, 3 = quadratic curve) */
  points: [number, number][];
  label: string;
}

export interface PlayInstructions {
  comBola: string;
  semBola: string;
  dica: string;
}

export interface Subtype {
  id: string;
  name: string;
  tag: string;
  description: string;
  radarValues: Record<string, number>;
  heatZones: HeatZone[];
  references: string[];
  movement: MovementPath;
  play: PlayInstructions;
}

export interface TacticalPosition {
  id: string;
  name: string;
  shortName: string;
  color: string;
  description: string;
  mainFunctions: string[];
  radarAttributes: string[];
  subtypes: Subtype[];
  dbPositions: string[];
}

export interface SquadPlayer {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
}

/** ids matching TacticalPosition.id — the 7 role families explored in the lab */
export type RoleFamilyId =
  | "zagueiro"
  | "lateral"
  | "volante"
  | "meia-ofensivo"
  | "ponta"
  | "centroavante"
  | "segundo-atacante";

export interface FormationPlayerNode {
  /** short label used on the pitch node, e.g. "ZAD", "ALE", "GR" */
  sigla: string;
  /** full role label, e.g. "Zagueiro Direito" */
  label: string;
  /** maps to a RoleFamily for click-through into the role explorer; null for goalkeeper (no role family) */
  family: RoleFamilyId | null;
  /** 0-1000 pitch coordinate space (matches TacticalBoard viewBox) */
  x: number;
  /** 0-660 pitch coordinate space */
  y: number;
}

export interface FormationVariation {
  label: string;
  nodes: FormationPlayerNode[];
  play: PlayInstructions;
}

export interface FormationDescription {
  howItWorks: string;
  pros: string;
  cons: string;
}

export interface TacticalFormation {
  key: string;
  name: string;
  recommendedVariation: string;
  description: FormationDescription;
  /** flat sigla list of the 11 formation slots, for quick reference/display */
  positions: string[];
  variations: Record<string, FormationVariation>;
}
