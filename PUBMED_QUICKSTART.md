# PubMed Quick Start

Get cannabis research tracking up and running in 2 minutes.

## Setup (One Command)

```bash
./setup-pubmed.sh
```

That's it! The system will now automatically check PubMed every 6 hours for new cannabis research.

## What You Get

Articles matching these terms:
- cannabis
- cannabidiol (CBD)  
- THC
- marijuana
- cannabinoid

## Check Status

```bash
./check-pubmed-status.sh
```

## Manual Trigger

```bash
deno run --allow-net --allow-env --allow-read test-pubmed.ts
```

## View Recent Papers

```sql
SELECT title, published_at, journal 
FROM signal_items si
JOIN paper_items pi ON pi.signal_item_id = si.id
WHERE type = 'paper'
ORDER BY published_at DESC
LIMIT 10;
```

## Customize Search

```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{search_query}',
  '"cannabis AND clinical trial[Publication Type]"'
)
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

## Need More?

See [PUBMED_SETUP.md](PUBMED_SETUP.md) for full documentation.

## Troubleshooting

**No articles found?**
- Check: `SELECT is_active FROM source_endpoints WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed')`
- Should return `true`

**Rate limit errors?**
- Get free API key: https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/
- Add to database: See PUBMED_SETUP.md

**Want more frequent updates?**
```sql
UPDATE source_endpoints
SET polling_schedule = '0 */3 * * *'  -- Every 3 hours
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```
