# Memory: architecture/compare-unified-stats-v1
Updated: now

The Compare Players page (/app/compare) uses the `unified_player_season_stats` view as its data source, ensuring parity with the Player Profile. The hook `useUnifiedPlayerStats.ts` provides the following:

1. **Data Source Priority**: LIVE stats (from `match_player_stats`) take priority over MANUAL stats (`manual_player_stats`). The view uses COALESCE with LIVE first, so if a player has live data for a season/competition, those values are used.

2. **No Double Counting**: For each (player_id, season_year, competition_id) tuple, only one source is used - never a sum of both.

3. **data_source Indicator**: The view returns 'live', 'manual', or 'both' to indicate the source. When 'both', LIVE values are prioritized via COALESCE.

4. **Aggregation**: The `aggregateUnifiedStats` function sums across all returned rows (different competitions/seasons), trusting the view's priority logic.

5. **Clearances**: Not present in the unified view; derived from recoveries or set to 0 in radar/PDF exports.
