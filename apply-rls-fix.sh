#!/bin/bash

# Apply RLS fix to allow public read access
# This script executes the SQL migration via Supabase's query endpoint

SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"

echo "🔧 Applying RLS fix migration..."
echo ""
echo "⚠️  Note: This script requires manual application via Supabase Dashboard"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Open the SQL Editor:"
echo "   https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/sql/new"
echo ""
echo "2. Copy the contents of:"
echo "   supabase/migrations/20260305180100_fix_public_read_access.sql"
echo ""
echo "3. Paste into the SQL Editor and click 'Run'"
echo ""
echo "4. Verify the news page works:"
echo "   https://f8ai.github.io/formul8-news/"
echo ""
echo "See FIX_PUBLIC_ACCESS.md for detailed instructions."
