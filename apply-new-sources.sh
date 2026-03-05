#!/bin/bash

# Apply new source migrations using service key

set -e

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"
PGPASSWORD="postgres"
DB_HOST="db.gptfmaceymhubyuhqegu.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "🚀 Applying New Source Migrations"
echo "=================================="
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Installing via Supabase CLI..."
    
    # Try using Supabase CLI to apply migrations
    if command -v supabase &> /dev/null; then
        echo "Using Supabase CLI to apply migrations..."
        
        # Read and execute migration 1
        echo "📦 Migration 1: Adding 60 new sources..."
        PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < supabase/migrations/20260305180300_add_comprehensive_sources.sql
        
        echo "📦 Migration 2: Updating PubMed for 2026..."
        PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < supabase/migrations/20260305180301_update_pubmed_2026.sql
        
        echo "✅ Migrations applied successfully"
    else
        echo "❌ Neither psql nor Supabase CLI found"
        echo "Please install PostgreSQL client or Supabase CLI"
        exit 1
    fi
else
    echo "📦 Applying migrations via psql..."
    
    # Apply migration 1
    echo "1️⃣  Adding 60 new RSS sources..."
    PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < supabase/migrations/20260305180300_add_comprehensive_sources.sql
    
    # Apply migration 2
    echo "2️⃣  Updating PubMed configuration for 2026..."
    PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < supabase/migrations/20260305180301_update_pubmed_2026.sql
    
    echo "✅ Migrations applied successfully"
fi

echo ""
echo "=================================="
echo "📊 Source Statistics"
echo "=================================="

# Get source counts
total_sources=$(curl -s "$SUPABASE_URL/rest/v1/sources?select=count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

total_endpoints=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=count&is_active=eq.true" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "Total sources: $total_sources"
echo "Active endpoints: $total_endpoints"

echo ""
echo "Sources by type:"
curl -s "$SUPABASE_URL/rest/v1/sources?select=type,count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r 'group_by(.type) | .[] | "  \(.[0].type): \(length)"'

echo ""
echo "✨ Ready to ingest articles!"
echo ""
echo "Next steps:"
echo "  1. Run backfill: ./run-comprehensive-backfill.sh"
echo "  2. Trigger PubMed: ./trigger-pubmed-ingestion.sh"
