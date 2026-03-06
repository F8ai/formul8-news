#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying arXiv migrations...\n');

  // Apply arXiv sources migration
  console.log('1. Adding arXiv sources...');
  const arxivSourcesSql = readFileSync('supabase/migrations/20260305180400_add_arxiv_sources.sql', 'utf8');
  const { error: sourcesError } = await supabase.rpc('exec_sql', { sql: arxivSourcesSql });
  
  if (sourcesError) {
    console.error('Error adding arXiv sources:', sourcesError);
  } else {
    console.log('✓ arXiv sources added successfully');
  }

  // Apply arXiv fields migration
  console.log('\n2. Adding arXiv fields to paper_items...');
  const arxivFieldsSql = readFileSync('supabase/migrations/20260305180401_add_arxiv_fields.sql', 'utf8');
  const { error: fieldsError } = await supabase.rpc('exec_sql', { sql: arxivFieldsSql });
  
  if (fieldsError) {
    console.error('Error adding arXiv fields:', fieldsError);
  } else {
    console.log('✓ arXiv fields added successfully');
  }

  // Verify sources were created
  console.log('\n3. Verifying arXiv sources...');
  const { data: sources, error: verifyError } = await supabase
    .from('sources')
    .select('id, name, type')
    .in('name', ['arXiv AI', 'arXiv Cannabis']);

  if (verifyError) {
    console.error('Error verifying sources:', verifyError);
  } else {
    console.log('✓ Found sources:', sources);
  }

  // Verify endpoints were created
  console.log('\n4. Verifying arXiv endpoints...');
  const { data: endpoints, error: endpointsError } = await supabase
    .from('source_endpoints')
    .select('id, name, endpoint_url, auth_config, sources(name)')
    .eq('name', 'arXiv API');

  if (endpointsError) {
    console.error('Error verifying endpoints:', endpointsError);
  } else {
    console.log('✓ Found endpoints:');
    endpoints.forEach(ep => {
      console.log(`  - ${ep.sources.name}: ${ep.endpoint_url}`);
      console.log(`    Query: ${ep.auth_config.search_query}`);
    });
  }

  console.log('\n✅ arXiv migration complete!');
  console.log('\nNext steps:');
  console.log('1. Deploy the updated ingest-literature function');
  console.log('2. Test with: node test-arxiv-ingestion.mjs');
}

applyMigration().catch(console.error);
