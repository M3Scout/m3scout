/**
 * M3 Market Score Engine
 * 
 * Calculates a 0-100 score for athletes based on 5 pillars:
 * 1. Age & Evolution Window (25%)
 * 2. Performance + Impact (25%)
 * 3. Competitive Context (20%)
 * 4. Consistency & Reliability (15%)
 * 5. Market Profile (15%)
 * 
 * IMPORTANT: This engine REUSES existing statistics from the platform.
 * It does NOT duplicate any calculation logic.
 */

import {
  MarketScoreBreakdown,
  MarketScoreWeights,
  DEFAULT_MARKET_SCORE_WEIGHTS,
  ActivePlayerData,
  TargetPlayerData,
  AgeWindowDetails,
  PerformanceImpactDetails,
  CompetitiveContextDetails,
  ConsistencyReliabilityDetails,
  MarketProfileDetails,
  POSITION_MATURITY_CONFIG,
  MarketScoreTrend,
} from '@/types/marketScore';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Get position maturity config
 */
function getPositionMaturityConfig(position: string) {
  const normalized = position.toLowerCase().trim();
  
  for (const config of POSITION_MATURITY_CONFIG) {
    if (config.positions.some(p => p.toLowerCase() === normalized)) {
      return config;
    }
  }
  
  // Default to midfielder config if position not found
  return POSITION_MATURITY_CONFIG.find(c => c.group === 'Central Midfielder')!;
}

/**
 * Check if position is a goalkeeper
 */
function isGoalkeeper(position: string): boolean {
  const normalized = position.toLowerCase().trim();
  return ['goleiro', 'gk', 'goalkeeper'].includes(normalized);
}

/**
 * Check if position is defensive
 */
function isDefensivePosition(position: string): boolean {
  const normalized = position.toLowerCase().trim();
  const defensivePositions = [
    'zagueiro', 'cb', 'center back', 'defensor central',
    'lateral direito', 'lateral esquerdo', 'rb', 'lb',
    'volante', 'cdm', 'dm', 'primeiro volante'
  ];
  return defensivePositions.some(p => normalized.includes(p) || p.includes(normalized));
}

/**
 * Check if position is attacking
 */
function isAttackingPosition(position: string): boolean {
  const normalized = position.toLowerCase().trim();
  const attackingPositions = [
    'centroavante', 'atacante', 'st', 'cf', 'striker', 'forward',
    'ponta direita', 'ponta esquerda', 'rw', 'lw',
    'meia atacante', 'cam', 'armador', 'segundo atacante'
  ];
  return attackingPositions.some(p => normalized.includes(p) || p.includes(normalized));
}

// =====================================================
// PILLAR 1: AGE & EVOLUTION WINDOW (25%)
// =====================================================

