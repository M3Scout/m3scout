# Memory: technical/attribute-radar-unified-source-v1
Updated: 2026-01-30

## Attribute Radar Unified Data Source

The "Visão Geral dos Atributos" (Attribute Radar) in the Player Profile uses a SEPARATE aggregator from the Compare page.

### Data Sources

1. **Live Stats** (`match_player_stats` via `match_players`):
   - Games tracked via Live Match system
   - Minutes from `player_field_presence` (authoritative)

2. **Manual Stats** (TWO tables):
   - `player_stats`: Legacy "Estatísticas por Temporada" section
   - `manual_player_stats`: Newer manual entry system

### Competition Dropdown

The competition filter in the radar uses `unifiedCompetitions.ts` which fetches from:
- `match_players` → `matches` → `competitions` (for Live Match data)
- `player_stats` (legacy admin stats)
- `manual_player_stats` (newer manual stats)

All three sources are merged and deduplicated by `competition_id + season_year`.

### Aggregation Rule

**SUM Live + Manual** (they represent DIFFERENT games):
- Live games are NEVER duplicated in player_stats
- Total = live_matches + manual_matches
- Percentages recalculated from summed denominators

### Key Files

- `src/lib/unifiedCompetitions.ts` - Fetches competitions from all 3 sources
- `src/hooks/useAttributeUnifiedStats.ts` - Aggregates Live + Manual stats
- `src/components/players/SofaScoreRadarCard.tsx` - Radar with filters
- `src/lib/attributeRadar.ts` - Computes radar scores from aggregated data

### Debug

Add `?debugAttributes=1` to URL to see:
- liveTotals: matches, minutes, goals, etc from Live Match
- manualTotals: matches, minutes, goals, etc from player_stats
- mergedFinal: combined totals used for radar

### Compare Page Isolation

The Compare page (`/app/compare`) uses `unified_player_season_stats` view and `useUnifiedPlayerStats` hook, which has DIFFERENT priority rules (COALESCE, not SUM). This change does NOT affect Compare.
