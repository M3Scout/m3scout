/**
 * Stats Calculation WebWorker
 * 
 * Offloads heavy computation from main thread to prevent UI jank on mobile.
 * Handles: stats aggregation, rating calculations, ranking/sorting.
 * 
 * Communication via postMessage with typed payloads.
 */

// ============ TYPES ============

export type WorkerTaskType = 
  | "aggregate_stats"
  | "calculate_rating"
  | "rank_players"
  | "generate_insights"
  | "sort_players";

export interface WorkerRequest<T = unknown> {
  id: string;
  type: WorkerTaskType;
  payload: T;
}

export interface WorkerResponse<T = unknown> {
  id: string;
  type: WorkerTaskType;
  success: boolean;
  result?: T;
  error?: string;
  duration_ms: number;
}

// ============ AGGREGATION LOGIC ============

interface StatsRow {
  matches?: number;
  minutes?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  tackles?: number;
  interceptions?: number;
  recoveries?: number;
  saves?: number;
  goals_conceded?: number;
  clean_sheets?: number;
}

interface AggregatedResult {
  total_matches: number;
  total_minutes: number;
  total_goals: number;
  total_assists: number;
  total_yellow_cards: number;
  total_red_cards: number;
  total_tackles: number;
  total_interceptions: number;
  total_recoveries: number;
  total_saves: number;
  total_goals_conceded: number;
  total_clean_sheets: number;
}

function aggregateStats(rows: StatsRow[]): AggregatedResult {
  return rows.reduce(
    (acc, row) => ({
      total_matches: acc.total_matches + (row.matches || 0),
      total_minutes: acc.total_minutes + (row.minutes || 0),
      total_goals: acc.total_goals + (row.goals || 0),
      total_assists: acc.total_assists + (row.assists || 0),
      total_yellow_cards: acc.total_yellow_cards + (row.yellow_cards || 0),
      total_red_cards: acc.total_red_cards + (row.red_cards || 0),
      total_tackles: acc.total_tackles + (row.tackles || 0),
      total_interceptions: acc.total_interceptions + (row.interceptions || 0),
      total_recoveries: acc.total_recoveries + (row.recoveries || 0),
      total_saves: acc.total_saves + (row.saves || 0),
      total_goals_conceded: acc.total_goals_conceded + (row.goals_conceded || 0),
      total_clean_sheets: acc.total_clean_sheets + (row.clean_sheets || 0),
    }),
    {
      total_matches: 0,
      total_minutes: 0,
      total_goals: 0,
      total_assists: 0,
      total_yellow_cards: 0,
      total_red_cards: 0,
      total_tackles: 0,
      total_interceptions: 0,
      total_recoveries: 0,
      total_saves: 0,
      total_goals_conceded: 0,
      total_clean_sheets: 0,
    }
  );
}

// ============ RATING CALCULATION ============

interface RatingInput {
  age: number | null;
  position: string;
  competitionCoefficient: number;
  stats: AggregatedResult;
}

interface RatingBreakdown {
  competitionLevelScore: number;
  productionScore: number;
  defensiveActionsScore: number;
  disciplineScore: number;
  agePotentialScore: number;
  overall0_100: number;
  rating0_5: number;
  positionGroup: string;
}

const RATING_WEIGHTS = {
  competitionLevel: 0.30,
  production: 0.35,
  defensiveActions: 0.20,
  discipline: 0.10,
  agePotential: 0.05,
};

