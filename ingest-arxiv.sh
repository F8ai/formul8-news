#!/bin/bash

# Quick script to manually trigger arXiv ingestion

echo "🚀 Triggering arXiv ingestion..."
echo ""

# Get arXiv source IDs
AI_SOURCE=$(psql $DATABASE_URL -t -c "SELECT id FROM sources WHERE name = 'arXiv AI' LIMIT 1;" | xargs)
CANNABIS_SOURCE=$(psql $DATABASE_URL -t -c "SELECT id FROM sources WHERE name = 'arXiv Cannabis' LIMIT 1;" | xargs)

if [ -z "$AI_SOURCE" ]; then
  echo "❌ arXiv AI source not found. Run: node apply-arxiv-migration.mjs"
  exit 1
fi

if [ -z "$CANNABIS_SOURCE" ]; then
  echo "❌ arXiv Cannabis source not found. Run: node apply-arxiv-migration.mjs"
  exit 1
fi

echo "📚 Found sources:"
echo "   - arXiv AI: $AI_SOURCE"
echo "   - arXiv Cannabis: $CANNABIS_SOURCE"
echo ""

# Trigger ingestion via orchestrator
echo "🔄 Calling ingest-orchestrator..."
curl -X POST "${SUPABASE_URL}/functions/v1/ingest-orchestrator" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo ""
echo "✅ Ingestion triggered!"
echo ""
echo "Monitor progress:"
echo "  psql \$DATABASE_URL -c \"SELECT s.name, ir.status, ir.items_created FROM ingest_runs ir JOIN sources s ON ir.source_id = s.id WHERE s.name LIKE 'arXiv%' ORDER BY ir.started_at DESC LIMIT 5;\""
