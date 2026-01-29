# Memory: technical/unified-stats-single-source-v1
Updated: now

## Unified Stats Architecture (Manual + Live Match)

The system now uses a **Single Source of Truth** for all player statistics across both manual (player_stats) and live match (match_player_stats) data sources.

### Database View: `unified_player_season_stats`

A PostgreSQL view that combines:
- **Manual Stats**: From `player_stats` table (externally entered data)
- **Live Match Stats**: From `match_players` + `match_player_stats` (recorded during live games)

The view performs a FULL OUTER JOIN by `player_id + competition_id + season_year`, summing values where both sources have data.

Each row includes a `data_source` field: `'manual'`, `'live'`, or `'both'`.

### Components Using Unified Data

1. **DataQualityPanel** (`src/components/players/DataQualityPanel.tsx`)
   - Fetches unified competitions via `fetchUnifiedCompetitions` + direct aggregation
   - Shows combined games/minutes/stats from both sources

2. **OverallRatingCard / Auto Rating** (via `calculate_athlete_auto_rating` RPC)
   - Now queries `unified_player_season_stats` view instead of just `player_stats`
   - Rating considers all player activity regardless of data origin

3. **Attribute Radar Filters** (`SofaScoreRadarCard`, `GKRadarCard`)
   - Uses `fetchUnifiedCompetitions` from `src/lib/unifiedCompetitions.ts`
   - Dropdown shows single list without live/manual distinction

### Key Files

- `src/lib/unifiedCompetitions.ts` - Client-side competition list fetcher
- `src/components/players/DataQualityPanel.tsx` - Stats completeness panel
- Database: `unified_player_season_stats` view (SECURITY INVOKER)
- Database: `calculate_athlete_auto_rating` function (uses unified view)

### UI Principle

**No distinction between "live" and "manual" data in the UI.** Users see a unified view of the athlete's career without knowing the data origin.
