# Memory: architecture/mobile-performance-optimization-v1

Updated: 2026-02-06

## Mobile Performance Optimization Strategy

### Target Users
- **Admin/Scout**: Primary use of Live Match on mobile (4G/LTE)
- **Athlete**: Full dashboard usage on mobile

### Code Splitting Implementation

#### Lazy Loading by Route
All `/app/*` routes are now lazy-loaded using `React.lazy()`:
- **Dashboard, Players, Reports, Compare, Contracts, News, Targets, Teams**
- Each route is a separate webpack chunk

#### Live Match Priority
Live Match routes use a specialized `<LiveMatchSuspense>` skeleton optimized for mobile viewport.

#### Prefetch Strategy
1. **After boot_complete**: Prefetch Live Match bundle (most used by scouts)
2. **After 2s delay**: Prefetch secondary routes (Players, Compare, Reports)
3. **Athlete users**: Skip Live Match prefetch, prioritize dashboard routes

### Live Match Ultra Responsiveness

Already implemented via `liveMatchEventQueue.ts`:
- **Optimistic UI**: Events registered instantly in local state
- **Persistent Queue**: localStorage with 24h retention
- **Retry with Backoff**: 1s → 2s → 4s (max 3 attempts)
- **Idempotent Writes**: `client_event_id` prevents duplicates on retry
- **Status Indicators**: Pending/Syncing badges visible without blocking UI

### Dashboard Smart Loading

1. **Skeleton-first render**: `AdminSkeletonDashboard` shown while RBAC loads
2. **Parallel data fetch**: All 8 queries run in `Promise.all()`
3. **Cache duration**: 
   - React Query: 1 min stale, 5 min GC
   - RBAC (me_context): 3 min cache with localStorage fallback

### Measurement & Debug

New `/app/debug/performance` page shows:
- **Web Vitals**: LCP, INP, CLS, TTFB, FCP with color-coded ratings
- **Memory usage**: JS heap stats (Chrome only)
- **Prefetch status**: List of routes already loaded
- **Mobile optimizations**: Summary of implemented strategies

### Files Created/Modified

**New Files:**
- `src/lib/routePrefetch.ts` - Prefetch utility
- `src/lib/webVitals.ts` - Web Vitals collection
- `src/hooks/usePrefetchRoutes.ts` - Hook for intelligent prefetch
- `src/components/app/RouteSuspense.tsx` - Lazy loading skeletons
- `src/pages/app/DebugPerformance.tsx` - Performance debug page

**Modified Files:**
- `src/App.tsx` - Converted all app routes to lazy loading

### Performance Comparison

| Metric | Before | After |
|--------|--------|-------|
| Initial Bundle | ~1 chunk (all routes) | ~15+ chunks (per route) |
| Live Match Load | Included in main | Prefetched after boot |
| Route Transition | Instant (preloaded) | Skeleton → Content (~100ms) |
| Prefetch Strategy | None | Priority-based (Live Match first) |
| Debug Tools | Logs only | Visual Web Vitals dashboard |

### Validation

1. Open `/app/debug/performance` to verify Web Vitals
2. Check Network tab for separate chunk files per route
3. Test on mobile: Events should register instantly even on slow 4G
4. Verify queue persistence: Add event → close app → reopen → event syncs
