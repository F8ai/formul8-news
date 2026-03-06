# arXiv Integration Setup

This guide explains how to set up arXiv paper indexing for AI and cannabis research.

## Overview

arXiv is a free distribution service and open-access archive for scholarly articles. This integration adds two sources:

1. **arXiv AI** - Indexes papers from AI/ML categories (cs.AI, cs.LG, cs.CL, cs.CV, stat.ML)
2. **arXiv Cannabis** - Indexes papers mentioning cannabis, cannabinoids, CBD, THC, marijuana, or hemp

## Features

- Automatic paper discovery via arXiv API
- Full-text PDF download (all arXiv papers are open access)
- Metadata extraction (title, abstract, authors, categories)
- Deduplication based on content fingerprints
- Scheduled polling every 6 hours

## Setup Steps

### 1. Apply Migrations

Run the migration script to add arXiv sources and fields:

```bash
node apply-arxiv-migration.mjs
```

This will:
- Add "arXiv AI" and "arXiv Cannabis" sources
- Create arXiv API endpoints with search queries
- Add arXiv-specific fields to the paper_items table (arxiv_id, arxiv_categories)

### 2. Deploy Updated Function

Deploy the updated ingest-literature function that supports arXiv:

```bash
npx supabase functions deploy ingest-literature
```

### 3. Test Ingestion

Test the arXiv integration:

```bash
node test-arxiv-ingestion.mjs
```

This will:
- Fetch recent papers from both arXiv sources
- Process and store them in the database
- Download full-text PDFs
- Display sample results

### 4. Enable Scheduled Ingestion

The arXiv endpoints are configured to poll every 6 hours. To enable automatic ingestion, ensure the orchestrator is running:

```bash
# Check orchestrator status
npx supabase functions list

# If needed, deploy orchestrator
npx supabase functions deploy ingest-orchestrator
```

## arXiv API Details

### Search Queries

**AI Papers:**
```
cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:stat.ML
```

Categories:
- cs.AI - Artificial Intelligence
- cs.LG - Machine Learning
- cs.CL - Computation and Language (NLP)
- cs.CV - Computer Vision
- stat.ML - Machine Learning (Statistics)

**Cannabis Papers:**
```
all:cannabis OR all:cannabinoid OR all:cannabidiol OR all:CBD OR all:THC OR all:marijuana OR all:hemp
```

Searches across all fields (title, abstract, authors, comments).

### Rate Limiting

arXiv recommends:
- Maximum 3 seconds between requests
- No API key required
- Respectful usage of their free service

### Data Format

arXiv returns Atom feeds with:
- arXiv ID (e.g., 2103.12345)
- DOI (if available)
- Title and abstract
- Authors
- Categories
- Published/updated dates
- PDF download link

## Database Schema

### New Fields in paper_items

```sql
arxiv_id TEXT              -- arXiv identifier (e.g., 2103.12345)
arxiv_categories TEXT[]    -- Subject categories (e.g., ['cs.AI', 'cs.LG'])
```

### Example Query

Find all AI papers from arXiv:

```sql
SELECT 
  si.title,
  pi.arxiv_id,
  pi.arxiv_categories,
  si.published_at,
  si.url
FROM paper_items pi
JOIN signal_items si ON pi.signal_item_id = si.id
WHERE pi.arxiv_id IS NOT NULL
  AND pi.arxiv_categories && ARRAY['cs.AI', 'cs.LG']
ORDER BY si.published_at DESC
LIMIT 10;
```

## Customization

### Modify Search Queries

Update the auth_config in source_endpoints:

```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{search_query}',
  '"cat:cs.AI AND submittedDate:[202401010000 TO 202412312359]"'
)
WHERE name = 'arXiv API' 
  AND source_id = (SELECT id FROM sources WHERE name = 'arXiv AI');
```

### Adjust Polling Frequency

Change the polling_schedule (cron format):

```sql
UPDATE source_endpoints
SET polling_schedule = '0 */12 * * *'  -- Every 12 hours
WHERE name = 'arXiv API';
```

### Increase Max Results

Fetch more papers per run:

```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{max_results}',
  '500'
)
WHERE name = 'arXiv API';
```

## Monitoring

### Check Ingestion Status

```sql
SELECT 
  s.name,
  ir.status,
  ir.items_processed,
  ir.items_created,
  ir.started_at,
  ir.completed_at
FROM ingest_runs ir
JOIN sources s ON ir.source_id = s.id
WHERE s.name LIKE 'arXiv%'
ORDER BY ir.started_at DESC
LIMIT 10;
```

### View Recent Papers

```bash
node get-article-stats.sh
```

Or query directly:

```sql
SELECT 
  COUNT(*) as total_arxiv_papers,
  COUNT(DISTINCT arxiv_categories) as unique_categories,
  MIN(si.published_at) as oldest_paper,
  MAX(si.published_at) as newest_paper
FROM paper_items pi
JOIN signal_items si ON pi.signal_item_id = si.id
WHERE pi.arxiv_id IS NOT NULL;
```

## Troubleshooting

### No Papers Found

1. Check endpoint configuration:
```sql
SELECT * FROM source_endpoints WHERE name = 'arXiv API';
```

2. Verify search query syntax at https://arxiv.org/help/api/user-manual

3. Check arXiv API status: https://status.arxiv.org/

### PDF Download Failures

- arXiv PDFs are always available, but may be large
- Check storage bucket permissions
- Verify network connectivity from Supabase Edge Functions

### Duplicate Papers

The system uses content fingerprints to detect duplicates. If you see duplicates:

1. Check fingerprint generation in ingest-literature function
2. Verify signal_fingerprints table has proper indexes
3. Review ingest_item_events for duplicate events

## Resources

- [arXiv API Documentation](https://arxiv.org/help/api/)
- [arXiv Category Taxonomy](https://arxiv.org/category_taxonomy)
- [arXiv Terms of Use](https://arxiv.org/help/api/tou)

## Next Steps

After setup:

1. Monitor first few ingestion runs
2. Adjust search queries based on results
3. Consider adding more specific arXiv categories
4. Set up alerts for high-impact papers
5. Integrate with enrichment pipeline for citation analysis
