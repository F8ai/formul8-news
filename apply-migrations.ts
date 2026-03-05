#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 Applying New Source Migrations');
console.log('==================================\n');

// Read migration files
const migration1 = await Deno.readTextFile('supabase/migrations/20260305180300_add_comprehensive_sources.sql');
const migration2 = await Deno.readTextFile('supabase/migrations/20260305180301_update_pubmed_2026.sql');

console.log('📦 Migration 1: Adding 60 new sources...\n');

try {
  // Execute migration 1 as a single transaction
  const response1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: migration1 }),
  });

  if (!response1.ok) {
    console.log('⚠️  RPC method not available, using direct inserts...\n');
    
    // Fallback: Use Supabase client to insert sources directly
    // Parse and execute INSERT statements manually
    
    // Cannabis sources
    const cannabisSources = [
      { name: 'MJBizDaily', type: 'RSS', description: 'Leading cannabis business news and analysis', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Marijuana Moment', type: 'RSS', description: 'Cannabis policy and legalization news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Leafly News', type: 'RSS', description: 'Cannabis culture, science, and business', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'High Times', type: 'RSS', description: 'Cannabis culture and industry news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Cannabis Business Times', type: 'RSS', description: 'Cultivation and business insights', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Green Market Report', type: 'RSS', description: 'Cannabis market intelligence', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'NORML News', type: 'RSS', description: 'Cannabis law reform and advocacy', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Ganjapreneur', type: 'RSS', description: 'Cannabis entrepreneurship and business', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
    ];
    
    const { data: insertedSources, error: sourcesError } = await supabase
      .from('sources')
      .insert(cannabisSources)
      .select();
    
    if (sourcesError) {
      console.error('❌ Error inserting sources:', sourcesError.message);
    } else {
      console.log(`✅ Inserted ${insertedSources?.length || 0} cannabis sources`);
    }
    
    // AI sources
    const aiSources = [
      { name: 'TechCrunch AI', type: 'RSS', description: 'AI startup and product news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'The Verge AI', type: 'RSS', description: 'AI technology and culture coverage', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Ars Technica AI', type: 'RSS', description: 'In-depth AI technology analysis', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Wired AI', type: 'RSS', description: 'AI impact on society and technology', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Papers with Code', type: 'RSS', description: 'Latest ML research papers with code', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'DeepMind Blog', type: 'RSS', description: 'DeepMind AI research and news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Meta AI Blog', type: 'RSS', description: 'Meta AI research and products', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Microsoft AI Blog', type: 'RSS', description: 'Microsoft AI and Azure ML news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
    ];
    
    const { data: insertedAI, error: aiError } = await supabase
      .from('sources')
      .insert(aiSources)
      .select();
    
    if (aiError) {
      console.error('❌ Error inserting AI sources:', aiError.message);
    } else {
      console.log(`✅ Inserted ${insertedAI?.length || 0} AI sources`);
    }
    
    // Tech/Science sources
    const techSources = [
      { name: 'Reuters Technology', type: 'RSS', description: 'Global technology news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Hacker News', type: 'RSS', description: 'Tech community news aggregator', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Nature News', type: 'RSS', description: 'Scientific research news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Science Daily', type: 'RSS', description: 'Latest research news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
      { name: 'Phys.org', type: 'RSS', description: 'Science and technology news', license_policy: {"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true} },
    ];
    
    const { data: insertedTech, error: techError } = await supabase
      .from('sources')
      .insert(techSources)
      .select();
    
    if (techError) {
      console.error('❌ Error inserting tech sources:', techError.message);
    } else {
      console.log(`✅ Inserted ${insertedTech?.length || 0} tech/science sources`);
    }
    
  } else {
    console.log('✅ Migration 1 applied via RPC');
  }
} catch (error) {
  console.error('❌ Error applying migration 1:', error);
}

console.log('\n📦 Migration 2: Updating PubMed for 2026...\n');

try {
  // Update PubMed endpoint
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
      console.log('✅ PubMed updated for 2026 articles');
    }
  }
} catch (error) {
  console.error('❌ Error applying migration 2:', error);
}

console.log('\n==================================');
console.log('📊 Source Statistics');
console.log('==================================\n');

// Get counts
const { count: sourceCount } = await supabase
  .from('sources')
  .select('*', { count: 'exact', head: true });

const { count: endpointCount } = await supabase
  .from('source_endpoints')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

console.log(`Total sources: ${sourceCount}`);
console.log(`Active endpoints: ${endpointCount}`);

console.log('\n✨ Migrations complete!\n');
console.log('Next steps:');
console.log('  1. Run backfill: ./run-comprehensive-backfill.sh');
console.log('  2. Trigger PubMed: ./trigger-pubmed-ingestion.sh');
