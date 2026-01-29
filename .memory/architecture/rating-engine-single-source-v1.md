# Memory: architecture/rating-engine-single-source-v1
Updated: 2026-01-29

## Rating Engine - Single Source of Truth

The `calculateMatchRating()` function in `src/lib/matchRatingEngine.ts` is the **ONLY** canonical source for match ratings. All rating displays MUST use this function with consistent input mapping.

### Critical Data Semantics (DB Schema)

The database stores:
- `passes_total` = **FAILED passes count** (not actual total)
- `dribbles_total` = **FAILED dribbles count** (not actual total)
- `duels_total` = **REAL total** (won + lost)
- `aerial_duels_total` = **REAL total** (won + lost)

### Input Mapping

When converting to `PlayerStatsInput` for the rating engine:

```typescript
// CORRECT mapping from MatchDerivedStats
passes_total: stats.passes_failed,      // Engine expects FAILED count
dribbles_total: stats.dribbles_failed,  // Engine expects FAILED count
duels_total: stats.duels_total,         // Engine expects REAL total
aerial_duels_total: stats.aerial_duels_total  // Engine expects REAL total
```

### Consumer Hooks

1. **Match Summary** (`useMatchRatings`): Uses `calculatePlayerMatchRating()` → `matchPlayerStatsToInput()` directly from DB values
2. **Player Profile** (`usePlayerMatchRatings`): Uses `matchDerivedStatsToInput()` which maps derived stats back to engine format

Both MUST produce identical ratings for the same matchId + playerId.

### Debug Logging

In development, `usePlayerMatchRatings` logs `[RATING PARITY]` for each rating calculation to aid in debugging discrepancies.
