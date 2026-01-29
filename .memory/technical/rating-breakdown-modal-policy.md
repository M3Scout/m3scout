# Memory: technical/rating-breakdown-modal-policy
Updated: 2026-01-29

## Rating Breakdown Modal ("!" Icon)

The rating breakdown modal (accessible via "!" icon) shows how a player's match rating was calculated.

### Availability
- The "!" icon ALWAYS appears for any player with a valid rating (hasRating = true)
- Works for both live-calculated ratings AND persisted ratings
- Never silently hides the button

### Two Display Modes

**1. Full Breakdown (Live/Calculated Ratings)**
When `detailedBreakdown` is available:
- Shows full category breakdown (Ataque, Criação, Passes, Defesa, Disciplina)
- Shows individual stat contributions with weights
- Shows caps applied and anti-inflation status
- Shows impact calculations step-by-step

**2. Abbreviated Mode (Persisted Ratings)**
When `detailedBreakdown` is null (rating read from DB):
- Shows the player name and final rating
- Shows base rating (6.0) and minutes factor
- Shows "Detalhamento indisponível para esta partida"
- Explains: "A nota foi calculada pelo motor de scouting e persistida no banco"
- In DEV mode: Shows hint about rebuild

### Implementation
- `RatingBreakdownModal` in `src/components/live-match/RatingBreakdownModal.tsx`
- `PlayerRatingBadge` wraps ratings with the modal trigger
- Modal now handles `hasBreakdown` boolean to switch display modes

### Future Enhancement
When running `rebuild_match_ratings()`, consider persisting `detailedBreakdown` as JSON in `match_player_stats` for full historical audit trail.
