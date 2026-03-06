#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔬 Updating PubMed for 2026 Papers');
console.log('===================================\n');

// Get PubMed source
const { data: pubmedSource } = await supabase
  .from('sources')
  .select('id')
  .eq('name', 'PubMed')
  .single();

if (!pubmedSource) {
  console.error('❌ PubMed source not found');
  process.exit(1);
}

// Update endpoint configuration
const { error: updateError } = await supabase
  .from('source_endpoints')
  .update({
    auth_config: {
      api_key: null,
      search_query: '(cannabis[Title/Abstract] OR cannabidiol[Title/Abstract] OR CBD[Title/Abstract] OR THC[Title/Abstract] OR marijuana[Title/Abstract] OR cannabinoid[Title/Abstract]) AND (2026[PDAT])',
      max_results: 10000
    },
    polling_schedule: '0 */3 * * *' // Every 3 hours
  })
  .eq('source_id', pubmedSource.id)
  .eq('name', 'E-utilities Search');

if (updateError) {
  console.error('❌ Error updating endpoint:', updateError.message);
  process.exit(1);
}

console.log('✅ PubMed endpoint updated!\n');
console.log('📋 New Configuration:');
console.log('   Query: Cannabis terms + 2026 only');
console.log('   Max Results: 10,000');
console.log('   Schedule: Every 3 hours\n');

console.log('🚀 Now run the ingestion:');
console.log('   node ingest-pubmed-direct.mjs\n');