function calculateAgeWindowScore(
  age: number | null,
  position: string
): AgeWindowDetails {
  const config = getPositionMaturityConfig(position);
  
  if (age === null) {
    return {
      age: null,
      position,
      optimalAgeRange: config.optimalAgeRange,
      ageScore: 50, // Neutral score when age unknown
      positionMaturityFactor: config.maturityFactor,
      reasoning: 'Idade não informada - score neutro aplicado.',
    };
  }
  
  const [minOptimal, maxOptimal] = config.optimalAgeRange;
  const peakAge = config.peakAge;
  
  let ageScore: number;
  let reasoning: string;
  
  if (age >= minOptimal && age <= maxOptimal) {
    // In optimal range - score based on proximity to peak
    const distanceFromPeak = Math.abs(age - peakAge);
    const maxDistance = Math.max(peakAge - minOptimal, maxOptimal - peakAge);
    ageScore = 100 - (distanceFromPeak / maxDistance) * 15; // 85-100 range
    reasoning = `Idade dentro da janela ideal (${minOptimal}-${maxOptimal} anos). Próximo ao pico de ${peakAge} anos.`;
  } else if (age < minOptimal) {
    // Young player - high potential but not yet optimal
    const yearsUntilOptimal = minOptimal - age;
    if (yearsUntilOptimal <= 2) {
      ageScore = 80 + (2 - yearsUntilOptimal) * 5; // 80-90 range
      reasoning = `Jovem a ${yearsUntilOptimal} anos da janela ideal. Alto potencial de valorização.`;
    } else if (yearsUntilOptimal <= 4) {
      ageScore = 65 + (4 - yearsUntilOptimal) * 7.5; // 65-80 range
      reasoning = `Jogador em formação, ${yearsUntilOptimal} anos até a janela ideal.`;
    } else {
      ageScore = 50 + Math.max(0, 15 - yearsUntilOptimal * 2); // 35-65 range
      reasoning = `Jogador muito jovem (${age} anos). Precisa de desenvolvimento.`;
    }
  } else {
    // Older player - declining value
    const yearsAfterOptimal = age - maxOptimal;
    if (yearsAfterOptimal <= 2) {
      ageScore = 70 - yearsAfterOptimal * 10; // 50-70 range
      reasoning = `Experiência sólida, ${yearsAfterOptimal} anos após a janela ideal.`;
    } else if (yearsAfterOptimal <= 4) {
      ageScore = 50 - (yearsAfterOptimal - 2) * 10; // 30-50 range
      reasoning = `Jogador veterano, curva de valorização em declínio.`;
    } else {
      ageScore = Math.max(10, 30 - (yearsAfterOptimal - 4) * 5); // 10-30 range
      reasoning = `Jogador em fim de carreira. Valor de mercado limitado.`;
    }
  }
  
  // Apply position maturity factor adjustment
  if (age !== null && age < minOptimal && config.maturityFactor > 1.0) {
    // For late-maturing positions, young players get a slight boost
    ageScore = Math.min(100, ageScore * (1 + (config.maturityFactor - 1) * 0.3));
    reasoning += ` Posição de maturação tardia (+bonus).`;
  }
  
  return {
    age,
    position,
    optimalAgeRange: config.optimalAgeRange,
    ageScore: Math.round(clamp(ageScore, 0, 100)),
    positionMaturityFactor: config.maturityFactor,
    reasoning,
  };
}

// =====================================================
// PILLAR 2: PERFORMANCE + IMPACT (30%) — 100% stats-based via p90
// =====================================================

function calculatePerformanceImpactScore(
  data: ActivePlayerData
): PerformanceImpactDetails {
  const { seasonStats, position } = data;

  const {
    goals, assists, keyPasses, chancesCreated,
    tackles, interceptions, clearances
  } = seasonStats;

  const matches = Math.max(seasonStats.matches, 1);
  const minutes = Math.max(seasonStats.minutes, 1);
  // p90 multiplier: stat * per90 = stat per 90 minutes
  const per90 = 90 / (minutes / matches);

  let decisiveActionsScore = 0;
  const isGK = isGoalkeeper(position);
  const isDefensive = isDefensivePosition(position);
  const isAttacking = isAttackingPosition(position);

  if (isGK) {
    // Goalkeeper: defensive contributions p90
    // Benchmark: ~3 defensive contributions/90 → score ~85
    const defContrib90 = (clearances + interceptions) * per90;
    decisiveActionsScore = Math.min(100, defContrib90 * 15 + 40);
  } else if (isDefensive) {
    // Defender: defensive actions p90 + offensive bonus
    // Benchmark: ~5 def actions/90 → score ~60; ~8/90 → ~84
    const defActions90 = (tackles + interceptions + clearances) * per90;
    const offBonus90 = (goals * 10 + assists * 8) * per90;
    decisiveActionsScore = Math.min(100, defActions90 * 8 + offBonus90 + 20);
  } else if (isAttacking) {
    // Attacker: goals+assists p90 most important, then creation
    // Benchmark: 0.5 G+A/90 → score ~60; 1.0 G+A/90 → score ~85
    const g90 = goals * per90;
    const a90 = assists * per90;
    const cc90 = chancesCreated * per90;
    const kp90 = keyPasses * per90;
    decisiveActionsScore = Math.min(100, g90 * 25 + a90 * 20 + cc90 * 8 + kp90 * 5 + 15);
  } else {
    // Midfielder: balanced contributions p90
    // Benchmark: 0.3 G+A/90 + 4 def/90 → score ~60
    const g90 = goals * per90;
    const a90 = assists * per90;
    const kp90 = keyPasses * per90;
    const defActions90 = (tackles + interceptions + seasonStats.recoveries) * per90;
    decisiveActionsScore = Math.min(100, g90 * 20 + a90 * 15 + kp90 * 8 + defActions90 * 5 + 20);
  }

  // 100% stats-based — no rating weight
  const combinedScore = decisiveActionsScore;

  let reasoning = '';
  if (isAttacking) {
    reasoning = `${goals}G + ${assists}A | ${(goals * per90).toFixed(2)}G/90 + ${(assists * per90).toFixed(2)}A/90.`;
  } else if (isDefensive) {
    const defTotal = tackles + interceptions + clearances;
    reasoning = `${defTotal} ações def. | ${(defTotal * per90).toFixed(2)}/90.`;
  } else if (isGK) {
    const defContrib = clearances + interceptions;
    reasoning = `${defContrib} contribuições def. | ${(defContrib * per90).toFixed(2)}/90.`;
  } else {
    reasoning = `${goals}G + ${assists}A | ${(keyPasses * per90).toFixed(2)} passes dec./90.`;
  }

  return {
    matchesAnalyzed: seasonStats.matches,
    minutesPlayed: seasonStats.minutes,
    averageRating: null,
    ratingScore: 0,
    decisiveActions: {
      goals,
      assists,
      keyPasses,
      chancesCreated,
      tackles,
      interceptions,
      clearances,
    },
    decisiveActionsScore: Math.round(clamp(decisiveActionsScore, 0, 100)),
    combinedScore: Math.round(clamp(combinedScore, 0, 100)),
    reasoning,
  };
}

