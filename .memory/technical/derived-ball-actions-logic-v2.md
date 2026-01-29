# Memory: technical/derived-ball-actions-logic-v2
Updated: 2026-01-29

Ações com a bola (Ball Actions) is a DERIVED statistic (weight 0) calculated automatically from possession-related events. 

## Definition (Single Source of Truth)
See `src/lib/derivedBallActions.ts` for the canonical implementation.

Ball actions = sum of:
- **Attack**: goals, shots_on_target, shots_off_target, shots_blocked (offensive)
- **Creation**: assists, key_passes, chances_created
- **Passing**: passes_completed, passes_total (which stores FAILED passes)
- **Crosses**: crosses_success, crosses_failed
- **Dribbles**: dribbles_success, dribbles_total (which stores FAILED dribbles)
- **Possession**: possession_lost, recoveries

## Critical Schema Notes
- `passes_total` in DB stores **failed passes count**, NOT actual total
- `dribbles_total` in DB stores **failed dribbles count**, NOT actual total
- Frontend derives actual totals as: success + failed

## Display Rules
1. **Live Match UI**: Auto badge (cyan) - read-only, cannot be manually edited
2. **Match Review / PDF**: Cyan badge with derived value
3. **Half Summary Table**: Shows 1ºT/2ºT/Total breakdown
4. **Player Profile**: Aggregated across matches using `calculateDerivedBallActions()`

## Storage vs Display
- DB `match_player_stats.ball_actions` is periodically synced via migration
- Frontend ALWAYS recalculates using `calculateDerivedBallActions()` for display
- Uses `Math.max(derived, manual)` for backwards compatibility with legacy matches

## Anti-Regression Rules
- NEVER trust stored `ball_actions` directly - always recalculate
- `PostGameInsightsCard` uses `calculateDerivedBallActions()` 
- `MatchSummaryVectorPdf` uses `calculateBallActionsFromMatchStats()`
- `usePlayerMatchStats` calculates derived value for each match
- `usePlayerMatchStatsBySeasonCompetition` calculates derived value during aggregation
