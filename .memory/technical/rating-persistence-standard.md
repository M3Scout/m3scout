# Memory: technical/rating-persistence-standard
Updated: 2026-01-29

## Single Source of Truth for Match Ratings

The official rating per athlete per match is persisted in `match_player_stats.rating` along with:
- `rating_minutes_played` - Derived minutes (using started/entered/exited if minutes_played is NULL)
- `rating_minutes_factor` - The multiplier used (0.6/0.8/0.9/1.0)
- `rating_breakdown` - **JSONB with full category contributions** for the breakdown modal
- `rating_computed_at` - Timestamp of last calculation
- `rating_engine_version` - Version tag (e.g., 'v8-sql-rebuild')

## Rating Breakdown Persistence

The SQL function `rebuild_match_ratings()` persists a JSONB breakdown for EVERY player with a rating:

```json
{
  "baseRating": 6.0,
  "minutesPlayed": 50,
  "minutesFactor": 0.8,
  "rawImpact": 0.34,
  "isGoalkeeper": false,
  "hasImpact": true,
  "offensiveCapped": 0.35,
  "categories": {
    "attack": { "value": 0.16, "label": "Ataque" },
    "creation": { "value": 0.21, "label": "Criação" },
    "passing": { "value": -0.02, "label": "Passes" },
    "defense": { "value": -0.01, "label": "Defesa" },
    "discipline": { "value": 0, "label": "Disciplina" },
    "goalkeeper": { "value": 0, "label": "Goleiro" }
  },
  "computedAt": "2026-01-29T05:51:41Z"
}
```

## Minutes Derivation

The rebuild function derives minutes from match_players when `minutes_played` is NULL:
1. If `started=true` and `exited_minute` exists → use `exited_minute`
2. If `started=true` and no exit → assume 90 minutes
3. If `entered_minute` and `exited_minute` exist → `exited - entered`
4. If only `entered_minute` → `90 - entered`
5. Otherwise → 0 minutes (no rating)

## UI Reading Pattern

All screens read exclusively from `match_player_stats`:
- Match Summary → reads rating + breakdown
- Player Profile → reads rating + breakdown
- Rating Evolution Chart → reads rating

The hook `useMatchRatings` converts `rating_breakdown` JSON to `DetailedBreakdown` for the modal.

## Anti-Regression Rules

1. **Never recalculate ratings in UI** for finished matches
2. After any event/stat edit, call `rebuildSingleMatchRatings(matchId)`
3. Invalidate React Query caches after rebuild
4. Every player with events MUST have breakdown (no silent failures)
