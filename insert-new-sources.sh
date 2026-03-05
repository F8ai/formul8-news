#!/bin/bash

export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4"
SUPABASE_URL="https://gptfmaceymhubyuhqegu.supabase.co"

# Add New Cannabis Ventures
echo "Adding New Cannabis Ventures..."
NCV_RESULT=$(curl -s -X POST "$SUPABASE_URL/rest/v1/sources" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "New Cannabis Ventures",
    "type": "rss",
    "description": "Cannabis business news and information",
    "is_active": true
  }')

NCV_ID=$(echo $NCV_RESULT | jq -r '.[0].id')
echo "Created source: $NCV_ID"

curl -s -X POST "$SUPABASE_URL/rest/v1/source_endpoints" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"source_id\": \"$NCV_ID\",
    \"name\": \"Main Feed\",
    \"endpoint_url\": \"https://www.newcannabisventures.com/feed/\",
    \"is_active\": true
  }"

# Add Cannabis Industry Journal
echo "Adding Cannabis Industry Journal..."
CIJ_RESULT=$(curl -s -X POST "$SUPABASE_URL/rest/v1/sources" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Cannabis Industry Journal",
    "type": "rss",
    "description": "Digital publishing platform for legal cannabis industry",
    "is_active": true
  }')

CIJ_ID=$(echo $CIJ_RESULT | jq -r '.[0].id')
echo "Created source: $CIJ_ID"

curl -s -X POST "$SUPABASE_URL/rest/v1/source_endpoints" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"source_id\": \"$CIJ_ID\",
    \"name\": \"Main Feed\",
    \"endpoint_url\": \"https://cannabisindustryjournal.com/feed/\",
    \"is_active\": true
  }"

# Add Americans for Safe Access
echo "Adding Americans for Safe Access..."
ASA_RESULT=$(curl -s -X POST "$SUPABASE_URL/rest/v1/sources" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Americans for Safe Access",
    "type": "rss",
    "description": "Medical marijuana advocacy and policy news",
    "is_active": true
  }')

ASA_ID=$(echo $ASA_RESULT | jq -r '.[0].id')
echo "Created source: $ASA_ID"

curl -s -X POST "$SUPABASE_URL/rest/v1/source_endpoints" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{
    \"source_id\": \"$ASA_ID\",
    \"name\": \"Main Feed\",
    \"endpoint_url\": \"https://www.safeaccessnow.org/blog.rss\",
    \"is_active\": true
  }"

echo "✅ All sources added successfully!"
