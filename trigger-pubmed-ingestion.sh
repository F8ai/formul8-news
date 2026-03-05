#!/bin/bash

# Trigger PubMed ingestion for 2026 cannabis research articles

set -e

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🔬 PubMed Cannabis Research Ingestion (2026)"
echo "============================================="
echo ""

# Get PubMed endpoint ID
pubmed_endpoint=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=id,auth_config&source_id=eq.(select:id:from:sources:where:name:eq:PubMed)" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0]')

endpoint_id=$(echo "$pubmed_endpoint" | jq -r '.id')
search_query=$(echo "$pubmed_endpoint" | jq -r '.auth_config.search_query')
max_results=$(echo "$pubmed_endpoint" | jq -r '.auth_config.max_results')

echo "📋 Configuration:"
echo "   Endpoint ID: $endpoint_id"
echo "   Search Query: $search_query"
echo "   Max Results: $max_results"
echo ""

# Trigger ingestion via orchestrator
echo "🚀 Triggering PubMed ingestion..."
echo ""

result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-orchestrator" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"source_endpoint_id\": \"$endpoint_id\",
    \"mode\": \"streaming\"
  }")

echo "$result" | jq '.'

echo ""
echo "============================================="
echo "📊 Ingestion Results"
echo "============================================="

# Parse results
items_created=$(echo "$result" | jq -r '.items_created // 0')
items_skipped=$(echo "$result" | jq -r '.items_skipped // 0')
status=$(echo "$result" | jq -r '.status')

echo "Status: $status"
echo "New papers: $items_created"
echo "Duplicates skipped: $items_skipped"

# Get total paper count
echo ""
echo "============================================="
echo "📈 Database Statistics"
echo "============================================="

total_papers=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count&signal_type=eq.paper" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "Total research papers: $total_papers"

# Get 2026 papers
papers_2026=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count&signal_type=eq.paper&published_at=gte.2026-01-01&published_at=lt.2027-01-01" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "Papers from 2026: $papers_2026"

# Get recent papers
echo ""
echo "Recent papers (last 5):"
curl -s "$SUPABASE_URL/rest/v1/paper_items?select=title,journal,published_at&order=published_at.desc&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[] | "  - \(.title[:60])... (\(.journal), \(.published_at[:10]))"'

echo ""
echo "✨ PubMed ingestion complete!"
echo ""
echo "To run again: ./trigger-pubmed-ingestion.sh"
