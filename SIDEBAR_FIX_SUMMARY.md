# Sidebar Display Issue - Summary

## Problem
Both sidebars show the same cannabis articles instead of:
- Left sidebar: AI articles
- Right sidebar: Cannabis articles

## Root Causes

### 1. Most AI RSS Feeds Failed to Ingest
From the ingestion log:
- OpenAI Blog: 873 duplicates (already existed)
- Hugging Face: 743 duplicates (already existed)
- Most other AI sources: 0 articles (feeds may be invalid or empty)

Only successful AI ingestions:
- MIT Technology Review: 10 articles
- VentureBeat AI: 7 articles

### 2. Enrichment Over-Tagging "Artificial Intelligence"
Cannabis articles are being incorrectly tagged with "Artificial Intelligence" topic:
- "The Cannabis Retailer's Survival Guide to 2026" → Tagged with AI
- "Taking Cannabis Global" → Tagged with AI
- "How To Use Blunts As a Brand Building Catalyst" → Tagged with AI

This is causing cannabis articles to appear in the AI sidebar.

## Solutions

### Immediate Fix: Improve Topic Detection
The enrichment function needs better keyword matching to avoid false positives.

Current issue: The word "intelligence" or "AI" appearing in cannabis articles triggers the AI topic tag.

**Fix in `supabase/functions/enrich-signals/index.ts`:**
- Make topic detection more strict
- Require multiple AI-related keywords, not just one
- Exclude articles that have strong cannabis keywords

### Medium-term: Fix AI RSS Feeds
Many AI source URLs are returning 0 articles:
- MJBizDaily: Wrong URL
- Leafly News: Feed may have changed
- Cannabis Business Times: Feed may require authentication
- Green Market Report: Feed may be broken
- Hemp Industry Daily: Feed may be broken

Need to verify and update RSS URLs for these sources.

### Long-term: Source-Based Topic Assignment
Instead of relying solely on content analysis:
- Articles from AI sources should automatically get AI topics
- Articles from Cannabis sources should automatically get Cannabis topics
- Content analysis can add additional topics

## Current Stats

**Total Articles:** ~100
**AI Articles (correctly tagged):** ~17 (MIT Tech Review + VentureBeat)
**Cannabis Articles:** ~80+
**Incorrectly tagged:** Several cannabis articles have "Artificial Intelligence" topic

## Quick Workaround

Until enrichment is fixed, the site will show:
- AI sidebar: Mix of real AI articles + incorrectly tagged cannabis articles
- Cannabis sidebar: Cannabis articles (correct)
- Latest News: Remaining articles

## Action Items

1. ✅ Document the issue
2. ⏳ Fix enrichment topic detection logic
3. ⏳ Verify and fix broken RSS feed URLs
4. ⏳ Add source-based topic hints to enrichment
5. ⏳ Re-run enrichment on existing articles after fixes
