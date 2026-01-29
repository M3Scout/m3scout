# Memory: technical/rating-breakdown-modal-policy
Updated: 2026-01-29

## Rating Breakdown Modal ("!" Icon) Policy

### Visibility Rule
The "!" icon that opens the "Como a nota foi calculada" modal MUST be visible for ANY athlete with a valid rating (`hasRating: true`), regardless of whether detailed breakdown data exists.

### Data Sources (Priority Order)
1. **Persisted Breakdown (preferred)**: Read from `match_player_stats.rating_breakdown` JSONB column
   - Converted by `convertPersistedBreakdown()` in `useMatchRatings.ts`
   - Contains category contributions (attack, defense, creation, etc.)
   
2. **On-the-fly Calculation (fallback for live matches)**: Calculated by `calculatePlayerMatchRating()` in `matchRatingEngine.ts`
   - Full detailed breakdown with individual items

### Modal Behavior
- If `detailedBreakdown` exists → Show full breakdown with accordion categories
- If `detailedBreakdown` is null but rating exists → Show abbreviated mode with:
  - Final rating and label
  - Minutes factor
  - Message: "Detalhamento indisponível para esta partida"
  - DEV log for debugging

### Rebuild Guarantees
After running `rebuild_match_ratings()`:
- ALL players with calculated ratings will have `rating_breakdown` populated
- The JSONB includes: baseRating, minutesPlayed, minutesFactor, rawImpact, hasImpact, categories, computedAt
- No player should show "indisponível" for newly rebuilt matches

### Minutes Derivation (Critical for Bug 2)
The rebuild function derives minutes from match_players when `minutes_played` is NULL:
1. If `started=true` and `exited_minute` exists → use `exited_minute`
2. If `started=true` and no exit → assume 90 minutes
3. If `entered_minute` and `exited_minute` exist → `exited - entered`
4. If only `entered_minute` → `90 - entered`
5. Otherwise → 0 minutes (no rating)

This ensures players like Gustavo (started=true, exited_minute=20) get proper ratings even when `minutes_played` field is NULL.

### Anti-Regression
- Never hide the "!" icon based on breakdown availability
- Always allow opening the modal to show at least the final rating
- Log warnings in DEV when breakdown is missing for a rated player
- A player with events in match_events MUST have a rating (never "Não entrou em campo")