// =====================================================
// PILLAR 3: COMPETITIVE CONTEXT (20%)
// =====================================================

function calculateCompetitiveContextScore(
  matchRatings: ActivePlayerData['matchRatings']
): CompetitiveContextDetails {
  if (matchRatings.length === 0) {
    return {
      competitionsPlayed: [],
      averageCompetitionCoefficient: 0,
      highestCoefficient: 0,
      contextScore: 30, // Low score for no data
      reasoning: 'Sem jogos registrados em competições.',
    };
  }
  
  const coefficients = matchRatings
    .filter(m => m.competitionCoefficient > 0)
    .map(m => m.competitionCoefficient);
  
  if (coefficients.length === 0) {
    return {
      competitionsPlayed: [],
      averageCompetitionCoefficient: 1.0,
      highestCoefficient: 1.0,
      contextScore: 50, // Neutral score when coefficients not available
      reasoning: 'Coeficientes de competição não disponíveis.',
    };
  }
  
  const avgCoeff = coefficients.reduce((a, b) => a + b, 0) / coefficients.length;
  const maxCoeff = Math.max(...coefficients);
  
  // Competition IDs played
  const competitionIds = [...new Set(matchRatings.map(m => m.competitionId).filter(Boolean))] as string[];
  
  // Convert coefficient to score (assuming coefficient ranges from 0.5 to 2.0)
  // Coefficient 1.0 = 50, 1.5 = 75, 2.0 = 100, 0.5 = 25
  const contextScore = clamp((avgCoeff - 0.5) * 50 + 25, 20, 100);
  
  let reasoning = `Coeficiente médio de ${avgCoeff.toFixed(2)}`;
  if (maxCoeff > avgCoeff * 1.1) {
    reasoning += `, máximo de ${maxCoeff.toFixed(2)} em competição de maior nível.`;
  } else {
    reasoning += '.';
  }
  
  return {
    competitionsPlayed: competitionIds,
    averageCompetitionCoefficient: Math.round(avgCoeff * 100) / 100,
    highestCoefficient: Math.round(maxCoeff * 100) / 100,
    contextScore: Math.round(contextScore),
    reasoning,
  };
}

// =====================================================
// PILLAR 4: CONSISTENCY & RELIABILITY (15%)
// =====================================================

