# Site Display Issues & Fixes

## Current Issues

### 1. Same Articles in All Columns ✅ IDENTIFIED
**Problem:** All three columns (AI Categories, Latest News, Cannabis Categories) show the same articles.

**Root Cause:** 
- Only 5 articles exist in database, all are cannabis-related
- No AI articles have been ingested yet
- JavaScript filters articles by topics:
  - AI column: Looks for AI topics (Large Language Models, AI Tools, etc.)
  - Cannabis column: Looks for Cannabis topics
  - Latest: Shows remaining articles

**Solution:** Run ingestion to get AI articles
```bash
./ingest-all-direct.sh
```

This will ingest from all 40 sources including:
- 10 AI sources (TechCrunch AI, DeepMind, Meta AI, etc.)
- 10 Cannabis sources
- 6 Tech/Science sources

Expected result: 800-1,000 articles with proper topic distribution

### 2. No Images Showing ✅ IDENTIFIED
**Problem:** Article cards have no images/thumbnails.

**Root Cause:**
- RSS feeds don't include image URLs
- Database schema doesn't have an `image_url` field
- JavaScript has `getImageUrl()` function but it returns placeholder

**Current Code:**
```javascript
function getImageUrl(article) {
    // Placeholder - would need to extract from RSS or use OG image
    return null;
}
```

**Solutions:**

#### Option A: Extract from RSS (Recommended)
Modify `ingest-rss` connector to extract:
- `<media:thumbnail>` tags
- `<enclosure>` tags with image types
- `<content:encoded>` first image
- Store in new `image_url` field

#### Option B: Use Open Graph (Fallback)
- Fetch article URL
- Parse OG image meta tag
- Store in database
- More reliable but slower

#### Option C: Use Placeholders
- Generate topic-based placeholder images
- Use emoji or gradients
- Fast but less engaging

## Quick Fixes

### Fix 1: Get More Articles (Immediate)
```bash
# This will populate AI and other categories
./ingest-all-direct.sh
```

### Fix 2: Add Image Support (Requires Code Changes)

**Step 1: Add image_url column**
```sql
ALTER TABLE signal_items ADD COLUMN image_url TEXT;
```

**Step 2: Update RSS connector**
Add image extraction to `supabase/functions/ingest-rss/index.ts`:
```typescript
// Extract image from RSS
let imageUrl = null;
const mediaThumb = parseXMLAttribute(itemXml, 'media:thumbnail', 'url');
const enclosure = parseXMLAttribute(itemXml, 'enclosure', 'url');
if (mediaThumb) imageUrl = mediaThumb;
else if (enclosure && enclosure.match(/\.(jpg|jpeg|png|gif|webp)$/i)) imageUrl = enclosure;

// Add to signal_items insert
image_url: imageUrl,
```

**Step 3: Update site to use images**
Already implemented in `docs/index.html` - just needs data

## Current Status

**Articles in Database:** 5 (all cannabis)
**Sources Configured:** 36 RSS + 1 PubMed
**Topics Assigned:** Yes (enrichment working)
**Images:** No (not extracted from RSS)

## Action Plan

1. **Immediate:** Run `./ingest-all-direct.sh` to get 800-1,000 articles
2. **Short-term:** Add image extraction to RSS connector
3. **Medium-term:** Set up cron for automatic ingestion
4. **Long-term:** Add image caching/optimization

## Testing

After running ingestion:
1. Check article count: `./get-article-stats.sh`
2. Verify topics: Check database for AI vs Cannabis distribution
3. Refresh site: Should see different articles in each column
4. Images: Will still be missing until connector is updated

## Files to Modify

- `supabase/migrations/XXXXXX_add_image_url.sql` - Add column
- `supabase/functions/ingest-rss/index.ts` - Extract images
- `docs/index.html` - Already supports images (no changes needed)
