# Adding AI News Sources to Formul8 News

This guide explains how to add AI news coverage (models, tools, research) to the Formul8 News platform.

## Overview

We're expanding the platform to curate AI industry news alongside cannabis news, covering:
- Large Language Models (GPT, Claude, Llama, Gemini)
- AI Tools & Frameworks (LangChain, PyTorch, TensorFlow)
- Computer Vision (DALL-E, Midjourney, Stable Diffusion)
- AI Research & Papers
- AI Business & Startups
- AI Ethics & Safety

## Step 1: Apply Database Migration

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/sql/new

2. Copy and paste the contents of:
   `supabase/migrations/20260305180200_add_ai_sources.sql`

3. Click "Run" to execute

This will add:
- 7 new AI news RSS sources
- 10 new AI-related topics
- RSS endpoints for each source

## Step 2: Deploy Updated Enrichment Function

The enrichment function has been updated to detect AI-related content.

### Via Supabase CLI (if authenticated):

```bash
supabase functions deploy enrich-signals
```

### Via Supabase Dashboard:

1. Go to Edge Functions: https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/functions

2. Select `enrich-signals` function

3. Copy the contents of `supabase/functions/enrich-signals/index.ts`

4. Paste and deploy

## Step 3: Test AI News Ingestion

Run the orchestrator to ingest from all RSS sources (including new AI sources):

```bash
curl -X POST 'https://gptfmaceymhubyuhqegu.supabase.co/functions/v1/ingest-orchestrator' \
  -H 'Authorization: Bearer SERVICE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"source_types": ["RSS"]}'
```

Replace `SERVICE_KEY` with your Supabase service role key.

## Step 4: Update News Page Categories

The news page (`docs/index.html`) should be updated to include AI categories:

```javascript
const categoryMap = {
    'Cannabis': { icon: '🌿', topics: ['Cannabis', 'CBD', 'THC', 'Medical Cannabis'] },
    'AI & ML': { icon: '🤖', topics: ['Artificial Intelligence', 'Large Language Models', 'Machine Learning'] },
    'AI Tools': { icon: '🛠️', topics: ['AI Tools', 'AI Models', 'AI Infrastructure'] },
    'AI Research': { icon: '🔬', topics: ['AI Research', 'Computer Vision', 'Generative AI'] },
    'Regulation': { icon: '⚖️', topics: ['Cannabis Regulation', 'AI Ethics'] },
    'Business': { icon: '💼', topics: ['Cannabis Business', 'AI Business', 'Cannabis Finance'] }
};
```

## New AI Sources Added

1. **OpenAI Blog** - https://openai.com/blog/rss.xml
   - GPT models, DALL-E, official announcements

2. **Anthropic News** - https://www.anthropic.com/news/rss.xml
   - Claude AI updates and research

3. **Hugging Face Blog** - https://huggingface.co/blog/feed.xml
   - Open source models, datasets, tools

4. **Google AI Blog** - http://ai.googleblog.com/feeds/posts/default
   - Gemini, research, product announcements

5. **The Batch by deeplearning.ai** - https://www.deeplearning.ai/the-batch/feed/
   - Weekly AI news curated by Andrew Ng

6. **MIT Technology Review AI** - https://www.technologyreview.com/topic/artificial-intelligence/feed
   - In-depth AI coverage and analysis

7. **VentureBeat AI** - https://venturebeat.com/category/ai/feed/
   - AI business news and product launches

## New AI Topics

- Large Language Models
- Computer Vision
- Machine Learning
- AI Tools
- AI Models
- AI Research
- AI Ethics
- AI Business
- Generative AI
- AI Infrastructure

## Entity Detection

The enrichment function now detects:

**AI Models**: GPT-4, GPT-3, Claude, Llama, Gemini, DALL-E, Midjourney, Stable Diffusion

**AI Companies**: OpenAI, Anthropic, Google, Meta, Microsoft, Hugging Face, Cohere

**AI Tools**: LangChain, PyTorch, TensorFlow, Keras, Transformers

## Verification

After setup, verify AI news is being ingested:

```bash
curl -s 'https://gptfmaceymhubyuhqegu.supabase.co/rest/v1/signal_items?select=id,title,signal_topics(topics(name))&limit=10' \
  -H "apikey: ANON_KEY" | jq '.[] | select(.signal_topics[].topics.name | contains("AI"))'
```

## Next Steps

1. Monitor ingestion logs for AI sources
2. Adjust topic keywords if needed for better categorization
3. Consider adding more AI-specific sources (e.g., Papers with Code, AI Alignment Forum)
4. Update the news page UI to highlight AI content
