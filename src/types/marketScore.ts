/**
 * M3 Market Score Module - Type Definitions
 * 
 * Score range: 0-100
 * 5 Pillars with configurable weights
 */

// =====================================================
// ENUMS (mirroring DB types)
// =====================================================

export type MarketScoreType = 'ACTIVE' | 'TARGET';
export type MarketScoreTrend = 'UP' | 'DOWN' | 'FLAT';
export type TargetStatus = 'MONITORING' | 'APPROACH' | 'NEGOTIATION' | 'DROPPED' | 'SIGNED';
export type TargetPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// =====================================================
// CONFIGURABLE WEIGHTS
// =====================================================

export interface MarketScoreWeights {
  ageWindow: number;           // Default: 0.25 (25%)
  performanceImpact: number;   // Default: 0.30 (30%)
  competitiveContext: number;  // Default: 0.20 (20%)
  consistencyReliability: number; // Default: 0.15 (15%)
  marketProfile: number;       // Default: 0.10 (10%)
}

export const DEFAULT_MARKET_SCORE_WEIGHTS: MarketScoreWeights = {
  ageWindow: 0.25,
  performanceImpact: 0.30,
  competitiveContext: 0.20,
  consistencyReliability: 0.15,
  marketProfile: 0.10,
};

// =====================================================
// PILLAR BREAKDOWN DETAILS
// =====================================================

export interface AgeWindowDetails {
  age: number | null;
  position: string;
  optimalAgeRange: [number, number]; // e.g., [21, 27] for attackers
  ageScore: number; // 0-100
  positionMaturityFactor: number; // multiplier based on position
  reasoning: string;
}

export interface PerformanceImpactDetails {
  matchesAnalyzed: number;
  minutesPlayed: number;
  averageRating: number | null; // 0-10 from existing rating engine
  ratingScore: number; // 0-100 normalized
  decisiveActions: {
    goals: number;
    assists: number;
    keyPasses: number;
    chancesCreated: number;
    tackles: number;
    interceptions: number;
    clearances: number;
  };
  decisiveActionsScore: number; // 0-100 normalized by position
  combinedScore: number; // 0-100
  reasoning: string;
}

export interface CompetitiveContextDetails {
  competitionsPlayed: string[];
  averageCompetitionCoefficient: number;
  highestCoefficient: number;
  contextScore: number; // 0-100
  reasoning: string;
}

export interface ConsistencyReliabilityDetails {
  totalMatches: number;
  totalMinutes: number;
  minutesPerMatch: number;
  ratingVariance: number | null; // standard deviation of ratings
  matchesLast30Days: number;
  samplePenalty: number; // 0-1, penalty for small sample
  consistencyScore: number; // 0-100
  reasoning: string;
}

export interface MarketProfileDetails {
  position: string;
  secondaryPositions: string[];
  versatilityScore: number; // 0-100
  positionFitScore: number; // 0-100 based on stats matching position archetype
  keyTraits: string[]; // e.g., "high dribble success", "aerial dominant"
  combinedScore: number; // 0-100
  reasoning: string;
}

// =====================================================
// FULL BREAKDOWN RESULT
// =====================================================

export interface MarketScoreBreakdown {
  scoreTotal: number; // 0-100
  
  // Individual pillar scores (0-100)
  scoreAgeWindow: number;
  scorePerformanceImpact: number;
  scoreCompetitiveContext: number;
  scoreConsistencyReliability: number;
  scoreMarketProfile: number;
  
  // Detailed breakdown per pillar
  ageWindowDetails: AgeWindowDetails;
  performanceImpactDetails: PerformanceImpactDetails;
  competitiveContextDetails: CompetitiveContextDetails;
  consistencyReliabilityDetails: ConsistencyReliabilityDetails;
  marketProfileDetails: MarketProfileDetails;
  
  // Confidence and metadata
  confidenceLevel: number; // 0-100
  trend30d: MarketScoreTrend;
  calculatedFromRange: string; // e.g., "últimos 10 jogos"
  weightsUsed: MarketScoreWeights;
  
  // Calculation timestamp
  calculatedAt: Date;
}

// =====================================================
// DATABASE ENTITIES
// =====================================================

