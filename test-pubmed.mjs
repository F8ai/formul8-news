#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🧪 Testing PubMed Integration\n');

// Step 1: Check if PubMed source exists
console.log('1️⃣ Checking PubMed source...');
const { data: pubmedSource, error: sourceError } = await supabase
  .from('sources')
  .select('*, source_endpoints(*)')
  .eq('name', 'PubMed')
  .single();

if (sourceError || !pubmedSource) {
  console.error('❌ PubMed source not found. Run migration first:');
  console.error('   node apply-pubmed-migration.mjs');
  process.exit(1);
}

console.log(`✅ Found PubMed source (ID: ${pubmedSource.id})`);
console.log(`   Endpoints: ${pubmedSource.source_endpoints.length}`);

if (pubmedSource.source_endpoints.length === 0) {
  console.error('❌ No endpoints configured for PubMed');
  process.exit(1);
}

const endpoint = pubmedSource.source_endpoints[0];
console.log(`   Endpoint: ${endpoint.name}`);
console.log(`   Active: ${endpoint.is_active}`);
console.log(`   Schedule: ${endpoint.polling_schedule}\n`);

// Step 2: Trigger ingestion via orchestrator
console.log('2️⃣ Triggering PubMed ingestion...');
const orchestratorUrl = `${SUPABASE_URL}/functions/v1/ingest-orchestrator`;

const response = await fetch(orchestratorUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({
    source_endpoint_id: endpoint.id,
    mode: 'streaming',
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  console.error(`❌ Orchestrator failed: ${response.status}`);
  console.error(errorText);
  process.exit(1);
}

const result = await response.json();
console.log('✅ Ingestion completed');
console.log(`   Status: ${result.status}`);
console.log(`   Items created: ${result.items_created}`);
console.log(`   Items skipped: ${result.items_skipped}`);

if (result.errors && result.errors.length > 0) {
  console.log(`   Errors: ${result.errors.length}`);
  result.errors.forEach((err) => {
    console.log(`     - ${err.error}`);
  });
}

// Step 3: Check recent papers
console.log('\n3️⃣ Checking recent cannabis papers...');
const { data: recentPapers, error: papersError } = await supabase
  .from('signal_items')
  .select(`
    id,
    title,
    published_at,
    paper_items (
      doi,
      journal,
      is_open_access
    )
  `)
  .eq('type', 'paper')
  .order('published_at', { ascending: false })
  .limit(5);

if (papersError) {
  console.error('❌ Failed to fetch papers:', papersError.message);
} else if (!recentPapers || recentPapers.length === 0) {
  console.log('⚠️  No papers found yet');
} else {
  console.log(`✅ Found ${recentPapers.length} recent papers:\n`);
  recentPapers.forEach((paper, i) => {
    console.log(`   ${i + 1}. ${paper.title}`);
    console.log(`      Published: ${paper.published_at || 'Unknown'}`);
    if (paper.paper_items && paper.paper_items.length > 0) {
      const details = paper.paper_items[0];
      console.log(`      Journal: ${details.journal || 'Unknown'}`);
      console.log(`      DOI: ${details.doi || 'N/A'}`);
      console.log(`      Open Access: ${details.is_open_access ? 'Yes' : 'No'}`);
    }
    console.log();
  });
}

console.log('✅ PubMed integration test complete!');
