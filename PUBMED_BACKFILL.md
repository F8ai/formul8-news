# PubMed Historical Backfill Guide

Get ALL cannabis research articles from PubMed's entire history.

## Quick Start

```bash
./backfill-pubmed.sh
```

Select from preset options:
1. **Recent years (2020-2025)** - ~5,000 articles, ~10 minutes
2. **Last decade (2015-2025)** - ~15,000 articles, ~30 minutes  
3. **Modern era (2000-2025)** - ~30,000 articles, ~1 hour
4. **All available (1970-2025)** - ~50,000+ articles, ~2 hours
5. **Custom range** - Specify your own years

## Manual Usage

Backfill specific years:

```bash
node backfill-pubmed-all-years.mjs 2020 2025
```

Single year:

```bash
node backfill-pubmed-all-years.mjs 2024 2024
```

## What Gets Captured

For each article:
- ✅ Title
- ✅ Full abstract (when available)
- ✅ All authors
- ✅ Journal name
- ✅ DOI and PMID
- ✅ Publication date
- ✅ Open access status

## Search Terms

Articles matching ANY of these terms in title or abstract:
- cannabis
- cannabidiol (CBD)
- THC
- marijuana
- cannabinoid

## Rate Limits

- **Without API key**: 3 requests/second (~340ms delay)
- **With API key**: 10 requests/second (~100ms delay)

To add an API key, edit `backfill-pubmed-all-years.mjs` and set:
```javascript
const API_KEY = 'your-ncbi-api-key';
```

Get a free key: https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/

## Progress Tracking

The script shows real-time progress:
- Articles found per year
- Fetch progress (batches of 200)
- Processing progress (every 50 papers)
- Year-by-year summary

All output is logged to `pubmed-backfill.log`

## Deduplication

The system automatically:
- Computes SHA-256 fingerprints of title + abstract
- Skips articles already in the database
- Tracks duplicate events for metrics

## Estimated Totals

Based on PubMed data:
- **1970-1989**: ~500 articles
- **1990-1999**: ~2,000 articles
- **2000-2009**: ~8,000 articles
- **2010-2019**: ~25,000 articles
- **2020-2025**: ~15,000 articles

**Total**: ~50,000+ cannabis research articles

## Monitoring Progress

Check how many papers have been ingested:

```bash
node check-abstracts.mjs
```

Or query the database:

```sql
SELECT 
  DATE_PART('year', published_at) as year,
  COUNT(*) as papers
FROM signal_items
WHERE type = 'paper'
GROUP BY year
ORDER BY year DESC;
```

## Resume After Interruption

If the backfill is interrupted:
1. Check which years completed in `pubmed-backfill.log`
2. Resume from the next year:
   ```bash
   node backfill-pubmed-all-years.mjs 2015 2025
   ```

The deduplication system ensures no duplicates even if you re-run years.

## Performance Tips

1. **Run during off-peak hours** - PubMed is faster at night (US time)
2. **Get an API key** - 3x faster processing
3. **Start with recent years** - Most relevant articles first
4. **Monitor logs** - Watch for rate limit errors

## Troubleshooting

**Rate limit errors?**
- Add API key (see above)
- Increase delay between requests in the script

**Missing abstracts?**
- Some older articles don't have abstracts in PubMed
- This is normal, especially pre-2000

**Script stops unexpectedly?**
- Check `pubmed-backfill.log` for errors
- Resume from the last completed year
- Verify internet connection

## After Backfill

Once complete, you'll have:
- Complete historical cannabis research database
- Full abstracts for semantic search
- Author and journal metadata
- Publication trends over time

Use for:
- Research trend analysis
- Topic modeling
- Citation network analysis
- Literature reviews
- AI/ML training data
