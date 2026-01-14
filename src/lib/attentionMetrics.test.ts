import { describe, it, expect } from 'vitest';

// Types for testing
interface StatItem {
  stat: string;
  label: string;
  score: number;
  available: boolean;
}

interface PositionGroupProfile {
  primaryMetrics: string[];
  secondaryMetrics: string[];
  ignoredMetrics: string[];
}

// Replicate the position profiles for testing
const POSITION_GROUP_PROFILES: Record<string, PositionGroupProfile> = {
  midfielder: {
    primaryMetrics: ["assists", "key_passes", "chances_created", "shots", "shots_on_target", "goals", "accurate_passes", "duels_won", "successful_dribbles", "possession_lost"],
    secondaryMetrics: ["tackles", "interceptions"],
    ignoredMetrics: ["clearances", "aerial_duels_won", "saves", "goals_conceded", "clean_sheets", "tackles", "interceptions", "recoveries"],
  },
  forward: {
    primaryMetrics: ["goals", "assists", "shots", "shots_on_target", "successful_dribbles", "chances_created"],
    secondaryMetrics: ["key_passes"],
    ignoredMetrics: ["tackles", "interceptions", "clearances", "recoveries", "aerial_duels_won", "saves", "goals_conceded", "clean_sheets"],
  },
};

/**
 * Replicates the midfielder weakness selection logic for testing
 */
function selectMidfielderWeaknesses(primaryStats: StatItem[]): StatItem[] {
  const type1Metrics = ["assists", "goals", "chances_created", "key_passes"]; // Offensive production
  const type2Metrics = ["successful_dribbles", "accurate_passes", "possession_lost"]; // Risk/possession
  
  let selected: StatItem[] = [];
  
  // Phase 1: Type 1 with threshold <= 40
  const type1Candidates = primaryStats
    .filter(s => type1Metrics.includes(s.stat) && s.score <= 40)
    .sort((a, b) => a.score - b.score);
  
  for (const candidate of type1Candidates) {
    if (selected.length >= 3) break;
    selected.push(candidate);
  }
  
  // Phase 2: Add Type 2 with threshold <= 45 if needed
  if (selected.length < 3) {
    const type2Candidates = primaryStats
      .filter(s => type2Metrics.includes(s.stat) && s.score <= 45 && !selected.some(sel => sel.stat === s.stat))
      .sort((a, b) => a.score - b.score);
    
    for (const candidate of type2Candidates) {
      if (selected.length >= 3) break;
      selected.push(candidate);
    }
  }
  
  // Phase 3: Fallback - expand Type 1 to <= 45
  if (selected.length < 3) {
    const expandedType1 = primaryStats
      .filter(s => type1Metrics.includes(s.stat) && s.score > 40 && s.score <= 45 && !selected.some(sel => sel.stat === s.stat))
      .sort((a, b) => a.score - b.score);
    
    for (const candidate of expandedType1) {
      if (selected.length >= 3) break;
      selected.push(candidate);
    }
  }
  
  // Phase 4: Fallback - expand Type 2 to <= 50
  if (selected.length < 3) {
    const expandedType2 = primaryStats
      .filter(s => type2Metrics.includes(s.stat) && s.score > 45 && s.score <= 50 && !selected.some(sel => sel.stat === s.stat))
      .sort((a, b) => a.score - b.score);
    
    for (const candidate of expandedType2) {
      if (selected.length >= 3) break;
      selected.push(candidate);
    }
  }
  
  return selected.slice(0, 3);
}

/**
 * Replicates the forward weakness selection logic for testing
 */
function selectForwardWeaknesses(primaryStats: StatItem[]): StatItem[] {
  const type1Metrics = ["goals", "assists", "shots", "shots_on_target"]; // Scoring/finishing
  const type2Metrics = ["successful_dribbles", "chances_created"]; // Technical/creation
  
  let selected: StatItem[] = [];
  
  // Phase 1: Type 1 with threshold <= 40
  const type1Candidates = primaryStats
    .filter(s => type1Metrics.includes(s.stat) && s.score <= 40)
    .sort((a, b) => a.score - b.score);
  
  for (const candidate of type1Candidates) {
    if (selected.length >= 3) break;
    selected.push(candidate);
  }
  
  // Phase 2: Add Type 2 with threshold <= 45 if needed
  if (selected.length < 3) {
    const type2Candidates = primaryStats
      .filter(s => type2Metrics.includes(s.stat) && s.score <= 45 && !selected.some(sel => sel.stat === s.stat))
      .sort((a, b) => a.score - b.score);
    
    for (const candidate of type2Candidates) {
      if (selected.length >= 3) break;
      selected.push(candidate);
    }
  }
  
  // Phase 3: Fallback - expand Type 1 to <= 45
  if (selected.length < 3) {
    const expandedType1 = primaryStats
      .filter(s => type1Metrics.includes(s.stat) && s.score > 40 && s.score <= 45 && !selected.some(sel => sel.stat === s.stat))
      .sort((a, b) => a.score - b.score);
    
    for (const candidate of expandedType1) {
      if (selected.length >= 3) break;
      selected.push(candidate);
    }
  }
  
  // Phase 4: Fallback - expand Type 2 to <= 50
  if (selected.length < 3) {
    const expandedType2 = primaryStats
      .filter(s => type2Metrics.includes(s.stat) && s.score > 45 && s.score <= 50 && !selected.some(sel => sel.stat === s.stat))
      .sort((a, b) => a.score - b.score);
    
    for (const candidate of expandedType2) {
      if (selected.length >= 3) break;
      selected.push(candidate);
    }
  }
  
  return selected.slice(0, 3);
}

