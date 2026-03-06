# arXiv Integration Implementation Summary

## What Was Built

Added arXiv paper indexing for AI and cannabis research to the literature ingestion system.

## Files Created

### Migrations
1. **supabase/migrations/20260305180400_add_arxiv_sources.sql**
   - Adds "arXiv AI" and "arXiv Cannabis" sources
   - Creates arXiv API endpoints with search queries
   - Configures polling schedule (every 6 hours)

2. **supabase/migrations/20260305180401_add_arxiv_fields.sql**
   - Adds `arxiv_id` field to paper_items table
   - Adds `arxiv_categories` array field
   - Creates index for arXiv ID lookups

### Functions
3. **supabase/functions/ingest-literature/index.ts** (updated)
   - Added `parseArXivAtom()` function to parse arXiv Atom feeds
   - Added arXiv API integration alongside existing PubMed support
   - Handles arXiv-specific metadata (categories, arXiv ID)
   - Downloads full-text PDFs from arXiv
   - Supports both PubMed and arXiv endpoints

### Scripts
4. **apply-arxiv-migration.mjs**
   - Applies both arXiv migrations
   - Verifies sources and endpoints were created
   - Shows configuration details

5. **test-arxiv-ingestion.mjs**
   - Tests arXiv ingestion for both sources
   - Creates ingest runs
   - Displays results and sample papers
   - Updates run status

### Documentation
6. **ARXIV_SETUP.md**
   - Comprehensive setup guide
   - API details and search query syntax
   - Database schema documentation
   - Customization examples
   - Monitoring queries
   - Troubleshooting tips

7. **ARXIV_QUICKSTART.md**
   - Quick 3-step setup
   - Common query examples
   - Basic customization
   - Troubleshooting

8. **ARXIV_IMPLEMENTATION.md** (this file)
   - Implementation summary
   - Technical details

## Technical Details

### arXiv API Integration

**Endpoint:** `http://export.arxiv.org/api/query`

**Search Queries:**
- AI: `cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR stat.ML`
- Cannabis: `all:cannabis OR all:cannabinoid OR all:cannabidiol OR all:CBD OR all:THC OR all:marijuana OR all:hemp`

**Response Format:** Atom XML feed

**Rate Limiting:** 3 seconds between requests (implemented)

### Data Flow

1. **Discovery**: arXiv API query returns Atom feed with paper metadata
2. **Parsing**: `parseArXivAtom()` extracts:
   - arXiv ID (e.g., 2103.12345)
   - DOI (if available)
   - Title and abstract
   - Authors
   - Categories (e.g., cs.AI, cs.LG)
   - Published/updated dates
   - PDF URL
3. **Deduplication**: Content fingerprint check (SHA-256 of title + abstract)
4. **Storage**:
   - signal_items: Core paper metadata
   - paper_items: Paper-specific fields including arXiv data
   - provenance_records: Source tracking
   - signal_fingerprints: Deduplication
5. **Full Text**: PDF downloaded from arXiv and stored in raw-artifacts bucket

### Database Schema Changes

```sql
-- New fields in paper_items
arxiv_id TEXT              -- arXiv identifier
arxiv_categories TEXT[]    -- Subject categories

-- New index
CREATE INDEX idx_paper_items_arxiv_id ON paper_items(arxiv_id);
```

### Code Architecture

The `ingest-literature` function now supports multiple literature APIs:

```typescript
// Detect API type
const isArXiv = endpoint.endpoint_url.includes('arxiv.org');
const isPubMed = endpoint.endpoint_url.includes('ncbi.nlm.nih.gov');

if (isArXiv) {
  // arXiv-specific logic
  papers = parseArXivAtom(atomText);
} else if (isPubMed) {
  // PubMed-specific logic
  papers = parsePubMedXML(xmlText);
}

// Common processing for all papers
for (const paper of papers) {
  // Handle both formats
  const itemId = arxivId || pmid || doi;
  // ... rest of processing
}
```

## Configuration

### Source Configuration

```sql
-- arXiv AI source
name: 'arXiv AI'
type: 'LITERATURE'
license_policy: {
  "mode": "store_full_text_allowed",
  "snippet_length": 1000,
  "attribution_required": true,
  "redistribution_allowed": true,
  "license_type": "CC BY 4.0"
}

-- Endpoint configuration
endpoint_url: 'http://export.arxiv.org/api/query'
polling_schedule: '0 */6 * * *'  -- Every 6 hours
auth_config: {
  "search_query": "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR stat.ML",
  "max_results": 200,
  "sort_by": "submittedDate",
  "sort_order": "descending"
}
```

## Usage

### Setup
```bash
node apply-arxiv-migration.mjs
npx supabase functions deploy ingest-literature
node test-arxiv-ingestion.mjs
```

### Query Papers
```sql
-- Recent AI papers
SELECT si.title, pi.arxiv_id, pi.arxiv_categories
FROM paper_items pi
JOIN signal_items si ON pi.signal_item_id = si.id
WHERE pi.arxiv_categories && ARRAY['cs.AI']
ORDER BY si.published_at DESC;
```

## Benefits

1. **Open Access**: All arXiv papers are freely available
2. **Full Text**: PDFs automatically downloaded
3. **Rich Metadata**: Categories, authors, abstracts
4. **Automatic Updates**: Polls every 6 hours
5. **Deduplication**: Prevents duplicate storage
6. **Flexible Queries**: Powerful search syntax
7. **No API Key**: Free to use

## Limitations

1. **Rate Limiting**: 3 seconds between requests
2. **No Citation Counts**: arXiv doesn't provide this (unlike PubMed)
3. **Preprints**: Papers may not be peer-reviewed
4. **Search Syntax**: Different from PubMed (category-based)

## Future Enhancements

1. Add more arXiv categories (physics, math, etc.)
2. Integrate with citation APIs (Semantic Scholar, OpenCitations)
3. Add paper version tracking (arXiv papers can be updated)
4. Implement author disambiguation
5. Add category-based filtering in UI
6. Set up alerts for specific keywords or authors

## Testing

Run the test script to verify:
```bash
node test-arxiv-ingestion.mjs
```

Expected results:
- AI papers: ~200 per run
- Cannabis papers: ~50-100 per run
- Full text download: 100% (all arXiv papers are open access)
- Deduplication: Subsequent runs should show mostly duplicates

## Monitoring

Check ingestion runs:
```sql
SELECT s.name, ir.status, ir.items_created, ir.started_at
FROM ingest_runs ir
JOIN sources s ON ir.source_id = s.id
WHERE s.name LIKE 'arXiv%'
ORDER BY ir.started_at DESC;
```

## Resources

- [arXiv API Documentation](https://arxiv.org/help/api/)
- [arXiv Category Taxonomy](https://arxiv.org/category_taxonomy)
- [Search Query Syntax](https://arxiv.org/help/api/user-manual#query_details)