export interface MarketScore {
  id: string;
  athlete_id: string | null;
  target_id: string | null;
  type: MarketScoreType;
  score_total: number;
  score_age_window: number;
  score_performance_impact: number;
  score_competitive_context: number;
  score_consistency_reliability: number;
  score_market_profile: number;
  confidence_level: number;
  trend_30d: MarketScoreTrend;
  last_calculated_at: string;
  calculated_from_range: string | null;
  calculation_details: MarketScoreBreakdown | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketScoreEvent {
  id: string;
  market_score_id: string;
  reason: string;
  previous_score_total: number | null;
  new_score_total: number;
  delta: number;
  details: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface Target {
  id: string;
  name: string;
  position: string;
  birth_date: string | null;
  age_estimate: number | null;
  current_club: string | null;
  league_competition: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  dominant_foot: string | null;
  height: number | null;
  weight: number | null;
  source: string | null;
  status: TargetStatus;
  priority: TargetPriority;
  tags: string[];
  notes_internal: string | null;
  photo_url: string | null;
  highlight_video_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetObservation {
  id: string;
  target_id: string;
  observation_date: string;
  match_context: string | null;
  opponent: string | null;
  competition: string | null;
  result: string | null;
  minutes_observed: number | null;
  qualitative_notes: string | null;
  performance_rating: number | null; // 1-10
  created_by: string | null;
  created_at: string;
}

// =====================================================
// INPUT DATA FOR CALCULATION
// =====================================================

export interface ActivePlayerData {
  playerId: string;
  fullName: string;
  position: string;
  secondaryPositions: string[];
  birthDate: string | null;
  age: number | null;
  
  // Aggregated stats from usePlayerMatchStats
  seasonStats: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    keyPasses: number;
    chancesCreated: number;
    tackles: number;
    interceptions: number;
    recoveries: number;
    clearances: number;
    duelsWon: number;
    duelsTotal: number;
    aerialDuelsWon: number;
    aerialDuelsTotal: number;
    dribblesSuccess: number;
    dribblesTotal: number;
    passesCompleted: number;
    passesTotal: number;
    crossesSuccess: number;
    crossesFailed: number;
  };
  
  // Match ratings from usePlayerMatchRatings
  matchRatings: {
    matchId: string;
    matchDate: string;
    rating: number; // 0-10
    competitionId: string | null;
    competitionCoefficient: number;
  }[];
  
  // Last 30 days activity
  matchesLast30Days: number;
}

export interface TargetPlayerData {
  targetId: string;
  name: string;
  position: string;
  birthDate: string | null;
  ageEstimate: number | null;
  currentClub: string | null;
  leagueCompetition: string | null;
  
  // Observations
  observations: {
    date: string;
    minutesObserved: number | null;
    performanceRating: number | null; // 1-10
    competition: string | null;
  }[];
}

// =====================================================
// POSITION MATURITY MAPPING
// =====================================================

/**
 * Position groups with their optimal age ranges and maturity factors
 * Goalkeepers and defenders mature later than attackers
 */
export interface PositionMaturityConfig {
  group: string;
  positions: string[];
  optimalAgeRange: [number, number];
  peakAge: number;
  maturityFactor: number; // 1.0 = standard, >1 = matures later
}

export const POSITION_MATURITY_CONFIG: PositionMaturityConfig[] = [
  {
    group: 'Goalkeeper',
    positions: ['Goleiro', 'GK', 'Goalkeeper'],
    optimalAgeRange: [25, 34],
    peakAge: 30,
    maturityFactor: 1.3,
  },
  {
    group: 'Central Defender',
    positions: ['Zagueiro', 'CB', 'Center Back', 'Defensor Central'],
    optimalAgeRange: [24, 32],
    peakAge: 28,
    maturityFactor: 1.2,
  },
  {
    group: 'Fullback',
    positions: ['Lateral Direito', 'Lateral Esquerdo', 'RB', 'LB', 'Right Back', 'Left Back', 'Ala Direita', 'Ala Esquerda'],
    optimalAgeRange: [23, 30],
    peakAge: 27,
    maturityFactor: 1.1,
  },
  {
    group: 'Defensive Midfielder',
    positions: ['Volante', 'CDM', 'DM', 'Defensive Midfielder', 'Primeiro Volante'],
    optimalAgeRange: [24, 31],
    peakAge: 28,
    maturityFactor: 1.15,
  },
  {
    group: 'Central Midfielder',
    positions: ['Meia', 'Meia Central', 'CM', 'Central Midfielder', 'Meio-Campo'],
    optimalAgeRange: [23, 30],
    peakAge: 27,
    maturityFactor: 1.1,
  },
  {
    group: 'Attacking Midfielder',
    positions: ['Meia Atacante', 'CAM', 'AM', 'Attacking Midfielder', 'Armador'],
    optimalAgeRange: [22, 29],
    peakAge: 26,
    maturityFactor: 1.0,
  },
  {
    group: 'Winger',
    positions: ['Ponta Direita', 'Ponta Esquerda', 'RW', 'LW', 'Right Winger', 'Left Winger', 'Extremo'],
    optimalAgeRange: [21, 28],
    peakAge: 25,
    maturityFactor: 0.95,
  },
  {
    group: 'Striker',
    positions: ['Centroavante', 'Atacante', 'ST', 'CF', 'Striker', 'Forward', 'Segundo Atacante'],
    optimalAgeRange: [22, 29],
    peakAge: 26,
    maturityFactor: 1.0,
  },
];
