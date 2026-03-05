# PubMed Integration Setup

This guide explains how to set up and use the PubMed integration to track cannabis research articles.

## Quick Start

Run the setup script:

```bash
./setup-pubmed.sh
```

This will:
1. Apply the database migration to add PubMed as a source
2. Test the ingestion pipeline
3. Fetch recent cannabis-related articles

## What Gets Tracked

The system searches PubMed for articles containing:
- cannabis
- cannabidiol (CBD)
- THC
- marijuana
- cannabinoid

Articles are checked every 6 hours automatically.

## Manual Ingestion

To manually trigger PubMed ingestion:

```bash
deno run --allow-net --allow-env --allow-read test-pubmed.ts
```

Or use the orchestrator directly:

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/ingest-orchestrator" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"mode": "streaming"}'
```

## Customizing the Search

To modify what articles are tracked, update the search query in the database:

```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{search_query}',
  '"(your custom query here)"'
)
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

### PubMed Search Syntax

Examples:
- `cannabis[Title/Abstract]` - Search in title or abstract
- `cannabis AND clinical trial[Publication Type]` - Only clinical trials
- `cannabis NOT review[Publication Type]` - Exclude reviews
- `cannabis AND ("2024/01/01"[Date - Publication] : "3000"[Date - Publication])` - Date range

Full syntax: https://pubmed.ncbi.nlm.nih.gov/help/

## API Key (Optional)

Without an API key, you're limited to 3 requests/second. With a key, you get 10 requests/second.

To add an API key:

1. Get a key: https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/
2. Update the endpoint:

```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{api_key}',
  '"your-api-key-here"'
)
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

## Viewing Results

Query recent papers:

```sql
SELECT 
  si.title,
  si.published_at,
  pi.journal,
  pi.doi,
  pi.is_open_access
FROM signal_items si
JOIN paper_items pi ON pi.signal_item_id = si.id
WHERE si.type = 'paper'
ORDER BY si.published_at DESC
LIMIT 10;
```

## Scheduling

The default schedule is every 6 hours. To change it:

```sql
UPDATE source_endpoints
SET polling_schedule = '0 */3 * * *'  -- Every 3 hours
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

Cron format: `minute hour day month weekday`

## Troubleshooting

### No articles found
- Check the search query is valid
- Verify the endpoint is active: `SELECT is_active FROM source_endpoints WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed')`
- Check recent runs: `SELECT * FROM ingest_runs ORDER BY created_at DESC LIMIT 5`

### Rate limiting errors
- Add an API key (see above)
- Reduce max_results in auth_config
- Increase polling interval

### Missing abstracts
- Some older articles don't have abstracts in PubMed
- This is normal and expected

## Architecture

1. **Orchestrator** (`ingest-orchestrator`) - Schedules and coordinates ingestion
2. **Literature Connector** (`ingest-literature`) - Fetches from PubMed E-utilities API
3. **Database** - Stores articles with deduplication
4. **Storage** - Stores full-text PDFs for open access articles

The system automatically:
- Deduplicates articles using content fingerprints
- Downloads full-text PDFs for open access articles
- Tracks provenance and ingestion history
- Handles rate limiting and retries
