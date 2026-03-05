#!/bin/bash

# Test direct RSS ingestion for one endpoint

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🧪 Testing Direct RSS Ingestion"
echo "================================"
echo ""

# Get first endpoint
endpoint=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=id,name,endpoint_url,sources(name)&is_active=eq.true&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0]')

endpoint_id=$(echo "$endpoint" | jq -r '.id')
source_name=$(echo "$endpoint" | jq -r '.sources.name')
feed_url=$(echo "$endpoint" | jq -r '.endpoint_url')

echo "Testing: $source_name"
echo "Feed URL: $feed_url"
echo "Endpoint ID: $endpoint_id"
echo ""

# Create a test ingest run
run_result=$(curl -s "$SUPABASE_URL/rest/v1/ingest_runs" \
  -X POST \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"source_endpoint_id\": \"$endpoint_id\", \"mode\": \"streaming\", \"status\": \"started\"}")

run_id=$(echo "$run_result" | jq -r '.[0].id')

echo "Created ingest run: $run_id"
echo ""

# Call RSS connector directly
echo "Calling RSS connector..."
result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-rss" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"source_endpoint_id\": \"$endpoint_id\",
    \"ingest_run_id\": \"$run_id\",
    \"mode\": \"streaming\"
  }")

echo "$result" | jq '.'

echo ""
echo "================================"
echo "📊 Results"
echo "================================"

items_created=$(echo "$result" | jq -r '.items_created // 0')
items_duplicate=$(echo "$result" | jq -r '.items_duplicate // 0')
items_processed=$(echo "$result" | jq -r '.items_processed // 0')

echo "Processed: $items_processed"
echo "Created: $items_created"
echo "Duplicates: $items_duplicate"

# Check database
total=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.count // 0')

echo ""
echo "Total articles in database: $total"
