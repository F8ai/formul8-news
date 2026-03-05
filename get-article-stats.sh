#!/bin/bash

# Get comprehensive article statistics

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "📊 Article Database Statistics"
echo "================================"
echo ""

# Total articles
total=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" \
  -H "Range: 0-0" | grep -oP 'content-range: \d+-\d+/\K\d+' || echo "0")

echo "Total articles: $total"

# News vs Papers
news=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=id&type=eq.news" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" \
  -H "Range: 0-0" | grep -oP 'content-range: \d+-\d+/\K\d+' || echo "0")

papers=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=id&type=eq.paper" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" \
  -H "Range: 0-0" | grep -oP 'content-range: \d+-\d+/\K\d+' || echo "0")

echo "  News articles: $news"
echo "  Research papers: $papers"

# Sources
echo ""
echo "Active sources: "
curl -s "$SUPABASE_URL/rest/v1/sources?select=name,type&order=name" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[] | "  - \(.name) (\(.type))"'

# Endpoints
echo ""
endpoints=$(curl -s "$SUPABASE_URL/rest/v1/source_endpoints?select=id&is_active=eq.true" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" \
  -H "Range: 0-0" | grep -oP 'content-range: \d+-\d+/\K\d+' || echo "0")

echo "Active endpoints: $endpoints"

# Recent articles
echo ""
echo "Recent articles (last 5):"
curl -s "$SUPABASE_URL/rest/v1/signal_items?select=title,published_at&order=published_at.desc&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[] | "  - \(.title[:60])... (\(.published_at[:10]))"'

echo ""
echo "================================"
echo "✨ Statistics complete"