function calculateConsistencyReliabilityScore(
  data: ActivePlayerData
): ConsistencyReliabilityDetails {
  const { seasonStats, matchRatings, matchesLast30Days } = data;
  const { matches, minutes } = seasonStats;
  
  // Minutes per match
  const minutesPerMatch = matches > 0 ? minutes / matches : 0;
  
  // Rating variance
  const validRatings = matchRatings.filter(r => r.rating > 0).map(r => r.rating);
  const ratingVariance = validRatings.length >= 3 ? standardDeviation(validRatings) : null;
  
  // Sample penalty aligned with official playing-time brackets (StatsTab.tsx):
  // < 1200 min  → "Amostragem Baixa"  (low)        → 0.85
  // < 2500 min  → "Jogador de Elenco" (regular)     → 0.90
  // ≤ 4200 min  → "Protagonista"      (protagonist) → 0.95
  // > 4200 min  → "Zona de Risco"     (risk/peak)   → 1.0
  let samplePenalty = 1.0;
  if (minutes < 1200) {
    samplePenalty = 0.85;
  } else if (minutes < 2500) {
    samplePenalty = 0.90;
  } else if (minutes <= 4200) {
    samplePenalty = 0.95;
  }
  
  // Base score components
  let consistencyScore = 50; // Start neutral
  
  // 1. Minutes played factor (25% of score)
  // 90 mins/match = max, 45 mins = 50%, less = penalty
  const minutesFactor = Math.min(minutesPerMatch / 90, 1.0);
  consistencyScore += minutesFactor * 25;
  
  // 2. Rating consistency factor (25% of score)
  // Low variance = good, high variance = bad
  if (ratingVariance !== null) {
    // Variance of 0.5 or less = excellent, 1.5+ = poor
    const varianceFactor = Math.max(0, 1 - (ratingVariance - 0.3) / 1.2);
    consistencyScore += varianceFactor * 25;
  } else {
    consistencyScore += 10; // Partial credit if not enough data
  }
  
  // 3. Recent activity (25% of score)
  // 4+ matches in last 30 days = excellent, 0 = poor
  const activityFactor = Math.min(matchesLast30Days / 4, 1.0);
  consistencyScore += activityFactor * 25;
  
  // 4. Sample size bonus (up to 25%)
  consistencyScore += samplePenalty * 25;
  
  // Cap and apply final penalty
  consistencyScore = clamp(consistencyScore * samplePenalty, 10, 100);
  
  let reasoning = `${matches} jogos, ${Math.round(minutesPerMatch)} min/jogo.`;
  if (ratingVariance !== null) {
    reasoning += ` Variação de nota: ${ratingVariance.toFixed(2)}.`;
  }
  if (matchesLast30Days > 0) {
    reasoning += ` ${matchesLast30Days} jogos nos últimos 30 dias.`;
  } else {
    reasoning += ' Sem jogos recentes.';
  }
  if (minutes < 1200) {
    reasoning += ' (Amostragem baixa — < 1200 min)';
  } else if (minutes < 2500) {
    reasoning += ' (Jogador de elenco — 1200–2499 min)';
  } else if (minutes <= 4200) {
    reasoning += ' (Protagonista — 2500–4200 min)';
  }
  
  return {
    totalMatches: matches,
    totalMinutes: minutes,
    minutesPerMatch: Math.round(minutesPerMatch),
    ratingVariance: ratingVariance !== null ? Math.round(ratingVariance * 100) / 100 : null,
    matchesLast30Days,
    samplePenalty,
    consistencyScore: Math.round(consistencyScore),
    reasoning,
  };
}

// =====================================================
// PILLAR 5: MARKET PROFILE (15%)
// =====================================================

