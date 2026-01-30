# Memory: architecture/compare-unified-stats-v1
Updated: 2026-01-30

The Compare Players page (/app/compare) uses the `unified_player_season_stats` view as its data source, ensuring parity with the Player Profile. The hook `useUnifiedPlayerStats.ts` provides the following:

1. **Data Source**: The view joins LIVE stats (from `match_player_stats` via `match_players`) with MANUAL stats (from `player_stats` table). Uses FULL JOIN on (player_id, season_year, competition_id).

2. **Priority Rule**: COALESCE prioritizes LIVE data. If both exist for the same context, LIVE values are used.

3. **Career View**: When filter is "Todas", the view returns ALL rows from both sources (different seasons/competitions), allowing complete career aggregation.

4. **data_source Indicator**: Returns 'live', 'manual', or 'both' to indicate the source for each row.

5. **Season/Competition Filters**: Compare page includes dropdowns. Default is "all" for career view. Changing filters re-aggregates stats.

6. **Radar Threshold**: Attribute radar requires minimum 100 minutes to display (ensures at least ~1 full match of data).

7. **Debug Mode**: Add `?debugCompare=1` to URL to log data source, filters, and stats breakdown.

8. **Consistency Rule**: Compare page values must match the Player Profile for the same season/competition filter.

9. **IMPORTANT**: The view uses `player_stats` table (NOT `manual_player_stats` which is empty) for manual data.
