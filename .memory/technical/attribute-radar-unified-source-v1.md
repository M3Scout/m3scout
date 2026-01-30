# Memory: technical/attribute-radar-unified-source-v1
Updated: 2026-01-30

## Attribute Radar Unified Data Source

The "Visão Geral dos Atributos" (Attribute Radar) in the Player Profile now uses a SEPARATE aggregator from the Compare page.

### Data Sources

1. **Live Stats** (`match_player_stats` via `match_players`):
   - Games tracked via Live Match system
   - Minutes from `player_field_presence` (authoritative)

2. **Manual Stats** (`player_stats` table):
   - Historical/external games entered via admin
   - "Estatísticas por Temporada" section

### Aggregation Rule

**SUM Live + Manual** (they represent DIFFERENT games):
- Live games are NEVER duplicated in player_stats
- Total = live_matches + manual_matches
- Percentages recalculated from summed denominators

### Key Files

- `src/hooks/useAttributeUnifiedStats.ts` - New dedicated hook for attributes
- `src/components/players/sections/PlayerAttributeRadarSection.tsx` - Consumes the hook
- `src/lib/attributeRadar.ts` - Computes radar scores from aggregated data

### Debug

Add `?debugAttributes=1` to URL to see:
- liveTotals: matches, minutes, goals, etc from Live Match
- manualTotals: matches, minutes, goals, etc from player_stats
- mergedFinal: combined totals used for radar

### Compare Page Isolation

The Compare page (`/app/compare`) uses `unified_player_season_stats` view and `useUnifiedPlayerStats` hook, which has DIFFERENT priority rules (COALESCE, not SUM). This change does NOT affect Compare.
