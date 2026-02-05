# Memory: technical/live-match-resilience-v1

Updated: 2026-02-05

## Live Match Resilience Implementation

### Problem Diagnosed

Mobile users experienced:
1. **Event registration failures** - clicking to add stats showed error in footer
2. **Stuck recovery loop** - after refresh, app hung on "Estamos recuperando sua sessão..." 
3. **Root causes identified**:
   - No retry mechanism for failed writes
   - No idempotency (retries could create duplicates)
   - No persistence of pending events
   - Network errors were blocking UI without recovery path

### Solution Architecture

#### 1. Event Queue System (`src/lib/liveMatchEventQueue.ts`)

- **Optimistic UI**: Events show immediately, sync in background
- **Queue States**: `pending` → `sending` → `confirmed` / `failed`
- **Persistence**: Queue stored in `localStorage` per match
- **Retry with Backoff**: 1s, 2s, 4s delays, max 3 attempts
- **Non-retryable Errors**: 401/403/400 fail immediately (no infinite loops)

#### 2. Idempotent Writes

- **client_event_id**: UUID generated client-side for each event
- **Database Constraint**: Unique index `(match_id, client_event_id)` prevents duplicates
- **RPC Update**: `create_live_event_v2` accepts `p_client_event_id` parameter
- **Idempotent Response**: If event exists, returns success with existing event ID

#### 3. Telemetry Ring Buffer (`src/lib/liveMatchTelemetry.ts`)

- **200 events max** in `localStorage` (ring buffer)
- **Events tracked**: app_boot, enqueue, send_start, send_success, send_fail, retry_scheduled
- **Debug pages**: `/app/debug/auth` and `/app/debug/live-match` (admin only)

#### 4. Supabase Client Singleton Verification

- **Counter**: `window.__sbClientCount` tracks instance count
- **Warning**: Console error if multiple instances detected
- **Prevention**: Centralized import from `@/integrations/supabase/client`

### Files Created/Modified

**New Files:**
- `src/lib/liveMatchEventQueue.ts` - Queue system
- `src/lib/liveMatchTelemetry.ts` - Ring buffer logging
- `src/hooks/useLiveMatchQueue.ts` - React hook for queue
- `src/pages/app/DebugAuth.tsx` - Auth debug page
- `src/pages/app/DebugLiveMatch.tsx` - Live Match debug page

**Modified Files:**
- `src/integrations/supabase/client.ts` - Singleton counter
- `src/App.tsx` - Added debug routes

**Database Migration:**
- Added `client_event_id UUID` column to `match_events`
- Created unique index `idx_match_events_idempotent`
- Updated `create_live_event_v2` RPC with idempotency check

### Validation Steps for Mobile/4G/iOS

1. Open `/app/debug/live-match` before testing
2. Start a Live Match and add several events rapidly
3. Put device in airplane mode, add more events
4. Re-enable network and observe queue processing
5. Check debug page for send_success/send_fail counts
6. Verify no duplicate events in database

### Error Classification (Important!)

| Code | Action | Retry? |
|------|--------|--------|
| 401 | Token invalid → redirect to login | No |
| 403 | Permission denied → show error | No |
| 400 | Bad request → show error | No |
| 5xx | Server error → retry with backoff | Yes |
| Network | Connection failed → retry with backoff | Yes |
