#!/bin/bash

echo "📦 Deploying Literature Ingestion Function"
echo "=========================================="
echo ""

# Check if we have the Supabase project linked
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found"
    exit 1
fi

source .env.local

echo "🚀 Deploying ingest-literature function..."

# Use npx supabase to deploy
npx supabase functions deploy ingest-literature \
  --project-ref gptfmaceymhubyuhqegu \
  --no-verify-jwt

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Function deployed successfully!"
echo ""
echo "🧪 Test it with:"
echo "   node test-pubmed.mjs"
