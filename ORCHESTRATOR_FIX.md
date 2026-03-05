# Orchestrator Authentication Fix

## Problem

The orchestrator was returning 401 Unauthorized errors when calling Edge Functions (RSS connector, Literature connector, etc.). All 40 endpoints failed with this error.

## Root Cause

Edge Functions in Supabase require BOTH headers for authentication:
- `Authorization: Bearer <service_role_key>`
- `apikey: <service_role_key>`

The orchestrator was only sending the `Authorization` header, causing 401 errors.

## Fix Applied

**File:** `supabase/functions/ingest-orchestrator/index.ts`

**Before:**
```typescript
connectorResponse = await fetch(connectorUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
  },
  body: JSON.stringify({...}),
});
```

**After:**
```typescript
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

connectorResponse = await fetch(connectorUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${serviceRoleKey}`,
    "apikey": serviceRoleKey,  // ← Added this line
  },
  body: JSON.stringify({...}),
});
```

## Deployment Status

✅ **Fix applied to local code**
⏳ **Deployment pending** - requires Supabase CLI authentication or Dashboard deployment

### Deployment Options

#### Option 1: Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/functions
2. Click on `ingest-orchestrator`
3. Click "Edit Function"
4. Replace code with contents of `supabase/functions/ingest-orchestrator/index.ts`
5. Click "Deploy"

#### Option 2: Supabase CLI
```bash
supabase login
supabase link --project-ref gptfmaceymhubyuhqegu
supabase functions deploy ingest-orchestrator
```

#### Option 3: Use Workaround (No deployment needed)
Use the direct ingestion script that bypasses the orchestrator:
```bash
./ingest-all-direct.sh
```

## Workaround: Direct Ingestion

While the orchestrator is being redeployed, use `ingest-all-direct.sh` to ingest articles:

**What it does:**
- Queries all active RSS endpoints
- Calls the RSS connector directly for each endpoint
- Creates and updates ingest_run records
- Processes all 40 endpoints sequentially with rate limiting

**Advantages:**
- Works immediately without redeployment
- Same functionality as orchestrator
- Proper tracking in ingest_runs table

**Disadvantages:**
- Sequential processing (slower than orchestrator's concurrent processing)
- Must be run manually (not triggered by cron)
- Doesn't support other connector types (Patents, Literature) yet

## Testing

After deployment, test with:
```bash
./trigger-all-ingestion.sh
```

Expected result:
- `endpoints_processed: 40`
- `items_created: 500-1000` (depending on feed history)
- `errors: []` (no errors)

## Impact

**Before fix:**
- 0 articles ingested
- 40/40 endpoints failing with 401 errors

**After fix (expected):**
- 500-1,000 articles from initial backfill
- 80-200 new articles per day
- 0 authentication errors

## Related Files

- `supabase/functions/ingest-orchestrator/index.ts` - Fixed orchestrator
- `ingest-all-direct.sh` - Workaround script
- `deploy-orchestrator.mjs` - Deployment helper
- `trigger-all-ingestion.sh` - Test script

## Next Steps

1. Deploy the fixed orchestrator using one of the methods above
2. Test with `./trigger-all-ingestion.sh`
3. Set up cron jobs for automatic ingestion every 30 minutes
4. Monitor ingest_runs table for errors
