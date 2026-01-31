# Memory: architecture/rbac-optimized-v3

Updated: 2026-01-31

## RBAC Performance Optimization v3 - "Big Site" Behavior

### Overview

Implements Instagram/Google-style resilience: silent recovery, SWR caching, automatic revalidation on tab focus, and login only as last resort.

### Key Architecture

1. **Auth Recovery Service (`src/lib/authRecovery.ts`)**:
   - Single unified `recoverAuthAndRbac(reason)` function
   - Handles: focus, visible, manual-retry, init, token-refresh
   - Auto-refreshes token if expiring within 5 minutes
   - Clears stuck dedupe state before fetching
   - Returns `{ success, payload }` or `{ success: false, reason, shouldLogout }`

2. **SWR (Stale-While-Revalidate) Cache**:
   - TTL: 24 hours (localStorage + memory cache)
   - Key: `m3_rbac_v3`
   - If cache exists: apply immediately, revalidate in background
   - Shows subtle "progress bar" during background update, NOT skeleton

3. **Visibility/Focus Listeners**:
   - Auto-triggered on `focus` and `visibilitychange`
   - Uses `shouldTriggerRecovery()` to check cache freshness (5 min threshold)
   - Throttled to min 2s between recoveries

4. **Retry Button Behavior**:
   - Calls `triggerRecovery("manual-retry")`
   - Clears cache and dedupe state first
   - Shows "Reconectando..." with 10s timeout
   - Only redirects to login if recovery truly fails AND no cache

5. **Dedupe State Management**:
   - `resetInflightState()` clears stuck promises
   - Called on any error/abort/timeout
   - Prevents "dedupe - awaiting existing fetch" infinite block

### Error Handling Rules

- **401/403**: Immediate logout redirect
- **Network/Timeout with cache**: Keep UI working, retry in background (30s interval)
- **Network/Timeout without cache**: After 3 retries → logout redirect
- **AbortError**: Silently ignored, not an error

### Service Worker Config

Auth/RBAC endpoints use `NetworkOnly` strategy:
- `/auth/*`
- `/rest/v1/rpc/*`
- `/rest/v1/user_roles*`
- `/rest/v1/user_permissions*`

### Performance Targets

- Cache HIT: <10ms (memory cache first, then localStorage)
- Cache MISS: <10s (3 retries with backoff: 0, 800, 2000ms)
- Background revalidation: 30s intervals on failure
- Token refresh threshold: 5 minutes before expiry

### Files

- `src/lib/authRecovery.ts` - Core recovery service
- `src/hooks/useAuth.tsx` - Integrated auth hook
- `src/components/auth/ProtectedRoute.tsx` - SWR-aware route guard
- `vite.config.ts` - Service worker exclusions
