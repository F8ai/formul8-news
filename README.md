# Formul8 News Database Curation System

A multi-source ingestion platform built on Supabase that collects, normalizes, deduplicates, enriches, and publishes news articles, patents, and scientific literature.

## Architecture

- **Database**: Supabase Postgres 17 with pgvector extension
- **Storage**: Supabase Storage (raw-artifacts private, public-feeds public)
- **Compute**: Supabase Edge Functions (Deno runtime)
- **Scheduling**: Supabase Cron (pg_cron extension)

## Features

### Phase 1 - MVP (Current)
- Multi-source RSS/Atom feed ingestion
- Hard duplicate detection via content fingerprinting
- License policy enforcement (store_full_text_allowed, snippet_only, link_only)
- Public feed export to JSON
- Row-Level Security (RLS) policies
- Scheduled ingestion via cron

### Phase 2 - Patents & Literature
- Patent API connector with family clustering
- Literature API connector with open access support
- Manual upload endpoint
- Multi-type feed exports

### Phase 3 - Enrichment
- Language detection
- Topic extraction and tagging
- Named entity extraction
- Summary generation
- Vector embeddings for semantic search
- Near-duplicate clustering

## Getting Started

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Deno](https://deno.land/) installed (for Edge Functions)
- Node.js 18+ (for testing)

### Local Development

1. Initialize Supabase:
```bash
supabase init
```

2. Start Supabase services:
```bash
supabase start
```

3. Apply database migrations:
```bash
supabase db reset
```

4. Configure environment variables:
```bash
cp .env.local .env
# Edit .env with your API keys
```

5. Deploy Edge Functions:
```bash
supabase functions deploy
```

### Configuration

Edit `.env.local` with your API keys:
- `OPENAI_API_KEY`: For enrichment (summaries and embeddings)
- `NEWS_API_KEY`: For news API connectors
- `PATENT_API_KEY`: For patent API connectors
- `LITERATURE_API_KEY`: (Optional) PubMed API key for higher rate limits

### PubMed Integration

Track cannabis research articles from PubMed automatically:

```bash
./setup-pubmed.sh
```

This sets up automatic ingestion of cannabis-related research papers every 6 hours. See [PUBMED_SETUP.md](PUBMED_SETUP.md) for detailed configuration options.

#### Historical Backfill

Get ALL cannabis research articles from PubMed's entire history:

```bash
./backfill-pubmed.sh
```

Choose from preset ranges (2020-2025, 2015-2025, 2000-2025, or 1970-2025) or specify custom years. See [PUBMED_BACKFILL.md](PUBMED_BACKFILL.md) for details.

### Database Schema

See `supabase/migrations/` for the complete schema including:
- `sources` and `source_endpoints`: Ingestion source configuration
- `signal_items`: Canonical records for all signals (news, patents, papers)
- `news_items`, `patent_items`, `paper_items`: Type-specific data
- `signal_fingerprints`: Hard duplicate detection
- `clusters` and `cluster_members`: Near-duplicate clustering
- `topics`, `entities`: Enrichment data
- `ingest_runs`, `ingest_item_events`: Job tracking and observability

### Edge Functions

- `ingest-orchestrator`: Coordinates ingestion across all sources
- `ingest-rss`: RSS/Atom feed connector
- `ingest-news-api`: News API connector
- `ingest-patents`: Patent API connector
- `ingest-literature`: Literature API connector
- `upload-manual`: Manual upload endpoint
- `enrich-signals`: Enrichment worker
- `export-feeds`: Public feed exporter

### Storage Buckets

- `raw-artifacts` (private): Raw ingestion artifacts for audit
- `public-feeds` (public): Policy-safe JSON feeds for GitHub Pages

### Public Feeds

Exported to `public-feeds` bucket:
- `index.json`: Feed index with metadata
- `archives/YYYY-MM.json`: Monthly archives
- `topics/topic-{name}.json`: Topic-filtered feeds
- `entities/entity-{id}.json`: Entity-filtered feeds

## Testing

### Unit Tests
```bash
deno test --allow-all
```

### Property-Based Tests
```bash
deno test --allow-all tests/properties/
```

### Integration Tests
```bash
deno test --allow-all tests/integration/
```

## Deployment

### Deploy to Supabase Cloud

1. Link to your Supabase project:
```bash
supabase link --project-ref <project-ref>
```

2. Push database migrations:
```bash
supabase db push
```

3. Deploy Edge Functions:
```bash
supabase functions deploy
```

4. Set up cron jobs (see `supabase/migrations/` for cron configuration)

## License Policy Enforcement

The system enforces per-source license policies:

- **store_full_text_allowed**: Store complete content
- **snippet_only**: Store only first 500 characters
- **link_only**: Store only URL and metadata

Public feeds automatically filter content based on license policies.

## Observability

- Ingest runs tracked in `ingest_runs` table
- Item-level events logged in `ingest_item_events`
- Metrics tracked per source/endpoint
- Alerts sent when error rate exceeds 10%

## Documentation

- [Requirements](.kiro/specs/news-database-curation/requirements.md)
- [Design](.kiro/specs/news-database-curation/design.md)
- [Implementation Tasks](.kiro/specs/news-database-curation/tasks.md)

## Contributing

See [Implementation Tasks](.kiro/specs/news-database-curation/tasks.md) for the complete task list.
