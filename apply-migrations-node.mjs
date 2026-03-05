#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 Adding New Sources');
console.log('==================================\n');

const licensePolicy = {
  mode: "snippet_only",
  snippet_length: 500,
  attribution_required: true,
  redistribution_allowed: true
};

// Cannabis sources with endpoints
const cannabisSources = [
  { name: 'MJBizDaily', url: 'https://mjbizdaily.com/feed/', description: 'Leading cannabis business news and analysis' },
  { name: 'Marijuana Moment', url: 'https://www.marijuanamoment.net/feed/', description: 'Cannabis policy and legalization news' },
  { name: 'Leafly News', url: 'https://www.leafly.com/news/feed', description: 'Cannabis culture, science, and business' },
  { name: 'High Times', url: 'https://hightimes.com/feed/', description: 'Cannabis culture and industry news' },
  { name: 'Cannabis Business Times', url: 'https://www.cannabisbusinesstimes.com/rss.xml', description: 'Cultivation and business insights' },
  { name: 'Green Market Report', url: 'https://www.greenmarketreport.com/feed/', description: 'Cannabis market intelligence' },
  { name: 'NORML News', url: 'https://norml.org/news/feed/', description: 'Cannabis law reform and advocacy' },
  { name: 'Ganjapreneur', url: 'https://www.ganjapreneur.com/feed/', description: 'Cannabis entrepreneurship and business' },
  { name: 'Hemp Industry Daily', url: 'https://hempindustrydaily.com/feed/', description: 'Hemp and CBD business news' },
  { name: 'Cannabis Wire', url: 'https://cannabiswire.com/feed/', description: 'Cannabis policy and business journalism' },
];

// AI sources with endpoints
const aiSources = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', description: 'AI startup and product news' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', description: 'AI technology and culture coverage' },
  { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', description: 'In-depth AI technology analysis' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', description: 'AI impact on society and technology' },
  { name: 'Papers with Code', url: 'https://paperswithcode.com/feeds/latest/', description: 'Latest ML research papers with code' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', description: 'DeepMind AI research and news' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', description: 'Meta AI research and products' },
  { name: 'Microsoft AI Blog', url: 'https://blogs.microsoft.com/ai/feed/', description: 'Microsoft AI and Azure ML news' },
  { name: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', description: 'AWS ML services and tutorials' },
  { name: 'NVIDIA AI Blog', url: 'https://blogs.nvidia.com/feed/', description: 'NVIDIA AI hardware and software' },
];

// Tech/Science sources with endpoints
const techSources = [
  { name: 'Reuters Technology', url: 'https://www.reuters.com/technology/rss', description: 'Global technology news' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', description: 'Tech community news aggregator' },
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss', description: 'Scientific research news' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', description: 'Latest research news' },
  { name: 'Phys.org', url: 'https://phys.org/rss-feed/', description: 'Science and technology news' },
  { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', description: 'Math and science journalism' },
];

async function addSources(sources, category) {
  console.log(`📦 Adding ${sources.length} ${category} sources...\n`);
  
  for (const source of sources) {
    try {
      // Insert source
      const { data: insertedSource, error: sourceError } = await supabase
        .from('sources')
        .insert({
          name: source.name,
          type: 'RSS',
          description: source.description,
          license_policy: licensePolicy
        })
        .select()
        .single();
      
      if (sourceError) {
        if (sourceError.code === '23505') {
          console.log(`⏭️  ${source.name} already exists`);
          continue;
        }
        console.error(`❌ Error inserting ${source.name}:`, sourceError.message);
        continue;
      }
      
      // Insert endpoint
      const { error: endpointError } = await supabase
        .from('source_endpoints')
        .insert({
          source_id: insertedSource.id,
          name: 'Main Feed',
          endpoint_url: source.url,
          polling_schedule: '*/30 * * * *',
          is_active: true
        });
      
      if (endpointError) {
        console.error(`❌ Error inserting endpoint for ${source.name}:`, endpointError.message);
      } else {
        console.log(`✅ ${source.name}`);
      }
    } catch (error) {
      console.error(`❌ Exception for ${source.name}:`, error.message);
    }
  }
}

// Add all sources
await addSources(cannabisSources, 'Cannabis');
await addSources(aiSources, 'AI');
await addSources(techSources, 'Tech/Science');

console.log('\n📦 Updating PubMed for 2026...\n');

try {
  const { data: pubmedSource } = await supabase
    .from('sources')
    .select('id')
    .eq('name', 'PubMed')
    .single();
  
  if (pubmedSource) {
    const { error: updateError } = await supabase
      .from('source_endpoints')
      .update({
        auth_config: {
          api_key: null,
          search_query: '(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract] OR THC[Title/Abstract] OR marijuana[Title/Abstract] OR cannabinoid[Title/Abstract]) AND (2026[PDAT])',
          max_results: 500
        },
        polling_schedule: '0 */3 * * *'
      })
      .eq('source_id', pubmedSource.id)
      .eq('name', 'E-utilities Search');
    
    if (updateError) {
      console.error('❌ Error updating PubMed:', updateError.message);
    } else {
      console.log('✅ PubMed updated for 2026 articles (max 500, every 3 hours)');
    }
  }
} catch (error) {
  console.error('❌ Error updating PubMed:', error.message);
}

console.log('\n==================================');
console.log('📊 Source Statistics');
console.log('==================================\n');

const { count: sourceCount } = await supabase
  .from('sources')
  .select('*', { count: 'exact', head: true });

const { count: endpointCount } = await supabase
  .from('source_endpoints')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

console.log(`Total sources: ${sourceCount}`);
console.log(`Active endpoints: ${endpointCount}`);

console.log('\n✨ Sources added successfully!\n');
console.log('Next: Trigger ingestion to get articles');
console.log('  ./run-comprehensive-backfill.sh');