function calculateMarketProfileScore(
  data: ActivePlayerData
): MarketProfileDetails {
  const { position, secondaryPositions, seasonStats } = data;
  
  // Versatility score: bonus for multiple positions
  const totalPositions = 1 + secondaryPositions.length;
  let versatilityScore = Math.min(100, 40 + totalPositions * 20);
  
  // Position fit score: does the player's stats match their position archetype?
  let positionFitScore = 50; // Neutral start
  const keyTraits: string[] = [];
  
  const matches = Math.max(seasonStats.matches, 1);
  const minutes = Math.max(seasonStats.minutes, 1);
  const per90 = 90 / (minutes / matches);
  
  if (isGoalkeeper(position)) {
    // GK: aerial duels, clearances
    const aerialWinRate = seasonStats.aerialDuelsTotal > 0
      ? seasonStats.aerialDuelsWon / seasonStats.aerialDuelsTotal
      : 0;
    if (aerialWinRate > 0.7) {
      positionFitScore += 20;
      keyTraits.push('Dominante no jogo aéreo');
    }
    if (seasonStats.clearances * per90 > 2) {
      positionFitScore += 15;
      keyTraits.push('Bom saindo do gol');
    }
  } else if (isDefensivePosition(position)) {
    // Defensive: tackles, interceptions, aerial duels, passing
    const defActions = (seasonStats.tackles + seasonStats.interceptions) * per90;
    if (defActions > 4) {
      positionFitScore += 20;
      keyTraits.push('Alta recuperação de bola');
    }
    const aerialWinRate = seasonStats.aerialDuelsTotal > 0
      ? seasonStats.aerialDuelsWon / seasonStats.aerialDuelsTotal
      : 0;
    if (aerialWinRate > 0.6) {
      positionFitScore += 15;
      keyTraits.push('Forte no jogo aéreo');
    }
    const passAccuracy = seasonStats.passesTotal > 0
      ? seasonStats.passesCompleted / seasonStats.passesTotal
      : 0;
    if (passAccuracy > 0.85) {
      positionFitScore += 10;
      keyTraits.push('Bom passe de construção');
    }
  } else if (isAttackingPosition(position)) {
    // Attacking: dribbles, goals, chances
    const dribbleSuccess = seasonStats.dribblesTotal > 0
      ? seasonStats.dribblesSuccess / seasonStats.dribblesTotal
      : 0;
    if (dribbleSuccess > 0.6 && seasonStats.dribblesTotal * per90 > 2) {
      positionFitScore += 20;
      keyTraits.push('Drible eficiente');
    }
    const goalContribution = (seasonStats.goals + seasonStats.assists) * per90;
    if (goalContribution > 0.5) {
      positionFitScore += 25;
      keyTraits.push('Alta participação em gols');
    }
    if (seasonStats.chancesCreated * per90 > 1) {
      positionFitScore += 10;
      keyTraits.push('Criador de chances');
    }
  } else {
    // Midfielder: balanced
    const passAccuracy = seasonStats.passesTotal > 0
      ? seasonStats.passesCompleted / seasonStats.passesTotal
      : 0;
    if (passAccuracy > 0.85) {
      positionFitScore += 15;
      keyTraits.push('Passe preciso');
    }
    const duelsWinRate = seasonStats.duelsTotal > 0
      ? seasonStats.duelsWon / seasonStats.duelsTotal
      : 0;
    if (duelsWinRate > 0.55) {
      positionFitScore += 15;
      keyTraits.push('Vence duelos');
    }
    if (seasonStats.keyPasses * per90 > 1) {
      positionFitScore += 15;
      keyTraits.push('Passes decisivos');
    }
  }
  
  // Cap position fit score
  positionFitScore = Math.min(100, positionFitScore);
  
  // Combine scores: 40% versatility, 60% position fit
  const combinedScore = versatilityScore * 0.4 + positionFitScore * 0.6;
  
  const reasoning = keyTraits.length > 0
    ? `Perfil: ${keyTraits.join(', ')}.`
    : 'Perfil ainda em definição com base nos dados.';
  
  return {
    position,
    secondaryPositions,
    versatilityScore: Math.round(versatilityScore),
    positionFitScore: Math.round(positionFitScore),
    keyTraits,
    combinedScore: Math.round(clamp(combinedScore, 0, 100)),
    reasoning,
  };
}

// =====================================================
// TREND CALCULATION
// =====================================================

function calculateTrend(
  currentScore: number,
  previousScore: number | null
): MarketScoreTrend {
  if (previousScore === null) return 'FLAT';
  
  const delta = currentScore - previousScore;
  if (delta >= 3) return 'UP';
  if (delta <= -3) return 'DOWN';
  return 'FLAT';
}

// =====================================================
// CONFIDENCE CALCULATION
// =====================================================

function calculateConfidence(data: ActivePlayerData): number {
  let confidence = 0;
  
  // Age data: +15%
  if (data.age !== null) confidence += 15;
  
  // Position data: +10%
  if (data.position) confidence += 10;
  
  // Match data: up to 40%
  const matches = data.seasonStats.matches;
  if (matches >= 10) confidence += 40;
  else if (matches >= 5) confidence += 30;
  else if (matches >= 3) confidence += 20;
  else if (matches >= 1) confidence += 10;
  
  // Rating data: up to 20%
  const ratedMatches = data.matchRatings.filter(r => r.rating > 0).length;
  if (ratedMatches >= 5) confidence += 20;
  else if (ratedMatches >= 3) confidence += 15;
  else if (ratedMatches >= 1) confidence += 10;
  
  // Recent activity: up to 15%
  if (data.matchesLast30Days >= 3) confidence += 15;
  else if (data.matchesLast30Days >= 1) confidence += 10;
  
  return Math.min(100, confidence);
}

// =====================================================
// MAIN CALCULATION FUNCTION: ACTIVE PLAYER
// =====================================================

