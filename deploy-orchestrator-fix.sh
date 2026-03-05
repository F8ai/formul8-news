#!/bin/bash

# Deploy the fixed orchestrator function using Supabase Management API

set -e

echo "🔧 Deploying Fixed Orchestrator"
echo "================================"
echo ""

# The orchestrator fix adds the 'apikey' header to Edge Function calls
# This is required for proper authentication between Edge Functions

echo "⚠️  Manual Deployment Required"
echo ""
echo "The Supabase CLI requires authentication that isn't configured."
echo "Please deploy the orchestrator manually using one of these methods:"
echo ""
echo "Method 1: Supabase Dashboard"
echo "  1. Go to https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/functions"
echo "  2. Click on 'ingest-orchestrator'"
echo "  3. Click 'Edit Function'"
echo "  4. Replace the code with the contents of:"
echo "     supabase/functions/ingest-orchestrator/index.ts"
echo "  5. Click 'Deploy'"
echo ""
echo "Method 2: Supabase CLI (after authentication)"
echo "  1. Run: supabase login"
echo "  2. Run: supabase link --project-ref gptfmaceymhubyuhqegu"
echo "  3. Run: supabase functions deploy ingest-orchestrator"
echo ""
echo "The fix adds this line to the fetch headers:"
echo '  "apikey": serviceRoleKey,'
echo ""
echo "This ensures Edge Functions can authenticate with each other."
echo ""
echo "After deployment, test with:"
echo "  ./trigger-all-ingestion.sh"