const POSITION_TO_GROUP: Record<string, string> = {
  'Atacante': 'forward', 'Centroavante': 'forward', 
  'Ponta Direita': 'forward', 'Ponta Esquerda': 'forward',
  'Meia': 'midfielder', 'Meia Atacante': 'midfielder',
  'Volante': 'midfielder', 'Meio-Campo': 'midfielder',
  'Zagueiro': 'defender', 'Lateral Direito': 'defender',
  'Lateral Esquerdo': 'defender',
  'Goleiro': 'goalkeeper',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function calculatePlayerRating(input: RatingInput): RatingBreakdown {
  const positionGroup = POSITION_TO_GROUP[input.position] || 'midfielder';
  
  // Competition Level Score (normalize coefficient 0.55-1.25 to 0-100)
  const competitionLevelScore = clamp(
    ((input.competitionCoefficient - 0.55) / 0.70) * 100, 0, 100
  );
  
  // Production Score (goals + assists per 90 mins)
  const gamesPlayed = input.stats.total_minutes / 90;
  let productionScore = 0;
  if (gamesPlayed > 0) {
    const goals90 = input.stats.total_goals / gamesPlayed;
    const assists90 = input.stats.total_assists / gamesPlayed;
    const productionRate = goals90 * 0.6 + assists90 * 0.4;
    productionScore = clamp(productionRate * 100, 0, 100);
  }
  
  // Defensive Actions Score
  let defensiveActionsScore = 0;
  if (gamesPlayed > 0) {
    const tackles90 = input.stats.total_tackles / gamesPlayed;
    const interceptions90 = input.stats.total_interceptions / gamesPlayed;
    const recoveries90 = input.stats.total_recoveries / gamesPlayed;
    const defenseRate = tackles90 * 0.5 + interceptions90 * 0.3 + recoveries90 * 0.2;
    defensiveActionsScore = clamp(defenseRate * 15, 0, 100);
  }
  
  // Discipline Score (cards per 90 - lower is better)
  let disciplineScore = 100;
  if (gamesPlayed > 0) {
    const cards90 = (input.stats.total_yellow_cards + input.stats.total_red_cards * 3) / gamesPlayed;
    if (cards90 > 0.45) disciplineScore = 20;
    else if (cards90 > 0.30) disciplineScore = 40;
    else if (cards90 > 0.20) disciplineScore = 60;
    else if (cards90 > 0.10) disciplineScore = 80;
  }
  
  // Age Potential Score
  let agePotentialScore = 75;
  if (input.age !== null) {
    if (input.age >= 16 && input.age <= 19) agePotentialScore = 90;
    else if (input.age >= 20 && input.age <= 22) agePotentialScore = 95;
    else if (input.age >= 23 && input.age <= 25) agePotentialScore = 85;
    else if (input.age >= 26 && input.age <= 28) agePotentialScore = 75;
    else if (input.age >= 29 && input.age <= 31) agePotentialScore = 65;
    else agePotentialScore = 55;
  }
  
  // Calculate overall
  const overall0_100 =
    competitionLevelScore * RATING_WEIGHTS.competitionLevel +
    productionScore * RATING_WEIGHTS.production +
    defensiveActionsScore * RATING_WEIGHTS.defensiveActions +
    disciplineScore * RATING_WEIGHTS.discipline +
    agePotentialScore * RATING_WEIGHTS.agePotential;
  
  const rating0_5 = roundToHalf((overall0_100 / 100) * 5);
  
  return {
    competitionLevelScore: Math.round(competitionLevelScore * 10) / 10,
    productionScore: Math.round(productionScore * 10) / 10,
    defensiveActionsScore: Math.round(defensiveActionsScore * 10) / 10,
    disciplineScore: Math.round(disciplineScore * 10) / 10,
    agePotentialScore: Math.round(agePotentialScore * 10) / 10,
    overall0_100: Math.round(overall0_100 * 10) / 10,
    rating0_5: clamp(rating0_5, 0, 5),
    positionGroup,
  };
}

// ============ RANKING ============

interface PlayerForRanking {
  id: string;
  full_name: string;
  position: string;
  auto_rating: number | null;
  age?: number | null;
  [key: string]: unknown;
}

interface RankPlayersPayload {
  players: PlayerForRanking[];
  sortBy: 'auto_rating' | 'age' | 'full_name';
  direction: 'asc' | 'desc';
  limit?: number;
}

function rankPlayers(payload: RankPlayersPayload): PlayerForRanking[] {
  const { players, sortBy, direction, limit } = payload;
  
  const sorted = [...players].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;
    
    if (sortBy === 'auto_rating') {
      aVal = a.auto_rating ?? -Infinity;
      bVal = b.auto_rating ?? -Infinity;
    } else if (sortBy === 'age') {
      aVal = a.age ?? -Infinity;
      bVal = b.age ?? -Infinity;
    } else if (sortBy === 'full_name') {
      aVal = a.full_name.toLowerCase();
      bVal = b.full_name.toLowerCase();
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return direction === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
  
  return limit ? sorted.slice(0, limit) : sorted;
}

// ============ INSIGHTS GENERATION ============

interface InsightsPayload {
  players: Array<{
    id: string;
    full_name: string;
    position: string;
    auto_rating: number | null;
    age: number | null;
  }>;
  stats: StatsRow[];
}

interface GeneratedInsight {
  id: string;
  type: 'rising' | 'alert' | 'market' | 'neutral';
  title: string;
  description: string;
  playerId?: string;
}

function generateInsights(payload: InsightsPayload): GeneratedInsight[] {
  const { players, stats } = payload;
  const insights: GeneratedInsight[] = [];
  
  // Find top player
  const sortedByRating = [...players]
    .filter(p => p.auto_rating !== null)
    .sort((a, b) => (b.auto_rating ?? 0) - (a.auto_rating ?? 0));
  
  if (sortedByRating.length > 0 && sortedByRating[0].auto_rating && sortedByRating[0].auto_rating >= 4.0) {
    insights.push({
      id: 'rising-1',
      type: 'rising',
      title: `${sortedByRating[0].full_name.split(' ')[0]} em alta`,
      description: `Nota ${sortedByRating[0].auto_rating.toFixed(1)} — destaque`,
      playerId: sortedByRating[0].id,
    });
  }
  
  // Find players needing attention
  const lowRated = sortedByRating.filter(p => p.auto_rating && p.auto_rating < 3.0);
  if (lowRated.length > 0) {
    insights.push({
      id: 'alert-1',
      type: 'alert',
      title: `${lowRated[0].full_name.split(' ')[0]} precisa de atenção`,
      description: `Nota ${lowRated[0].auto_rating?.toFixed(1)} — abaixo do esperado`,
      playerId: lowRated[0].id,
    });
  }
  
  // Find young talents
  const youngTalents = players.filter(
    p => p.age && p.age <= 23 && p.auto_rating && p.auto_rating >= 3.5
  );
  if (youngTalents.length > 0) {
    insights.push({
      id: 'market-1',
      type: 'market',
      title: `${youngTalents[0].full_name.split(' ')[0]} tem potencial`,
      description: `${youngTalents[0].age} anos + nota ${youngTalents[0].auto_rating?.toFixed(1)}`,
      playerId: youngTalents[0].id,
    });
  }
  
  // Calculate total goals from stats
  const totalGoals = stats.reduce((sum, s) => sum + (s.goals || 0), 0);
  if (totalGoals > 10) {
    insights.push({
      id: 'neutral-1',
      type: 'neutral',
      title: `${totalGoals} gols no período`,
      description: 'Produção ofensiva do portfólio',
    });
  }
  
  return insights;
}

// ============ MESSAGE HANDLER ============

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  const startTime = performance.now();
  
  try {
    let result: unknown;
    
    switch (type) {
      case "aggregate_stats":
        result = aggregateStats(payload as StatsRow[]);
        break;
        
      case "calculate_rating":
        result = calculatePlayerRating(payload as RatingInput);
        break;
        
      case "rank_players":
        result = rankPlayers(payload as RankPlayersPayload);
        break;
        
      case "generate_insights":
        result = generateInsights(payload as InsightsPayload);
        break;
        
      case "sort_players":
        result = rankPlayers(payload as RankPlayersPayload);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    const duration_ms = Math.round(performance.now() - startTime);
    
    const response: WorkerResponse = {
      id,
      type,
      success: true,
      result,
      duration_ms,
    };
    
    self.postMessage(response);
    
  } catch (error) {
    const duration_ms = Math.round(performance.now() - startTime);
    
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms,
    };
    
    self.postMessage(response);
  }
};
