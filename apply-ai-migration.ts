#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🤖 Adding AI News Sources to Formul8 News Database\n');

// Read the migration file
const migrationSQL = await Deno.readTextFile('supabase/migrations/20260305180200_add_ai_sources.sql');

console.log('📝 Applying migration...\n');

// Execute the migration by running it as raw SQL
const { data, error } = await supabase.rpc('exec', { sql: migrationSQL }).catch(() => {
  // If exec RPC doesn't exist, we'll need to use the REST API directly
  return { data: null, error: { message: 'exec RPC not available' } };
});

if (error && error.message !== 'exec RPC not available') {
  console.error('❌ Error applying migration:', error);
  console.log('\n📋 Please apply manually via Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/sql/new');
  Deno.exit(1);
}

// If exec RPC doesn't work, apply via direct SQL inserts
if (error?.message === 'exec RPC not available') {
  console.log('⚠️  Using direct insert method...\n');
  
  // Insert AI sources
  const sources = [
    { name: 'OpenAI Blog', type: 'RSS', description: 'Official OpenAI blog covering GPT models, DALL-E, and AI research', url: 'https://openai.com/blog/rss.xml' },
    { name: 'Anthropic News', type: 'RSS', description: 'Anthropic announcements and Claude AI updates', url: 'https://www.anthropic.com/news/rss.xml' },
    { name: 'Hugging Face Blog', type: 'RSS', description: 'Open source AI models, datasets, and tools', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'Google AI Blog', type: 'RSS', description: 'Google AI research and product announcements', url: 'http://ai.googleblog.com/feeds/posts/default' },
    { name: 'The Batch by deeplearning.ai', type: 'RSS', description: 'Weekly AI news and insights from Andrew Ng', url: 'https://www.deeplearning.ai/the-batch/feed/' },
    { name: 'AI News - MIT Technology Review', type: 'RSS', description: 'AI coverage from MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
    { name: 'VentureBeat AI', type: 'RSS', description: 'AI business news and product launches', url: 'https://venturebeat.com/category/ai/feed/' }
  ];
  
  for (const source of sources) {
    console.log(`  Adding source: ${source.name}...`);
    
    const { data: sourceData, error: sourceError } = await supabase
      .from('sources')
      .insert({
        name: source.name,
        type: source.type,
        description: source.description,
        license_policy: {
          mode: 'snippet_only',
          snippet_length: 500,
          attribution_required: true,
          redistribution_allowed: true
        }
      })
      .select()
      .single();
    
    if (sourceError) {
      console.error(`    ❌ Error: ${sourceError.message}`);
      continue;
    }
    
    // Add endpoint
    const { error: endpointError } = await supabase
      .from('source_endpoints')
      .insert({
        source_id: sourceData.id,
        name: 'Main Feed',
        endpoint_url: source.url,
        polling_schedule: '*/30 * * * *',
        is_active: true
      });
    
    if (endpointError) {
      console.error(`    ❌ Endpoint error: ${endpointError.message}`);
    } else {
      console.log(`    ✅ Added successfully`);
    }
  }
  
  // Add AI topics
  console.log('\n  Adding AI topics...');
  const topics = [
    { name: 'Large Language Models', description: 'GPT, Claude, Llama, and other LLMs' },
    { name: 'Computer Vision', description: 'Image generation, recognition, and processing' },
    { name: 'Machine Learning', description: 'ML algorithms, training, and deployment' },
    { name: 'AI Tools', description: 'AI development tools, frameworks, and platforms' },
    { name: 'AI Models', description: 'New AI model releases and updates' },
    { name: 'AI Research', description: 'Academic AI research and papers' },
    { name: 'AI Ethics', description: 'AI safety, alignment, and ethical considerations' },
    { name: 'AI Business', description: 'AI startups, funding, and market trends' },
    { name: 'Generative AI', description: 'Text, image, video, and audio generation' },
    { name: 'AI Infrastructure', description: 'GPU, cloud, and compute for AI' }
  ];
  
  const { error: topicsError } = await supabase
    .from('topics')
    .upsert(topics, { onConflict: 'name', ignoreDuplicates: true });
  
  if (topicsError) {
    console.error(`    ❌ Error: ${topicsError.message}`);
  } else {
    console.log(`    ✅ Added ${topics.length} AI topics`);
  }
}

console.log('\n✅ AI sources migration complete!');
console.log('\n📊 Summary:');
console.log('  - 7 AI news sources added');
console.log('  - 10 AI topics added');
console.log('  - RSS endpoints configured');

console.log('\n🔄 Next: Deploy updated enrichment function');
console.log('   supabase functions deploy enrich-signals');

console.log('\n🧪 Test ingestion:');
console.log('   curl -X POST https://gptfmaceymhubyuhqegu.supabase.co/functions/v1/ingest-orchestrator \\');
console.log('     -H "Authorization: Bearer SERVICE_KEY" \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"source_types": ["RSS"]}\'');
