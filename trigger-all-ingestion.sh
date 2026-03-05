#!/bin/bash

# Trigger comprehensive ingestion for all sources

set -e

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🚀 Comprehensive Article Ingestion"
echo "=================================="
echo ""

# Get endpoint count
endpoint_count=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=count&is_active=eq.true" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "📊 Found $endpoint_count active RSS endpoints"
echo ""
echo "🔄 Starting backfill ingestion (this will take 5-10 minutes)..."
echo ""

# Trigger orchestrator in backfill mode
result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-orchestrator" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"mode": "backfill"}')

echo "$result" | jq '.'

echo ""
echo "=================================="
echo "📊 Ingestion Results"
echo "=================================="

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
  echo "⚠️  Errors:"
  echo "$result" | jq -r '.errors[] | "  - \(.error)"'
fi

echo ""
echo "=================================="
echo "📈 Database Statistics"
echo "=================================="

total_items=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

news_count=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count&signal_type=eq.news" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

papers_count=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count&signal_type=eq.paper" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo ""
echo "Total articles: $total_items"
echo "  News articles: $news_count"
echo "  Research papers: $papers_count"

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

echo ""
echo "✨ Ingestion complete!"
