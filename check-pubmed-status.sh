#!/bin/bash

# Quick status check for PubMed integration

source .env.local

echo "📊 PubMed Integration Status"
echo "============================="
echo ""

# Check if source exists
echo "🔍 Checking PubMed source..."
PUBMED_EXISTS=$(psql "${SUPABASE_DB_URL}" -t -c "SELECT COUNT(*) FROM sources WHERE name = 'PubMed';" 2>/dev/null)

if [ -z "$PUBMED_EXISTS" ] || [ "$PUBMED_EXISTS" -eq 0 ]; then
    echo "❌ PubMed source not found"
    echo "   Run: ./setup-pubmed.sh"
    exit 1
fi

echo "✅ PubMed source configured"
echo ""

# Check recent runs
echo "📅 Recent ingestion runs:"
psql "${SUPABASE_DB_URL}" -c "
SELECT 
    ir.created_at::date as date,
    ir.status,
    ir.items_processed,
    ir.items_created,
    ir.items_duplicate
FROM ingest_runs ir
JOIN source_endpoints se ON se.id = ir.source_endpoint_id
JOIN sources s ON s.id = se.source_id
WHERE s.name = 'PubMed'
ORDER BY ir.created_at DESC
LIMIT 5;
" 2>/dev/null

echo ""

# Check total papers
echo "📚 Total cannabis papers in database:"
psql "${SUPABASE_DB_URL}" -t -c "
SELECT COUNT(*) 
FROM signal_items 
WHERE type = 'paper';
" 2>/dev/null

echo ""

# Check most recent papers
echo "📰 Most recent papers:"
psql "${SUPABASE_DB_URL}" -c "
SELECT 
    si.published_at::date as published,
    LEFT(si.title, 60) || '...' as title,
    pi.journal
FROM signal_items si
JOIN paper_items pi ON pi.signal_item_id = si.id
WHERE si.type = 'paper'
ORDER BY si.published_at DESC
LIMIT 5;
" 2>/dev/null

echo ""
echo "✅ Status check complete"
