#!/bin/bash

# Run enrichment on all articles to assign topics

set -e

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🎨 Running Article Enrichment"
echo "=============================="
echo ""
echo "This will assign topics to articles so they appear in the correct columns"
echo ""

# Trigger enrichment
result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/enrich-signals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"batch_size": 100}')

echo "$result" | jq '.'

echo ""
echo "=============================="
echo "📊 Enrichment Results"
echo "=============================="

items_processed=$(echo "$result" | jq -r '.items_processed // 0')
items_enriched=$(echo "$result" | jq -r '.items_enriched // 0')

echo "Processed: $items_processed"
echo "Enriched: $items_enriched"

echo ""
echo "✨ Enrichment complete!"
echo ""
echo "Refresh the site to see articles in correct categories"
