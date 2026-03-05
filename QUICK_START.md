# Quick Start Guide

## What Was Done

✅ **Added 26 new RSS sources** (cannabis, AI, tech/science)
✅ **Updated PubMed** for 2026 articles (500 max, every 3 hours)
✅ **Fixed orchestrator** authentication issue (added apikey header)
✅ **Created workaround** for immediate article ingestion
✅ **Committed and pushed** all changes to GitHub

## Current Status

- **Total Sources:** 36 RSS + 1 PubMed = 37 sources
- **Active Endpoints:** 40
- **Orchestrator Fix:** Applied locally, needs deployment
- **Workaround:** Ready to use immediately

## Get Articles Now (3 Options)

### Option 1: Use Workaround Script (Recommended - Works Now)
```bash
./ingest-all-direct.sh
```
This bypasses the orchestrator and ingests from all 40 endpoints directly.

### Option 2: Deploy Fixed Orchestrator (Best Long-term)
1. Go to https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/functions
2. Click `ingest-orchestrator` → Edit Function
3. Copy contents of `supabase/functions/ingest-orchestrator/index.ts`
4. Deploy
5. Run: `./trigger-all-ingestion.sh`

### Option 3: Test Single Source
```bash
./test-direct-rss.sh
```
Tests one endpoint to verify everything works.

## Expected Results

After running ingestion:
- **Initial backfill:** 800-1,000 articles
- **Daily growth:** 80-200 new articles/day
- **Sources:** Cannabis news, AI news, tech/science news, research papers

## Check Status

```bash
./get-article-stats.sh
```

Shows:
- Total articles
- Sources configured
- Recent articles
- Active endpoints

## Files Created

**Migrations:**
- `supabase/migrations/20260305180300_add_comprehensive_sources.sql` - 26 new sources
- `supabase/migrations/20260305180301_update_pubmed_2026.sql` - PubMed 2026 config

**Scripts:**
- `ingest-all-direct.sh` - Direct ingestion workaround ⭐
- `trigger-all-ingestion.sh` - Trigger via orchestrator
- `get-article-stats.sh` - Database statistics
- `test-direct-rss.sh` - Test single endpoint
- `apply-migrations-node.mjs` - Apply migrations

**Documentation:**
- `ARTICLE_EXPANSION_SUMMARY.md` - Complete expansion summary
- `ORCHESTRATOR_FIX.md` - Authentication fix details
- `QUICK_START.md` - This file

## Next Steps

1. **Immediate:** Run `./ingest-all-direct.sh` to get articles
2. **Soon:** Deploy fixed orchestrator via Dashboard
3. **Later:** Set up cron jobs for automatic ingestion
4. **Monitor:** Check `ingest_runs` table for errors

## Troubleshooting

**No articles created?**
- Check if they're duplicates (already exist)
- Verify RSS feeds are accessible
- Check `ingest_runs` table for errors

**401 errors?**
- Orchestrator needs redeployment
- Use `ingest-all-direct.sh` workaround

**Want more sources?**
- Edit `apply-migrations-node.mjs`
- Add new sources to arrays
- Run: `node apply-migrations-node.mjs`

## Support

See detailed documentation:
- `ARTICLE_EXPANSION_SUMMARY.md` - Full expansion details
- `ORCHESTRATOR_FIX.md` - Authentication fix
- `README.md` - Project overview
