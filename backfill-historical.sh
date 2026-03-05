#!/bin/bash

# Backfill historical cannabis news articles
# This script scrapes archives from multiple cannabis news sources

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

echo "🚀 Starting Historical Cannabis News Backfill"
echo "=============================================="
echo ""

# Function to scrape a source
scrape_source() {
  local source_name="$1"
  local archive_url="$2"
  local max_pages="$3"
  
  echo "📰 Scraping: $source_name"
  echo "   URL: $archive_url"
  echo "   Pages: $max_pages"
  
  result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/scrape-news-archives" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -d "{
      \"source_name\": \"$source_name\",
      \"archive_url\": \"$archive_url\",
      \"max_pages\": $max_pages
    }")
  
  echo "$result" | jq -r '"   ✅ Found: \(.articles_found) | Ingested: \(.articles_ingested) | Duplicates: \(.articles_duplicate) | Pages: \(.pages_scraped)"'
  
  if [ $(echo "$result" | jq '.errors | length') -gt 0 ]; then
    echo "   ⚠️  Errors: $(echo "$result" | jq '.errors | length')"
  fi
  
  echo ""
}

# 1. New Cannabis Ventures - Business news
echo "1️⃣  New Cannabis Ventures (Business News)"
scrape_source "New Cannabis Ventures" "https://www.newcannabisventures.com/category/news/" 10
sleep 5

# 2. Cannabis Industry Journal - Industry news
echo "2️⃣  Cannabis Industry Journal (Industry News)"
scrape_source "Cannabis Industry Journal" "https://cannabisindustryjournal.com/" 10
sleep 5

# 3. Americans for Safe Access - Policy news
echo "3️⃣  Americans for Safe Access (Policy & Advocacy)"
scrape_source "Americans for Safe Access" "https://www.safeaccessnow.org/blog" 5
sleep 5

echo "=============================================="
echo "📊 Backfill Summary"
echo "=============================================="

# Get total counts
total_items=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=count" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count')

echo "Total signal items in database: $total_items"

# Get counts by source
echo ""
echo "Items by source:"
curl -s "$SUPABASE_URL/rest/v1/news_items?select=source_name,count&order=count.desc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[] | "  - \(.source_name): \(.count)"'

# Get date range
echo ""
echo "Date range:"
oldest=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=published_at&order=published_at.asc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].published_at')

newest=$(curl -s "$SUPABASE_URL/rest/v1/signal_items?select=published_at&order=published_at.desc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].published_at')

echo "  Oldest: $oldest"
echo "  Newest: $newest"

echo ""
echo "✨ Backfill complete!"
echo ""
echo "Next steps:"
echo "  1. Run enrichment: bash test-ingestion.sh (step 5)"
echo "  2. Export feeds: bash test-ingestion.sh (step 6)"
echo "  3. View public feed: curl $SUPABASE_URL/storage/v1/object/public/public-feeds/index.json"
