// Shared types for scouting reports

export interface ScoutingReportData {
  id: string;
  match_date: string;
  opponent: string | null;
  match_notes: string | null;
  technical_score: number;
  tactical_score: number;
  physical_score: number;
  mental_score: number;
  impact_score: number;
  technical_notes: string | null;
  tactical_notes: string | null;
  physical_notes: string | null;
  mental_notes: string | null;
  impact_notes: string | null;
  base_score: number;
  competition_coefficient: number;
  adjusted_score: number;
  potential_bonus: number;
  consistency_modifier: number;
  final_score: number;
  rating: number;
  summary: string | null;
  recommendation: string | null;
  scout_id: string;
  players: {
    id: string;
    full_name: string;
    position: string;
    photo_url: string | null;
    current_club: string | null;
    nationality: string;
  } | null;
  competitions: {
    name: string;
    country: string;
    division: string | null;
    phase: string | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

export interface ScoutingCategoryConfig {
  key: string;
  label: string;
  color: string;
}

export const SCOUTING_CATEGORY_CONFIG: ScoutingCategoryConfig[] = [
  { key: "technical", label: "Técnico", color: "#10b981" },
  { key: "tactical", label: "Tático", color: "#3b82f6" },
  { key: "physical", label: "Físico", color: "#f59e0b" },
  { key: "mental", label: "Mental", color: "#ec4899" },
  { key: "impact", label: "Impacto", color: "#8b5cf6" },
];
