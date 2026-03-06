#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔬 Applying PubMed Migration');
console.log('============================\n');

// Check if PubMed already exists
console.log('1️⃣ Checking for existing PubMed source...');
const { data: existingPubmed } = await supabase
  .from('sources')
  .select('id, source_endpoints(*)')
  .eq('name', 'PubMed')
  .single();

if (existingPubmed) {
  console.log('⚠️  PubMed source already exists');
  console.log(`   Source ID: ${existingPubmed.id}`);
  console.log(`   Endpoints: ${existingPubmed.source_endpoints?.length || 0}\n`);
  
  if (existingPubmed.source_endpoints && existingPubmed.source_endpoints.length > 0) {
    console.log('✅ PubMed is already configured!\n');
    console.log('To test ingestion, run:');
    console.log('  deno run --allow-net --allow-env --allow-read test-pubmed.ts\n');
    Deno.exit(0);
  }
}

// Insert PubMed source
console.log('2️⃣ Creating PubMed source...');
const { data: pubmedSource, error: sourceError } = await supabase
  .from('sources')
  .insert({
    name: 'PubMed',
    type: 'Literature_API',
    description: 'NIH database of biomedical literature including cannabis research',
    license_policy: {
      mode: "snippet_only",
      snippet_length: 500,
      attribution_required: true,
      redistribution_allowed: true
    }
  })
  .select()
  .single();

if (sourceError) {
  console.error('❌ Error creating PubMed source:', sourceError.message);
  Deno.exit(1);
}

console.log(`✅ Created PubMed source (ID: ${pubmedSource.id})\n`);

// Insert PubMed endpoint
console.log('3️⃣ Creating PubMed endpoint...');
const { data: endpoint, error: endpointError } = await supabase
  .from('source_endpoints')
  .insert({
    source_id: pubmedSource.id,
    name: 'E-utilities Search',
    endpoint_url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
    polling_schedule: '0 */6 * * *', // Every 6 hours
    is_active: true,
    auth_config: {
      api_key: null,
      search_query: '(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract] OR THC[Title/Abstract] OR marijuana[Title/Abstract] OR cannabinoid[Title/Abstract])',
      max_results: 100
    }
  })
  .select()
  .single();

if (endpointError) {
  console.error('❌ Error creating endpoint:', endpointError.message);
  Deno.exit(1);
}

console.log(`✅ Created endpoint (ID: ${endpoint.id})\n`);

console.log('============================');
console.log('✅ PubMed Migration Complete!\n');

console.log('📋 Configuration:');
console.log(`   Source: PubMed (${pubmedSource.id})`);
console.log(`   Endpoint: E-utilities Search (${endpoint.id})`);
console.log(`   Schedule: Every 6 hours`);
console.log(`   Status: Active\n`);

console.log('🧪 Next Steps:');
console.log('   1. Test ingestion:');
console.log('      deno run --allow-net --allow-env --allow-read test-pubmed.ts\n');
console.log('   2. Check status:');
console.log('      ./check-pubmed-status.sh\n');
console.log('   3. Customize search query (optional):');
console.log('      See PUBMED_SETUP.md for details\n');