// Helper to create stat items
function createStat(stat: string, score: number, label?: string): StatItem {
  return {
    stat,
    label: label || stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score,
    available: true,
  };
}

describe('Midfielder Weakness Selection (Atenção)', () => {
  describe('Phase 1: Type 1 metrics <= 40', () => {
    it('should select assists with score 34', () => {
      const stats = [
        createStat('assists', 34),
        createStat('goals', 70),
        createStat('key_passes', 65),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('assists');
      expect(result[0].score).toBe(34);
    });

    it('should select multiple Type 1 metrics <= 40 sorted by score', () => {
      const stats = [
        createStat('assists', 34),
        createStat('goals', 38),
        createStat('key_passes', 25),
        createStat('chances_created', 40),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(3);
      expect(result[0].stat).toBe('key_passes');
      expect(result[0].score).toBe(25);
      expect(result[1].stat).toBe('assists');
      expect(result[1].score).toBe(34);
      expect(result[2].stat).toBe('goals');
      expect(result[2].score).toBe(38);
    });

    it('should include chances_created at exactly 40', () => {
      const stats = [
        createStat('chances_created', 40),
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('chances_created');
    });
  });

  describe('Phase 2: Type 2 metrics <= 45', () => {
    it('should include successful_dribbles with score 34', () => {
      const stats = [
        createStat('successful_dribbles', 34),
        createStat('goals', 70),
        createStat('assists', 65),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('successful_dribbles');
    });

    it('should include possession_lost with score 35', () => {
      const stats = [
        createStat('possession_lost', 35),
        createStat('goals', 70),
        createStat('assists', 65),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('possession_lost');
    });

    it('should include accurate_passes with score 45', () => {
      const stats = [
        createStat('accurate_passes', 45),
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('accurate_passes');
    });

    it('should combine Type 1 and Type 2 metrics to fill 3 slots', () => {
      const stats = [
        createStat('assists', 34),
        createStat('successful_dribbles', 34),
        createStat('possession_lost', 35),
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(3);
      // Type 1 first (assists), then Type 2 (dribbles, possession)
      expect(result.map(r => r.stat)).toContain('assists');
      expect(result.map(r => r.stat)).toContain('successful_dribbles');
      expect(result.map(r => r.stat)).toContain('possession_lost');
    });
  });

  describe('Phase 3 & 4: Fallback thresholds', () => {
    it('should expand Type 1 to <= 45 when needed', () => {
      const stats = [
        createStat('assists', 42), // Above 40, but <= 45 (fallback)
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('assists');
      expect(result[0].score).toBe(42);
    });

    it('should expand Type 2 to <= 50 when needed', () => {
      const stats = [
        createStat('successful_dribbles', 48), // Above 45, but <= 50 (fallback)
        createStat('goals', 70),
        createStat('assists', 65),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('successful_dribbles');
    });

    it('should not include metrics above fallback threshold', () => {
      const stats = [
        createStat('assists', 51), // Above all thresholds
        createStat('successful_dribbles', 51), // Above all thresholds
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Defensive metrics exclusion', () => {
    it('should never include tackles in Atenção for midfielder', () => {
      const stats = [
        createStat('tackles', 20), // Very low score
        createStat('interceptions', 15), // Very low score
        createStat('clearances', 10), // Very low score
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      // Defensive metrics are in ignoredMetrics and NOT in primaryMetrics
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      // No defensive metrics should be included
      expect(result.map(r => r.stat)).not.toContain('tackles');
      expect(result.map(r => r.stat)).not.toContain('interceptions');
      expect(result.map(r => r.stat)).not.toContain('clearances');
    });
  });

  describe('Real-world scenario: Meia Atacante with scores 34-35', () => {
    it('should correctly identify weaknesses for typical attacking midfielder', () => {
      const stats = [
        createStat('assists', 34),
        createStat('successful_dribbles', 34),
        createStat('possession_lost', 35),
        createStat('goals', 55),
        createStat('key_passes', 72),
        createStat('chances_created', 68),
        createStat('shots', 60),
        createStat('shots_on_target', 58),
        createStat('accurate_passes', 75),
        createStat('duels_won', 50),
      ];
      const profile = POSITION_GROUP_PROFILES.midfielder;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectMidfielderWeaknesses(primaryStats);
      
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(3);
      
      // Should include assists (34) as Type 1
      expect(result.map(r => r.stat)).toContain('assists');
      
      // Should include at least one of: successful_dribbles (34), possession_lost (35)
      const hasType2 = result.some(r => 
        r.stat === 'successful_dribbles' || r.stat === 'possession_lost'
      );
      expect(hasType2).toBe(true);
    });
  });
});

describe('Forward Weakness Selection (Atenção)', () => {
  describe('Type 1 metrics <= 40', () => {
    it('should select goals with score 35', () => {
      const stats = [
        createStat('goals', 35),
        createStat('assists', 70),
        createStat('shots', 65),
      ];
      const profile = POSITION_GROUP_PROFILES.forward;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectForwardWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('goals');
    });

    it('should prioritize lowest scores first', () => {
      const stats = [
        createStat('goals', 38),
        createStat('assists', 25),
        createStat('shots', 32),
        createStat('shots_on_target', 40),
      ];
      const profile = POSITION_GROUP_PROFILES.forward;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectForwardWeaknesses(primaryStats);
      
      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(25); // assists first (lowest)
      expect(result[1].score).toBe(32); // shots second
      expect(result[2].score).toBe(38); // goals third
    });
  });

  describe('Type 2 metrics <= 45', () => {
    it('should include successful_dribbles with score 42', () => {
      const stats = [
        createStat('successful_dribbles', 42),
        createStat('goals', 70),
        createStat('assists', 65),
      ];
      const profile = POSITION_GROUP_PROFILES.forward;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectForwardWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('successful_dribbles');
    });

    it('should include chances_created with score 44', () => {
      const stats = [
        createStat('chances_created', 44),
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.forward;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectForwardWeaknesses(primaryStats);
      
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('chances_created');
    });
  });

  describe('Defensive metrics exclusion', () => {
    it('should never include defensive metrics for forward', () => {
      const stats = [
        createStat('tackles', 10),
        createStat('interceptions', 15),
        createStat('recoveries', 20),
        createStat('goals', 70),
      ];
      const profile = POSITION_GROUP_PROFILES.forward;
      const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
      
      const result = selectForwardWeaknesses(primaryStats);
      
      expect(result.map(r => r.stat)).not.toContain('tackles');
      expect(result.map(r => r.stat)).not.toContain('interceptions');
      expect(result.map(r => r.stat)).not.toContain('recoveries');
    });
  });
});

describe('Edge Cases', () => {
  it('should return empty array when no metrics meet thresholds', () => {
    const stats = [
      createStat('assists', 70),
      createStat('goals', 80),
      createStat('key_passes', 65),
    ];
    const profile = POSITION_GROUP_PROFILES.midfielder;
    const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
    
    const result = selectMidfielderWeaknesses(primaryStats);
    
    expect(result).toHaveLength(0);
  });

  it('should handle empty stats array', () => {
    const result = selectMidfielderWeaknesses([]);
    expect(result).toHaveLength(0);
  });

  it('should limit results to maximum 3 items', () => {
    const stats = [
      createStat('assists', 20),
      createStat('goals', 25),
      createStat('key_passes', 30),
      createStat('chances_created', 35),
      createStat('successful_dribbles', 28),
    ];
    const profile = POSITION_GROUP_PROFILES.midfielder;
    const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
    
    const result = selectMidfielderWeaknesses(primaryStats);
    
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('should correctly handle boundary value 40 for Type 1', () => {
    const stats = [
      createStat('assists', 40), // Should be included in Phase 1
      createStat('goals', 41),   // Should NOT be in Phase 1, but in Phase 3
    ];
    const profile = POSITION_GROUP_PROFILES.midfielder;
    const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
    
    const result = selectMidfielderWeaknesses(primaryStats);
    
    expect(result).toHaveLength(2);
    expect(result[0].stat).toBe('assists'); // 40 comes first (Phase 1)
    expect(result[1].stat).toBe('goals');   // 41 comes from Phase 3 fallback
  });

  it('should correctly handle boundary value 45 for Type 2', () => {
    const stats = [
      createStat('successful_dribbles', 45), // Should be included in Phase 2
      createStat('possession_lost', 46),     // Should NOT be in Phase 2, but in Phase 4
    ];
    const profile = POSITION_GROUP_PROFILES.midfielder;
    const primaryStats = stats.filter(s => profile.primaryMetrics.includes(s.stat));
    
    const result = selectMidfielderWeaknesses(primaryStats);
    
    expect(result).toHaveLength(2);
    expect(result[0].stat).toBe('successful_dribbles'); // 45 comes first
    expect(result[1].stat).toBe('possession_lost');     // 46 from Phase 4
  });
});