export function computeMarketScoreActive(
  data: ActivePlayerData,
  previousScore: number | null = null,
  weights: MarketScoreWeights = DEFAULT_MARKET_SCORE_WEIGHTS
): MarketScoreBreakdown {
  // Calculate each pillar
  const ageWindowDetails = calculateAgeWindowScore(data.age, data.position);
  const performanceImpactDetails = calculatePerformanceImpactScore(data);
  const competitiveContextDetails = calculateCompetitiveContextScore(data.matchRatings);
  const consistencyReliabilityDetails = calculateConsistencyReliabilityScore(data);
  const marketProfileDetails = calculateMarketProfileScore(data);
  
  // Get individual scores
  const scoreAgeWindow = ageWindowDetails.ageScore;
  const scorePerformanceImpact = performanceImpactDetails.combinedScore;
  const scoreCompetitiveContext = competitiveContextDetails.contextScore;
  const scoreConsistencyReliability = consistencyReliabilityDetails.consistencyScore;
  const scoreMarketProfile = marketProfileDetails.combinedScore;
  
  // Calculate weighted total
  const scoreTotal = Math.round(
    scoreAgeWindow * weights.ageWindow +
    scorePerformanceImpact * weights.performanceImpact +
    scoreCompetitiveContext * weights.competitiveContext +
    scoreConsistencyReliability * weights.consistencyReliability +
    scoreMarketProfile * weights.marketProfile
  );
  
  // Calculate confidence and trend
  const confidenceLevel = calculateConfidence(data);
  const trend30d = calculateTrend(scoreTotal, previousScore);
  
  // Determine calculation range
  const calculatedFromRange = data.seasonStats.matches > 0
    ? `últimos ${data.seasonStats.matches} jogos`
    : 'sem jogos';
  
  return {
    scoreTotal: clamp(scoreTotal, 0, 100),
    scoreAgeWindow,
    scorePerformanceImpact,
    scoreCompetitiveContext,
    scoreConsistencyReliability,
    scoreMarketProfile,
    ageWindowDetails,
    performanceImpactDetails,
    competitiveContextDetails,
    consistencyReliabilityDetails,
    marketProfileDetails,
    confidenceLevel,
    trend30d,
    calculatedFromRange,
    weightsUsed: weights,
    calculatedAt: new Date(),
  };
}

// =====================================================
// MAIN CALCULATION FUNCTION: TARGET PLAYER
// =====================================================

