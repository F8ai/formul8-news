#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔧 Adding Google News RSS Feeds');
console.log('================================\n');

const licensePolicy = {
  mode: "snippet_only",
  snippet_length: 500,
  attribution_required: true,
  redistribution_allowed: true
};

// Google News RSS feeds - these are very reliable and high-volume
const googleNewsFeeds = [
  // AI Topics
  { 
    name: 'Google News - Artificial Intelligence', 
    url: 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en',
    description: 'Latest AI news from Google News aggregator',
    category: 'AI'
  },
  { 
    name: 'Google News - Machine Learning', 
    url: 'https://news.google.com/rss/search?q=machine+learning&hl=en-US&gl=US&ceid=US:en',
    description: 'Machine learning news from Google News',
    category: 'AI'
  },
  { 
    name: 'Google News - ChatGPT', 
    url: 'https://news.google.com/rss/search?q=ChatGPT+OR+GPT-4+OR+OpenAI&hl=en-US&gl=US&ceid=US:en',
    description: 'ChatGPT and OpenAI news from Google News',
    category: 'AI'
  },
  { 
    name: 'Google News - AI Technology', 
    url: 'https://news.google.com/rss/search?q=AI+technology+OR+generative+AI&hl=en-US&gl=US&ceid=US:en',
    description: 'AI technology and generative AI news',
    category: 'AI'
  },
  
  // Cannabis Topics
  { 
    name: 'Google News - Cannabis', 
    url: 'https://news.google.com/rss/search?q=cannabis&hl=en-US&gl=US&ceid=US:en',
    description: 'Latest cannabis news from Google News aggregator',
    category: 'Cannabis'
  },
  { 
    name: 'Google News - Marijuana', 
    url: 'https://news.google.com/rss/search?q=marijuana&hl=en-US&gl=US&ceid=US:en',
    description: 'Marijuana news from Google News',
    category: 'Cannabis'
  },
  { 
    name: 'Google News - CBD', 
    url: 'https://news.google.com/rss/search?q=CBD+OR+cannabidiol&hl=en-US&gl=US&ceid=US:en',
    description: 'CBD and cannabidiol news from Google News',
    category: 'Cannabis'
  },
  { 
    name: 'Google News - Cannabis Legalization', 
    url: 'https://news.google.com/rss/search?q=cannabis+legalization+OR+marijuana+legalization&hl=en-US&gl=US&ceid=US:en',
    description: 'Cannabis legalization and policy news',
    category: 'Cannabis'
  },
];

console.log(`📦 Adding ${googleNewsFeeds.length} Google News feeds...\n`);

for (const feed of googleNewsFeeds) {
  try {
    // Insert source
    const { data: insertedSource, error: sourceError } = await supabase
      .from('sources')
      .insert({
        name: feed.name,
        type: 'RSS',
        description: feed.description,
        license_policy: licensePolicy
      })
      .select()
      .single();
    
    if (sourceError) {
      if (sourceError.code === '23505') {
        console.log(`⏭️  ${feed.name} already exists`);
        continue;
      }
      console.error(`❌ Error inserting ${feed.name}:`, sourceError.message);
      continue;
    }
    
    // Insert endpoint
    const { error: endpointError } = await supabase
      .from('source_endpoints')
      .insert({
        source_id: insertedSource.id,
        name: 'Main Feed',
        endpoint_url: feed.url,
        polling_schedule: '*/15 * * * *', // Every 15 minutes for high-volume feeds
        is_active: true
      });
    
    if (endpointError) {
      console.error(`❌ Error inserting endpoint for ${feed.name}:`, endpointError.message);
    } else {
      console.log(`✅ ${feed.name} (${feed.category})`);
    }
  } catch (error) {
    console.error(`❌ Exception for ${feed.name}:`, error.message);
  }
}

console.log('\n================================');
console.log('📊 Source Statistics');
console.log('================================\n');

const { count: sourceCount } = await supabase
  .from('sources')
  .select('*', { count: 'exact', head: true });

const { count: endpointCount } = await supabase
  .from('source_endpoints')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

console.log(`Total sources: ${sourceCount}`);
console.log(`Active endpoints: ${endpointCount}`);

console.log('\n✨ Google News feeds added successfully!\n');
console.log('These feeds are:');
console.log('  - High volume (100+ articles/day)');
console.log('  - Very reliable (Google infrastructure)');
console.log('  - Broad coverage (aggregates from many sources)');
console.log('  - Updated every 15 minutes');
console.log('\nNext: Run ingestion to get articles');
console.log('  ./ingest-all-direct.sh');
