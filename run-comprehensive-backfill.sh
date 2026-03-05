#!/bin/bash

# Comprehensive backfill script for all RSS sources
# This triggers the orchestrator in backfill mode to grab historical articles

set -e

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🚀 Comprehensive Article Backfill"
echo "=================================="
echo ""
echo "This will ingest historical articles from all active RSS sources"
echo "Most RSS feeds provide 30-90 days of history"
echo ""

# Apply new migrations first
echo "📦 Applying new migrations..."
supabase db push

echo ""
echo "✅ Migrations applied"
echo ""

# Get count of active endpoints
endpoint_count=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=count&is_active=eq.true" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count')

echo "📊 Found $endpoint_count active RSS endpoints"
echo ""

# Run orchestrator in backfill mode
echo "🔄 Starting backfill ingestion..."
echo "   Mode: backfill (grabs historical articles)"
echo "   This may take 5-10 minutes..."
echo ""

result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-orchestrator" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"mode": "backfill"}')

echo "$result" | jq '.'

echo ""
echo "=================================="
echo "📊 Backfill Results"
echo "=================================="

# Parse results
endpoints_processed=$(echo "$result" | jq -r '.endpoints_processed // 0')
items_created=$(echo "$result" | jq -r '.items_created // 0')
items_skipped=$(echo "$result" | jq -r '.items_skipped // 0')
error_count=$(echo "$result" | jq -r '.errors | length')

echo "Endpoints processed: $endpoints_processed"
echo "New articles: $items_created"
echo "Duplicates skipped: $items_skipped"
echo "Errors: $error_count"

if [ "$error_count" -gt 0 ]; then
  echo ""
  echo "⚠️  Errors encountered:"
  echo "$result" | jq -r '.errors[] | "  - \(.endpoint_id): \(.error)"'
fi

echo ""
echo "=================================="
echo "📈 Database Statistics"
echo "=================================="

# Get total counts
total_items=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "Total articles in database: $total_items"

# Get counts by type
news_count=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count&signal_type=eq.news" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

papers_count=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count&signal_type=eq.paper" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "  News articles: $news_count"
echo "  Research papers: $papers_count"

# Get date range
echo ""
echo "Date range:"
oldest=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=published_at&order=published_at.asc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].published_at // "N/A"')

newest=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=published_at&order=published_at.desc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].published_at // "N/A"')

echo "  Oldest: $oldest"
echo "  Newest: $newest"

# Get top sources
echo ""
echo "Top 10 sources by article count:"
curl -s "$SUPABASE_URL/rest/v1/rpc/get_source_counts" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null | jq -r '.[:10][] | "  \(.count | tostring | . + " " * (6 - length)) \(.source_name)"' || echo "  (Stats function not available)"

echo ""
echo "✨ Backfill complete!"
echo ""
echo "Next steps:"
echo "  1. Trigger PubMed ingestion: ./trigger-pubmed-ingestion.sh"
echo "  2. Run enrichment: curl -X POST $SUPABASE_URL/functions/v1/enrich-signals -H 'Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY'"
echo "  3. Export feeds: curl -X POST $SUPABASE_URL/functions/v1/export-feeds -H 'Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY'"
