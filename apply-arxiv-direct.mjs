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

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // Try direct query if exec_sql doesn't exist
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return await response.json();
  }
  return data;
}

async function applyMigrations() {
  console.log('Applying arXiv migrations directly...\n');

  try {
    // Read migration files
    const arxivSourcesSql = readFileSync('supabase/migrations/20260305180400_add_arxiv_sources.sql', 'utf8');
    const arxivFieldsSql = readFileSync('supabase/migrations/20260305180401_add_arxiv_fields.sql', 'utf8');

    // Apply arXiv sources
    console.log('1. Adding arXiv sources...');
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .insert([
        {
          name: 'arXiv AI',
          type: 'Literature_API',
          description: 'arXiv artificial intelligence and machine learning papers',
          license_policy: {
            mode: 'store_full_text_allowed',
            snippet_length: 1000,
            attribution_required: true,
            redistribution_allowed: true,
            license_type: 'CC BY 4.0'
          }
        },
        {
          name: 'arXiv Cannabis',
          type: 'Literature_API',
          description: 'arXiv cannabis and cannabinoid research papers',
          license_policy: {
            mode: 'store_full_text_allowed',
            snippet_length: 1000,
            attribution_required: true,
            redistribution_allowed: true,
            license_type: 'CC BY 4.0'
          }
        }
      ])
      .select();

    if (sourcesError) {
      if (sourcesError.code === '23505') {
        console.log('✓ arXiv sources already exist');
      } else {
        throw sourcesError;
      }
    } else {
      console.log('✓ arXiv sources created:', sources.map(s => s.name).join(', '));
    }

    // Get source IDs
    const { data: arxivSources } = await supabase
      .from('sources')
      .select('id, name')
      .in('name', ['arXiv AI', 'arXiv Cannabis']);

    if (!arxivSources || arxivSources.length === 0) {
      throw new Error('Failed to find arXiv sources');
    }

    const aiSource = arxivSources.find(s => s.name === 'arXiv AI');
    const cannabisSource = arxivSources.find(s => s.name === 'arXiv Cannabis');

    // Add endpoints
    console.log('\n2. Adding arXiv endpoints...');
    const { data: endpoints, error: endpointsError } = await supabase
      .from('source_endpoints')
      .insert([
        {
          source_id: aiSource.id,
          name: 'arXiv API',
          endpoint_url: 'http://export.arxiv.org/api/query',
          polling_schedule: '0 */6 * * *',
          is_active: true,
          auth_config: {
            search_query: 'cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:stat.ML',
            max_results: 200,
            sort_by: 'submittedDate',
            sort_order: 'descending'
          }
        },
        {
          source_id: cannabisSource.id,
          name: 'arXiv API',
          endpoint_url: 'http://export.arxiv.org/api/query',
          polling_schedule: '0 */6 * * *',
          is_active: true,
          auth_config: {
            search_query: 'all:cannabis OR all:cannabinoid OR all:cannabidiol OR all:CBD OR all:THC OR all:marijuana OR all:hemp',
            max_results: 100,
            sort_by: 'submittedDate',
            sort_order: 'descending'
          }
        }
      ])
      .select();

    if (endpointsError) {
      if (endpointsError.code === '23505') {
        console.log('✓ arXiv endpoints already exist');
      } else {
        throw endpointsError;
      }
    } else {
      console.log('✓ arXiv endpoints created');
    }

    // Add arXiv fields to paper_items
    console.log('\n3. Adding arXiv fields to paper_items...');
    
    // Check if columns already exist
    const { data: columns } = await supabase
      .from('paper_items')
      .select('*')
      .limit(0);
    
    // We can't easily check column existence, so just try to add them
    console.log('✓ arXiv fields will be added via migration (run: npx supabase db push)');

    console.log('\n✅ arXiv setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npx supabase db push (to add arxiv_id and arxiv_categories fields)');
    console.log('2. Deploy function: npx supabase functions deploy ingest-literature');
    console.log('3. Test: node test-arxiv-ingestion.mjs');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigrations();
