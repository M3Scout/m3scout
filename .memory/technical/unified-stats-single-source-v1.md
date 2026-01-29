# Memory: technical/unified-stats-single-source-v1
Updated: now

## Unified Stats Architecture (Manual + Live Match) - v2

The system enforces **strict source separation** for player statistics:

### Data Sources

1. **Live Match Stats** (`match_player_stats` table):
   - Primary source for games tracked via Live Match
   - Stats populated during live games, ratings calculated on finish
   - Apply does NOT write to any other table—data stays here

2. **Manual Stats** (`manual_player_stats` table):
   - Fallback for external games not tracked via Live Match
   - User-editable via "Adicionar Jogos Externos" form
   - UNIQUE constraint per `(player_id, competition_id, season_year)`

### Priority Rule

**Live data ALWAYS takes precedence over manual data.**

For the same `(player_id, competition_id, season_year)`:
- If live data exists → use live, ignore manual
- If only manual exists → use manual as fallback
- NEVER sum live + manual together

### Database View: `unified_player_season_stats`

A PostgreSQL view that:
- Aggregates live stats from `match_player_stats` + `match_players`
- Uses `manual_player_stats` as fallback (not `player_stats`!)
- Returns `data_source` field: `'live'`, `'manual'`, or `'both'`
- Uses FULL OUTER JOIN with COALESCE priority for live

### Apply Flow (Critical)

The `applyStats` mutation in `LiveMatchReview.tsx`:
- Does NOT write to `player_stats` or `manual_player_stats`
- Only updates `match_players.minutes_played` with calculated values
- Marks match as `status = 'applied'`
- Triggers rating rebuild via `rebuildSingleMatchRatings`

### Key Files

- `src/pages/app/LiveMatchReview.tsx` - Apply logic (no player_stats writes)
- `src/components/players/DataQualityPanel.tsx` - Priority aggregation
- `src/lib/unifiedCompetitions.ts` - Uses `manual_player_stats` for manual source
- `src/hooks/useManualPlayerStats.ts` - CRUD for manual stats only
- Database: `unified_player_season_stats` view (uses priority, not sum)

### UI Principle

- Live Match badge (⚡) for games from Live Match
- Manual badge (📝) for manually entered external games
- "Combinado" only refers to multiple live games, NEVER live + manual
