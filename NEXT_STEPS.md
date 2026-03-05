# Next Steps to Fix News Page

## Current Issue
The news page at https://f8ai.github.io/formul8-news/ shows "No articles found" because RLS (Row Level Security) policies are blocking anonymous users from reading the database.

## Solution Created
I've created a migration that fixes the RLS policies to allow public read access:
- File: `supabase/migrations/20260305180100_fix_public_read_access.sql`

## How to Apply (Choose One)

### Option 1: Supabase Dashboard (Easiest) ✅

1. Open: https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/sql/new
2. Copy the entire contents of `supabase/migrations/20260305180100_fix_public_read_access.sql`
3. Paste into the SQL Editor
4. Click "Run"
5. Visit https://f8ai.github.io/formul8-news/ to verify articles appear

### Option 2: Supabase CLI (if you have local DB running)

```bash
supabase migration up
```

## What This Fixes

The migration updates RLS policies to allow anonymous users to read:
- `signal_items` - All articles
- `news_items` - News-specific data  
- `patent_items` - Patent-specific data
- `paper_items` - Research paper data
- `sources` - Source information
- `topics` - Topic tags
- `signal_topics` - Article-topic associations

## Verification

After applying, test with:

```bash
curl -s 'https://gptfmaceymhubyuhqegu.supabase.co/rest/v1/signal_items?select=id,title&limit=3' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzA1NzUsImV4cCI6MjA4ODMwNjU3NX0.BkohmTjlu9q0-Stu62EPj36fGoFlNXBGqFgaHAmiKhw"
```

Should return JSON with articles (not an empty array).

## Files Created

- `supabase/migrations/20260305180100_fix_public_read_access.sql` - The migration
- `FIX_PUBLIC_ACCESS.md` - Detailed documentation
- `apply-rls-fix.sh` - Helper script with instructions
- `check-public-access.ts` - Deno test script (requires deno)
- `check-public-access.mjs` - Node test script (requires @supabase/supabase-js)

## Additional Context

The original RLS policies required provenance records to exist, but those aren't being created due to a bug in the RSS connector. This simplified version allows public read access without that requirement, which is appropriate for a public news feed.
