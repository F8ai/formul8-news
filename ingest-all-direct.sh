#!/bin/bash

# Direct RSS ingestion for all endpoints (bypasses orchestrator)
# This is a workaround until the orchestrator is redeployed with the auth fix

set -e

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🚀 Direct RSS Ingestion (All Endpoints)"
echo "========================================"
echo ""
echo "This bypasses the orchestrator and calls RSS connector directly"
echo ""

# Get all active RSS endpoints
endpoints=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=id,name,endpoint_url,sources(name,type)&is_active=eq.true&sources.type=eq.RSS" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

endpoint_count=$(echo "$endpoints" | jq 'length')

echo "📊 Found $endpoint_count active RSS endpoints"
echo ""

total_created=0
total_duplicate=0
total_processed=0
total_errors=0

# Process each endpoint
echo "$endpoints" | jq -c '.[]' | while read -r endpoint; do
  endpoint_id=$(echo "$endpoint" | jq -r '.id')
  source_name=$(echo "$endpoint" | jq -r '.sources.name')
  feed_url=$(echo "$endpoint" | jq -r '.endpoint_url')
  
  echo "📰 $source_name"
  echo "   URL: $feed_url"
  
  # Create ingest run
  run_result=$(curl -s "$SUPABASE_URL/rest/v1/ingest_runs" \
    -X POST \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"source_endpoint_id\": \"$endpoint_id\", \"mode\": \"backfill\", \"status\": \"started\"}")
  
  run_id=$(echo "$run_result" | jq -r '.[0].id')
  
  # Call RSS connector
  result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-rss" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -d "{
      \"source_endpoint_id\": \"$endpoint_id\",
      \"ingest_run_id\": \"$run_id\",
      \"mode\": \"backfill\"
    }")
  
  items_created=$(echo "$result" | jq -r '.items_created // 0')
  items_duplicate=$(echo "$result" | jq -r '.items_duplicate // 0')
  items_processed=$(echo "$result" | jq -r '.items_processed // 0')
  error_count=$(echo "$result" | jq -r '.errors | length')
  
  echo "   ✅ Processed: $items_processed | Created: $items_created | Duplicates: $items_duplicate | Errors: $error_count"
  
  # Update totals
  total_created=$((total_created + items_created))
  total_duplicate=$((total_duplicate + items_duplicate))
  total_processed=$((total_processed + items_processed))
  total_errors=$((total_errors + error_count))
  
  # Update ingest run
  curl -s "$SUPABASE_URL/rest/v1/ingest_runs?id=eq.$run_id" \
    -X PATCH \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
      \"status\": \"completed\",
      \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"items_processed\": $items_processed,
      \"items_created\": $items_created,
      \"items_duplicate\": $items_duplicate,
      \"items_error\": $error_count
    }" > /dev/null
  
  echo ""
  
  # Rate limiting - wait 2 seconds between requests
  sleep 2
done

echo "========================================"
echo "📊 Ingestion Complete"
echo "========================================"
echo ""
echo "Total processed: $total_processed"
echo "Total created: $total_created"
echo "Total duplicates: $total_duplicate"
echo "Total errors: $total_errors"
echo ""

# Get final database stats
total_articles=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" \
  -H "Range: 0-0" | grep -oE 'content-range: [0-9]+-[0-9]+/[0-9]+' | grep -oE '[0-9]+$' || echo "0")

echo "Total articles in database: $total_articles"
echo ""
echo "✨ Done!"