export function computeMarketScoreTarget(
  data: TargetPlayerData,
  previousScore: number | null = null,
  weights: MarketScoreWeights = DEFAULT_MARKET_SCORE_WEIGHTS
): MarketScoreBreakdown {
  // For targets, we have limited data - calculate what we can
  
  // Age calculation (same logic)
  const age = data.birthDate
    ? Math.floor((Date.now() - new Date(data.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : data.ageEstimate;
  
  const ageWindowDetails = calculateAgeWindowScore(age, data.position);
  
  // Performance from observations
  const validObservations = data.observations.filter(o => o.performanceRating !== null);
  const avgRating = validObservations.length > 0
    ? validObservations.reduce((sum, o) => sum + (o.performanceRating ?? 0), 0) / validObservations.length
    : null;
  
  // Simple performance score from observations
  let ratingScore = 50; // Neutral if no data
  if (avgRating !== null) {
    ratingScore = clamp(avgRating * 10, 20, 100);
  }
  
  const performanceImpactDetails: PerformanceImpactDetails = {
    matchesAnalyzed: validObservations.length,
    minutesPlayed: data.observations.reduce((sum, o) => sum + (o.minutesObserved ?? 0), 0),
    averageRating: avgRating,
    ratingScore: Math.round(ratingScore),
    decisiveActions: {
      goals: 0, assists: 0, keyPasses: 0, chancesCreated: 0,
      tackles: 0, interceptions: 0, clearances: 0,
    },
    decisiveActionsScore: Math.round(ratingScore), // Use same as rating for targets
    combinedScore: Math.round(ratingScore),
    reasoning: avgRating !== null
      ? `Avaliação média de ${avgRating.toFixed(1)} em ${validObservations.length} observações.`
      : 'Sem avaliações de observação registradas.',
  };
  
  // Competitive context from league info
  let contextScore = 50;
  if (data.leagueCompetition) {
    // Try to infer level from league name
    const league = data.leagueCompetition.toLowerCase();
    if (league.includes('série a') || league.includes('serie a') || league.includes('primeira divisão')) {
      contextScore = 75;
    } else if (league.includes('série b') || league.includes('serie b') || league.includes('segunda divisão')) {
      contextScore = 60;
    } else if (league.includes('série c') || league.includes('série d')) {
      contextScore = 45;
    }
  }
  
  const competitiveContextDetails: CompetitiveContextDetails = {
    competitionsPlayed: data.leagueCompetition ? [data.leagueCompetition] : [],
    averageCompetitionCoefficient: 1.0,
    highestCoefficient: 1.0,
    contextScore,
    reasoning: data.leagueCompetition
      ? `Atua no ${data.leagueCompetition}.`
      : 'Competição não informada.',
  };
  
  // Consistency from observations
  const totalMinutesObserved = data.observations.reduce((sum, o) => sum + (o.minutesObserved ?? 0), 0);
  const observationsLast30Days = data.observations.filter(o => {
    const obsDate = new Date(o.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return obsDate >= thirtyDaysAgo;
  }).length;
  
  let consistencyScore = 40; // Lower base for targets
  if (data.observations.length >= 5) consistencyScore += 30;
  else if (data.observations.length >= 3) consistencyScore += 20;
  else if (data.observations.length >= 1) consistencyScore += 10;
  
  if (observationsLast30Days > 0) consistencyScore += 15;
  
  const consistencyReliabilityDetails: ConsistencyReliabilityDetails = {
    totalMatches: data.observations.length,
    totalMinutes: totalMinutesObserved,
    minutesPerMatch: data.observations.length > 0
      ? Math.round(totalMinutesObserved / data.observations.length)
      : 0,
    ratingVariance: null,
    matchesLast30Days: observationsLast30Days,
    samplePenalty: data.observations.length < 3 ? 0.6 : 1.0,
    consistencyScore: Math.round(clamp(consistencyScore, 10, 100)),
    reasoning: `${data.observations.length} observações registradas, ${totalMinutesObserved} minutos observados.`,
  };
  
  // Market profile - simpler for targets
  const versatilityScore = 50; // Unknown secondary positions
  const positionFitScore = 50; // Can't assess without detailed stats
  
  const marketProfileDetails: MarketProfileDetails = {
    position: data.position,
    secondaryPositions: [],
    versatilityScore,
    positionFitScore,
    keyTraits: [],
    combinedScore: 50,
    reasoning: 'Perfil de mercado baseado em dados limitados.',
  };
  
  // Calculate scores
  const scoreAgeWindow = ageWindowDetails.ageScore;
  const scorePerformanceImpact = performanceImpactDetails.combinedScore;
  const scoreCompetitiveContext = competitiveContextDetails.contextScore;
  const scoreConsistencyReliability = consistencyReliabilityDetails.consistencyScore;
  const scoreMarketProfile = marketProfileDetails.combinedScore;
  
  // Weighted total
  const scoreTotal = Math.round(
    scoreAgeWindow * weights.ageWindow +
    scorePerformanceImpact * weights.performanceImpact +
    scoreCompetitiveContext * weights.competitiveContext +
    scoreConsistencyReliability * weights.consistencyReliability +
    scoreMarketProfile * weights.marketProfile
  );
  
  // Confidence for targets - generally lower
  let confidenceLevel = 0;
  if (age !== null) confidenceLevel += 20;
  if (data.position) confidenceLevel += 10;
  if (data.currentClub) confidenceLevel += 10;
  if (data.leagueCompetition) confidenceLevel += 15;
  if (validObservations.length >= 3) confidenceLevel += 25;
  else if (validObservations.length >= 1) confidenceLevel += 15;
  if (totalMinutesObserved >= 180) confidenceLevel += 20;
  
  const trend30d = calculateTrend(scoreTotal, previousScore);
  
  const calculatedFromRange = data.observations.length > 0
    ? `${data.observations.length} observações`
    : 'sem observações';
  
  return {
    scoreTotal: clamp(scoreTotal, 0, 100),
    scoreAgeWindow,
    scorePerformanceImpact,
    scoreCompetitiveContext,
    scoreConsistencyReliability,
    scoreMarketProfile,
    ageWindowDetails,
    performanceImpactDetails,
    competitiveContextDetails,
    consistencyReliabilityDetails,
    marketProfileDetails,
    confidenceLevel: Math.min(100, confidenceLevel),
    trend30d,
    calculatedFromRange,
    weightsUsed: weights,
    calculatedAt: new Date(),
  };
}
