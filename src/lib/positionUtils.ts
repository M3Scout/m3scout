/**
 * Position Utility Functions
 * 
 * =====================================================
 * POSITION FIELD DOCUMENTATION
 * =====================================================
 * 
 * DATABASE SCHEMA (players table):
 * - position: TEXT NOT NULL - Primary position (single string)
 * - secondary_positions: TEXT[] - Array of secondary positions
 * 
 * CURRENT VALUES IN DATABASE (as of 2026-01-11):
 * Primary positions found:
 *   - "Meia Atacante"
 *   - "Ponta Direita"
 *   - "Zagueiro"
 * 
 * Secondary positions found:
 *   - "Meia Atacante"
 *   - "Volante"
 * 
 * EXPECTED VALUES (from POSITION_MAPPING in playerRatingV2.ts):
 *   Goalkeeper: "Goleiro", "GK"
 *   Defenders: "Zagueiro", "Zagueiro Central", "CB", "Lateral Direito", "Lateral Esquerdo"
 *   Defensive Mids: "Volante", "Primeiro Volante", "DM", "CDM", "Segundo Volante"
 *   Midfielders: "Meia", "Meia Atacante", "Meia Central", "Meio-Campo", "CM", "CAM", "AM"
 *   Wing-backs: "Ala Direito", "Ala Esquerdo"
 *   Forwards: "Atacante", "Centroavante", "Ponta Direita", "Ponta Esquerda", 
 *             "Segundo Atacante", "ST", "CF", "RW", "LW"
 * 
 * FRONTEND USAGE:
 * - Position is read from player.position as a single string
 * - Secondary positions from player.secondary_positions as string[]
 * - Used in: PlayerCard, PlayerDetail, AppPlayers, NewPlayer, etc.
 * 
 * =====================================================
 */

/**
 * Goalkeeper position aliases (case-insensitive matching)
 */
const GOALKEEPER_ALIASES = [
  'goleiro',
  'gk',
  'goalkeeper',
  'arquero',      // Spanish
  'portero',      // Spanish
  'gardien',      // French
  'torwart',      // German
  'portiere',     // Italian
];

/**
 * Check if a player's position is Goalkeeper
 * 
 * @param player - Player object with position field, or position string directly
 * @returns true if the player is a goalkeeper
 * 
 * @example
 * // With player object
 * isGoalkeeper({ position: 'Goleiro' }) // true
 * isGoalkeeper({ position: 'GK' }) // true
 * isGoalkeeper({ position: 'Zagueiro' }) // false
 * 
 * // With string
 * isGoalkeeper('Goleiro') // true
 * isGoalkeeper('goalkeeper') // true
 */
export function isGoalkeeper(player: { position?: string | null } | string | null | undefined): boolean {
  if (!player) return false;
  
  // Handle both object with position field and direct string
  const position = typeof player === 'string' ? player : player.position;
  
  if (!position) return false;
  
  const normalizedPosition = position.toLowerCase().trim();
  
  return GOALKEEPER_ALIASES.some(alias => normalizedPosition === alias);
}

/**
 * Check if any of the player's positions (primary or secondary) is Goalkeeper
 * 
 * @param player - Player object with position and secondary_positions fields
 * @returns true if any position is goalkeeper
 */
export function hasGoalkeeperPosition(player: {
  position?: string | null;
  secondary_positions?: string[] | null;
} | null | undefined): boolean {
  if (!player) return false;
  
  // Check primary position
  if (isGoalkeeper(player.position)) return true;
  
  // Check secondary positions
  if (player.secondary_positions?.some(pos => isGoalkeeper(pos))) return true;
  
  return false;
}

/**
 * Position group detection (consistent with playerRatingV2.ts)
 */
export type PositionGroup = 'goalkeeper' | 'center_back' | 'defensive_mid' | 'midfielder' | 'forward';

const POSITION_TO_GROUP: Record<string, PositionGroup> = {
  // Goalkeeper
  'goleiro': 'goalkeeper',
  'gk': 'goalkeeper',
  'goalkeeper': 'goalkeeper',
  // Center Back
  'zagueiro': 'center_back',
  'zagueiro central': 'center_back',
  'cb': 'center_back',
  'lateral direito': 'center_back',
  'lateral esquerdo': 'center_back',
  // Defensive Mid
  'volante': 'defensive_mid',
  'primeiro volante': 'defensive_mid',
  'dm': 'defensive_mid',
  'cdm': 'defensive_mid',
  'segundo volante': 'defensive_mid',
  // Midfielders
  'meia': 'midfielder',
  'meia atacante': 'midfielder',
  'meia central': 'midfielder',
  'meio-campo': 'midfielder',
  'cm': 'midfielder',
  'cam': 'midfielder',
  'am': 'midfielder',
  'ala direito': 'midfielder',
  'ala esquerdo': 'midfielder',
  // Forwards
  'atacante': 'forward',
  'centroavante': 'forward',
  'ponta direita': 'forward',
  'ponta esquerda': 'forward',
  'segundo atacante': 'forward',
  'st': 'forward',
  'cf': 'forward',
  'rw': 'forward',
  'lw': 'forward',
};

/**
 * Get the position group for a given position string
 * Case-insensitive matching
 * 
 * @param position - Position string
 * @returns Position group, defaults to 'midfielder' if unknown
 */
export function getPositionGroup(position: string | null | undefined): PositionGroup {
  if (!position) return 'midfielder';
  return POSITION_TO_GROUP[position.toLowerCase().trim()] || 'midfielder';
}
