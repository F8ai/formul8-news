#!/bin/bash

# Trigger ingestion for all RSS sources (Cannabis + AI)

SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"

echo "🔄 Triggering ingestion for all RSS sources..."
echo ""

curl -X POST "${SUPABASE_URL}/functions/v1/ingest-orchestrator" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"source_types": ["RSS"]}'

echo ""
echo ""
echo "✅ Ingestion triggered!"
echo ""
echo "Check the results at: https://f8ai.github.io/formul8-news/"
