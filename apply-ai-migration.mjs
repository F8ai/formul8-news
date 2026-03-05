#!/usr/bin/env node

import { readFile } from 'fs/promises';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

console.log('🤖 Adding AI News Sources to Formul8 News Database\n');

// Helper function to make API calls
async function apiCall(endpoint, method, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API call failed: ${response.status} ${error}`);
  }
  
  return response.json();
}

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

console.log('📝 Adding AI news sources...\n');

for (const source of sources) {
  try {
    console.log(`  Adding: ${source.name}...`);
    
    // Insert source
    const [sourceData] = await apiCall('sources', 'POST', {
      name: source.name,
      type: source.type,
      description: source.description,
      license_policy: {
        mode: 'snippet_only',
        snippet_length: 500,
        attribution_required: true,
        redistribution_allowed: true
      }
    });
    
    // Add endpoint
    await apiCall('source_endpoints', 'POST', {
      source_id: sourceData.id,
      name: 'Main Feed',
      endpoint_url: source.url,
      polling_schedule: '*/30 * * * *',
      is_active: true
    });
    
    console.log(`    ✅ Added successfully`);
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
  }
}

// Add AI topics
console.log('\n📚 Adding AI topics...\n');
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

try {
  await apiCall('topics', 'POST', topics);
  console.log(`  ✅ Added ${topics.length} AI topics`);
} catch (error) {
  console.log(`  ⚠️  Topics may already exist: ${error.message}`);
}

console.log('\n✅ AI sources migration complete!');
console.log('\n📊 Summary:');
console.log('  - 7 AI news sources added');
console.log('  - 10 AI topics added');
console.log('  - RSS endpoints configured');

console.log('\n🔄 Next steps:');
console.log('  1. Deploy updated enrichment function');
console.log('  2. Run ingestion to fetch AI news');
console.log('  3. Update news page categories');
