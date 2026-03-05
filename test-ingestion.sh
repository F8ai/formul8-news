#!/bin/bash

# Test script for end-to-end ingestion
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"
SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set"
  exit 1
fi

echo "🚀 Starting Formul8 News Ingestion Test"
echo ""
echo "📡 Supabase URL: $SUPABASE_URL"
echo ""

# Step 1: Check database connectivity
echo "1️⃣  Checking database connectivity..."
SOURCES=$(curl -s -X GET "$SUPABASE_URL/rest/v1/sources?select=count" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY")

if [ $? -eq 0 ]; then
  echo "✅ Database connected"
  echo ""
else
  echo "❌ Database connectivity failed"
  echo ""
  exit 1
fi

# Step 2: List available sources
echo "2️⃣  Listing RSS sources..."
curl -s -X GET "$SUPABASE_URL/rest/v1/source_endpoints?select=*,sources(name)&is_active=eq.true" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | jq -r '.[] | "   - \(.sources.name): \(.endpoint_url)"'
echo ""

# Step 3: Trigger ingestion
echo "3️⃣  Triggering ingestion orchestrator..."
INGEST_RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-orchestrator" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"mode": "streaming"}')

echo "$INGEST_RESULT" | jq '.'
echo ""

# Step 4: Check ingested signals
echo "4️⃣  Checking ingested signals..."
curl -s -X GET "$SUPABASE_URL/rest/v1/signal_items?select=id,type,title,enrichment_status&limit=5&order=created_at.desc" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | jq -r '.[] | "   - [\(.type)] \(.title[0:60])... (Status: \(.enrichment_status))"'
echo ""

# Step 5: Trigger enrichment
echo "5️⃣  Triggering enrichment worker..."
ENRICH_RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/enrich-signals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"batch_size": 10}')

echo "$ENRICH_RESULT" | jq '.'
echo ""

# Step 6: Trigger feed export
echo "6️⃣  Triggering feed export..."
EXPORT_RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/export-feeds" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"export_types": ["index", "monthly"]}')

echo "$EXPORT_RESULT" | jq '.'
echo ""

# Step 7: Verify public feed
echo "7️⃣  Verifying public feed..."
curl -s -X GET "$SUPABASE_URL/storage/v1/object/public/public-feeds/index.json" | jq '.'
echo ""

echo "✨ End-to-end test completed!"
echo ""
echo "🎉 System is operational!"
