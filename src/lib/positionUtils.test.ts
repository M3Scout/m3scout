import { describe, it, expect } from 'vitest';
import { 
  isGoalkeeper, 
  hasGoalkeeperPosition, 
  getRadarConfig, 
  hasRadarValues,
  GK_RADAR_AXES,
  OUTFIELD_RADAR_AXES,
  type RadarConfig
} from './positionUtils';

describe('isGoalkeeper', () => {
  it('should return true for goalkeeper positions', () => {
    expect(isGoalkeeper('Goleiro')).toBe(true);
    expect(isGoalkeeper('GK')).toBe(true);
    expect(isGoalkeeper('Goalkeeper')).toBe(true);
    expect(isGoalkeeper('goleiro')).toBe(true);
    expect(isGoalkeeper('gk')).toBe(true);
  });

  it('should return false for outfield positions', () => {
    expect(isGoalkeeper('Atacante')).toBe(false);
    expect(isGoalkeeper('Zagueiro')).toBe(false);
    expect(isGoalkeeper('Meio-campo')).toBe(false);
    expect(isGoalkeeper('Lateral')).toBe(false);
    expect(isGoalkeeper('ST')).toBe(false);
    expect(isGoalkeeper('CB')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isGoalkeeper(null)).toBe(false);
    expect(isGoalkeeper(undefined)).toBe(false);
    expect(isGoalkeeper('')).toBe(false);
  });

  it('should handle player objects', () => {
    expect(isGoalkeeper({ position: 'Goleiro' })).toBe(true);
    expect(isGoalkeeper({ position: 'GK' })).toBe(true);
    expect(isGoalkeeper({ position: 'Atacante' })).toBe(false);
    expect(isGoalkeeper({ position: null })).toBe(false);
  });
});

describe('hasGoalkeeperPosition', () => {
  it('should detect primary goalkeeper position', () => {
    expect(hasGoalkeeperPosition({ position: 'Goleiro' })).toBe(true);
    expect(hasGoalkeeperPosition({ position: 'GK' })).toBe(true);
  });

  it('should detect secondary goalkeeper position', () => {
    expect(hasGoalkeeperPosition({ 
      position: 'Zagueiro', 
      secondary_positions: ['Goleiro'] 
    })).toBe(true);
    expect(hasGoalkeeperPosition({ 
      position: 'Lateral', 
      secondary_positions: ['GK', 'Zagueiro'] 
    })).toBe(true);
  });

  it('should return false for outfield-only players', () => {
    expect(hasGoalkeeperPosition({ 
      position: 'Atacante', 
      secondary_positions: ['Ponta'] 
    })).toBe(false);
  });
});

describe('getRadarConfig - Goalkeeper Detection', () => {
  // Using uppercase keys as defined in PlayerRadarData interface
  const gkAutoRatingDetails = {
    gk_radar: {
      DEF: 75,
      ANT: 80,
      TAT: 70,
      DIS: 85,
      AER: 78
    }
  };

  const outfieldAutoRatingDetails = {
    radar: {
      ATA: 70,
      'TÉC': 75,
      DEF: 60,
      'TÁT': 65,
      CRI: 80
    }
  };

  it('should return GK radar config for goalkeeper with gk_radar data', () => {
    const player = {
      position: 'Goleiro',
      auto_rating_details: gkAutoRatingDetails
    };

    const config = getRadarConfig(player);
    
    expect(config.type).toBe('GK');
    expect(config.title).toBe('Radar do Goleiro');
    expect(config.labels).toEqual(GK_RADAR_AXES);
    expect(config.values).toEqual({ DEF: 75, ANT: 80, TAT: 70, DIS: 85, AER: 78 });
  });

  it('should return GK radar config for GK position variant', () => {
    const player = {
      position: 'GK',
      auto_rating_details: gkAutoRatingDetails
    };

    const config = getRadarConfig(player);
    
    expect(config.type).toBe('GK');
    expect(config.labels).toEqual(GK_RADAR_AXES);
  });

  it('should return outfield radar for outfield player', () => {
    const player = {
      position: 'Atacante',
      auto_rating_details: outfieldAutoRatingDetails
    };

    const config = getRadarConfig(player);
    
    expect(config.type).toBe('OUTFIELD');
    expect(config.title).toBe('Visão geral dos atributos');
    expect(config.labels).toEqual(OUTFIELD_RADAR_AXES);
    expect(config.values).toEqual({ ATA: 70, 'TÉC': 75, DEF: 60, 'TÁT': 65, CRI: 80 });
  });

  it('should return GK radar with null values when goalkeeper has no gk_radar data', () => {
    const player = {
      position: 'Goleiro',
      auto_rating_details: null
    };

    const config = getRadarConfig(player);
    
    expect(config.type).toBe('GK');
    expect(config.labels).toEqual(GK_RADAR_AXES);
    expect(config.values).toBeNull();
  });

  it('should NEVER return outfield radar for goalkeeper', () => {
    // This is the critical test - GK should never see ATA/CRI/TÉC axes
    const goalkeeperPositions = ['Goleiro', 'GK', 'Goalkeeper', 'goleiro', 'gk'];
    
    goalkeeperPositions.forEach(position => {
      // Even with outfield radar data, GK should get GK radar
      const playerWithWrongData = {
        position,
        auto_rating_details: outfieldAutoRatingDetails // Wrong data type for GK
      };

      const config = getRadarConfig(playerWithWrongData);
      
      expect(config.type).toBe('GK');
      expect(config.labels).toEqual(GK_RADAR_AXES);
      // Should not contain outfield-specific axes
      expect(config.labels).not.toContain('ATA');
      expect(config.labels).not.toContain('CRI');
      expect(config.labels).not.toContain('TÉC');
    });
  });

  it('should NEVER return GK radar for outfield player', () => {
    const outfieldPositions = ['Atacante', 'Zagueiro', 'Lateral', 'Meio-campo', 'ST', 'CB', 'CM'];
    
    outfieldPositions.forEach(position => {
      const player = {
        position,
        auto_rating_details: gkAutoRatingDetails // Even with GK data
      };

      const config = getRadarConfig(player);
      
      expect(config.type).toBe('OUTFIELD');
      expect(config.labels).toEqual(OUTFIELD_RADAR_AXES);
      // Should not contain GK-specific axes
      expect(config.labels).not.toContain('ANT');
      expect(config.labels).not.toContain('DIS');
      expect(config.labels).not.toContain('AER');
    });
  });
});

describe('hasRadarValues', () => {
  it('should return true when radar has values', () => {
    const config: RadarConfig = {
      type: 'GK',
      title: 'Radar do Goleiro',
      labels: GK_RADAR_AXES,
      values: { DEF: 75, ANT: 80, TAT: 70, DIS: 85, AER: 78 }
    };
    
    expect(hasRadarValues(config)).toBe(true);
  });

  it('should return false when values is null', () => {
    const config: RadarConfig = {
      type: 'GK',
      title: 'Radar do Goleiro',
      labels: GK_RADAR_AXES,
      values: null
    };
    
    expect(hasRadarValues(config)).toBe(false);
  });

  it('should return false when all values are zero', () => {
    const config: RadarConfig = {
      type: 'GK',
      title: 'Radar do Goleiro',
      labels: GK_RADAR_AXES,
      values: { DEF: 0, ANT: 0, TAT: 0, DIS: 0, AER: 0 }
    };
    
    expect(hasRadarValues(config)).toBe(false);
  });
});
