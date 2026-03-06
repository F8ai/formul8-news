# arXiv Integration - Quick Start

Get AI and cannabis papers from arXiv in 3 steps.

## 1. Apply Migrations

```bash
node apply-arxiv-migration.mjs
```

This adds:
- arXiv AI source (cs.AI, cs.LG, cs.CL, cs.CV, stat.ML categories)
- arXiv Cannabis source (cannabis, CBD, THC, cannabinoid keywords)
- arXiv-specific database fields

## 2. Deploy Function

```bash
npx supabase functions deploy ingest-literature
```

## 3. Test It

```bash
node test-arxiv-ingestion.mjs
```

Expected output:
```
Testing arXiv ingestion...

Found 2 arXiv endpoints

📚 Testing arXiv AI...
   Query: cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR stat.ML
   Ingest run ID: xxx
   ✅ Ingestion successful!
   - Items processed: 200
   - Items created: 195
   - Full text downloaded: 195

📚 Testing arXiv Cannabis...
   Query: all:cannabis OR all:cannabinoid OR all:cannabidiol OR all:CBD OR all:THC
   Ingest run ID: yyy
   ✅ Ingestion successful!
   - Items processed: 50
   - Items created: 48
   - Full text downloaded: 48

📄 Sample of ingested arXiv papers:

1. Large Language Models for Code Generation
   arXiv: 2401.12345
   Categories: cs.AI, cs.LG
   URL: https://arxiv.org/abs/2401.12345
   Published: 2024-01-15
```

## What You Get

- **Automatic discovery** of new papers every 6 hours
- **Full-text PDFs** downloaded and stored
- **Rich metadata**: title, abstract, authors, categories
- **Deduplication** to avoid storing the same paper twice
- **Open access**: All arXiv papers are freely available

## Query Examples

### Find recent AI papers

```sql
SELECT 
  si.title,
  pi.arxiv_id,
  pi.arxiv_categories,
  si.published_at
FROM paper_items pi
JOIN signal_items si ON pi.signal_item_id = si.id
WHERE pi.arxiv_categories && ARRAY['cs.AI', 'cs.LG']
ORDER BY si.published_at DESC
LIMIT 10;
```

### Find cannabis research

```sql
SELECT 
  si.title,
  pi.abstract,
  pi.arxiv_id,
  si.url
FROM paper_items pi
JOIN signal_items si ON pi.signal_item_id = si.id
WHERE pi.arxiv_id IS NOT NULL
  AND (
    si.title ILIKE '%cannabis%' 
    OR pi.abstract ILIKE '%cannabidiol%'
  )
ORDER BY si.published_at DESC;
```

### Count papers by category

```sql
SELECT 
  unnest(pi.arxiv_categories) as category,
  COUNT(*) as paper_count
FROM paper_items pi
WHERE pi.arxiv_id IS NOT NULL
GROUP BY category
ORDER BY paper_count DESC;
```

## Customization

### Change search query

```sql
-- Focus on specific AI subfield
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{search_query}',
  '"cat:cs.CL"'  -- Just NLP papers
)
WHERE name = 'arXiv API' 
  AND source_id = (SELECT id FROM sources WHERE name = 'arXiv AI');
```

### Adjust polling frequency

```sql
-- Poll every 12 hours instead of 6
UPDATE source_endpoints
SET polling_schedule = '0 */12 * * *'
WHERE name = 'arXiv API';
```

### Increase results per run

```sql
-- Fetch up to 500 papers per run
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{max_results}',
  '500'
)
WHERE name = 'arXiv API';
```

## Monitoring

Check ingestion status:

```sql
SELECT 
  s.name,
  ir.status,
  ir.items_processed,
  ir.items_created,
  ir.started_at
FROM ingest_runs ir
JOIN sources s ON ir.source_id = s.id
WHERE s.name LIKE 'arXiv%'
ORDER BY ir.started_at DESC
LIMIT 5;
```

## Troubleshooting

**No papers found?**
- Check arXiv API status: https://status.arxiv.org/
- Verify search query syntax: https://arxiv.org/help/api/user-manual

**Function errors?**
- Check function logs: `npx supabase functions logs ingest-literature`
- Verify environment variables are set

**Duplicates?**
- System automatically deduplicates based on content
- Check `ingest_item_events` table for duplicate events

## Next Steps

- See [ARXIV_SETUP.md](./ARXIV_SETUP.md) for detailed documentation
- Customize search queries for your specific needs
- Set up alerts for high-impact papers
- Integrate with enrichment pipeline
