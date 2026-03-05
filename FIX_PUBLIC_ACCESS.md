# Fix Public Access to News Articles

## Problem
The news page at https://f8ai.github.io/formul8-news/ shows "No articles found" because the RLS (Row Level Security) policies are blocking anonymous users from reading the data.

## Solution
Apply the migration `supabase/migrations/20260305180100_fix_public_read_access.sql` to allow public read access.

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to the SQL Editor: https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/sql/new

2. Copy and paste the contents of `supabase/migrations/20260305180100_fix_public_read_access.sql`

3. Click "Run" to execute the SQL

4. Verify by visiting: https://f8ai.github.io/formul8-news/

### Option 2: Via Supabase CLI (if local DB is running)

```bash
supabase migration up
```

### Option 3: Via psql (if you have direct database access)

```bash
psql "postgresql://postgres:[password]@db.gptfmaceymhubyuhqegu.supabase.co:5432/postgres" \
  -f supabase/migrations/20260305180100_fix_public_read_access.sql
```

## What the Migration Does

The migration updates RLS policies to allow anonymous (public) users to:

- Read `signal_items` (articles)
- Read `news_items` (news-specific data)
- Read `patent_items` (patent-specific data)
- Read `paper_items` (research paper-specific data)
- Read `sources` (source information)
- Read `topics` (topic tags)
- Read `signal_topics` (article-topic associations)

This is a simplified version that doesn't require provenance records to exist (which aren't being created yet due to a separate bug in the RSS connector).

## Verification

After applying the migration, the news page should display articles. You can also verify by running:

```bash
curl -X GET 'https://gptfmaceymhubyuhqegu.supabase.co/rest/v1/signal_items?select=id,title&limit=5' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzA1NzUsImV4cCI6MjA4ODMwNjU3NX0.BkohmTjlu9q0-Stu62EPj36fGoFlNXBGqFgaHAmiKhw" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzA1NzUsImV4cCI6MjA4ODMwNjU3NX0.BkohmTjlu9q0-Stu62EPj36fGoFlNXBGqFgaHAmiKhw"
```

If you get JSON data back (not an empty array), public access is working!
