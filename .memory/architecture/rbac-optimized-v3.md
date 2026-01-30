# Memory: architecture/rbac-optimized-v3

Updated: 2026-01-30

## RBAC Performance Optimization v3

### Changes Made

1. **Consolidated RPC Function (`get_user_rbac`)**:
   - Single database call returns all RBAC data
   - Eliminates N+1 queries (was: user_roles + user_permissions separately)
   - Returns: `userId`, `roles[]`, `isAdmin`, `isPlayer`, `isOwner`, `linkedPlayerId`, `userStatus`, `permissions`, `fetchedAt`, `ttlSeconds`

2. **Cache Configuration**:
   - TTL: 30 minutes (up from 15 min)
   - Storage: localStorage only (simplified from session+local)
   - Key: `m3_rbac_v3` (new version for clean migration)
   - Old keys cleaned up on cache clear

3. **Dedupe Singleton**:
   - Global `inflightPromise` prevents duplicate fetches
   - If fetch in progress, await it instead of starting new one

4. **Instrumentation**:
   - `console.time('rbac_fetch')` / `console.timeEnd('rbac_fetch')` for fetch duration
   - Logs: "RBAC cache HIT" vs "RBAC cache MISS"
   - Logs: "RBAC calls count" per page load (should be 0 on HIT, 1 on MISS)
   - Logs: source as "supabase_rpc"

5. **Background Revalidation**:
   - Only triggers if cache > 5 minutes old
   - Non-blocking, UI renders immediately from cache

6. **Removed**:
   - 4s timeout warning (no longer needed - RPC is fast)
   - Visibility/focus listeners (TTL is sufficient)
   - Retry backoff logic (single fast call)

### Performance Targets
- Cache HIT: <50ms (instant localStorage read)
- Cache MISS: <1s (single RPC call)
- Network requests: 1 per session (0 on navigation)
