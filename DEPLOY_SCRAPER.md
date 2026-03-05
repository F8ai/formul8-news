# Deploy Updated Scraper

The scraper has been updated with correct HTML parsing patterns for all three cannabis news sources. To deploy it:

## Option 1: Via Supabase CLI (Recommended)

1. Authenticate with the correct account:
```bash
supabase login
```

2. Link to the project:
```bash
supabase link --project-ref gptfmaceymhubyuhqegu
```

3. Deploy the function:
```bash
supabase functions deploy scrape-news-archives
```

## Option 2: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/functions
2. Click "Deploy new function"
3. Name: `scrape-news-archives`
4. Copy the entire contents of `supabase/functions/scrape-news-archives/index.ts`
5. Paste into the editor
6. Click "Deploy"

## What Was Updated

The scraper now correctly extracts article links from:

1. **New Cannabis Ventures**: 
   - Pattern: `<h3 class="entry-title"><a href="URL">`
   - ✅ Working

2. **Cannabis Industry Journal**: 
   - Pattern: `<h4 class="entry-title"><a href="URL">`
   - Updated from incorrect category URL to homepage
   - Archive URL: `https://cannabisindustryjournal.com/`

3. **Americans for Safe Access**:
   - Pattern: Generic link extraction with filtering
   - Filters out navigation/static pages
   - Archive URL: `https://www.safeaccessnow.org/blog`

## Test After Deployment

Run the backfill script:
```bash
bash backfill-historical.sh
```

This will scrape:
- 10 pages from New Cannabis Ventures (~50 articles)
- 10 pages from Cannabis Industry Journal (~50 articles)  
- 5 pages from Americans for Safe Access (~25 articles)

Expected results: 100+ historical cannabis news articles ingested into the database.

## Troubleshooting

If you get 403 errors during deployment:
1. Check you're logged in: `supabase projects list`
2. Verify the project is listed and linked (marked with ●)
3. If not, run `supabase link --project-ref gptfmaceymhubyuhqegu`

If the scraper finds 0 articles:
1. Check the Edge Function logs in the Supabase Dashboard
2. The patterns may need adjustment for site changes
3. Test individual URLs with curl to verify site structure
