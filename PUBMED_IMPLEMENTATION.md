# PubMed Integration Implementation

## Overview

Implemented a complete PubMed integration to automatically track cannabis-related research articles using the NCBI E-utilities API.

## What Was Built

### 1. Database Migration
**File**: `supabase/migrations/20260305180000_seed_pubmed_source.sql`

- Adds PubMed as a Literature_API source
- Configures E-utilities endpoint with cannabis search query
- Sets up 6-hour polling schedule
- Default search covers: cannabis, cannabidiol, CBD, THC, marijuana, cannabinoid

### 2. Literature Ingestion Function
**File**: `supabase/functions/ingest-literature/index.ts`

Enhanced with full PubMed E-utilities support:
- **Search API**: Queries PubMed for matching articles
- **Fetch API**: Retrieves detailed article metadata in batches
- **XML Parser**: Extracts title, abstract, authors, journal, dates, DOI, PMID
- **Rate Limiting**: Respects 3 req/sec limit (10 req/sec with API key)
- **Open Access**: Automatically downloads full-text PDFs from PMC
- **Deduplication**: Content fingerprinting prevents duplicates

### 3. Testing & Setup Scripts

**setup-pubmed.sh**: One-command setup
- Applies database migration
- Tests ingestion pipeline
- Provides next steps

**test-pubmed.ts**: Comprehensive test script
- Verifies source configuration
- Triggers manual ingestion
- Shows recent papers

**check-pubmed-status.sh**: Quick status check
- Shows recent ingestion runs
- Displays paper counts
- Lists newest articles

### 4. Documentation

**PUBMED_SETUP.md**: Complete user guide
- Quick start instructions
- Search query customization
- API key setup (optional)
- Troubleshooting guide
- Architecture overview

**README.md**: Updated with PubMed section

## How It Works

```
┌─────────────────┐
│  Orchestrator   │  Runs every 6 hours (configurable)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Literature      │  1. Search PubMed for cannabis articles
│ Connector       │  2. Fetch article details in batches
└────────┬────────┘  3. Parse XML responses
         │           4. Check for duplicates
         ▼           5. Download open access PDFs
┌─────────────────┐  6. Store in database
│   Database      │
│  - signal_items │
│  - paper_items  │
│  - fingerprints │
└─────────────────┘
```

## Key Features

### Automatic Tracking
- Polls PubMed every 6 hours
- Searches for cannabis-related terms
- Captures new publications immediately

### Smart Deduplication
- SHA-256 fingerprints of title + abstract
- Prevents duplicate entries
- Tracks duplicate events for metrics

### Open Access Support
- Detects PMC open access articles
- Downloads full-text PDFs automatically
- Stores in Supabase Storage

### Rate Limit Handling
- Respects NCBI rate limits
- Batches requests efficiently
- Optional API key for higher limits

### Comprehensive Metadata
- Title, abstract, authors
- Journal, publication date
- DOI, PMID identifiers
- Open access status

## Usage

### Initial Setup
```bash
./setup-pubmed.sh
```

### Manual Ingestion
```bash
deno run --allow-net --allow-env --allow-read test-pubmed.ts
```

### Check Status
```bash
./check-pubmed-status.sh
```

### Query Papers
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
ORDER BY si.published_at DESC;
```

## Customization

### Change Search Query
```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{search_query}',
  '"(your custom PubMed query)"'
)
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

### Adjust Polling Frequency
```sql
UPDATE source_endpoints
SET polling_schedule = '0 */3 * * *'  -- Every 3 hours
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

### Add API Key
```sql
UPDATE source_endpoints
SET auth_config = jsonb_set(
  auth_config,
  '{api_key}',
  '"your-ncbi-api-key"'
)
WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed');
```

Get API key: https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/

## Files Created/Modified

### New Files
- `supabase/migrations/20260305180000_seed_pubmed_source.sql`
- `setup-pubmed.sh`
- `test-pubmed.ts`
- `check-pubmed-status.sh`
- `PUBMED_SETUP.md`
- `PUBMED_IMPLEMENTATION.md`

### Modified Files
- `supabase/functions/ingest-literature/index.ts` - Complete PubMed integration
- `README.md` - Added PubMed section

## Next Steps

1. Run `./setup-pubmed.sh` to activate
2. Wait for first automatic run (or trigger manually)
3. Check results with `./check-pubmed-status.sh`
4. Customize search query if needed
5. Consider adding NCBI API key for higher rate limits

## Technical Details

### PubMed E-utilities APIs Used
- **ESearch**: Search for article IDs matching query
- **EFetch**: Retrieve full article metadata as XML

### Rate Limits
- Without API key: 3 requests/second
- With API key: 10 requests/second
- Batch size: 200 articles per fetch request

### Data Flow
1. Search returns list of PMIDs
2. Fetch retrieves metadata in batches of 200
3. XML parsed to extract structured data
4. Content fingerprint computed (SHA-256)
5. Duplicate check against existing fingerprints
6. New articles stored with provenance tracking
7. Open access PDFs downloaded to Storage

### Error Handling
- Retry logic with exponential backoff
- Rate limit detection and waiting
- Partial batch failures logged but don't stop processing
- All errors tracked in ingest_item_events table

## Monitoring

Check ingestion health:
```sql
SELECT 
  DATE(created_at) as date,
  status,
  items_processed,
  items_created,
  items_duplicate,
  items_error
FROM ingest_runs
WHERE source_endpoint_id IN (
  SELECT id FROM source_endpoints 
  WHERE source_id = (SELECT id FROM sources WHERE name = 'PubMed')
)
ORDER BY created_at DESC;
```
