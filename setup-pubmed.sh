#!/bin/bash

echo "🔬 Setting up PubMed Integration"
echo "================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "1️⃣ Applying PubMed migration..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Migration failed"
    exit 1
fi

echo "✅ Migration applied"
echo ""

echo "2️⃣ Testing PubMed ingestion..."
deno run --allow-net --allow-env --allow-read test-pubmed.ts

if [ $? -ne 0 ]; then
    echo "❌ Test failed"
    exit 1
fi

echo ""
echo "✅ PubMed is now set up and running!"
echo ""
echo "📋 Next steps:"
echo "   • The system will automatically check PubMed every 6 hours"
echo "   • To manually trigger ingestion, run: ./test-pubmed.ts"
echo "   • To adjust the search query, update the source_endpoints.auth_config"
echo "   • To get a PubMed API key (optional, for higher rate limits):"
echo "     https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/"
