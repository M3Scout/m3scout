# Memory: technical/rating-persistence-policy
Updated: 2026-01-29

## SINGLE SOURCE OF TRUTH: match_player_stats.rating

A nota oficial do atleta por partida é persistida exclusivamente no campo `match_player_stats.rating`. 

### Regras Absolutas
1. **PROIBIDO recalcular nota em UI** - Toda tela deve ler `match_player_stats.rating`
2. **persistedRatingToResult()** - Função canônica em `matchRatingEngine.ts` para converter rating persistido em objeto de display
3. **rebuild_match_ratings(matchId)** - Função SQL que recalcula e persiste ratings para todos os atletas de uma partida

### Fluxo de Persistência
- Match finalizado → `rebuildSingleMatchRatings(matchId)` é chamado
- Edição na Revisão do Jogo → `rebuildSingleMatchRatings(matchId)` é chamado
- Ambos invalidam caches do React Query

### Componentes Corrigidos (2026-01-29)
- `LiveMatchReview.tsx` - Agora usa `persistedRatingToResult()` ao invés de `calculatePlayerMatchRating()`
- `MatchSummaryVectorPdf.tsx` - Agora lê `stats.rating` diretamente
- `MatchRatingsCard.tsx` - Usa `useSortedPlayersByRating()` que lê ratings persistidos
- `PlayerRatingBadge.tsx` - Componente de display puro

### Anti-Regressão
- Nunca usar `calculatePlayerMatchRating()` em telas de resumo/perfil
- Sempre usar rating persistido para displays finais
- Divergências entre telas indicam bug de fonte de dados
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
